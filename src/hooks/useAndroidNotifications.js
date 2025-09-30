import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';
import androidNotificationService from '@/src/services/AndroidNotificationService';

export default function useAndroidNotifications() {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const currentChatIdRef = useRef(null);
  const listenersSetupRef = useRef(false);

  // Track current chat to avoid notifications for active chat
  const setCurrentChatId = (chatId) => {
    currentChatIdRef.current = chatId;
  };

  // Main initialization effect
  useEffect(() => {
    // Only run on mobile platforms (not web)
    if (Platform.OS === 'web' || !token || !user) {
      console.log('🔔 Skipping Android notifications:', { 
        platform: Platform.OS, 
        hasToken: !!token, 
        hasUser: !!user 
      });
      return;
    }

    console.log('🔔 Initializing Android notifications for user:', user.id);

    // Initialize socket and set up listeners
    const initializeSocket = async () => {
      try {
        const socket = getSocket(token);
        socketRef.current = socket;
        
        console.log('🔌 Socket initialization status for Android notifications:', {
          connected: socket?.connected,
          id: socket?.id,
          hasToken: !!token,
          userId: user?.id
        });
        
        // Set up listeners
        setupNotificationListeners(socket);
        
        // Wait for connection if not connected
        if (!socket.connected) {
          console.log('🔄 Waiting for socket connection...');
          
          socket.on('connect', () => {
            console.log('✅ Socket connected for Android notifications');
            setupNotificationListeners(socket);
          });
        }
        
        console.log('✅ Socket ready for Android notifications');
        
      } catch (error) {
        console.error('❌ Error initializing socket for Android notifications:', error);
        // Retry after delay
        setTimeout(initializeSocket, 2000);
      }
    };

    initializeSocket();

    // Cleanup function
    return () => {
      console.log('🔔 Cleaning up Android notifications...');
      if (socketRef.current) {
        cleanupNotificationListeners(socketRef.current);
      }
      listenersSetupRef.current = false;
    };
  }, [token, user]);

  // Setup notification listeners
  const setupNotificationListeners = (socket) => {
    if (listenersSetupRef.current) return; // Prevent duplicate setup
    
    console.log('🔔 Setting up Android notification listeners...');
    
    // Clean up existing listeners first
    cleanupNotificationListeners(socket);
    
    // Register event listeners
    registerEventListeners(socket);
    listenersSetupRef.current = true;
  };

  // Cleanup notification listeners
  const cleanupNotificationListeners = (socket) => {
    if (!socket) return;
    
    console.log('🧹 Cleaning up Android notification listeners...');
    socket.off('notification:new', handleGenericNotification);
    socket.off('friend:request:received', handleFriendRequestReceived);
    socket.off('friend:request:accepted', handleFriendRequestAccepted);
    socket.off('chat:message:background', handleMessageReceived);
    socket.off('message:request:received', handleMessageRequestReceived);
    socket.off('matchmaking:proposal', handleMatchFound);
    socket.off('chat:reaction:received', handleReactionReceived);
    socket.off('voice:incoming-call', handleIncomingVoiceCall);
    socket.off('activity:user_joined', handleUserJoinedActivity);
    socket.off('activity:friends_connected', handleFriendsConnectedActivity);
    socket.off('activity:user_matched', handleUserMatchedActivity);
    socket.off('activity:location_updated', handleLocationUpdatedActivity);
    socket.off('activity:interest_updated', handleInterestUpdatedActivity);
  };

  // Generic notification handler
  const handleGenericNotification = ({ notification }) => {
    console.log('🔔 Generic notification received for Android:', notification);
    
    if (!notification) {
      console.error('❌ No notification data received');
      return;
    }
    
    const senderName = notification.sender?.first_name 
      ? `${notification.sender.first_name} ${notification.sender.last_name || ''}`.trim()
      : notification.sender?.username || 'Someone';
    
    // Handle different notification types
    switch (notification.type) {
      case 'friend_request':
        androidNotificationService.showFriendRequestNotification({
          senderName,
          senderId: notification.sender_id,
          requestId: notification.data?.requestId
        });
        break;
        
      case 'message_request':
        androidNotificationService.showMessageNotification({
          senderName,
          message: 'Wants to send you a message',
          chatId: null,
          senderId: notification.sender_id
        });
        break;
        
      case 'friend_request_accepted':
        androidNotificationService.showFriendRequestNotification({
          senderName: `${senderName} accepted your friend request`,
          senderId: notification.sender_id,
          requestId: null
        });
        break;
        
      case 'new_match':
        androidNotificationService.showMatchNotification({
          matchedUserName: senderName,
          matchId: notification.sender_id
        });
        break;
        
      case 'profile_visit':
        androidNotificationService.showProfileVisitNotification({
          visitorName: senderName,
          visitorId: notification.sender_id
        });
        break;
        
      default:
        console.log('🔔 Unknown notification type for Android notification:', notification.type);
    }
  };

  // Friend request notifications
  const handleFriendRequestReceived = ({ request }) => {
    console.log('🔔 Friend request received for Android notification:', request);
    
    const senderName = request.sender?.first_name 
      ? `${request.sender.first_name} ${request.sender.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showFriendRequestNotification({
      senderName,
      senderId: request.sender_id,
      requestId: request.id
    });
  };

  // Friend request accepted notifications
  const handleFriendRequestAccepted = ({ request }) => {
    console.log('🔔 Friend request accepted for Android notification:', request);
    
    const acceptedByName = request.acceptedBy?.first_name 
      ? `${request.acceptedBy.first_name} ${request.acceptedBy.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showFriendRequestNotification({
      senderName: `${acceptedByName} accepted your friend request`,
      senderId: request.acceptedBy?.id,
      requestId: request.id
    });
  };

  // Message notifications
  const handleMessageReceived = ({ message }) => {
    console.log('🔔 Message received for Android notification:', message);
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === message.chatId) {
      console.log('🔔 User is in active chat, not showing notification');
      return;
    }

    androidNotificationService.showMessageNotification({
      senderName: message.senderName || 'Someone',
      message: message.content || message.text || 'New message',
      chatId: message.chatId,
      senderId: message.senderId
    });
  };

  // Message request notifications
  const handleMessageRequestReceived = ({ request }) => {
    console.log('🔔 Message request received for Android notification:', request);
    
    const senderName = request.sender?.first_name 
      ? `${request.sender.first_name} ${request.sender.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showMessageNotification({
      senderName,
      message: 'Wants to send you a message',
      chatId: null,
      senderId: request.sender_id
    });
  };

  // Match notifications
  const handleMatchFound = ({ other }) => {
    console.log('🔔 Match found for Android notification:', other);
    
    const matchedUserName = other?.first_name 
      ? `${other.first_name} ${other.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showMatchNotification({
      matchedUserName,
      matchId: other?.id
    });
  };

  // Reaction notifications
  const handleReactionReceived = ({ reaction, message, sender, chatId }) => {
    console.log('🔔 Reaction received for Android notification:', { reaction, message, sender });
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === chatId) {
      console.log('🔔 User is in active chat, not showing reaction notification');
      return;
    }

    const senderName = sender?.first_name 
      ? `${sender.first_name} ${sender.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showMessageNotification({
      senderName: `${senderName} reacted ${reaction.emoji || '👍'}`,
      message: `to: ${message.content || message.text || 'your message'}`,
      chatId,
      senderId: sender?.id
    });
  };

  // Voice call notifications
  const handleIncomingVoiceCall = ({ callId, callerId, callerName, callerAvatar }) => {
    console.log('📞 Incoming voice call for Android notification:', { callId, callerId, callerName });

    androidNotificationService.showVoiceCallNotification({
      callerName: callerName || 'Someone',
      callerId,
      callId
    });
  };

  // Activity notifications
  const handleUserJoinedActivity = (activity) => {
    console.log('🔔 User joined activity for Android notification:', activity);
    
    androidNotificationService.showUserJoinedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      location: activity.data.location
    });
  };

  const handleFriendsConnectedActivity = (activity) => {
    console.log('🔔 Friends connected activity for Android notification:', activity);
    
    androidNotificationService.showFriendsConnectedNotification({
      user1Name: activity.data.user1_name,
      user2Name: activity.data.user2_name,
      user1Id: activity.data.user1_id,
      user2Id: activity.data.user2_id
    });
  };

  const handleUserMatchedActivity = (activity) => {
    console.log('🔔 User matched activity for Android notification:', activity);
    
    androidNotificationService.showUserMatchedNotification({
      user1Name: activity.data.user1_name,
      user2Name: activity.data.user2_name,
      user1Id: activity.data.user1_id,
      user2Id: activity.data.user2_id
    });
  };

  const handleLocationUpdatedActivity = (activity) => {
    console.log('🔔 Location updated activity for Android notification:', activity);
    
    androidNotificationService.showLocationUpdatedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      location: activity.data.location
    });
  };

  const handleInterestUpdatedActivity = (activity) => {
    console.log('🔔 Interest updated activity for Android notification:', activity);
    
    androidNotificationService.showInterestUpdatedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      interests: activity.data.interests
    });
  };

  // Register event listeners
  const registerEventListeners = (socket) => {
    console.log('🔔 Registering Android notification event listeners...');
    
    // Generic notification listener
    socket.on('notification:new', ({ notification }) => {
      console.log('🔔 RAW notification:new event received (Android):', { notification });
      handleGenericNotification({ notification });
    });
    
    // Specific event listeners
    socket.on('friend:request:received', (data) => {
      console.log('🔔 RAW friend:request:received event (Android):', data);
      handleFriendRequestReceived(data);
    });

    socket.on('friend:request:accepted', (data) => {
      console.log('🔔 RAW friend:request:accepted event (Android):', data);
      handleFriendRequestAccepted(data);
    });

    socket.on('chat:message:background', (data) => {
      console.log('🔔 RAW chat:message:background event (Android):', data);
      handleMessageReceived(data);
    });

    socket.on('message:request:received', (data) => {
      console.log('🔔 RAW message:request:received event (Android):', data);
      handleMessageRequestReceived(data);
    });

    socket.on('matchmaking:proposal', (data) => {
      console.log('🔔 RAW matchmaking:proposal event (Android):', data);
      handleMatchFound(data);
    });

    socket.on('chat:reaction:received', (data) => {
      console.log('🔔 RAW chat:reaction:received event (Android):', data);
      handleReactionReceived(data);
    });

    socket.on('voice:incoming-call', (data) => {
      console.log('🔔 RAW voice:incoming-call event (Android):', data);
      handleIncomingVoiceCall(data);
    });

    // Activity event listeners
    socket.on('activity:user_joined', (data) => {
      console.log('🔔 RAW activity:user_joined event (Android):', data);
      handleUserJoinedActivity(data);
    });

    socket.on('activity:friends_connected', (data) => {
      console.log('🔔 RAW activity:friends_connected event (Android):', data);
      handleFriendsConnectedActivity(data);
    });

    socket.on('activity:user_matched', (data) => {
      console.log('🔔 RAW activity:user_matched event (Android):', data);
      handleUserMatchedActivity(data);
    });

    socket.on('activity:location_updated', (data) => {
      console.log('🔔 RAW activity:location_updated event (Android):', data);
      handleLocationUpdatedActivity(data);
    });

    socket.on('activity:interest_updated', (data) => {
      console.log('🔔 RAW activity:interest_updated event (Android):', data);
      handleInterestUpdatedActivity(data);
    });
  };

  return {
    setCurrentChatId,
    notificationService: androidNotificationService
  };
}
