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
      return;
    }

    // Initialize socket and set up listeners
    const initializeSocket = async () => {
      try {
        const socket = getSocket(token);
        socketRef.current = socket;
        
        
        // Set up listeners
        setupNotificationListeners(socket);
        
        // Wait for connection if not connected
        if (!socket.connected) {
          socket.on('connect', () => {
            setupNotificationListeners(socket);
          });
        }
        
      } catch (error) {
        console.error('❌ Error initializing socket for Android notifications:', error);
        // Retry after delay
        setTimeout(initializeSocket, 2000);
      }
    };
    
    initializeSocket();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        cleanupNotificationListeners(socketRef.current);
      }
      listenersSetupRef.current = false;
    };
  }, [token, user]);

  // Setup notification listeners
  const setupNotificationListeners = (socket) => {
    if (listenersSetupRef.current) return; // Prevent duplicate setup
    
    
    // Clean up existing listeners first
    cleanupNotificationListeners(socket);
    
    // Register event listeners
    registerEventListeners(socket);
    listenersSetupRef.current = true;
  };

  // Cleanup notification listeners
  const cleanupNotificationListeners = (socket) => {
    if (!socket) return;
    
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
    }
  };

  // Friend request notifications
  const handleFriendRequestReceived = ({ request }) => {
    
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
  const handleFriendRequestAccepted = ({ friendship, friend }) => {
    // Backend sends { friendship, friend } structure
    // friend = the user who accepted the request (for sender)
    // or the user who sent the request (for receiver)
    
    const acceptedByName = friend?.first_name 
      ? `${friend.first_name} ${friend.last_name || ''}`.trim()
      : 'Someone';

    androidNotificationService.showFriendRequestNotification({
      senderName: `${acceptedByName} accepted your friend request`,
      senderId: friend?.id,
      requestId: friendship?.id
    });
  };

  // Message notifications
  const handleMessageReceived = ({ message }) => {
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === message.chatId) {
      return;
    }

    androidNotificationService.showMessageNotification({
      senderName: message.senderName || 'Someone',
      message: message.content || message.text || 'New message',
      chatId: message.chatId,
      senderId: message.senderId,
      messageId: message.id // For deduplication with push notifications
    });
  };

  // Message request notifications
  const handleMessageRequestReceived = ({ request }) => {
    
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
    
    // Don't show notification if user is in the same chat
    if (currentChatIdRef.current === chatId) {
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

    androidNotificationService.showVoiceCallNotification({
      callerName: callerName || 'Someone',
      callerId,
      callId
    });
  };

  // Activity notifications
  const handleUserJoinedActivity = (activity) => {
    // Don't show notification for own join activity
    if (activity.data.user_id === user?.id) {
      console.log('👋 Skipping user joined notification for self');
      return;
    }
    
    androidNotificationService.showUserJoinedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      location: activity.data.location
    });
  };

  const handleFriendsConnectedActivity = (activity) => {
    // Don't show notification if current user is one of the connected friends
    // (they already know they connected)
    if (activity.data.user1_id === user?.id || activity.data.user2_id === user?.id) {
      console.log('🤝 Skipping friends connected notification for self');
      return;
    }
    
    androidNotificationService.showFriendsConnectedNotification({
      user1Name: activity.data.user1_name,
      user2Name: activity.data.user2_name,
      user1Id: activity.data.user1_id,
      user2Id: activity.data.user2_id
    });
  };

  const handleUserMatchedActivity = (activity) => {
    // Don't show notification if current user is one of the matched users
    // (they already get a separate match notification)
    if (activity.data.user1_id === user?.id || activity.data.user2_id === user?.id) {
      console.log('💕 Skipping user matched notification for self');
      return;
    }
    
    androidNotificationService.showUserMatchedNotification({
      user1Name: activity.data.user1_name,
      user2Name: activity.data.user2_name,
      user1Id: activity.data.user1_id,
      user2Id: activity.data.user2_id
    });
  };

  const handleLocationUpdatedActivity = (activity) => {
    // Don't show notification for own location updates
    if (activity.data.user_id === user?.id) {
      console.log('📍 Skipping location notification for self');
      return;
    }
    
    androidNotificationService.showLocationUpdatedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      location: activity.data.location
    });
  };

  const handleInterestUpdatedActivity = (activity) => {
    // Don't show notification for own interest updates
    if (activity.data.user_id === user?.id) {
      console.log('🎯 Skipping interest notification for self');
      return;
    }
    
    androidNotificationService.showInterestUpdatedNotification({
      userName: activity.data.user_name,
      userId: activity.data.user_id,
      interests: activity.data.interests
    });
  };

  // Register event listeners
  const registerEventListeners = (socket) => {
    
    // Generic notification listener
    socket.on('notification:new', ({ notification }) => {
      handleGenericNotification({ notification });
    });
    
    // Specific event listeners
    socket.on('friend:request:received', (data) => {
      handleFriendRequestReceived(data);
    });

    socket.on('friend:request:accepted', (data) => {
      handleFriendRequestAccepted(data);
    });

    socket.on('chat:message:background', (data) => {
      handleMessageReceived(data);
    });

    socket.on('message:request:received', (data) => {
      handleMessageRequestReceived(data);
    });

    socket.on('matchmaking:proposal', (data) => {
      handleMatchFound(data);
    });

    socket.on('chat:reaction:received', (data) => {
      handleReactionReceived(data);
    });

    socket.on('voice:incoming-call', (data) => {
      handleIncomingVoiceCall(data);
    });

    // Activity event listeners
    socket.on('activity:user_joined', (data) => {
      handleUserJoinedActivity(data);
    });

    socket.on('activity:friends_connected', (data) => {
      handleFriendsConnectedActivity(data);
    });

    socket.on('activity:user_matched', (data) => {
      handleUserMatchedActivity(data);
    });

    socket.on('activity:location_updated', (data) => {
      handleLocationUpdatedActivity(data);
    });

    socket.on('activity:interest_updated', (data) => {
      handleInterestUpdatedActivity(data);
    });
  };

  return {
    setCurrentChatId,
    notificationService: androidNotificationService
  };
}
