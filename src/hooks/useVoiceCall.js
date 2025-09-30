// NEW SIMPLIFIED VOICE CALL HOOK - BUILT FROM SCRATCH
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { voiceCallService } from '../services/VoiceCallService.new';
import { useAuth } from '@/contexts/AuthContext';

export function useVoiceCall() {
  const router = useRouter();
  const { token } = useAuth();
  
  useEffect(() => {
    console.log('🎙️ Voice call hook initialized');
    
    // Initialize voice call service
    if (token) {
      voiceCallService.initializeSocket(token);
    }
    
    // Handle incoming calls
    voiceCallService.onIncomingCall = (callData) => {
      console.log('📞 Incoming call:', callData);
      
      // Navigate to voice call screen
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
      console.log('🧹 Voice call hook cleanup');
      voiceCallService.onIncomingCall = null;
    };
  }, [token, router]);
  
  // Start a voice call
  const startVoiceCall = async (receiverId, receiverName, receiverAvatar) => {
    try {
      console.log('📞 Starting voice call to:', receiverId);
      
      // Navigate to voice call screen
      router.push({
        pathname: '/secure/voice-call',
        params: {
          callId: 'pending',
          callerId: receiverId,
          callerName: receiverName || 'Unknown',
          callerAvatar: receiverAvatar || '',
          isIncoming: 'false'
        }
      });
      
      // Start the call
      const success = await voiceCallService.startCall(receiverId, token);
      
      if (!success) {
        console.error('❌ Failed to start call');
        router.back();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error starting call:', error);
      return false;
    }
  };
  
  return { startVoiceCall };
}

export default useVoiceCall;
