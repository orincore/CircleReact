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
import { voiceCallService } from '@/src/services/VoiceCallService';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';

export default function VoiceCallScreen() {
  const router = useRouter();
  const { callId, callerId, callerName, callerAvatar, isIncoming } = useLocalSearchParams();
  const { token, user } = useAuth();
  
  // Simple state management
  const isIncomingCall = isIncoming === 'true';
  const [callState, setCallState] = useState(isIncomingCall ? 'incoming' : 'calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    console.log('📞 Voice call screen mounted:', {
      callId,
      callerId,
      callerName,
      callerAvatar,
      isIncomingCall,
      initialState: isIncomingCall ? 'incoming' : 'calling',
      user: user,
      userAvatar: user?.profile_photo_url,
      userFirstName: user?.first_name,
      userLastName: user?.last_name
    });
    
    // Initialize socket
    voiceCallService.initializeSocket(token);
    
    // Setup listeners
    voiceCallService.onCallStateChange = (newState, data) => {
      console.log('📞 State changed to:', newState, 'from:', callState);
      
      // Prevent state changes during cleanup
      if (isCleaningUp) {
        console.log('⚠️ Ignoring state change during cleanup');
        return;
      }
      
      setCallState(newState);
      
      if (data?.duration) {
        setCallDuration(data.duration);
      }
      
      if (newState === 'ended') {
        setIsCleaningUp(true);
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/secure/chat');
          }
        }, 1500);
      }
    };
    
    voiceCallService.onCallEnded = () => {
      console.log('📞 Call ended callback');
      if (!isCleaningUp) {
        setIsCleaningUp(true);
        setCallState('ended');
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/secure/chat');
          }
        }, 1500);
      }
    };
    
    voiceCallService.onError = (error) => {
      console.error('❌ Call error:', error);
      // Only show error alert if it's not during cleanup
      if (!isCleaningUp) {
        alert(`Call error: ${error}`);
      }
    };
    
    // Set call ID and state if incoming - CRITICAL for showing accept/decline screen
    if (isIncomingCall) {
      voiceCallService.currentCallId = callId;
      voiceCallService.isInitiator = false;
      voiceCallService.setCallState('incoming');
      setCallState('incoming'); // Ensure UI state matches
      console.log('📞 Set incoming call state');
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
    
    // Cleanup on unmount
    return () => {
      console.log('📞 Voice call screen unmounting - cleaning up');
      setIsCleaningUp(true);
      voiceCallService.cleanup();
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
    if (isCleaningUp) return;
    
    console.log('❌ Declining call');
    setIsCleaningUp(true);
    voiceCallService.declineCall();
    
    // Give time for cleanup before navigating back
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/secure/chat');
      }
    }, 300);
  };
  
  // End call
  const handleEnd = () => {
    if (isCleaningUp) return;
    
    console.log('📞 Ending call');
    setIsCleaningUp(true);
    voiceCallService.endCall();
    
    // Give time for cleanup before navigating back
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/secure/chat');
      }
    }, 300);
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
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/secure/chat');
                }
              }}
            >
              <Ionicons name="chevron-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Voice Call</Text>
          </View>
          
          {/* Call Info */}
          <View style={styles.callInfo}>
            {/* Dual Avatar Layout */}
            <View style={styles.dualAvatarContainer}>
              {/* Other User Avatar (Larger) */}
              <Animated.View style={[styles.mainAvatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Avatar
                  user={{
                    id: callerId,
                    name: callerName || 'Unknown',
                    profile_photo_url: callerAvatar || '',
                    first_name: callerName?.split(' ')[0] || 'Unknown',
                    last_name: callerName?.split(' ')[1] || ''
                  }}
                  size={120}
                  style={[
                    styles.mainAvatar,
                    callState === 'connected' && styles.connectedAvatar
                  ]}
                  disabled={true}
                />
                
                {isIncomingCall && callState === 'incoming' && (
                  <View style={styles.incomingIndicator}>
                    <Ionicons name="call" size={20} color="white" />
                  </View>
                )}
              </Animated.View>
              
              {/* Current User Avatar (Smaller, bottom right) */}
              {user && (
                <View style={styles.myAvatarContainer}>
                  <Avatar
                    user={{
                      id: user.id,
                      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'You',
                      profile_photo_url: user.profile_photo_url,
                      first_name: user.first_name,
                      last_name: user.last_name
                    }}
                    size={70}
                    style={styles.myAvatar}
                    disabled={true}
                  />
                  <View style={styles.myAvatarLabel}>
                    <Text style={styles.myAvatarText}>You</Text>
                  </View>
                </View>
              )}
            </View>
            
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
  dualAvatarContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainAvatarContainer: {
    position: 'relative',
    zIndex: 1,
  },
  mainAvatar: {
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  connectedAvatar: {
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  incomingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  myAvatarContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 2,
  },
  myAvatar: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  myAvatarLabel: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  myAvatarText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
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
