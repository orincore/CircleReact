import io from "socket.io-client";
import { API_BASE_URL } from "../config/api.js";
import { Platform } from 'react-native';

let socket: any | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 15; // Increased for production
let reconnectTimer: any = null;
let pingInterval: any = null;
let connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'reconnecting'
let isInitialized = false;
let currentToken: string | null = null;

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
    console.error('🔴 Max reconnection attempts reached. Please refresh the page.');
    socketService.notifyConnectionState('failed');
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s
  
  console.log(`🔄 Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms...`);
  socketService.notifyConnectionState('reconnecting');

  reconnectTimer = setTimeout(() => {
    console.log(`🔄 Reconnection attempt ${reconnectAttempts}...`);
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

    console.log('🔌 Creating new socket connection...', {
      platform: Platform.OS,
      url: API_BASE_URL,
      hasToken: !!token
    });
    socketService.notifyConnectionState('connecting');

    // Enhanced socket configuration for production
    const socketConfig = {
      path: "/ws",
      // Optimized transport order (WebSocket first for EC2 backend)
      transports: Platform.OS === 'web' ? ["websocket", "polling"] : ["websocket"],
      auth: token ? { token } : undefined,
      reconnection: false, // We handle reconnection manually
      autoConnect: true,
      timeout: 20000, // Standard timeout for EC2 backend
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true,
      // Standard configuration for EC2 backend
      withCredentials: false,
    };

    socket = io(API_BASE_URL, socketConfig);

    // Connection successful
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully', {
        id: socket.id,
        transport: socket.io.engine.transport.name,
        platform: Platform.OS
      });
      reconnectAttempts = 0; // Reset attempts on successful connection
      isInitialized = true;
      socketService.notifyConnectionState('connected');
      
      // Start heartbeat
      startHeartbeat();
      
      // Re-join any active chat
      const currentChatId = socketService.getCurrentChatId();
      if (currentChatId) {
        console.log('🔄 Re-joining chat after reconnection:', currentChatId);
        socket.emit('chat:join', { chatId: currentChatId });
      }
    });

    // Connection error
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport
      });
      socketService.notifyConnectionState('disconnected');
      
      // Enhanced error handling for different platforms and domains
      if (Platform.OS === 'web') {
        // Browser-specific error handling
        if (error.message?.includes('CORS')) {
          console.error('🌐 CORS error detected - check server configuration');
        }
        
        // Production domain specific debugging
        if (API_BASE_URL.includes('api.circle.orincore.com')) {
          console.error('🏭 Production domain connection failed:', {
            domain: 'api.circle.orincore.com',
            transport: socket.io?.engine?.transport?.name || 'unknown',
            readyState: socket.io?.engine?.readyState || 'unknown',
            url: API_BASE_URL,
            error: error.message
          });
          
          // Check if it's a WebSocket-specific issue
          if (error.message?.includes('websocket') || error.message?.includes('WebSocket')) {
            console.warn('⚠️ WebSocket connection failed on production domain - this is common with Vercel');
            console.warn('⚠️ Falling back to polling transport');
          }
          
          // Check for SSL/TLS issues
          if (error.message?.includes('SSL') || error.message?.includes('TLS') || error.message?.includes('certificate')) {
            console.error('🔒 SSL/TLS certificate issue detected on production domain');
          }
        }
      }
      
      attemptReconnection(token);
    });

    // Disconnection
    socket.on('disconnect', (reason: string) => {
      console.warn('⚠️ Socket disconnected:', reason, {
        platform: Platform.OS,
        wasConnected: isInitialized
      });
      clearIntervals();
      socketService.notifyConnectionState('disconnected');
      
      // Enhanced reconnection logic
      const shouldReconnect = reason !== 'io client disconnect' && 
                             reason !== 'io server disconnect' &&
                             isInitialized; // Only reconnect if was previously connected
      
      if (shouldReconnect) {
        attemptReconnection(token);
      }
    });

    // Pong response for heartbeat
    socket.on('pong', () => {
      console.log('💓 Heartbeat received');
    });

    // Handle authentication errors
    socket.on('auth_error', (error: any) => {
      console.error('🔐 Authentication error:', error);
      socketService.notifyConnectionState('auth_failed');
    });

    // Transport upgrade events for debugging
    socket.io.on('upgrade', () => {
      console.log('🚀 Socket transport upgraded to:', socket.io.engine.transport.name);
    });

    socket.io.on('upgradeError', (error: any) => {
      console.warn('⚠️ Socket transport upgrade failed:', error);
    });

  } catch (error) {
    console.error('❌ Error creating socket:', error);
    socketService.notifyConnectionState('error');
    attemptReconnection(token);
  }
}

// Heartbeat to keep connection alive
function startHeartbeat() {
  clearIntervals(); // Clear any existing intervals
  
  pingInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('ping');
      console.log('💓 Sending heartbeat...');
    } else {
      console.warn('⚠️ Socket not connected, stopping heartbeat');
      clearIntervals();
    }
  }, 25000); // Ping every 25 seconds
}

export function getSocket(token?: string | null): any {
  // Update token if provided and different
  if (token && token !== currentToken) {
    console.log('🔄 Token changed, reconnecting socket...');
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
    console.log('🔌 Creating socket - current state:', {
      hasSocket: !!socket,
      connected: socket?.connected,
      connectionState,
      platform: Platform.OS
    });
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
  console.log('🔌 Closing socket connection...');
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
  console.log('🔄 Forcing socket reconnection...');
  closeSocket();
  reconnectAttempts = 0;
  createSocket(token);
}
