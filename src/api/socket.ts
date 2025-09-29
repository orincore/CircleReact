import io from "socket.io-client";
import { API_BASE_URL } from "./config";

let socket: any | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectTimer: any = null;
let pingInterval: any = null;
let connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnected', 'reconnecting'

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
    // Clean up existing socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    clearIntervals();

    console.log('🔌 Creating new socket connection...');
    socketService.notifyConnectionState('connecting');

    socket = io(API_BASE_URL, {
      path: "/ws",
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
      reconnection: false, // We handle reconnection manually
      autoConnect: true,
      timeout: 20000, // 20 seconds timeout
      forceNew: true,
    });

    // Connection successful
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      reconnectAttempts = 0; // Reset attempts on successful connection
      socketService.notifyConnectionState('connected');
      
      // Start heartbeat
      startHeartbeat();
    });

    // Connection error
    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      socketService.notifyConnectionState('disconnected');
      attemptReconnection(token);
    });

    // Disconnection
    socket.on('disconnect', (reason: string) => {
      console.warn('⚠️ Socket disconnected:', reason);
      clearIntervals();
      socketService.notifyConnectionState('disconnected');
      
      // Don't reconnect if disconnection was intentional
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
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
  // Return existing connected socket
  if (socket && socket.connected && connectionState === 'connected') {
    return socket;
  }

  // Create new socket if none exists or connection is broken
  if (!socket || !socket.connected) {
    createSocket(token);
  }
  
  return socket;
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
