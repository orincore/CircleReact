// NEW SIMPLIFIED VOICE CALL SCREEN - BUILT FROM SCRATCH
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { voiceCallService } from '@/src/services/VoiceCallService.new';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';

export default function VoiceCallScreen() {
  const router = useRouter();
  const { callId, callerId, callerName, callerAvatar, isIncoming } = useLocalSearchParams();
  const { token } = useAuth();
  
  // Simple state management
  const isIncomingCall = isIncoming === 'true';
  const [callState, setCallState] = useState(isIncomingCall ? 'incoming' : 'calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    console.log('📞 Voice call screen mounted:', {
      callId,
      callerId,
      callerName,
      isIncomingCall
    });
    
    // Initialize socket
    voiceCallService.initializeSocket(token);
    
    // Setup listeners
    voiceCallService.onCallStateChange = (newState, data) => {
      console.log('📞 State changed to:', newState);
      setCallState(newState);
      
      if (data?.duration) {
        setCallDuration(data.duration);
      }
      
      if (newState === 'ended') {
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    };
    
    voiceCallService.onCallEnded = () => {
      console.log('📞 Call ended');
      setTimeout(() => {
        router.back();
      }, 2000);
    };
    
    voiceCallService.onError = (error) => {
      console.error('❌ Call error:', error);
      alert(`Call error: ${error}`);
    };
    
    // Set call ID if incoming
    if (isIncomingCall) {
      voiceCallService.currentCallId = callId;
      voiceCallService.setCallState('incoming');
    }
    
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
    
    return () => {
      voiceCallService.onCallStateChange = null;
      voiceCallService.onCallEnded = null;
      voiceCallService.onError = null;
    };
  }, []);
  
  // Accept call
  const handleAccept = async () => {
    console.log('✅ Accepting call');
    await voiceCallService.acceptCall();
  };
  
  // Decline call
  const handleDecline = () => {
    console.log('❌ Declining call');
    voiceCallService.declineCall();
    router.back();
  };
  
  // End call
  const handleEnd = () => {
    console.log('📞 Ending call');
    voiceCallService.endCall();
    router.back();
  };
  
  // Toggle mute
  const handleToggleMute = () => {
    if (voiceCallService.localStream) {
      const audioTrack = voiceCallService.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('🔇 Mute:', !audioTrack.enabled);
      }
    }
  };
  
  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render call status text
  const renderStatusText = () => {
    switch (callState) {
      case 'incoming':
        return 'Incoming call...';
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return 'Voice call';
    }
  };
  
  // Render action buttons
  const renderButtons = () => {
    if (isIncomingCall && callState === 'incoming') {
      // Incoming call - show accept/decline
      return (
        <View style={styles.incomingActions}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
          >
            <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Ionicons name="call" size={32} color="white" />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (callState === 'connected') {
      // Connected - show mute and end
      return (
        <View style={styles.connectedActions}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={handleToggleMute}
          >
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={24} 
              color={isMuted ? "#FF6B6B" : "white"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.endButton]}
            onPress={handleEnd}
          >
            <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (callState === 'calling' || callState === 'connecting') {
      // Calling/Connecting - show end only
      return (
        <TouchableOpacity
          style={[styles.button, styles.endButton]}
          onPress={handleEnd}
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
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
              
              {isIncomingCall && (
                <View style={styles.incomingIndicator}>
                  <Ionicons name="call" size={24} color="white" />
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
            <Text style={styles.callStatus}>{renderStatusText()}</Text>
            
            {isIncomingCall && callState === 'incoming' && (
              <Text style={styles.incomingText}>Incoming voice call</Text>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {renderButtons()}
          </View>
        </View>
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
  incomingText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionsContainer: {
    paddingBottom: 50,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  connectedActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  endButton: {
    backgroundColor: '#F44336',
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
