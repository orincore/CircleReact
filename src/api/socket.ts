import io from "socket.io-client";
import { API_BASE_URL, getWebSocketUrl } from "../config/api.js";
import { Platform, AppState } from 'react-native';

let socket: any | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 15; // Increased for production
let reconnectTimer: any = null;
let pingInterval: any = null;
let connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'reconnecting'
let isInitialized = false;
let currentToken: string | null = null;
let appStateSubscription: any = null;
let isAppInBackground = false;

// Socket service for managing chat state and message handlers
class SocketService {
  private currentChatId: string | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionListeners: Set<(state: string) => void> = new Set();

  setCurrentChatId(chatId: string | null) {
    this.currentChatId = chatId;
  }

  getCurrentChatId() {
    return this.currentChatId;
  }

  clearCurrentChatId() {
    this.currentChatId = null;
  }

  addMessageHandler(key: string, handler: (data: any) => void) {
    this.messageHandlers.set(key, handler);
  }

  removeMessageHandler(key: string) {
    this.messageHandlers.delete(key);
  }

  getMessageHandler(key: string) {
    return this.messageHandlers.get(key);
  }

  clearAllHandlers() {
    this.messageHandlers.clear();
  }

  // Connection state management
  addConnectionListener(listener: (state: string) => void) {
    this.connectionListeners.add(listener);
  }

  removeConnectionListener(listener: (state: string) => void) {
    this.connectionListeners.delete(listener);
  }

  notifyConnectionState(state: string) {
    connectionState = state;
    this.connectionListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  getConnectionState() {
    return connectionState;
  }

  isConnected() {
    return socket && socket.connected && connectionState === 'connected';
  }
}

export const socketService = new SocketService();

// Clear existing intervals
function clearIntervals() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

// Enhanced reconnection logic
function attemptReconnection(token?: string | null) {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('🔴 Max reconnection attempts reached. Please check your connection.');
    socketService.notifyConnectionState('failed');
    return;
  }

  reconnectAttempts++;
  // More gradual exponential backoff: 2s, 4s, 6s, 8s, 10s (max)
  const delay = Math.min(2000 * reconnectAttempts, 10000);
  
  console.log(`🔄 Scheduling reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay/1000}s`);
  socketService.notifyConnectionState('reconnecting');

  reconnectTimer = setTimeout(() => {
    createSocket(token);
  }, delay);
}

