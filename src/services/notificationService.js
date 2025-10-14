// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event, listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
}

class NotificationService extends SimpleEventEmitter {
  constructor() {
    super();
    this.notifications = [];
    this.maxNotifications = 3;
    this.idCounter = 0;
  }

  showNotification(notification) {
    // Check for duplicate notifications (same chatId and type within last 2 seconds)
    const now = Date.now();
    const isDuplicate = this.notifications.some(existing => 
      existing.chatId === notification.chatId &&
      existing.type === notification.type &&
      (now - existing.timestamp) < 2000 // Within 2 seconds
    );
    
    if (isDuplicate) {
      //console.log('Preventing duplicate notification');
      return null;
    }

    // Generate unique ID using timestamp + counter
    this.idCounter++;
    const id = `${Date.now()}-${this.idCounter}`;
    const newNotification = {
      id,
      ...notification,
      timestamp: Date.now(),
    };

    // Remove oldest notification if we have too many
    if (this.notifications.length >= this.maxNotifications) {
      this.notifications.shift();
    }

    this.notifications.push(newNotification);
    this.emit('notification:show', newNotification);

    return id;
  }

  hideNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit('notification:hide', id);
  }

  clearAll() {
    this.notifications = [];
    this.emit('notification:clear');
  }

  // Specific notification types
  showMessageNotification({ senderName, message, chatId, avatar, onPress }) {
    return this.showNotification({
      type: 'message',
      title: senderName,
      message: message,
      avatar: avatar,
      chatId: chatId,
      onPress: onPress,
      duration: 5000,
    });
  }

  showReactionNotification({ senderName, emoji, message, chatId, avatar, onPress }) {
    return this.showNotification({
      type: 'reaction',
      title: `${senderName} reacted ${emoji}`,
      message: `to: ${message}`,
      avatar: avatar,
      chatId: chatId,
      onPress: onPress,
      duration: 4000,
    });
  }

  // Check if we should show notification (don't show if user is in the same chat)
  shouldShowNotification(chatId, currentChatId) {
    return chatId !== currentChatId;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
