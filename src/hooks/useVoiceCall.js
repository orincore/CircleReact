// NEW SIMPLIFIED VOICE CALL HOOK - BUILT FROM SCRATCH
import { useAuth } from '@/contexts/AuthContext';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { voiceCallService } from '../services/VoiceCallService';

// Configure notification behavior for Android - Full screen for calls
if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isCallNotification = notification.request.content.data?.type === 'incoming_call';
      
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
        // For call notifications, we want full screen
        ...(isCallNotification && {
          autoDismiss: false,
        }),
      };
    },
  });
  
  // Set notification category for calls
  Notifications.setNotificationCategoryAsync('call', [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

export function useVoiceCall() {
  const router = useRouter();
  const { token } = useAuth();
  
  useEffect(() => {
    
    // Initialize voice call service
    if (token) {
      voiceCallService.initializeSocket(token);
    }
    
    // Handle notification tap and action buttons
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const actionIdentifier = response.actionIdentifier;
      
      //console.log('📱 Notification response:', actionIdentifier, data);
      
      if (data.type === 'incoming_call') {
        if (actionIdentifier === 'accept') {
          //console.log('✅ User accepted call from notification');
          // Navigate to call screen and auto-accept
          router.push({
            pathname: '/secure/voice-call',
            params: {
              callId: data.callId,
              callerId: data.callerId,
              callerName: data.callerName || 'Unknown Caller',
              callerAvatar: data.callerAvatar || '',
              isIncoming: 'true',
              autoAccept: 'true'
            }
          });
        } else if (actionIdentifier === 'decline') {
          //console.log('❌ User declined call from notification');
          // Decline the call
          voiceCallService.declineCall();
          // Dismiss notification
          Notifications.dismissNotificationAsync(response.notification.request.identifier);
        } else {
          //console.log('📱 User tapped call notification');
          // Just open the call screen
          router.push({
            pathname: '/secure/voice-call',
            params: {
              callId: data.callId,
              callerId: data.callerId,
              callerName: data.callerName || 'Unknown Caller',
              callerAvatar: data.callerAvatar || '',
              isIncoming: 'true'
            }
          });
        }
      }
    });
    
    // Setup notification handler for looping notifications
    voiceCallService.onNotificationNeeded = async (callData) => {
      if (Platform.OS !== 'android') return;
      
      try {
        //console.log('🔔 Showing notification for:', callData.callerName);
        
        // Dismiss previous notification first
        if (voiceCallService.currentNotificationId) {
          await Notifications.dismissNotificationAsync(voiceCallService.currentNotificationId);
        }
        
        // Create a high-priority notification channel for calls
        await Notifications.setNotificationChannelAsync('calls', {
          name: 'Voice Calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          lightColor: '#00E676',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          showBadge: true,
        });
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📞 Incoming Call',
            body: `${callData.callerName || 'Someone'} is calling you...`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            categoryIdentifier: 'call',
            sticky: true,
            autoDismiss: false,
            data: {
              type: 'incoming_call',
              callId: callData.callId,
              callerId: callData.callerId,
              callerName: callData.callerName,
              callerAvatar: callData.callerAvatar,
            },
          },
          trigger: null, // Show immediately
        });
        
        voiceCallService.currentNotificationId = notificationId;
        //console.log('✅ Notification scheduled with ID:', notificationId);
      } catch (error) {
        console.error('❌ Failed to show notification:', error);
        console.error('Error details:', error);
      }
    };
    
    // Track if we've already navigated for this call
    let navigatedCallId = null;
    
    // Handle incoming calls - Navigate to full-screen call UI
    voiceCallService.onIncomingCall = async (callData) => {
      //console.log('📞 Incoming call received:', callData);
      //console.log('📱 App state:', AppState.currentState);
      
      // Prevent duplicate navigation for same call
      if (navigatedCallId === callData.callId) {
        //console.log('⚠️ Already navigated for this call, skipping navigation');
        return;
      }
      
      navigatedCallId = callData.callId;
      
      const isBackground = AppState.currentState !== 'active';
      
      // Start notification loop if app is in background
      if (isBackground && Platform.OS === 'android') {
        //console.log('📱 App in background - starting notification loop');
        voiceCallService.startNotificationLoop(callData);
      }
      
      // Navigate to voice call screen (works when app comes to foreground)
      //console.log('📞 Navigating to call screen');
      router.push({
        pathname: '/secure/voice-call',
        params: {
          callId: callData.callId,
          callerId: callData.callerId,
          callerName: callData.callerName || 'Unknown Caller',
          callerAvatar: callData.callerAvatar || '',
          isIncoming: 'true'
        }
      });
    };
    
    return () => {
      voiceCallService.onIncomingCall = null;
      notificationSubscription.remove();
    };
  }, [token, router]);
  
  // Start a voice call
  const startVoiceCall = async (receiverId, receiverName, receiverAvatar) => {
    try {
      //console.log('📞 Starting voice call to:', receiverId);
      
      // Start the call first to get the real call ID
      const success = await voiceCallService.startCall(receiverId, token);
      
      if (!success) {
        console.error('❌ Failed to start call');
        Alert.alert('Call Failed', 'Failed to start the call. Please try again.');
        return false;
      }
      
      // Now navigate with the actual call ID from the service
      const actualCallId = voiceCallService.currentCallId;
      //console.log('📞 Navigating to call screen with call ID:', actualCallId);
      
      router.push({
        pathname: '/secure/voice-call',
        params: {
          callId: actualCallId,
          callerId: receiverId,
          callerName: receiverName || 'Unknown',
          callerAvatar: receiverAvatar || '',
          isIncoming: 'false'
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error starting call:', error);
      Alert.alert('Call Failed', error.message || 'Failed to start the call. Please try again.');
      return false;
    }
  };
  
  return { startVoiceCall };
}

export default useVoiceCall;
