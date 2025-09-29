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
    if (Platform.OS !== 'web' || !token || !user) {
      console.log('🔔 Skipping browser notifications:', { 
        platform: Platform.OS, 
        hasToken: !!token, 
        hasUser: !!user 
      });
      return;
    }

    console.log('🔔 Initializing browser notifications for user:', user.id);

    const socket = getSocket(token);
    socketRef.current = socket;

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

    // Register event listeners function
    const registerEventListeners = (socket) => {
      console.log('🔔 Registering notification event listeners...');
      
      // Remove existing listeners to avoid duplicates
      socket.off('friend:request:received', handleFriendRequestReceived);
      socket.off('friend:request:accepted', handleFriendRequestAccepted);
      socket.off('friend:request:background'); // Remove background friend request listener
      socket.off('friend:accepted:background'); // Remove background friend accepted listener
      socket.off('chat:message:received', handleMessageReceived);
      socket.off('chat:message:background'); // Remove background message listener
      socket.off('message:request:received', handleMessageRequestReceived);
      socket.off('matchmaking:proposal', handleMatchFound);
      socket.off('chat:reaction:received', handleReactionReceived);

      // Register fresh listeners with debug logging
      socket.on('friend:request:received', (data) => {
        console.log('🔔 RAW friend:request:received event:', data);
        console.log('🔍 Friend request data structure:', {
          request: data.request,
          sender: data.sender,
          directData: data
        });
        
        // Handle nested data structure like messages
        const friendRequestData = data.request || data;
        const senderData = data.sender || friendRequestData.sender;
        
        // Convert to expected format
        const convertedData = {
          request: {
            id: friendRequestData.id || data.id,
            sender: senderData || {
              id: friendRequestData.senderId,
              first_name: friendRequestData.senderName?.split(' ')[0] || 'Someone',
              last_name: friendRequestData.senderName?.split(' ').slice(1).join(' ') || ''
            }
          }
        };
        
        console.log('🔔 Converted friend request data:', convertedData);
        handleFriendRequestReceived(convertedData);
      });
      
      socket.on('friend:request:accepted', (data) => {
        console.log('🔔 RAW friend:request:accepted event:', data);
        console.log('🔍 Friend accepted data structure:', {
          request: data.request,
          acceptedBy: data.acceptedBy,
          directData: data
        });
        
        // Handle nested data structure
        const requestData = data.request || data;
        const acceptedByData = data.acceptedBy || data.sender || {
          id: requestData.acceptedById || requestData.senderId,
          first_name: requestData.acceptedByName?.split(' ')[0] || requestData.senderName?.split(' ')[0] || 'Someone',
          last_name: requestData.acceptedByName?.split(' ').slice(1).join(' ') || requestData.senderName?.split(' ').slice(1).join(' ') || ''
        };
        
        const convertedData = {
          request: requestData,
          acceptedBy: acceptedByData
        };
        
        console.log('🔔 Converted friend accepted data:', convertedData);
        handleFriendRequestAccepted(convertedData);
      });

      // Listen for potential background friend request events
      socket.on('friend:request:background', (data) => {
        console.log('🔔 RAW friend:request:background event:', data);
        
        // Handle similar to message background events
        const rawFriendRequest = data.request || data;
        
        console.log('🔍 Background friend request data:', {
          senderName: rawFriendRequest.senderName,
          senderId: rawFriendRequest.senderId,
          requestId: rawFriendRequest.id
        });
        
        const convertedData = {
          request: {
            id: rawFriendRequest.id || 'unknown_' + Date.now(),
            sender: {
              id: rawFriendRequest.senderId || 'unknown_sender',
              first_name: rawFriendRequest.senderName?.split(' ')[0] || 'Someone',
              last_name: rawFriendRequest.senderName?.split(' ').slice(1).join(' ') || ''
            }
          }
        };
        
        console.log('🔔 Converted background friend request data:', convertedData);
        handleFriendRequestReceived(convertedData);
      });

      socket.on('friend:accepted:background', (data) => {
        console.log('🔔 RAW friend:accepted:background event:', data);
        
        const rawAccepted = data.request || data;
        
        const convertedData = {
          request: rawAccepted,
          acceptedBy: {
            id: rawAccepted.acceptedById || rawAccepted.senderId,
            first_name: rawAccepted.acceptedByName?.split(' ')[0] || rawAccepted.senderName?.split(' ')[0] || 'Someone',
            last_name: rawAccepted.acceptedByName?.split(' ').slice(1).join(' ') || rawAccepted.senderName?.split(' ').slice(1).join(' ') || ''
          }
        };
        
        console.log('🔔 Converted background friend accepted data:', convertedData);
        handleFriendRequestAccepted(convertedData);
      });
      
      // Listen for BOTH message events (the actual event name is chat:message:background)
      socket.on('chat:message:received', (data) => {
        console.log('🔔 RAW chat:message:received event:', data);
        handleMessageReceived(data);
      });
      
      socket.on('chat:message:background', (data) => {
        console.log('🔔 RAW chat:message:background event:', data);
        
        // The actual data is nested under 'message' property
        const rawMessage = data.message || data;
        
        console.log('🔍 Available sender data:', {
          senderName: rawMessage.senderName,
          senderUsername: rawMessage.senderUsername,
          senderId: rawMessage.senderId,
          sender: rawMessage.sender,
          text: rawMessage.text,
          chatId: rawMessage.chatId
        });
        
        // Safe date conversion
        let createdAt;
        try {
          if (rawMessage.createdAt) {
            // Handle both timestamp (number) and ISO string formats
            const date = typeof rawMessage.createdAt === 'number' 
              ? new Date(rawMessage.createdAt) 
              : new Date(rawMessage.createdAt);
            
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date');
            }
            createdAt = date.toISOString();
          } else {
            createdAt = new Date().toISOString(); // Fallback to current time
          }
        } catch (error) {
          console.warn('🔔 Invalid createdAt value, using current time:', rawMessage.createdAt);
          createdAt = new Date().toISOString();
        }
        
        // Extract sender name from available data
        let senderDisplayName = 'Someone';
        if (rawMessage.senderName) {
          senderDisplayName = rawMessage.senderName;
        } else if (rawMessage.senderUsername) {
          senderDisplayName = rawMessage.senderUsername;
        } else if (rawMessage.sender?.first_name) {
          senderDisplayName = `${rawMessage.sender.first_name} ${rawMessage.sender.last_name || ''}`.trim();
        }

        // Convert the background message format to the expected format
        const convertedMessageData = {
          message: {
            id: rawMessage.id || 'unknown_' + Date.now(),
            content: rawMessage.text || '',
            text: rawMessage.text || '',
            created_at: createdAt
          },
          sender: {
            id: rawMessage.senderId || 'unknown_sender',
            first_name: rawMessage.senderName?.split(' ')[0] || senderDisplayName.split(' ')[0] || 'Someone',
            last_name: rawMessage.senderName?.split(' ').slice(1).join(' ') || senderDisplayName.split(' ').slice(1).join(' ') || '',
            username: rawMessage.senderUsername || 'user'
          },
          chatId: rawMessage.chatId || 'unknown_chat'
        };
        
        console.log('🔔 Converted message data for notification:', convertedMessageData);
        handleMessageReceived(convertedMessageData);
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

      // Listen for ALL socket events to debug
      const originalEmit = socket.emit;
      socket.emit = function(...args) {
        console.log('📤 Socket EMIT:', args[0], args.slice(1));
        return originalEmit.apply(this, args);
      };

      // Log all incoming events
      socket.onAny((eventName, ...args) => {
        console.log('📥 Socket RECEIVED:', eventName, args);
      });
      
      console.log('✅ Notification event listeners registered with debug logging');
    };

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

    // Add connection listener
    socketService.addConnectionListener(handleConnectionChange);

    // Initial registration of event listeners
    registerEventListeners(socket);

    // Cleanup function
    return () => {
      socketService.removeConnectionListener(handleConnectionChange);
      
      if (socketRef.current) {
        socketRef.current.off('friend:request:received', handleFriendRequestReceived);
        socketRef.current.off('friend:request:accepted', handleFriendRequestAccepted);
        socketRef.current.off('friend:request:background'); // Remove background friend request listener
        socketRef.current.off('friend:accepted:background'); // Remove background friend accepted listener
        socketRef.current.off('chat:message:received', handleMessageReceived);
        socketRef.current.off('chat:message:background'); // Remove background message listener
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
