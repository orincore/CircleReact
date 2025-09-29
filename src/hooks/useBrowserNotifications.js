import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket, socketService } from '@/src/api/socket';
import browserNotificationService from '../services/browserNotificationService';

export default function useBrowserNotifications() {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const currentChatIdRef = useRef(null);

  // Track current chat to avoid notifications for active chat
  const setCurrentChatId = (chatId) => {
    currentChatIdRef.current = chatId;
  };

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web' || !token || !user) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // Handle connection state changes
    const handleConnectionChange = (state) => {
      console.log('🔔 Notification hook - connection state changed:', state);
      
      if (state === 'connected') {
        console.log('🔔 Socket reconnected - re-registering notification listeners');
        // Re-register all event listeners when reconnected
        registerEventListeners(socket);
      } else if (state === 'disconnected' || state === 'reconnecting') {
        console.log('🔔 Socket disconnected - notifications may be delayed');
      }
    };

    socketService.addConnectionListener(handleConnectionChange);

    // Register event listeners
    const registerEventListeners = (socket) => {
      // Remove existing listeners to avoid duplicates
      socket.off('friend:request:received', handleFriendRequestReceived);
      socket.off('friend:request:accepted', handleFriendRequestAccepted);
      socket.off('chat:message:received', handleMessageReceived);
      socket.off('message:request:received', handleMessageRequestReceived);
      socket.off('matchmaking:proposal', handleMatchFound);
      socket.off('chat:reaction:received', handleReactionReceived);

      // Register fresh listeners
      socket.on('friend:request:received', handleFriendRequestReceived);
      socket.on('friend:request:accepted', handleFriendRequestAccepted);
      socket.on('chat:message:received', handleMessageReceived);
      socket.on('message:request:received', handleMessageRequestReceived);
      socket.on('matchmaking:proposal', handleMatchFound);
      socket.on('chat:reaction:received', handleReactionReceived);
    };

    // Friend request notifications
    const handleFriendRequestReceived = ({ request }) => {
      console.log('🔔 Friend request received for browser notification:', request);
      
      const senderName = request.sender?.first_name 
        ? `${request.sender.first_name} ${request.sender.last_name || ''}`.trim()
        : 'Someone';

      const result = browserNotificationService.showFriendRequestNotification({
        senderName,
        senderId: request.sender?.id,
        requestId: request.id
      });

      if (!result) {
        console.log('🔕 Friend request notification was blocked - checking conditions...');
        const status = browserNotificationService.getStatus();
        console.log('🔍 Notification status:', {
          supported: status.supported,
          permission: status.permission,
          enabled: status.enabled,
          pageVisible: document.visibilityState === 'visible',
          canShow: browserNotificationService.canShowNotifications()
        });
      }
    };

    // Friend request accepted notifications
    const handleFriendRequestAccepted = ({ request, acceptedBy }) => {
      console.log('🔔 Friend request accepted for browser notification:', request);
      
      const friendName = acceptedBy?.first_name 
        ? `${acceptedBy.first_name} ${acceptedBy.last_name || ''}`.trim()
        : 'Someone';

      browserNotificationService.showFriendRequestAcceptedNotification({
        friendName,
        friendId: acceptedBy?.id
      });
    };

    // Message notifications
    const handleMessageReceived = ({ message, sender, chatId }) => {
      console.log('🔔 Message received for browser notification:', { message, sender, chatId });
      
      // Don't show notification if user is in the same chat
      if (currentChatIdRef.current === chatId) {
        console.log('🔕 Skipping message notification - user in active chat');
        return;
      }

      const senderName = sender?.first_name 
        ? `${sender.first_name} ${sender.last_name || ''}`.trim()
        : sender?.username || 'Someone';

      const result = browserNotificationService.showMessageNotification({
        senderName,
        message: message.content || message.text || 'New message',
        chatId,
        senderId: sender?.id
      });

      if (!result) {
        console.log('🔕 Message notification was blocked - checking conditions...');
        const status = browserNotificationService.getStatus();
        console.log('🔍 Notification status:', {
          supported: status.supported,
          permission: status.permission,
          enabled: status.enabled,
          pageVisible: document.visibilityState === 'visible',
          canShow: browserNotificationService.canShowNotifications(),
          currentChatId: currentChatIdRef.current,
          messageChatId: chatId
        });
      }
    };

    // Message request notifications
    const handleMessageRequestReceived = ({ sender_id, receiver_id, requestId }) => {
      console.log('🔔 Message request received for browser notification:', { sender_id, requestId });
      
      // We might not have sender details, so we'll use a generic message
      browserNotificationService.showMessageRequestNotification({
        senderName: 'Someone',
        senderId: sender_id,
        requestId
      });
    };

    // Match notifications (from matchmaking system)
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

    // Initial registration of event listeners
    registerEventListeners(socket);

    // Cleanup function
    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
      
      if (socketRef.current) {
        socketRef.current.off('friend:request:received', handleFriendRequestReceived);
        socketRef.current.off('friend:request:accepted', handleFriendRequestAccepted);
        socketRef.current.off('chat:message:received', handleMessageReceived);
        socketRef.current.off('message:request:received', handleMessageRequestReceived);
        socketRef.current.off('matchmaking:proposal', handleMatchFound);
        socketRef.current.off('chat:reaction:received', handleReactionReceived);
      }
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

  return {
    setCurrentChatId,
    notificationService: browserNotificationService
  };
}
