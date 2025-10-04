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
  const handleFriendRequestReceived = ({ request, sender }) => {
    console.log('🔔 Friend request received for browser notification:', { request, sender });
    
    const senderName = sender?.first_name 
      ? `${sender.first_name} ${sender.last_name || ''}`.trim()
      : (request.sender?.first_name 
        ? `${request.sender.first_name} ${request.sender.last_name || ''}`.trim()
        : 'Someone');

    browserNotificationService.showFriendRequestNotification({
      senderName,
      senderId: sender?.id || request.sender?.id,
      requestId: request.id
    });
  };

  // Friend request accepted notifications
  const handleFriendRequestAccepted = ({ friendship, friend }) => {
    // Backend sends { friendship, friend } structure
    console.log('🔔 Friend request accepted for browser notification:', { friendship, friend });
    
    const friendName = friend?.first_name 
      ? `${friend.first_name} ${friend.last_name || ''}`.trim()
      : 'Someone';

    browserNotificationService.showFriendAcceptedNotification({
      friendName,
      friendId: friend?.id
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
    
    // If page is visible, trigger the voice call service handler directly
    if (document.visibilityState === 'visible') {
      console.log('📞 Page is visible, triggering voice call service handler');
      
      // Import and trigger voice call service handler
      try {
        const { voiceCallService } = require('@/src/services/VoiceCallService');
        if (voiceCallService && voiceCallService.onIncomingCall) {
          console.log('📞 Triggering voice call service onIncomingCall handler');
          voiceCallService.onIncomingCall({
            callId,
            callerId,
            callerName: callerName || 'Unknown Caller',
            callerAvatar: callerAvatar || ''
          });
        } else {
          console.warn('⚠️ Voice call service or onIncomingCall handler not available');
          
          // Fallback: Try to trigger global voice call handler
          if (window.__voiceCallHandler) {
            console.log('📞 Using global voice call handler fallback');
            window.__voiceCallHandler({
              callId,
              callerId,
              callerName: callerName || 'Unknown Caller',
              callerAvatar: callerAvatar || ''
            });
          } else {
            console.error('❌ No voice call handler available - call will be missed!');
          }
        }
      } catch (error) {
        console.error('❌ Error triggering voice call service:', error);
        
        // Fallback: Try to trigger global voice call handler
        if (window.__voiceCallHandler) {
          console.log('📞 Using global voice call handler fallback after error');
          window.__voiceCallHandler({
            callId,
            callerId,
            callerName: callerName || 'Unknown Caller',
            callerAvatar: callerAvatar || ''
          });
        }
      }
      return;
    }

    // If page is not visible, show browser notification
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
      socketId: socket?.id,
      userId: user?.id,
      hasAuth: !!socket?.handshake?.auth?.token
    });
    
    // Debug: Check if this matches the expected receiver ID
    console.log('🔍 DEBUGGING: Expected receiver ID from backend: 5d73dab8-eb6a-4842-a368-6ddfe0e7b208');
    console.log('🔍 DEBUGGING: Actual user ID from frontend:', user?.id);
    console.log('🔍 DEBUGGING: IDs match:', user?.id === '5d73dab8-eb6a-4842-a368-6ddfe0e7b208');
    
    // Test socket connection by emitting a test event
    if (socket?.connected) {
      console.log('🧪 Testing socket connection...');
      socket.emit('ping');
      
      // Test if we can receive our own events by emitting to ourselves
      console.log('🧪 Testing user room subscription...');
      
      // Add pong listener to verify connection
      socket.on('pong', (data) => {
        console.log('✅ Socket ping/pong successful:', data);
      });
      
      // Test voice call room subscription
      console.log('📞 Testing voice call room subscription for user:', user?.id);
      
      // Emit a test event to see if we're properly in our user room
      console.log('🧪 Emitting test:user-room event with userId:', user?.id);
      socket.emit('test:user-room', { userId: user?.id });
      
      // Also emit a direct test to check socket authentication
      socket.emit('debug:socket-info', { 
        requestedUserId: user?.id,
        socketId: socket?.id,
        timestamp: Date.now()
      });
      
      // Listen for any voice call events to debug
      socket.on('voice:test', (data) => {
        console.log('📞 Voice test event received:', data);
      });
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
