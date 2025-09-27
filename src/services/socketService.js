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
      console.log('Background message received:', data);
      
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

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('Socket connected for background messaging');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Auto-reconnect with exponential backoff
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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
    
    console.log('Checking notification for message:', { chatId: message.chatId, senderName: message.senderName });
    
    // Primary check: use explicitly tracked current chat ID
    if (this.currentChatId && message.chatId === this.currentChatId) {
      console.log('User is in same chat (tracked), skipping notification');
      return;
    }
    
    // Fallback: Get current route to check if user is in the same chat
    const currentRoute = router.getState?.()?.routes?.slice(-1)?.[0];
    const currentChatId = currentRoute?.params?.id;
    
    console.log('Current route info:', { 
      routeName: currentRoute?.name, 
      currentChatId, 
      trackedChatId: this.currentChatId,
      messageChatId: message.chatId 
    });
    
    // Don't show notification if user is in the same chat
    if (message.chatId === currentChatId) {
      console.log('User is in same chat (route), skipping notification');
      return;
    }
    
    // Additional check: if current route is the chat screen with this chat ID
    if (currentRoute?.name === '[id]' && currentChatId === message.chatId) {
      console.log('User is in chat screen for this conversation, skipping notification');
      return;
    }
    
    // Check if chat is muted
    let isMuted = false;
    try {
      // Import chatApi dynamically to avoid circular imports
      const { chatApi } = await import('../api/chat');
      const token = this.authToken; // Use stored token directly
      if (token) {
        console.log('Checking mute status for chat:', message.chatId);
        const response = await chatApi.getMuteStatus(message.chatId, token);
        isMuted = response.isMuted;
        console.log('Mute status result:', { chatId: message.chatId, isMuted });
      } else {
        console.log('No auth token available for mute check');
      }
    } catch (error) {
      console.error('Failed to check mute status:', error);
      // If we can't check mute status, don't show notification to be safe
      return;
    }
    
    // Don't show notification if chat is muted
    if (isMuted) {
      console.log('Chat is muted, skipping notification');
      return;
    }
    
    console.log('Showing notification for unmuted chat');
    notificationService.showMessageNotification({
      senderName: message.senderName || 'Someone',
      message: message.text || 'New message',
      chatId: message.chatId,
      avatar: message.senderName,
      onPress: () => this.navigateToChat(message.chatId, message.senderName),
    });
  }

  showReactionNotification = async (data) => {
    if (!data || !data.chatId || !data.reaction) return;
    
    console.log('Checking reaction notification:', { chatId: data.chatId, emoji: data.reaction.emoji });
    
    // Primary check: use explicitly tracked current chat ID
    if (this.currentChatId && data.chatId === this.currentChatId) {
      console.log('User is in same chat (tracked), skipping reaction notification');
      return;
    }
    
    // Fallback: Get current route to check if user is in the same chat
    const currentRoute = router.getState?.()?.routes?.slice(-1)?.[0];
    const currentChatId = currentRoute?.params?.id;
    
    console.log('Current route info for reaction:', { 
      routeName: currentRoute?.name, 
      currentChatId, 
      trackedChatId: this.currentChatId,
      reactionChatId: data.chatId 
    });
    
    // Don't show notification if user is in the same chat
    if (data.chatId === currentChatId) {
      console.log('User is in same chat (route), skipping reaction notification');
      return;
    }
    
    // Additional check: if current route is the chat screen with this chat ID
    if (currentRoute?.name === '[id]' && currentChatId === data.chatId) {
      console.log('User is in chat screen for this conversation, skipping reaction notification');
      return;
    }
    
    // Check if chat is muted
    let isMuted = false;
    try {
      const { chatApi } = await import('../api/chat');
      const token = this.authToken; // Use stored token directly
      if (token) {
        console.log('Checking mute status for reaction in chat:', data.chatId);
        const response = await chatApi.getMuteStatus(data.chatId, token);
        isMuted = response.isMuted;
        console.log('Reaction mute status result:', { chatId: data.chatId, isMuted });
      } else {
        console.log('No auth token available for reaction mute check');
      }
    } catch (error) {
      console.error('Failed to check mute status for reaction:', error);
      // If we can't check mute status, don't show notification to be safe
      return;
    }
    
    // Don't show notification if chat is muted
    if (isMuted) {
      console.log('Chat is muted, skipping reaction notification');
      return;
    }
    
    console.log('Showing reaction notification for unmuted chat');
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
    console.log('Set current chat ID:', chatId);
  }

  // Clear current chat ID (called when leaving a chat)
  clearCurrentChatId() {
    console.log('Cleared current chat ID:', this.currentChatId);
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
