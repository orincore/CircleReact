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
        
        if (data?.type === 'match_found') {
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
                    router.push({
                      pathname: '/secure/chat-conversation',
                      params: { chatId: data.chatId },
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
            if (data.chatId) {
              router.push({
                pathname: '/secure/chat-conversation',
                params: { chatId: data.chatId },
              });
            }
            break;
            
          case 'help_request':
            // Navigate to giver request modal or match screen
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