// Create socket with comprehensive event handling
function createSocket(token?: string | null) {
  try {
    // Store current token
    currentToken = token || null;
    
    // Clean up existing socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    clearIntervals();
    socketService.notifyConnectionState('connecting');

    // Get WebSocket URL using the new helper
    const wsUrl = getWebSocketUrl();
    const isProduction = wsUrl.includes('api.circle.orincore.com');
    
    // In production we want true realtime over WebSocket, with polling as a fallback.
    // NGINX and the backend are already configured to support WebSockets on /ws.
    const socketConfig = {
      path: "/ws",
      transports:
        Platform.OS === 'web'
          ? ["websocket", "polling"] // Web: prefer WebSocket, fall back to polling
          : ["websocket"],             // Native: WebSocket only
      auth: token ? { token } : undefined,
      reconnection: false, // We handle reconnection manually
      autoConnect: true,
      // Platform and environment-specific timeouts
      timeout: Platform.OS === 'ios' ? 45000 : (isProduction ? 30000 : 15000), // Longer timeout for iOS
      forceNew: true,
      // Allow engine.io to manage upgrades normally so WebSocket can be used in production
      withCredentials: false,
    };
    

    socket = io(wsUrl, socketConfig);

    // Connection successful
    socket.on('connect', () => {
      const transport = socket.io.engine.transport.name;
      isInitialized = true;
      
      // Production-specific connection validation
      if (isProduction) {
        // Test production connection immediately
        setTimeout(() => {
          if (socket && socket.connected) {
            socket.emit('ping', { test: 'production-stability', timestamp: Date.now() });
          }
        }, 1000);
      }
      
      reconnectAttempts = 0; // Reset attempts on successful connection
      socketService.notifyConnectionState('connected');
      
      // Enhanced connection verification - ensure user room membership
      setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('verify-room-membership', { timestamp: Date.now() });
          
          // Force refresh socket state for voice calls
          socket.emit('refresh-connection-state', { timestamp: Date.now() });
        }
      }, 2000);

      // Additional verification after 5 seconds for reliability
      setTimeout(() => {
        if (socket && socket.connected) {
          socket.emit('verify-room-membership', { timestamp: Date.now() });
        }
      }, 5000);
      
      // Start heartbeat
      startHeartbeat();
      
      // Re-join any active chat
      const currentChatId = socketService.getCurrentChatId();
      if (currentChatId) {
        socket.emit('chat:join', { chatId: currentChatId });
      }
      
      // Notify all connection listeners that we're connected
      // This allows components to retry failed operations
      socketService.notifyConnectionState('connected');
    });

    // Connection error
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport,
        url: wsUrl,
        timestamp: new Date().toISOString()
      });
      socketService.notifyConnectionState('disconnected');
      
      // Enhanced error handling for different platforms and domains
      if (Platform.OS === 'web') {
        // Browser-specific error handling
        if (error.message?.includes('CORS')) {
          console.error('🌐 CORS error detected - check server configuration');
        }
        
        // Production domain specific debugging
        if (wsUrl.includes('api.circle.orincore.com')) {
          console.error('🏭 PRODUCTION SOCKET ERROR ANALYSIS:', {
            domain: 'api.circle.orincore.com',
            transport: socket.io?.engine?.transport?.name || 'unknown',
            readyState: socket.io?.engine?.readyState || 'unknown',
            url: wsUrl,
            error: error.message,
            errorType: error.type,
            errorCode: error.code,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            connectionAttempt: reconnectAttempts + 1
          });
          
          // Specific error pattern detection
          if (error.message?.includes('websocket') || error.message?.includes('WebSocket')) {
            console.warn('⚠️ WebSocket connection failed on production domain');
            console.warn('⚠️ This could be due to:');
            console.warn('   - Proxy/CDN blocking WebSocket upgrades');
            console.warn('   - Server not supporting WebSocket on this domain');
            console.warn('   - Network firewall restrictions');
            console.warn('⚠️ Falling back to polling transport');
          }
          
          // Check for SSL/TLS issues
          if (error.message?.includes('SSL') || error.message?.includes('TLS') || error.message?.includes('certificate')) {
            console.error('🔒 SSL/TLS certificate issue detected on production domain');
            console.error('🔒 This could be due to:');
            console.error('   - Invalid or expired SSL certificate');
            console.error('   - Certificate chain issues');
            console.error('   - Mixed content (HTTP/HTTPS) issues');
          }
          
          // Check for timeout issues
          if (error.message?.includes('timeout') || error.type === 'timeout') {
            console.error('⏱️ Connection timeout on production domain');
            console.error('⏱️ This could be due to:');
            console.error('   - Slow server response times');
            console.error('   - Network latency issues');
            console.error('   - Server overload or cold starts');
          }
          
          // Check for network issues
          if (error.message?.includes('network') || error.message?.includes('fetch')) {
            console.error('🌐 Network error on production domain');
            console.error('🌐 This could be due to:');
            console.error('   - DNS resolution issues');
            console.error('   - Server downtime');
            console.error('   - CDN/proxy configuration issues');
          }
        }
      }
      
      attemptReconnection(token);
    });

    // Disconnection
    socket.on('disconnect', (reason: string) => {
      console.warn('⚠️ Socket disconnected:', reason, {
        platform: Platform.OS,
        wasConnected: isInitialized,
        isAppInBackground
      });
      clearIntervals();
      
      // Don't notify disconnection if app is in background (normal behavior)
      if (!isAppInBackground) {
        socketService.notifyConnectionState('disconnected');
      }
      
      // Enhanced reconnection logic
      // Don't reconnect if app is in background - will reconnect when app comes to foreground
      const shouldReconnect = reason !== 'io client disconnect' && 
                             reason !== 'io server disconnect' &&
                             isInitialized && // Only reconnect if was previously connected
                             !isAppInBackground; // Don't reconnect when app is backgrounded
      
      if (shouldReconnect) {
        attemptReconnection(token);
      }
    });

    // Pong response
    socket.on('pong', (data: any) => {
      // Heartbeat received
    });

    // Room membership verification response
    socket.on('room-membership-verified', (data: any) => {
      // Room membership verified
    });

    // Connection state refresh response
    socket.on('connection-state-refreshed', (data: any) => {
      // Connection state refreshed
    });

    // Authentication error
    socket.on('auth_error', (error: any) => {
      console.error('🔐 Authentication error:', error);
      socketService.notifyConnectionState('auth_failed');
    });

    // Transport upgrade events
    socket.io.on('upgrade', () => {
      // Transport upgraded
    });

    socket.io.on('upgradeError', (error: any) => {
      console.warn('⚠️ Socket transport upgrade failed:', error);
    });

    // Setup AppState listener for mobile apps
    if (Platform.OS !== 'web') {
      // Remove existing listener if any
      if (appStateSubscription) {
        appStateSubscription.remove();
      }

      appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App going to background
          isAppInBackground = true;
        } else if (nextAppState === 'active') {
          // App coming to foreground
          const wasInBackground = isAppInBackground;
          isAppInBackground = false;
          
          // Reconnect if we were disconnected while in background
          if (wasInBackground && socket && !socket.connected && token) {
            setTimeout(() => {
              createSocket(token);
            }, 500);
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Error creating socket:', error);
    socketService.notifyConnectionState('error');
    attemptReconnection(token);
  }
}

