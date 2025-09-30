import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, socketService } from '@/src/api/socket';
import browserNotificationService from '../services/browserNotificationService';

export default function useBrowserNotifications() {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const currentChatIdRef = useRef(null);
  const listenersSetupRef = useRef(false);

  // Track current chat to avoid notifications for active chat
  const setCurrentChatId = (chatId) => {
    currentChatIdRef.current = chatId;
  };

  // Main socket initialization effect
  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web' || !token || !user) {
      console.log('🔔 Skipping browser notifications:', { 
        platform: Platform.OS, 
        hasToken: !!token, 
        hasUser: !!user 
      });
      return;
    }

    console.log('🔔 Initializing browser notifications for user:', user.id);
    console.log('🔔 User details for notifications:', {
      id: user.id,
      email: user.email,
      username: user.username,
      token: !!token
    });

    // Enhanced socket connection with retry logic
    const initializeSocket = async () => {
      try {
        const socket = getSocket(token);
        socketRef.current = socket;
        
        console.log('🔌 Socket initialization status:', {
          connected: socket?.connected,
          id: socket?.id,
          hasToken: !!token,
          userId: user?.id
        });
        
        // Set up listeners immediately, even if not connected yet
        setupNotificationListeners(socket);
        
        // If not connected, wait for connection
        if (!socket.connected) {
          console.log('🔄 Waiting for socket connection...');
          
          // Listen for connection event
          socket.on('connect', () => {
            console.log('✅ Socket connected for browser notifications');
            // Re-setup listeners after connection
            setupNotificationListeners(socket);
          });
          
          // Also wait with timeout
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('⚠️ Socket connection timeout for notifications');
              resolve(socket); // Continue anyway
            }, 5000);
            
            const checkConnection = () => {
              if (socket.connected) {
                clearTimeout(timeout);
                resolve(socket);
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });
        }
        
        console.log('✅ Socket ready for browser notifications');
        
      } catch (error) {
        console.error('❌ Error initializing socket for notifications:', error);
        // Retry after delay
        setTimeout(initializeSocket, 2000);
      }
    };

    initializeSocket();

    // Cleanup function
    return () => {
      console.log('🔔 Cleaning up browser notifications...');
      if (socketRef.current) {
        cleanupNotificationListeners(socketRef.current);
      }
      listenersSetupRef.current = false;
    };
  }, [token, user]);

  // Clear notifications when app becomes visible
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear notifications when user returns to the app
        setTimeout(() => {
          browserNotificationService.clearAllNotifications();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Setup notification listeners
  const setupNotificationListeners = (socket) => {
    if (listenersSetupRef.current) return; // Prevent duplicate setup
    
    console.log('🔔 Setting up notification listeners...');
    console.log('🔔 Using same socket as NotificationPanel:', {
      connected: socket?.connected,
      id: socket?.id,
      sameAsPanel: true
    });
    
    // Clean up existing listeners first
    cleanupNotificationListeners(socket);
    
    // Register event listeners
    registerEventListeners(socket);
    listenersSetupRef.current = true;
  };

  // Cleanup notification listeners
  const cleanupNotificationListeners = (socket) => {
    if (!socket) return;
    
    console.log('🧹 Cleaning up notification listeners...');
    socket.off('notification:new', handleGenericNotification);
    socket.off('friend:request:received', handleFriendRequestReceived);
    socket.off('friend:request:accepted', handleFriendRequestAccepted);
    socket.off('chat:message:background', handleMessageReceived);
    socket.off('message:request:received', handleMessageRequestReceived);
    socket.off('matchmaking:proposal', handleMatchFound);
    socket.off('chat:reaction:received', handleReactionReceived);
    socket.off('voice:incoming-call', handleIncomingVoiceCall);
  };

  // Generic notification handler for all notification types
  const handleGenericNotification = ({ notification }) => {
    console.log('🔔 Generic notification received for browser:', notification);
    console.log('🔔 Notification details:', {
      type: notification?.type,
      sender: notification?.sender,
      title: notification?.title,
      message: notification?.message,
      timestamp: new Date().toISOString()
    });
    
    if (!notification) {
      console.error('❌ No notification data received');
      return;
    }
    
    const senderName = notification.sender?.first_name 
      ? `${notification.sender.first_name} ${notification.sender.last_name || ''}`.trim()
      : notification.sender?.username || 'Someone';
    
    console.log('👤 Extracted sender name:', senderName);
    
    // Handle different notification types
    switch (notification.type) {
      case 'friend_request':
        browserNotificationService.showFriendRequestNotification({
          senderName,
          senderId: notification.sender_id,
          requestId: notification.data?.requestId
        });
        break;
        
      case 'message_request':
        browserNotificationService.showMessageRequestNotification({
          senderName,
          senderId: notification.sender_id,
          requestId: notification.data?.requestId
        });
        break;
        
      case 'friend_request_accepted':
        browserNotificationService.showFriendAcceptedNotification({
          friendName: senderName,
          friendId: notification.sender_id
        });
        break;
        
      case 'new_match':
        browserNotificationService.showMatchNotification({
          matchedUserName: senderName,
          matchId: notification.sender_id
        });
        break;
        
      case 'profile_visit':
        console.log('👀 Processing profile visit notification:', {
          senderName,
          senderId: notification.sender_id,
          notificationType: notification.type
        });
        const result = browserNotificationService.showProfileVisitNotification({
          visitorName: senderName,
          visitorId: notification.sender_id
        });
        console.log('👀 Profile visit notification result:', result);
        break;
        
      default:
        console.log('🔔 Unknown notification type for browser notification:', notification.type);
    }
  };

  // Friend request notifications
  const handleFriendRequestReceived = ({ request }) => {
    console.log('🔔 Friend request received for browser notification:', request);
    
    const senderName = request.sender?.first_name 
      ? `${request.sender.first_name} ${request.sender.last_name || ''}`.trim()
      : 'Someone';

    browserNotificationService.showFriendRequestNotification({
      senderName,
      senderId: request.sender?.id,
      requestId: request.id
    });
  };

  // Friend request accepted notifications
  const handleFriendRequestAccepted = ({ request, acceptedBy }) => {
    console.log('🔔 Friend request accepted for browser notification:', { request, acceptedBy });
    
    const friendName = acceptedBy?.first_name 
      ? `${acceptedBy.first_name} ${acceptedBy.last_name || ''}`.trim()
      : 'Someone';

    browserNotificationService.showFriendAcceptedNotification({
      friendName,
      friendId: acceptedBy?.id
    });
  };

  // Message notifications
  const handleMessageReceived = ({ message }) => {
    console.log('🔔 Message received for browser notification:', { message });
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === message.chatId) {
      console.log('🔕 Skipping message notification - user in active chat');
      return;
    }

    const senderName = message.senderName || 'Someone';

    browserNotificationService.showMessageNotification({
      senderName,
      message: message.text || 'New message',
      chatId: message.chatId,
      senderId: message.senderId
    });
  };

  // Message request notifications
  const handleMessageRequestReceived = ({ sender_id, receiver_id, requestId }) => {
    console.log('🔔 Message request received for browser notification:', { sender_id, requestId });
    
    browserNotificationService.showMessageRequestNotification({
      senderName: 'Someone',
      senderId: sender_id,
      requestId
    });
  };

  // Match notifications
  const handleMatchFound = ({ other }) => {
    console.log('🔔 Match found for browser notification:', other);
    
    const matchedUserName = other?.first_name 
      ? `${other.first_name} ${other.last_name || ''}`.trim()
      : 'Someone';

    browserNotificationService.showMatchNotification({
      matchedUserName,
      matchId: other?.id
    });
  };

  // Reaction notifications
  const handleReactionReceived = ({ reaction, message, sender, chatId }) => {
    console.log('🔔 Reaction received for browser notification:', { reaction, message, sender });
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === chatId) {
      console.log('🔕 Skipping reaction notification - user in active chat');
      return;
    }

    const senderName = sender?.first_name 
      ? `${sender.first_name} ${sender.last_name || ''}`.trim()
      : sender?.username || 'Someone';

    browserNotificationService.showReactionNotification({
      senderName,
      emoji: reaction.emoji || '👍',
      message: message.content || message.text || 'a message',
      chatId,
      senderId: sender?.id
    });
  };

  // Voice call notifications
  const handleIncomingVoiceCall = ({ callId, callerId, callerName, callerAvatar }) => {
    console.log('📞 Incoming voice call for browser notification:', { callId, callerId, callerName });
    
    // Only show notification if page is not visible (user is not actively using the app)
    if (document.visibilityState === 'visible') {
      console.log('📞 Page is visible, not showing voice call notification');
      return;
    }

    browserNotificationService.showVoiceCallNotification({
      callerName: callerName || 'Someone',
      callerId,
      callId
    });
  };

  // Register event listeners function
  const registerEventListeners = (socket) => {
    console.log('🔔 Registering notification event listeners...');
    console.log('🔔 Socket details:', {
      connected: socket?.connected,
      id: socket?.id,
      userId: user?.id,
      hasAuth: !!socket?.handshake?.auth?.token
    });
    
    // Test socket connection by emitting a test event
    if (socket?.connected) {
      console.log('🧪 Testing socket connection...');
      socket.emit('ping');
      
      // Test if we can receive our own events by emitting to ourselves
      console.log('🧪 Testing user room subscription...');
      if (user?.id) {
        // This should help us verify if the socket is properly joined to the user's room
        console.log('🔔 Socket should be listening for events to user:', user.id);
        
        // Add a test listener for any events to this user
        socket.on('test:user:event', (data) => {
          console.log('✅ Received test user event:', data);
        });
      }
    }
    
    // Generic notification listener (unified system) - SAME AS NOTIFICATION PANEL
    socket.on('notification:new', ({ notification }) => {
      console.log('🔔 RAW notification:new event received (same as panel):', { notification });
      console.log('🔔 Socket connection status:', {
        connected: socket?.connected,
        id: socket?.id,
        timestamp: new Date().toISOString()
      });
      // Handle the notification object directly (same format as NotificationPanel)
      handleGenericNotification({ notification });
    });
    
    // Add a test listener to see if ANY events are coming through
    socket.onAny((eventName, ...args) => {
      if (eventName.includes('notification') || eventName.includes('profile') || eventName.includes('test')) {
        console.log('🔔 ANY socket event received:', eventName, args);
      }
    });
    
    // Add a specific test to see if we can receive events at all
    socket.on('ping', () => {
      console.log('🔔 Received ping response - socket is receiving events');
    });
    
    socket.on('friend:request:received', (data) => {
      console.log('🔔 RAW friend:request:received event:', data);
      handleFriendRequestReceived(data);
    });

    socket.on('friend:request:accepted', (data) => {
      console.log('🔔 RAW friend:request:accepted event:', data);
      handleFriendRequestAccepted(data);
    });

    socket.on('chat:message:background', (data) => {
      console.log('🔔 RAW chat:message:background event:', data);
      handleMessageReceived(data);
    });

    socket.on('message:request:received', (data) => {
      console.log('🔔 RAW message:request:received event:', data);
      handleMessageRequestReceived(data);
    });

    socket.on('matchmaking:proposal', (data) => {
      console.log('🔔 RAW matchmaking:proposal event:', data);
      handleMatchFound(data);
    });

    socket.on('chat:reaction:received', (data) => {
      console.log('🔔 RAW chat:reaction:received event:', data);
      handleReactionReceived(data);
    });

    socket.on('voice:incoming-call', (data) => {
      console.log('🔔 RAW voice:incoming-call event:', data);
      handleIncomingVoiceCall(data);
    });
  };

  return {
    setCurrentChatId,
    notificationService: browserNotificationService
  };
}
