import { Platform } from 'react-native';

class BrowserNotificationService {
  constructor() {
    this.isSupported = false;
    this.permission = 'default';
    this.isEnabled = false;
    this.notificationQueue = [];
    this.activeNotifications = new Map();
    
    // Only initialize on web platform
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.initialize();
    }
  }

  initialize() {
    console.log('🔔 Initializing browser notification service...');
    
    // Check if browser supports notifications
    this.isSupported = 'Notification' in window;
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      this.isEnabled = this.permission === 'granted';
      
      console.log('🔔 Browser notifications initialized:', {
        supported: this.isSupported,
        permission: this.permission,
        enabled: this.isEnabled,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        protocol: window.location.protocol,
        host: window.location.host
      });

      // Log additional debug info
      console.log('🔔 Notification API details:', {
        NotificationConstructor: typeof Notification,
        maxActions: Notification.maxActions || 'undefined',
        permission: Notification.permission,
        requestPermission: typeof Notification.requestPermission
      });
    } else {
      console.warn('⚠️ Browser notifications not supported');
      console.log('🔍 Debug info:', {
        hasWindow: typeof window !== 'undefined',
        hasNotification: 'Notification' in window,
        userAgent: navigator.userAgent
      });
    }
  }

  // Request notification permission
  async requestPermission() {
    console.log('🔔 Requesting notification permission...');
    
    if (!this.isSupported) {
      const error = 'Browser notifications not supported';
      console.error('❌', error);
      throw new Error(error);
    }

    if (this.permission === 'granted') {
      console.log('✅ Permission already granted');
      return true;
    }

    try {
      console.log('🔔 Current permission status:', this.permission);
      
      // Check if requestPermission is available
      if (typeof Notification.requestPermission !== 'function') {
        throw new Error('Notification.requestPermission is not available');
      }
      
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';
      
      console.log('🔔 Permission request result:', {
        permission,
        enabled: this.isEnabled,
        timestamp: new Date().toISOString()
      });
      
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', {
        error: error.message,
        stack: error.stack,
        permission: this.permission,
        supported: this.isSupported
      });
      return false;
    }
  }

  // Check if notifications are enabled
  canShowNotifications() {
    const canShow = this.isSupported && this.isEnabled && document.visibilityState === 'hidden';
    
    console.log('🔔 Can show notifications check:', {
      supported: this.isSupported,
      enabled: this.isEnabled,
      pageHidden: document.visibilityState === 'hidden',
      visibilityState: document.visibilityState,
      canShow,
      timestamp: new Date().toISOString()
    });
    
    return canShow;
  }

  // Show browser notification
  showNotification({ title, body, icon, tag, data, onClick, requiresInteraction = true }) {
    console.log('🔔 Attempting to show notification:', {
      title,
      body: body?.substring(0, 50) + '...',
      tag,
      timestamp: new Date().toISOString()
    });

    if (!this.canShowNotifications()) {
      console.log('🔕 Skipping notification - conditions not met');
      return null;
    }

    try {
      // Close existing notification with same tag
      if (tag && this.activeNotifications.has(tag)) {
        console.log('🔔 Closing existing notification with tag:', tag);
        this.activeNotifications.get(tag).close();
      }

      console.log('🔔 Creating notification with options:', {
        title,
        body,
        icon: icon || '/favicon.ico',
        tag,
        requiresInteraction,
        silent: false
      });

      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag,
        data,
        requiresInteraction,
        silent: false,
        badge: '/favicon.ico'
      });

      // Store active notification
      if (tag) {
        this.activeNotifications.set(tag, notification);
      }

      // Handle events
      notification.onclick = (event) => {
        console.log('🔔 Notification clicked:', title);
        event.preventDefault();
        window.focus(); // Focus the browser window
        
        if (onClick) {
          onClick(data);
        }
        
        notification.close();
        if (tag) {
          this.activeNotifications.delete(tag);
        }
      };

      notification.onshow = () => {
        console.log('🔔 Notification shown successfully:', title);
      };

      notification.onerror = (error) => {
        console.error('❌ Notification error:', error);
      };

      notification.onclose = () => {
        console.log('🔔 Notification closed:', title);
        if (tag) {
          this.activeNotifications.delete(tag);
        }
      };

      // Auto-close after delay
      setTimeout(() => {
        console.log('🔔 Auto-closing notification:', title);
        notification.close();
        if (tag) {
          this.activeNotifications.delete(tag);
        }
      }, 8000);

      console.log('✅ Browser notification created successfully:', title);
      return notification;
    } catch (error) {
      console.error('❌ Failed to show browser notification:', {
        error: error.message,
        stack: error.stack,
        title,
        supported: this.isSupported,
        enabled: this.isEnabled,
        permission: this.permission
      });
      return null;
    }
  }

  // Friend request notifications
  showFriendRequestNotification({ senderName, senderId, requestId }) {
    return this.showNotification({
      title: '👥 New Friend Request',
      body: `${senderName} wants to be your friend`,
      tag: `friend_request_${requestId}`,
      data: { type: 'friend_request', senderId, requestId },
      onClick: (data) => {
        // Navigate to notifications or match page
        window.location.hash = '/secure/notifications';
      }
    });
  }

  // Message notifications
  showMessageNotification({ senderName, message, chatId, senderId }) {
    const truncatedMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
    
    return this.showNotification({
      title: `💬 ${senderName}`,
      body: truncatedMessage,
      tag: `message_${chatId}`,
      data: { type: 'message', chatId, senderId },
      onClick: (data) => {
        // Navigate to chat
        window.location.hash = `/secure/chat/${chatId}`;
      }
    });
  }

  // Match notifications
  showMatchNotification({ matchedUserName, matchId }) {
    return this.showNotification({
      title: '💖 New Match!',
      body: `You matched with ${matchedUserName}`,
      tag: `match_${matchId}`,
      data: { type: 'match', matchId },
      onClick: (data) => {
        // Navigate to match page
        window.location.hash = '/secure/match';
      }
    });
  }

  // Message request notifications
  showMessageRequestNotification({ senderName, senderId, requestId }) {
    return this.showNotification({
      title: '📩 Message Request',
      body: `${senderName} wants to send you a message`,
      tag: `message_request_${requestId}`,
      data: { type: 'message_request', senderId, requestId },
      onClick: (data) => {
        // Navigate to notifications
        window.location.hash = '/secure/notifications';
      }
    });
  }

  // Friend request accepted notifications
  showFriendRequestAcceptedNotification({ friendName, friendId }) {
    return this.showNotification({
      title: '✅ Friend Request Accepted',
      body: `${friendName} accepted your friend request`,
      tag: `friend_accepted_${friendId}`,
      data: { type: 'friend_accepted', friendId },
      onClick: (data) => {
        // Navigate to chat with new friend
        window.location.hash = `/secure/chat/${friendId}`;
      }
    });
  }

  // Reaction notifications
  showReactionNotification({ senderName, emoji, message, chatId, senderId }) {
    const truncatedMessage = message.length > 30 ? message.substring(0, 30) + '...' : message;
    
    return this.showNotification({
      title: `${emoji} ${senderName}`,
      body: `Reacted to: "${truncatedMessage}"`,
      tag: `reaction_${chatId}_${Date.now()}`,
      data: { type: 'reaction', chatId, senderId },
      onClick: (data) => {
        // Navigate to chat
        window.location.hash = `/secure/chat/${chatId}`;
      }
    });
  }

  // Generic notification
  showGenericNotification({ title, body, type, data, onClick }) {
    return this.showNotification({
      title,
      body,
      tag: `generic_${type}_${Date.now()}`,
      data: { type, ...data },
      onClick
    });
  }

  // Clear all notifications
  clearAllNotifications() {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();
    console.log('🔕 All browser notifications cleared');
  }

  // Force show notification (for testing - ignores page visibility)
  forceShowNotification({ title, body, icon, tag, data, onClick }) {
    console.log('🧪 Force showing notification for testing:', title);
    
    if (!this.isSupported) {
      console.error('❌ Cannot force show - browser not supported');
      return null;
    }

    if (this.permission !== 'granted') {
      console.error('❌ Cannot force show - permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag,
        data,
        requiresInteraction: false,
        silent: false
      });

      notification.onclick = (event) => {
        console.log('🔔 Force notification clicked:', title);
        event.preventDefault();
        window.focus();
        
        if (onClick) {
          onClick(data);
        }
        
        notification.close();
      };

      // Auto-close after 5 seconds for testing
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('✅ Force notification shown successfully:', title);
      return notification;
    } catch (error) {
      console.error('❌ Failed to force show notification:', error);
      return null;
    }
  }

  // Get notification status
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled,
      activeCount: this.activeNotifications.size
    };
  }
}

// Create singleton instance
const browserNotificationService = new BrowserNotificationService();

export default browserNotificationService;