// Heartbeat to keep connection alive
function startHeartbeat() {
  clearIntervals(); // Clear any existing intervals
  
  const wsUrl = getWebSocketUrl();
  const isProduction = wsUrl.includes('api.circle.orincore.com');
  const heartbeatInterval = isProduction ? 20000 : 25000; // More frequent in production
  
  pingInterval = setInterval(() => {
    if (socket && socket.connected) {
      const pingData = {
        timestamp: Date.now(),
        environment: isProduction ? 'production' : 'local',
        transport: socket.io?.engine?.transport?.name || 'unknown'
      };
      
      socket.emit('ping', pingData);
      
      // Production-specific connection monitoring
      if (isProduction) {
        // Monitor for connection stability issues
        const connectionHealth = {
          connected: socket.connected,
          readyState: socket.io?.engine?.readyState,
          transport: socket.io?.engine?.transport?.name,
          upgraded: socket.io?.engine?.upgraded,
          timestamp: new Date().toISOString()
        };
        
        
        // Detect potential issues
        if (socket.io?.engine?.readyState !== 'open') {
          console.warn('⚠️ Production socket readyState is not "open":', socket.io?.engine?.readyState);
        }
      }
    } else {
      console.warn('⚠️ Socket not connected, stopping heartbeat');
      if (isProduction) {
        console.error('🏭 PRODUCTION HEARTBEAT FAILED - Socket disconnected');
      }
      clearIntervals();
    }
  }, heartbeatInterval);
}

export function getSocket(token?: string | null): any {
  // Update token if provided and different
  if (token && token !== currentToken) {
    closeSocket();
    createSocket(token);
    return socket;
  }

  // Return existing connected socket
  if (socket && socket.connected && connectionState === 'connected') {
    return socket;
  }

  // Create new socket if none exists or connection is broken
  if (!socket || !socket.connected || connectionState === 'disconnected') {
    createSocket(token || currentToken);
  }
  
  return socket;
}

// Enhanced function to ensure socket is ready
export function ensureSocketConnection(token?: string | null): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = getSocket(token);
    
    if (socket && socket.connected && connectionState === 'connected') {
      resolve(socket);
      return;
    }
    
    // Wait for connection with timeout
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 10000);
    
    const onConnect = () => {
      clearTimeout(timeout);
      socketService.removeConnectionListener(onConnect);
      resolve(socket);
    };
    
    socketService.addConnectionListener((state) => {
      if (state === 'connected') {
        onConnect();
      } else if (state === 'failed' || state === 'auth_failed') {
        clearTimeout(timeout);
        socketService.removeConnectionListener(onConnect);
        reject(new Error(`Socket connection failed: ${state}`));
      }
    });
  });
}

export function closeSocket() {
  clearIntervals();
  reconnectAttempts = 0;
  
  try { 
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect(); 
    }
  } catch (error) {
    console.error('Error closing socket:', error);
  }
  
  socket = null;
  socketService.notifyConnectionState('disconnected');
}

// Force reconnection (useful for debugging or manual reconnection)
export function forceReconnect(token?: string | null) {
  closeSocket();
  reconnectAttempts = 0;
  createSocket(token);
}

// Production socket diagnostics (for browser console debugging)
export function diagnoseProductionSocket() {
  const wsUrl = getWebSocketUrl();
  const isProduction = wsUrl.includes('api.circle.orincore.com');
  
  //console.log('🔍 SOCKET DIAGNOSTIC REPORT:', {
  //  environment: isProduction ? 'PRODUCTION' : 'LOCAL',
  //  url: wsUrl,
  //  socketExists: !!socket,
  //  connected: socket?.connected || false,
  //  socketId: socket?.id || 'none',
  //  transport: socket?.io?.engine?.transport?.name || 'unknown',
  //  readyState: socket?.io?.engine?.readyState || 'unknown',
  //  upgraded: socket?.io?.engine?.upgraded || false,
  //  reconnectAttempts: reconnectAttempts,
  //  connectionState: connectionState,
  //  isInitialized: isInitialized,
  //  currentToken: !!currentToken,
  //  platform: Platform.OS,
  //  timestamp: new Date().toISOString()
  //});
  
  if (isProduction && socket) {
    //console.log('🏭 PRODUCTION-SPECIFIC DIAGNOSTICS:', {
    //  engineUpgrade: socket.io?.engine?.upgrade,
    //  engineTransports: socket.io?.engine?.transports,
    //  engineSocket: !!socket.io?.engine?.socket,
    //  engineWriteBuffer: socket.io?.engine?.writeBuffer?.length || 0,
    //  engineReadyState: socket.io?.engine?.readyState,
    //  enginePingInterval: socket.io?.engine?.pingInterval,
    //  enginePingTimeout: socket.io?.engine?.pingTimeout
    //});
    
    // Test connection
    //console.log('🧪 Testing production connection...');
    socket.emit('ping', { 
      test: 'diagnostic', 
      timestamp: Date.now(),
      source: 'manual-diagnostic' 
    });
  }
  
  return {
    socket,
    isProduction,
    connected: socket?.connected,
    transport: socket?.io?.engine?.transport?.name
  };
}

// Make diagnostic function available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).diagnoseProductionSocket = diagnoseProductionSocket;
  (window as any).forceSocketReconnect = forceReconnect;
}
