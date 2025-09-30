import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { voiceCallService } from '@/src/services/VoiceCallService';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';

const { width, height } = Dimensions.get('window');

export default function VoiceCallScreen() {
  const router = useRouter();
  const { callId, callerId, callerName, callerAvatar, isIncoming } = useLocalSearchParams();
  const { token } = useAuth();
  
  // FORCE incoming state - no complex logic
  const isIncomingCall = isIncoming === 'true' || isIncoming === true;
  
  // Set initial call state based on whether it's incoming or outgoing
  const [callState, setCallState] = useState(() => {
    console.log('🎙️ Initial state setup:', { isIncoming, isIncomingCall });
    return isIncomingCall ? 'incoming' : 'calling';
  });
  
  // Prevent duplicate screens
  const [isScreenActive, setIsScreenActive] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Timer ref for call duration
  const durationTimer = useRef(null);

  // Safe navigation function with duplicate prevention
  const navigateBack = () => {
    if (hasNavigated || !isScreenActive) {
      console.log('📞 Navigation already in progress, skipping...');
      return;
    }
    
    console.log('📞 Attempting to navigate back...');
    setHasNavigated(true);
    setIsScreenActive(false);
    
    // Clear global flag
    if (typeof window !== 'undefined') {
      window.__activeVoiceCallScreen = false;
      console.log('🧹 Cleared global voice call screen flag on navigation');
    }
    
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
  };
  
  useEffect(() => {
    console.log('🎙️ VoiceCallScreen mounted:', {
      callId,
      callerId,
      callerName,
      callerAvatar,
      isIncoming: isIncoming === 'true',
      currentServiceState: voiceCallService.getCallState()
    });
    
    // Set global flag to prevent duplicate screens
    if (typeof window !== 'undefined') {
      if (window.__activeVoiceCallScreen) {
        console.warn('⚠️ Another voice call screen is already active, this one will self-destruct');
        setTimeout(() => {
          navigateBack();
        }, 1000);
        return;
      }
      window.__activeVoiceCallScreen = true;
    }
    
    // Set up voice call service listeners
    voiceCallService.onCallStateChange = handleCallStateChange;
    voiceCallService.onError = handleCallError;
    voiceCallService.onCallEnded = handleCallEnded;
    voiceCallService.onCallDurationUpdate = handleCallDurationUpdate;
    voiceCallService.onCallEndedByOther = handleCallEndedByOther;
    
    // Start animations
    startPulseAnimation();
    startFadeInAnimation();
    
    // Enhanced incoming call setup
    if (isIncomingCall) {
      console.log('📞 Setting up incoming call state...');
      voiceCallService.currentCallId = callId;
      setCallState('incoming');
      voiceCallService.setCallState('incoming');
    } else {
      // For outgoing calls, ensure proper state
      console.log('📞 Setting up outgoing call state...');
      setCallState('calling');
    }
    
    // Verify state after mount
    setTimeout(() => {
      console.log('🔍 Post-mount state verification:', {
        screenState: callState,
        serviceState: voiceCallService.getCallState(),
        isIncomingCall
      });
      
      // Fix state mismatch
      if (isIncomingCall && callState !== 'incoming') {
        console.log('🔧 Fixing state mismatch - forcing incoming state');
        setCallState('incoming');
      }
    }, 500);
    
    return () => {
      // Cleanup
      stopDurationTimer();
      voiceCallService.onCallStateChange = null;
      voiceCallService.onError = null;
      voiceCallService.onCallEnded = null;
      voiceCallService.onCallDurationUpdate = null;
      voiceCallService.onCallEndedByOther = null;
      
      // Clear global flag
      if (typeof window !== 'undefined') {
        window.__activeVoiceCallScreen = false;
        console.log('🧹 Cleared global voice call screen flag');
      }
    };
  }, []);
  
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };
  
  const startFadeInAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };
  
  const startDurationTimer = () => {
    durationTimer.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };
  
  const stopDurationTimer = () => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCallStateChange = (newState) => {
    console.log('📞 Call state changed:', callState, '->', newState);
    
    // Prevent duplicate state changes
    if (newState === callState) {
      console.log('📞 Ignoring duplicate state change');
      return;
    }
    
    setCallState(newState);
    
    if (newState === 'connected') {
      startDurationTimer();
      // Audio streaming is automatically handled by VoiceCallService
      console.log('🎵 Call connected - audio streaming will start automatically');
    } else if (newState === 'connecting') {
      console.log('🔄 Call connecting...');
      // Set a timeout to prevent getting stuck in connecting state
      setTimeout(() => {
        if (callState === 'connecting') {
          console.warn('⚠️ Call stuck in connecting state, forcing connected state');
          setCallState('connected');
          startDurationTimer();
        }
      }, 15000); // 15 second timeout
    } else if (newState === 'ended') {
      stopDurationTimer();
      setIsRecording(false);
      
      // Show "Call ended" for 3 seconds before navigating back
      console.log('📞 Call ended, showing end screen for 3 seconds...');
      setTimeout(() => {
        if (isScreenActive && !hasNavigated) {
          navigateBack();
        }
      }, 3000);
    }
  };
  
  const handleCallError = (error) => {
    console.error('❌ Call error:', error);
    Alert.alert('Call Error', error, [
      { text: 'OK', onPress: () => navigateBack() }
    ]);
  };
  
  const handleCallEnded = () => {
    console.log('📞 Call ended handler triggered');
    
    // Prevent duplicate call end handling
    if (callState === 'ended') {
      console.log('📞 Call already ended, ignoring duplicate event');
      return;
    }
    
    setCallState('ended');
    stopDurationTimer();
    if (voiceCallService.isExpoGo && isRecording) {
      stopAudioRecording();
    }
    
    // Show "Call ended" for 3 seconds before navigating back
    setTimeout(() => {
      if (isScreenActive && !hasNavigated) {
        navigateBack();
      }
    }, 3000);
  };

  const handleCallDurationUpdate = (duration) => {
    setCallDuration(duration);
  };

  const handleCallEndedByOther = (data) => {
    console.log('📞 Call ended by other user, duration:', data.duration, 'seconds');
    
    // Set state to ended first
    setCallState('ended');
    stopDurationTimer();
    
    // Show alert with call duration
    Alert.alert(
      'Call Ended', 
      `Call ended by ${callerName || 'the other user'}. Duration: ${formatDuration(data.duration || 0)}`,
      [{ 
        text: 'OK', 
        onPress: () => {
          if (isScreenActive && !hasNavigated) {
            navigateBack();
          }
        }
      }]
    );
  };
  
  const acceptCall = async () => {
    try {
      console.log('✅ User accepted the call');
      setCallState('connecting');
      
      // Verify socket connection before accepting
      if (!voiceCallService.socket || !voiceCallService.socket.connected) {
        console.warn('⚠️ Socket not connected, attempting to reconnect...');
        const initialized = voiceCallService.initializeSocket(token);
        if (!initialized) {
          throw new Error('Unable to establish connection');
        }
        
        // Wait briefly for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Accept the call through the voice call service
      const success = await voiceCallService.acceptCall(token);
      if (!success) {
        throw new Error('Failed to accept call - connection issue');
      }
      
      console.log('✅ Call acceptance sent to backend');
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      setCallState('incoming'); // Reset to incoming state on error
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('connection') 
        ? 'Connection issue. Please check your internet and try again.'
        : 'Failed to accept call. Please try again.';
        
      Alert.alert('Call Error', errorMessage, [
        { text: 'Retry', onPress: () => acceptCall() },
        { text: 'Decline', onPress: () => declineCall() }
      ]);
    }
  };
  
  const declineCall = () => {
    console.log('❌ Declining call');
    voiceCallService.declineCall();
    navigateBack();
  };
  
  const endCall = () => {
    console.log('📞 Ending call');
    voiceCallService.endCall();
    navigateBack();
  };
  
  const toggleMute = () => {
    const muted = voiceCallService.toggleMute();
    setIsMuted(muted);
    
    // For Expo Go, muting is handled by the audio streaming interval
    // The VoiceCallService checks isMuted before recording
    console.log('🔇 Mute toggled:', muted ? 'ON' : 'OFF');
  };
  
  const toggleSpeaker = () => {
    const speakerOn = voiceCallService.toggleSpeaker();
    setIsSpeakerOn(speakerOn);
  };
  
  const startAudioRecording = async () => {
    try {
      if (voiceCallService.isExpoGo) {
        const success = await voiceCallService.startAudioRecording();
        setIsRecording(success);
        console.log('🎤 Audio recording started:', success);
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  };
  
  const stopAudioRecording = async () => {
    try {
      if (voiceCallService.isExpoGo && isRecording) {
        const uri = await voiceCallService.stopAudioRecording();
        setIsRecording(false);
        console.log('🎤 Audio recording stopped, URI:', uri);
        
        // In a real implementation, you would send this audio to the other user
        // For now, we'll just log it
        if (uri) {
          console.log('📤 Would send audio message:', uri);
        }
      }
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
    }
  };
  
  const renderCallState = () => {
    console.log('🔍 renderCallState called with:', { callState, isIncomingCall });
    
    // ALWAYS show "Incoming call..." for incoming calls - no matter what state
    if (isIncomingCall) {
      return 'Incoming call...';
    }
    
    switch (callState) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return 'Call in progress...';
    }
  };
  
  const renderActionButtons = () => {
    console.log('🔍 renderActionButtons called with state:', {
      callState,
      isScreenActive,
      isIncomingCall
    });
    
    // ALWAYS show accept/decline buttons for incoming calls - no exceptions
    if (isIncomingCall) {
      console.log('✅ Rendering incoming call buttons (FORCED - incoming call detected)');
      return (
        <View style={styles.incomingCallActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={declineCall}
          >
            <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={acceptCall}
          >
            <Ionicons name="call" size={32} color="white" />
          </TouchableOpacity>
        </View>
      );
    }
    
    // For outgoing calls or other states
    if (callState === 'ended') {
      return (
        <View style={styles.endedCallContainer}>
          <Text style={styles.endedCallText}>Call ended</Text>
        </View>
      );
    }
    
    if (callState === 'connected') {
      // Connected call - show call controls
      return (
        <View style={styles.callControls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={24} 
              color={isMuted ? "#FF6B6B" : "white"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons 
              name={isSpeakerOn ? "volume-high" : "volume-low"} 
              size={24} 
              color={isSpeakerOn ? "#4ECDC4" : "white"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      );
    }
    
    // For calling/connecting states - show end call only
    if (callState === 'calling' || callState === 'connecting') {
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      );
    }
    
    // Fallback - should never reach here for incoming calls
    return null;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a0b2e', '#2d1b69', '#7b2cbf']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigateBack()}
            >
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Voice Call</Text>
          </View>
          
          {/* Call Info */}
          <View style={styles.callInfo}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Avatar
                uri={callerAvatar || ''}
                name={callerName || 'Unknown'}
                size={isIncomingCall ? 140 : 120}
                style={[
                  styles.avatar,
                  isIncomingCall && styles.incomingAvatar
                ]}
              />
              
              {/* Call type indicator */}
              {isIncomingCall && (
                <View style={styles.incomingIndicator}>
                  <Ionicons name="call" size={24} color="white" />
                </View>
              )}
              
              {voiceCallService.isExpoGo && isRecording && (
                <View style={styles.recordingIndicator}>
                  <Ionicons name="mic" size={20} color="#FF6B6B" />
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
            <Text style={styles.callStatus}>{renderCallState()}</Text>
            
            {/* Enhanced incoming call info */}
            {isIncomingCall && (
              <Text style={styles.incomingCallText}>
                Incoming voice call
              </Text>
            )}
            
            {voiceCallService.isExpoGo && (
              <Text style={styles.expoGoNotice}>
                Using audio recording mode
              </Text>
            )}
          </View>
          
          {/* Debug Info - Remove in production */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                State: {callState} | Incoming: {isIncomingCall.toString()} | Active: {isScreenActive.toString()}
              </Text>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {renderActionButtons()}
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 16,
  },
  callInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  incomingAvatar: {
    borderWidth: 6,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  incomingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    padding: 8,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  incomingCallText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  expoGoNotice: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    paddingBottom: 50,
  },
  incomingCallActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    alignSelf: 'center',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  endedCallContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endedCallText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});
