import { getSocket } from '../api/socket';
import { router } from 'expo-router';

class SocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.isInitialized = false;
    this.authToken = null;
    this.currentChatId = null; // Track current chat ID explicitly
  }

  initialize(token) {
    if (this.isInitialized && this.socket?.connected) return;
    
    this.socket = getSocket(token);
    this.authToken = token; // Store token for mute status checks
    this.isInitialized = true;
    
    // Set up global background message handler
    this.socket.on('chat:message:background', (data) => {
      // Notify all registered handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    });
  }

  // Called when the server silently reissues an access token (sliding
  // renewal — see src/api/tokenStore.ts; there is no refresh-token endpoint).
  // Unlike initialize(), this isn't a no-op on an already-connected socket:
  // getSocket() only recreates the connection when the token actually
  // differs from the one it's holding, so this just updates the handshake
  // auth to use on the next (re)connect.
  updateToken(token) {
    if (!token) return;
    this.socket = getSocket(token);
    this.authToken = token;
  }

  // Register a handler for background messages
  addMessageHandler(id, handler) {
    this.messageHandlers.set(id, handler);
  }

  // Remove a message handler
  removeMessageHandler(id) {
    this.messageHandlers.delete(id);
  }

  // Navigate to chat
  navigateToChat(chatId, senderName) {
    try {
      router.push({
        pathname: '/secure/chat/[id]',
        params: { 
          id: chatId, 
          name: senderName || 'Chat',
        },
      });
    } catch (error) {
      console.error('Failed to navigate to chat:', error);
    }
  }

  // Get the socket instance
  getSocket() {
    return this.socket;
  }

  // Set current chat ID (called when entering a chat)
  setCurrentChatId(chatId) {
    this.currentChatId = chatId;
  }

  // Clear current chat ID (called when leaving a chat)
  clearCurrentChatId() {
    this.currentChatId = null;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
      this.authToken = null;
      this.messageHandlers.clear();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
