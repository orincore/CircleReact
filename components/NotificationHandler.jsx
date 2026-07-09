import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Component to handle notification interactions
 * Manages navigation when user taps on notifications
 */
const NotificationHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Handle notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { data } = notification.request.content;
        
        if (data?.type === 'match_found' || data?.type === 'help_request_accepted') {
          // Show alert for match found
          Alert.alert(
            '🎉 Helper Found!',
            'Someone is ready to help you. Would you like to start chatting?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Start Chat',
                onPress: () => {
                  if (data.chatId) {
                    router.replace({
                      pathname: '/secure/chat-conversation',
                      params: { id: data.chatId, isBlindDate: 'true' },
                    });
                  }
                },
              },
            ]
          );
        }
      }
    );

    // Handle notification tapped (app opened from notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;
        
        switch (data?.type) {
          case 'match_found':
          case 'help_request_accepted':
            // Navigate directly to chat for help connect matches (use isBlindDate for masked chat)
            if (data.chatId) {
              router.replace({
                pathname: '/secure/chat-conversation',
                params: { id: data.chatId, isBlindDate: 'true' },
              });
            }
            break;
            
          case 'new_message':
          case 'message':
            // Navigate to the specific chat conversation
            if (data.chatId) {
              router.push({
                pathname: '/secure/chat-conversation',
                params: { 
                  id: data.chatId,
                  name: data.senderName || 'Chat',
                  avatar: data.senderAvatar || ''
                },
              });
            } else {
              // Fallback to chat list if no chatId
              router.push('/secure/(tabs)/chats');
            }
            break;
            
          case 'help_request':
            // Navigate to giver request modal or match screen
            router.push('/secure/(tabs)/match');
            break;
            
          case 'nearby_user':
            // Navigate to the nearby user's profile (use main profile route)
            if (data.userId) {
              router.push(`/secure/user-profile/${data.userId}`);
            } else {
              router.push('/secure/(tabs)/match');
            }
            break;
            
          case 'friend_request':
            // Navigate to friends screen
            router.push('/secure/(tabs)/friends');
            break;

          case 'meme_liked_by_friend':
          case 'meme_discovery':
            // Open the standalone meme viewer (same route MemeSharePreview
            // deep-links to from chat) for the meme the notification is about
            if (data.memeId) {
              router.push({ pathname: '/secure/meme-view', params: { memeId: data.memeId } });
            } else {
              router.push('/secure/(tabs)/memes');
            }
            break;

          case 'friend_birthday':
          case 'weather_checkin':
            // Open the chat with the friend the notification is about
            if (data.chatId) {
              router.push({
                pathname: '/secure/chat-conversation',
                params: { id: data.chatId, name: data.targetUserName || data.birthdayUserName || 'Chat' },
              });
            } else {
              router.push('/secure/(tabs)/chats');
            }
            break;

          case 'birthday_self':
            // Nothing specific to open -- just bring the user into the app.
            router.push('/secure/(tabs)/match');
            break;

          case 'search_update':
          case 'background_search_started':
          case 'background_reminder':
            // Navigate to match screen to show status
            router.push('/secure/(tabs)/match');
            break;
            
          default:
            // Default navigation
            router.push('/secure/(tabs)/match');
        }
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

  // This component doesn't render anything
  return null;
};

export default NotificationHandler;
