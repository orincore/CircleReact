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
  
  // Set initial call state based on whether it's incoming or outgoing
  const [callState, setCallState] = useState(() => {
    const incoming = isIncoming === 'true';
    return incoming ? 'incoming' : 'calling'; // incoming, calling, ringing, connecting, connected, ended
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Timer ref for call duration
  const durationTimer = useRef(null);

  // Safe navigation function
  const navigateBack = () => {
    console.log('📞 Attempting to navigate back...');
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
      isIncoming: isIncoming === 'true'
    });
    
    // Set up voice call service listeners
    voiceCallService.onCallStateChange = handleCallStateChange;
    voiceCallService.onError = handleCallError;
    voiceCallService.onCallEnded = handleCallEnded;
    voiceCallService.onCallDurationUpdate = handleCallDurationUpdate;
    voiceCallService.onCallEndedByOther = handleCallEndedByOther;
    
    // Start animations
    startPulseAnimation();
    startFadeInAnimation();
    
    // If incoming call, set up the service
    if (isIncoming === 'true') {
      voiceCallService.currentCallId = callId;
      voiceCallService.setCallState('incoming');
    }
    
    return () => {
      // Cleanup
      stopDurationTimer();
      voiceCallService.onCallStateChange = null;
      voiceCallService.onError = null;
      voiceCallService.onCallEnded = null;
      voiceCallService.onCallDurationUpdate = null;
      voiceCallService.onCallEndedByOther = null;
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
    console.log('📞 Call state changed:', newState);
    setCallState(newState);
    
    if (newState === 'connected') {
      startDurationTimer();
      // Audio streaming is automatically handled by VoiceCallService
      console.log('🎵 Call connected - audio streaming will start automatically');
    } else if (newState === 'ended') {
      stopDurationTimer();
      setIsRecording(false);
      // Navigate back after a short delay
      setTimeout(() => {
        navigateBack();
      }, 2000);
    }
  };
  
  const handleCallError = (error) => {
    console.error('❌ Call error:', error);
    Alert.alert('Call Error', error, [
      { text: 'OK', onPress: () => navigateBack() }
    ]);
  };
  
  const handleCallEnded = () => {
    console.log('📞 Call ended');
    setCallState('ended');
    stopDurationTimer();
    if (voiceCallService.isExpoGo && isRecording) {
      stopAudioRecording();
    }
  };

  const handleCallDurationUpdate = (duration) => {
    setCallDuration(duration);
  };

  const handleCallEndedByOther = (data) => {
    console.log('📞 Call ended by other user, duration:', data.duration, 'seconds');
    Alert.alert(
      'Call Ended', 
      `Call ended by ${callerName}. Duration: ${formatDuration(data.duration || 0)}`,
      [{ text: 'OK', onPress: () => navigateBack() }]
    );
  };
  
  const acceptCall = async () => {
    try {
      console.log('✅ User accepted the call');
      setCallState('connecting');
      
      // Accept the call through the voice call service
      const success = await voiceCallService.acceptCall(token);
      if (!success) {
        throw new Error('Failed to accept call');
      }
      
      console.log('✅ Call acceptance sent to backend');
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      setCallState('incoming'); // Reset to incoming state on error
      Alert.alert('Error', 'Failed to accept call: ' + error.message);
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
    switch (callState) {
      case 'incoming':
        return 'Incoming call...';
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
        return 'Unknown state';
    }
  };
  
  const renderActionButtons = () => {
    if (callState === 'incoming') {
      // Incoming call - show accept/decline
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
    } else if (callState === 'connected') {
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
    } else if (callState === 'calling' || callState === 'connecting') {
      // Calling or Connecting - show end call only
      return (
        <TouchableOpacity
          style={[styles.actionButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      );
    }
    
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
                uri={callerAvatar}
                name={callerName || 'Unknown'}
                size={120}
                style={styles.avatar}
              />
              {voiceCallService.isExpoGo && isRecording && (
                <View style={styles.recordingIndicator}>
                  <Ionicons name="mic" size={20} color="#FF6B6B" />
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
            <Text style={styles.callStatus}>{renderCallState()}</Text>
            
            {voiceCallService.isExpoGo && (
              <Text style={styles.expoGoNotice}>
                Using audio recording mode
              </Text>
            )}
          </View>
          
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
});
