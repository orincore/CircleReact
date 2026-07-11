/**
 * Global Unread Count Service
 * Manages unread message counts across the app with zero-delay updates
 */

// How long a locally-cleared chat is protected from being reverted by a
// REST inbox snapshot (initializeCounts). Read receipts are inserted and
// their cache invalidated asynchronously on the server; a poll/AppState/
// reconnect refresh landing in that short window can still return the
// pre-read count, which would otherwise silently resurrect a badge the
// user just cleared by opening the chat.
const CLEAR_GRACE_MS = 10000;

class UnreadCountService {
  constructor() {
    this.listeners = new Set();
    this.chatUnreadCounts = {};
    this.totalUnreadCount = 0;
    this.recentlyClearedAt = {};
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
    const now = Date.now();
    const next = {};

    if (Array.isArray(inboxData)) {
      inboxData.forEach(item => {
        const chatId = item.chat && item.chat.id;
        if (!chatId) return;
        const clearedAt = this.recentlyClearedAt[chatId];
        if (clearedAt && now - clearedAt < CLEAR_GRACE_MS) {
          // Trust the local clear over a REST snapshot that may have been
          // served just before the server-side cache invalidation landed.
          return;
        }
        if (item.unreadCount > 0) {
          next[chatId] = item.unreadCount;
        }
      });
    }

    this.chatUnreadCounts = next;
    this.totalUnreadCount = Object.values(this.chatUnreadCounts).reduce((sum, count) => sum + count, 0);
    this.notifyListeners();
  }

  // Clear unread count for a specific chat (called when messages are read)
  clearChatUnreadCount(chatId) {
    this.recentlyClearedAt[chatId] = Date.now();
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
        this.recentlyClearedAt[chatId] = Date.now();
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
      this.recentlyClearedAt[chatId] = Date.now();
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
