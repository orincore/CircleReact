/**
 * Global Unread Count Service
 * Manages unread message counts across the app with zero-delay updates
 */

class UnreadCountService {
  constructor() {
    this.listeners = new Set();
    this.chatUnreadCounts = {};
    this.totalUnreadCount = 0;
  }

  // Subscribe to unread count changes
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback({
      chatUnreadCounts: { ...this.chatUnreadCounts },
      totalUnreadCount: this.totalUnreadCount
    });
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners of changes
  notifyListeners() {
    const data = {
      chatUnreadCounts: { ...this.chatUnreadCounts },
      totalUnreadCount: this.totalUnreadCount
    };
    
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in unread count listener:', error);
      }
    });
  }

  // Initialize counts from API response
  initializeCounts(inboxData) {
    this.chatUnreadCounts = {};
    
    if (Array.isArray(inboxData)) {
      inboxData.forEach(item => {
        if (item.chat && item.chat.id && item.unreadCount > 0) {
          this.chatUnreadCounts[item.chat.id] = item.unreadCount;
        }
      });
    }
    
    this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
    this.notifyListeners();
  }

  // Clear unread count for a specific chat (called when messages are read)
  clearChatUnreadCount(chatId) {
    if (this.chatUnreadCounts[chatId]) {
      delete this.chatUnreadCounts[chatId];
      this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
      this.notifyListeners();
    }
  }

  // Reduce unread count for a specific chat by a certain amount
  reduceChatUnreadCount(chatId, reduceBy) {
    if (this.chatUnreadCounts[chatId]) {
      const currentCount = this.chatUnreadCounts[chatId];
      const newCount = Math.max(0, currentCount - reduceBy);
      
      if (newCount === 0) {
        delete this.chatUnreadCounts[chatId];
      } else {
        this.chatUnreadCounts[chatId] = newCount;
      }
      
      this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
      this.notifyListeners();
    }
  }

  // Set unread count for a specific chat (from server updates)
  setChatUnreadCount(chatId, count) {
    if (count === 0) {
      if (this.chatUnreadCounts[chatId]) {
        delete this.chatUnreadCounts[chatId];
      }
    } else {
      this.chatUnreadCounts[chatId] = count;
    }
    
    this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
    this.notifyListeners();
  }

  // Increment unread count for a chat (when new message arrives)
  incrementChatUnreadCount(chatId) {
    this.chatUnreadCounts[chatId] = (this.chatUnreadCounts[chatId] || 0) + 1;
    this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
    this.notifyListeners();
  }

  // Get current counts
  getCurrentCounts() {
    return {
      chatUnreadCounts: { ...this.chatUnreadCounts },
      totalUnreadCount: this.totalUnreadCount
    };
  }
}

// Export singleton instance
export const unreadCountService = new UnreadCountService();
