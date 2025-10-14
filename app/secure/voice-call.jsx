// NEW SIMPLIFIED VOICE CALL SCREEN - BUILT FROM SCRATCH
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { voiceCallService } from '@/src/services/VoiceCallService';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

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
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
 
    
    // Socket should already be initialized by useVoiceCall hook
    // Only initialize if not already connected
    if (!voiceCallService.socket || !voiceCallService.socket.connected) {
      //console.log('⚠️ Socket not connected, initializing...');
      voiceCallService.initializeSocket(token);
    } else {
      //console.log('✅ Socket already connected');
    }
    
    // Setup listeners
    voiceCallService.onCallStateChange = (newState, data) => {
      //console.log('📞 State changed to:', newState, 'from:', callState);
      
      // Prevent state changes during cleanup
      if (isCleaningUp) {
        //console.log('⚠️ Ignoring state change during cleanup');
        return;
      }
      
      setCallState(newState);
      
      if (data?.duration) {
        setCallDuration(data.duration);
      }
      
      if (newState === 'ended') {
        setIsCleaningUp(true);
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    };
    
    voiceCallService.onCallEnded = () => {
      //console.log('📞 Call ended callback');
      if (!isCleaningUp) {
        setIsCleaningUp(true);
        setCallState('ended');
        setTimeout(() => {
          router.back();
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
    
    // Set call ID and state if incoming - ONLY if not already set
    if (isIncomingCall && voiceCallService.currentCallId !== callId) {
      voiceCallService.currentCallId = callId;
      voiceCallService.isInitiator = false;
      voiceCallService.setCallState('incoming');
      setCallState('incoming'); // Ensure UI state matches
      //console.log('📞 Set incoming call state');
    } else if (isIncomingCall) {
      // Just sync UI state with service state, don't trigger state change
      setCallState(voiceCallService.callState);
      //console.log('📞 Synced UI state with service:', voiceCallService.callState);
    } else if (!isIncomingCall && callId === 'pending') {
      // For outgoing calls with 'pending' callId, wait for service to generate real callId
      //console.log('📞 Outgoing call - waiting for service to generate call ID');
    }
    
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Rotating gradient animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
    
    // Wave animations (for connected state)
    if (callState === 'connected') {
      [waveAnim1, waveAnim2, waveAnim3].forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              delay: index * 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }
    
    // Cleanup on unmount
    return () => {
      //console.log('📞 Voice call screen unmounting - cleaning up');
      //console.log('📞 Current call state:', callState);
      //console.log('📞 Is cleaning up:', isCleaningUp);
      
      // Only cleanup if we're actually ending the call
      // Don't cleanup if the screen is just re-rendering
      if (callState === 'ended' || isCleaningUp) {
        //console.log('✅ Cleaning up voice call resources');
        setIsCleaningUp(true);
        voiceCallService.cleanup();
      } else {
        //console.log('⚠️ Screen unmounting but call still active - not cleaning up');
      }
      
      voiceCallService.onCallStateChange = null;
      voiceCallService.onCallEnded = null;
      voiceCallService.onError = null;
    };
  }, [callState, isCleaningUp]);
  
  // Accept call
  const handleAccept = async () => {
    //console.log('✅ Accepting call');
    await voiceCallService.acceptCall();
  };
  
  // Decline call
  const handleDecline = () => {
    if (isCleaningUp) return;
    
    //console.log('❌ Declining call');
    setIsCleaningUp(true);
    voiceCallService.declineCall();
    
    // Navigate back after brief delay
    setTimeout(() => {
      router.back();
    }, 300);
  };
  
  // End call
  const handleEnd = () => {
    if (isCleaningUp) return;
    
    //console.log('📞 Ending call');
    setIsCleaningUp(true);
    voiceCallService.endCall();
    
    // Give time for cleanup before navigating back
    setTimeout(() => {
      router.back();
    }, 300);
  };
  
  // Toggle mute
  const handleToggleMute = () => {
    //console.log('🔇 Toggle mute clicked, current state:', isMuted);
    
    if (!voiceCallService.localStream) {
      console.error('❌ No local stream available');
      return;
    }
    
    const audioTracks = voiceCallService.localStream.getAudioTracks();
    //console.log('🎤 Audio tracks:', audioTracks.length);
    
    if (audioTracks.length > 0) {
      const audioTrack = audioTracks[0];
      const newMutedState = !audioTrack.enabled;
      audioTrack.enabled = !newMutedState;
      setIsMuted(newMutedState);
      //console.log('✅ Mute toggled:', newMutedState ? 'MUTED' : 'UNMUTED');
    } else {
      console.error('❌ No audio tracks found');
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
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Animated Background Circles */}
        <Animated.View style={[styles.bgCircle1, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.bgCircle2, { transform: [{ rotate: spin }] }]} />
        
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
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
                <BlurView intensity={20} tint="dark" style={styles.backButtonBlur}>
                  <Ionicons name="chevron-back" size={24} color="white" />
                </BlurView>
              </TouchableOpacity>
              <BlurView intensity={30} tint="dark" style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Voice Call</Text>
              </BlurView>
            </View>
          
          {/* Call Info */}
          <View style={styles.callInfo}>
            {/* Dual Avatar Layout */}
            <View style={styles.dualAvatarContainer}>
              {/* Other User Avatar (Larger) */}
              <Animated.View style={[styles.mainAvatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[
                  styles.avatarWrapper,
                  callState === 'connected' && styles.avatarWrapperConnected
                ]}>
                  <Avatar
                    user={{
                      id: callerId,
                      name: callerName || 'Unknown',
                      profile_photo_url: callerAvatar || '',
                      first_name: callerName?.split(' ')[0] || 'Unknown',
                      last_name: callerName?.split(' ')[1] || ''
                    }}
                    size={120}
                    style={styles.mainAvatar}
                    disabled={true}
                  />
                </View>
                
                {isIncomingCall && callState === 'incoming' && (
                  <View style={styles.incomingIndicator}>
                    <Ionicons name="call" size={20} color="white" />
                  </View>
                )}
              </Animated.View>
              
              {/* Current User Avatar (Smaller, bottom right) */}
              {user && (
                <View style={styles.myAvatarContainer}>
                  <View style={styles.myAvatarWrapper}>
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
                  </View>
                  <View style={styles.myAvatarLabel}>
                    <Text style={styles.myAvatarText}>You</Text>
                  </View>
                </View>
              )}
            </View>
            
            <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
            <Text style={styles.callStatus}>{renderStatusText()}</Text>
          </View>
          
            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {renderButtons()}
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    top: -width * 0.5,
    right: -width * 0.3,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    bottom: -width * 0.4,
    left: -width * 0.2,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  backButtonBlur: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.5,
  },
  callInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualAvatarContainer: {
    position: 'relative',
    width: 220,
    height: 220,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainAvatarContainer: {
    position: 'relative',
    zIndex: 1,
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    backgroundColor: 'transparent',
  },
  avatarWrapper: {
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarWrapperConnected: {
    borderWidth: 5,
    borderColor: '#00E676',
    shadowColor: '#00E676',
    shadowOpacity: 0.8,
  },
  mainAvatar: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  incomingIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#00E676',
    borderRadius: 24,
    padding: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  myAvatarContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    backgroundColor: 'transparent',
  },
  myAvatarWrapper: {
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
  },
  myAvatar: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  myAvatarLabel: {
    position: 'absolute',
    bottom: -28,
    left: -10,
    right: -10,
    alignItems: 'center',
  },
  myAvatarText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  callerName: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 24,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  callStatus: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 2,
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
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  acceptButton: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
    shadowOpacity: 0.6,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  declineButton: {
    backgroundColor: '#FF3D00',
    shadowColor: '#FF3D00',
    shadowOpacity: 0.6,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  endButton: {
    backgroundColor: '#FF3D00',
    shadowColor: '#FF3D00',
    shadowOpacity: 0.6,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 61, 0, 0.25)',
    borderColor: '#FF3D00',
    shadowColor: '#FF3D00',
    shadowOpacity: 0.5,
  },
});
