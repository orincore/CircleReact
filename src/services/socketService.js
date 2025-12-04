import { getSocket } from '../api/socket';
import notificationService from './notificationService';
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
      
      // Show in-app notification
      this.showMessageNotification(data.message);
    });

    // Set up reaction notifications
    this.socket.on('chat:reaction:added', (data) => {
      if (data && data.reaction && data.chatId) {
        this.showReactionNotification(data);
      }
    });
  }

  // Register a handler for background messages
  addMessageHandler(id, handler) {
    this.messageHandlers.set(id, handler);
  }

  // Remove a message handler
  removeMessageHandler(id) {
    this.messageHandlers.delete(id);
  }

  // Show message notification
  showMessageNotification = async (message) => {
    if (!message || !message.chatId) return;
    
    // Primary check: use explicitly tracked current chat ID
    if (this.currentChatId && message.chatId === this.currentChatId) {
      return;
    }
    
    // Additional primary check: if we have a tracked chat ID and it matches, always skip
    if (this.currentChatId === message.chatId) {
      return;
    }
    
    // Check the socket service from /src/api/socket.ts as well
    try {
      const { socketService: apiSocketService } = await import('../api/socket');
      const apiCurrentChatId = apiSocketService.getCurrentChatId();
      if (apiCurrentChatId && apiCurrentChatId === message.chatId) {
        return;
      }
    } catch (error) {
      // Ignore import errors
    }
    
    // Fallback: Get current route to check if user is in the same chat
    let currentRoute = null;
    let currentChatId = null;
    
    try {
      const routerState = router.getState?.();
      if (routerState?.routes) {
        currentRoute = routerState.routes[routerState.routes.length - 1];
        currentChatId = currentRoute?.params?.id;
      }
      
      // Alternative method to get current route
      if (!currentRoute && router.pathname) {
        const pathname = router.pathname;
        if (pathname.includes('/chat/')) {
          const chatIdMatch = pathname.match(/\/chat\/([^\/\?]+)/);
          if (chatIdMatch) {
            currentChatId = chatIdMatch[1];
            currentRoute = { name: '[id]', pathname };
          }
        }
      }
      
      // Web fallback: check window location
      if (!currentRoute && typeof window !== 'undefined' && window.location) {
        const pathname = window.location.pathname;
        if (pathname.includes('/chat/')) {
          const chatIdMatch = pathname.match(/\/chat\/([^\/\?]+)/);
          if (chatIdMatch) {
            currentChatId = chatIdMatch[1];
            currentRoute = { name: '[id]', pathname };
          }
        }
      }
    } catch (error) {
      // Ignore router errors
    }
    
    // Enhanced check: Don't show notification if user is on any chat screen with this chat ID
    if (currentRoute?.name === '[id]' && currentChatId === message.chatId) {
      return;
    }
    
    // Additional check: Don't show notification if user is in the same chat (route fallback)
    if (message.chatId === currentChatId) {
      return;
    }
    
    // Check if route name indicates we're in a chat screen
    if (currentRoute?.name === '[id]') {
      return;
    }
    
    // Additional check: look for chat-related routes in the pathname
    if (currentRoute?.pathname && currentRoute.pathname.includes('/chat/')) {
      return;
    }
    
    // Web-specific check: if window location indicates we're in a chat
    if (typeof window !== 'undefined' && window.location && window.location.pathname.includes('/chat/')) {
      return;
    }
    
    // Extra safety check: if the route contains the chat ID in any form
    if (currentRoute?.pathname?.includes(message.chatId) || 
        currentRoute?.key?.includes(message.chatId)) {
      return;
    }
    
    // Check if chat is muted
    let isMuted = false;
    try {
      // Import chatApi dynamically to avoid circular imports
      const { chatApi } = await import('../api/chat');
      const token = this.authToken; // Use stored token directly
      if (token) {
        const response = await chatApi.getMuteStatus(message.chatId, token);
        isMuted = response.isMuted;
      }
    } catch (error) {
      // If we can't check mute status, don't show notification to be safe
      return;
    }
    
    // Don't show notification if chat is muted
    if (isMuted) {
      return;
    }
    notificationService.showMessageNotification({
      senderName: message.senderName || 'Someone',
      message: message.text || 'New message',
      chatId: message.chatId,
      avatar: message.senderAvatar || message.senderName,
      onPress: () => this.navigateToChat(message.chatId, message.senderName),
    });
  }

  showReactionNotification = async (data) => {
    if (!data || !data.chatId || !data.reaction) return;
    
    // Primary check: use explicitly tracked current chat ID
    if (this.currentChatId && data.chatId === this.currentChatId) {
      return;
    }
    
    // Additional primary check: if we have a tracked chat ID and it matches, always skip
    if (this.currentChatId === data.chatId) {
      return;
    }
    
    // Check the socket service from /src/api/socket.ts as well
    try {
      const { socketService: apiSocketService } = await import('../api/socket');
      const apiCurrentChatId = apiSocketService.getCurrentChatId();
      if (apiCurrentChatId && apiCurrentChatId === data.chatId) {
        return;
      }
    } catch (error) {
      // Ignore import errors
    }
    
    // Fallback: Get current route to check if user is in the same chat
    const currentRoute = router.getState?.()?.routes?.slice(-1)?.[0];
    const currentChatId = currentRoute?.params?.id;
    
    // Enhanced check: Don't show notification if user is on any chat screen with this chat ID
    if (currentRoute?.name === '[id]' && currentChatId === data.chatId) {
      return;
    }
    
    // Additional check: Don't show notification if user is in the same chat (route fallback)
    if (data.chatId === currentChatId) {
      return;
    }
    
    // Check if route name indicates we're in a chat screen
    if (currentRoute?.name === '[id]') {
      return;
    }
    
    // Additional check: look for chat-related routes in the pathname
    if (currentRoute?.pathname && currentRoute.pathname.includes('/chat/')) {
      return;
    }
    
    // Extra safety check: if the route contains the chat ID in any form
    if (currentRoute?.pathname?.includes(data.chatId) || 
        currentRoute?.key?.includes(data.chatId)) {
      return;
    }
    
    // Check if chat is muted
    let isMuted = false;
    try {
      const { chatApi } = await import('../api/chat');
      const token = this.authToken; // Use stored token directly
      if (token) {
        const response = await chatApi.getMuteStatus(data.chatId, token);
        isMuted = response.isMuted;
      }
    } catch (error) {
      // If we can't check mute status, don't show notification to be safe
      return;
    }
    
    // Don't show notification if chat is muted
    if (isMuted) {
      return;
    }
    notificationService.showReactionNotification({
      senderName: data.reaction.senderName || 'Someone',
      emoji: data.reaction.emoji,
      message: data.messageText || 'your message',
      chatId: data.chatId,
      avatar: data.reaction.senderName,
      onPress: () => this.navigateToChat(data.chatId, data.reaction.senderName),
    });
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
