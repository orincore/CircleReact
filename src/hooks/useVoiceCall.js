import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { voiceCallService, initializeVoiceCallService } from '@/src/services/VoiceCallService';
import { useAuth } from '@/contexts/AuthContext';

export function useVoiceCall() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    console.log('🎙️ useVoiceCall hook mounted with token:', !!token);
    
    // Initialize voice call service with socket connection
    if (token) {
      console.log('🎙️ Initializing voice call service with token...');
      const initialized = initializeVoiceCallService(token);
    } else {
      console.warn('⚠️ No token available for voice call initialization');
    }

    // Set up incoming call handler
    console.log('🎧 Setting up incoming call handler...');
    const incomingCallHandler = (callData) => {
      console.log('🚨 INCOMING CALL HANDLER TRIGGERED! 🚨');
      console.log('📞 Handling incoming call:', callData);
      
      // Navigate to voice call screen with call data
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
    
    // Set handler on voice call service
    voiceCallService.onIncomingCall = incomingCallHandler;
    
    // Also set global fallback handler for browser notifications
    if (typeof window !== 'undefined') {
      window.__voiceCallHandler = incomingCallHandler;
      console.log('🌍 Global voice call handler registered');
    }

    // Cleanup on unmount
    return () => {
      console.log('🎙️ Cleaning up voice call hook...');
      voiceCallService.onIncomingCall = null;
      if (typeof window !== 'undefined') {
        window.__voiceCallHandler = null;
        console.log('🌍 Global voice call handler unregistered');
      }
    };
  }, [router, token]);

  const startVoiceCall = async (receiverId, receiverName, receiverAvatar) => {
    try {
      console.log('📞 Starting voice call to:', receiverId);
      
      // Navigate to voice call screen first
      router.push({
        pathname: '/secure/voice-call',
        params: {
          callId: 'outgoing-' + Date.now(),
          callerId: receiverId,
          callerName: receiverName || 'Unknown',
          callerAvatar: receiverAvatar || '',
          isIncoming: 'false'
        }
      });

      // Start the actual call
      const success = await voiceCallService.startCall(receiverId, token);
      if (!success) {
        // If call failed, navigate to a safe screen
        console.log('📞 Call failed, navigating back safely...');
        try {
          if (router.canGoBack()) {
            router.back();
          } else {
            // Navigate to match screen as fallback
            router.replace('/secure/(tabs)/match');
          }
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          // Final fallback - just replace with match screen
          router.replace('/secure/(tabs)/match');
        }
        throw new Error('Failed to start voice call');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      throw error;
    }
  };

  return {
    startVoiceCall,
    voiceCallService
  };
}
