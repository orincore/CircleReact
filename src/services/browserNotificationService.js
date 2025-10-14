import { Platform } from 'react-native';

class BrowserNotificationService {
  constructor() {
    this.isSupported = false;
    this.permission = 'default';
    this.isEnabled = false;
    this.notificationQueue = [];
    this.activeNotifications = new Map();
    this.permissionRequested = false;
    
    // Only initialize on web platform
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.initialize();
    }
  }

  initialize() {
    //console.log('🔔 Initializing browser notification service...');
    
    // Check if browser supports notifications
    this.isSupported = 'Notification' in window;
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      this.isEnabled = this.permission === 'granted';
      

      
      // Add visibility change listener for debugging
      document.addEventListener('visibilitychange', () => {
      
      });
      
    } else {
      console.warn('⚠️ Browser notifications not supported');
      
    }
  }

  // Request notification permission
  async requestPermission() {
    //console.log('🔔 Requesting notification permission...');
    this.permissionRequested = true;
    
    if (!this.isSupported) {
      console.error('❌ Browser notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      //console.log('✅ Permission already granted');
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';
      
      
      
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  // Check if notifications can be shown
  canShowNotifications() {
    const isPageHidden = document.visibilityState === 'hidden';
    const hasPermission = this.isSupported && this.isEnabled;
    
    
    
    return hasPermission && isPageHidden;
  }

  // Force show notification (for testing)
  canForceShow() {
    return this.isSupported && this.isEnabled;
  }

  // Core notification display method
  showNotification({ title, body, icon = '/icon-192x192.png', tag, data = {}, onClick }) {
    
    
    // Auto-request permission if not done yet
    if (!this.permissionRequested && this.permission === 'default') {
      //console.log('🔔 Auto-requesting permission...');
      this.requestPermission().then(() => {
        // Retry showing notification after permission
        if (this.canShowNotifications()) {
          //console.log('🔔 Permission granted, retrying notification...');
          this.displayNotification({ title, body, icon, tag, data, onClick });
        } else {
          //console.log('🔕 Still cannot show notification after permission grant');
        }
      });
      return false;
    }
    
    if (!this.canShowNotifications()) {
      
      return false;
    }
    
    //console.log('✅ All conditions met, displaying notification...');
    return this.displayNotification({ title, body, icon, tag, data, onClick });
  }

  // Display the actual notification
  displayNotification({ title, body, icon, tag, data, onClick }) {
    try {
      //console.log('✅ Displaying notification:', title);
      
      const notification = new Notification(title, {
        body,
        icon,
        tag,
        data,
        requireInteraction: false,
        silent: false
      });

      // Store reference
      if (tag) {
        this.activeNotifications.set(tag, notification);
      }

      // Handle click
      notification.onclick = (event) => {
        //console.log('🔔 Notification clicked:', title);
        
        // Focus the window
        if (window) {
          window.focus();
        }
        
        // Call custom onClick handler
        if (onClick) {
          onClick(data);
        }
        
        // Close notification
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      //console.log('✅ Notification displayed successfully:', title);
      return notification;
      
    } catch (error) {
      console.error('❌ Failed to display notification:', error);
      return null;
    }
  }

  // Clear all notifications
  clearAllNotifications() {
    //console.log('🧹 Clearing all notifications...');
    this.activeNotifications.forEach((notification, tag) => {
      try {
        notification.close();
      } catch (error) {
        console.warn('⚠️ Error closing notification:', tag, error);
      }
    });
    this.activeNotifications.clear();
  }

  // Friend request notifications
  showFriendRequestNotification({ senderName, senderId, requestId }) {
    return this.showNotification({
      title: '👥 New Friend Request',
      body: `${senderName} wants to be your friend`,
      icon: '/icon-192x192.png',
      tag: `friend-request-${senderId}`,
      data: { type: 'friend_request', senderId, requestId, senderName },
      onClick: (data) => {
        //console.log('🔔 Friend request notification clicked:', data);
        // Navigate to notifications or friend requests
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Message notifications
  showMessageNotification({ senderName, message, chatId, senderId }) {
    return this.showNotification({
      title: `💬 ${senderName}`,
      body: message,
      icon: '/icon-192x192.png',
      tag: `message-${chatId}`,
      data: { type: 'message', chatId, senderId, senderName },
      onClick: (data) => {
        //console.log('🔔 Message notification clicked:', data);
        // Navigate to chat
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Match notifications
  showMatchNotification({ matchedUserName, matchId }) {
    return this.showNotification({
      title: '💕 New Match!',
      body: `You matched with ${matchedUserName}`,
      icon: '/icon-192x192.png',
      tag: `match-${matchId}`,
      data: { type: 'match', matchId, matchedUserName },
      onClick: (data) => {
        //console.log('🔔 Match notification clicked:', data);
        // Navigate to matches
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Message request notifications
  showMessageRequestNotification({ senderName, senderId, requestId }) {
    return this.showNotification({
      title: '📩 Message Request',
      body: `${senderName} wants to send you a message`,
      icon: '/icon-192x192.png',
      tag: `message-request-${senderId}`,
      data: { type: 'message_request', senderId, requestId, senderName },
      onClick: (data) => {
        //console.log('🔔 Message request notification clicked:', data);
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Friend accepted notifications
  showFriendAcceptedNotification({ friendName, friendId }) {
    return this.showNotification({
      title: '✅ Friend Request Accepted',
      body: `${friendName} accepted your friend request`,
      icon: '/icon-192x192.png',
      tag: `friend-accepted-${friendId}`,
      data: { type: 'friend_accepted', friendId, friendName },
      onClick: (data) => {
        //console.log('🔔 Friend accepted notification clicked:', data);
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Profile visit notifications
  showProfileVisitNotification({ visitorName, visitorId }) {
    //console.log('👀 Showing profile visit notification:', { visitorName, visitorId });
    
    // Validate input parameters
    if (!visitorName || !visitorId) {
      console.error('❌ Invalid profile visit notification data:', { visitorName, visitorId });
      return false;
    }
    
    // Sanitize visitor name for display
    const sanitizedVisitorName = String(visitorName).trim() || 'Someone';
    
    return this.showNotification({
      title: '👀 Profile Visit',
      body: `${sanitizedVisitorName} viewed your profile`,
      icon: '/icon-192x192.png',
      tag: `profile-visit-${visitorId}`,
      data: { 
        type: 'profile_visit', 
        visitorId, 
        visitorName: sanitizedVisitorName,
        timestamp: new Date().toISOString()
      },
      onClick: (data) => {
        //console.log('🔔 Profile visit notification clicked:', data);
        
        // Focus the window
        if (typeof window !== 'undefined') {
          window.focus();
        }
        
        // Optional: Navigate to visitor's profile or notifications
        // This can be enhanced based on app routing requirements
        try {
          // Example: Could navigate to visitor's profile
          // window.location.href = `/profile/${data.visitorId}`;
          
          // Or navigate to notifications page
          // window.location.href = '/notifications';
          
          //console.log('✅ Profile visit notification click handled successfully');
        } catch (error) {
          console.error('❌ Error handling profile visit notification click:', error);
        }
      }
    });
  }

  // Voice call notifications
  showVoiceCallNotification({ callerName, callerId, callId }) {
    return this.showNotification({
      title: '📞 Incoming Voice Call',
      body: `${callerName} is calling you`,
      icon: '/icon-192x192.png',
      tag: `voice_call_${callId}`,
      data: { 
        type: 'voice_call', 
        callerId, 
        callId,
        timestamp: Date.now()
      },
      onClick: () => {
        //console.log('📞 Voice call notification clicked');
        // Focus the window to bring the app to foreground
        window.focus();
        // The call modal should already be handled by the socket listener
      }
    });
  }

  // Reaction notifications
  showReactionNotification({ senderName, emoji, message, chatId, senderId }) {
    return this.showNotification({
      title: `${emoji} ${senderName}`,
      body: `Reacted to: ${message}`,
      icon: '/icon-192x192.png',
      tag: `reaction-${chatId}-${senderId}`,
      data: { type: 'reaction', chatId, senderId, senderName, emoji },
      onClick: (data) => {
        //console.log('🔔 Reaction notification clicked:', data);
        if (typeof window !== 'undefined') {
          window.focus();
        }
      }
    });
  }

  // Force show notification (for testing)
  forceShowNotification({ title, body, icon, tag, data, onClick }) {
    if (!this.canForceShow()) {
      //console.log('🔕 Cannot force show - no permission');
      return false;
    }
    
    return this.displayNotification({ title, body, icon, tag, data, onClick });
  }

  // Get notification status
  getStatus() {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled,
      activeCount: this.activeNotifications.size,
      permissionRequested: this.permissionRequested
    };
  }
}

// Create singleton instance
const browserNotificationService = new BrowserNotificationService();

export default browserNotificationService;
