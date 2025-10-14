import { voiceCallService } from '@/src/services/VoiceCallService';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Avatar from './Avatar';

const { width, height } = Dimensions.get('window');

const VoiceCallModal = ({ 
  visible, 
  onClose, 
  callData, 
  token 
}) => {
  const [callState, setCallState] = useState('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [error, setError] = useState(null);

  // Timer for call duration
  useEffect(() => {
    let interval = null;
    
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Set up voice call service listeners
  useEffect(() => {
    if (!visible) return;

    // Call state change listener
    voiceCallService.onCallStateChange = (newState) => {
      //console.log('📞 Call state changed to:', newState);
      setCallState(newState);
      
      if (newState === 'ended') {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    };

    // Remote stream listener
    voiceCallService.onRemoteStream = (stream) => {
      //console.log('🎵 Remote stream received');
      // For voice calls, we don't need to do anything with the stream
      // The audio will play automatically through the device speakers
    };

    // Call ended listener
    voiceCallService.onCallEnded = () => {
      //console.log('📞 Call ended');
      setTimeout(() => {
        onClose();
      }, 1000);
    };

    // Error listener
    voiceCallService.onError = (errorMessage) => {
      console.error('❌ Call error:', errorMessage);
      setError(errorMessage);
    };

    return () => {
      // Clean up listeners
      voiceCallService.onCallStateChange = null;
      voiceCallService.onRemoteStream = null;
      voiceCallService.onCallEnded = null;
      voiceCallService.onError = null;
    };
  }, [visible, onClose]);

  // Handle accepting incoming call
  const handleAcceptCall = async () => {
    //console.log('✅ Accepting call');
    setError(null);
    const success = await voiceCallService.acceptCall(token);
    if (!success) {
      setError('Failed to accept call');
    }
  };

  // Handle declining call
  const handleDeclineCall = () => {
    //console.log('❌ Declining call');
    voiceCallService.declineCall();
    onClose();
  };

  // Handle ending call
  const handleEndCall = () => {
    //console.log('📞 Ending call');
    voiceCallService.endCall();
  };

  // Handle mute toggle
  const handleToggleMute = () => {
    const muted = voiceCallService.toggleMute();
    setIsMuted(muted);
  };

  // Handle speaker toggle
  const handleToggleSpeaker = () => {
    const speakerOn = voiceCallService.toggleSpeaker();
    setIsSpeakerOn(speakerOn);
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get call state display text
  const getCallStateText = () => {
    switch (callState) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Incoming call';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  // Get call state color
  const getCallStateColor = () => {
    switch (callState) {
      case 'calling':
      case 'connecting':
        return '#FFD6F2';
      case 'ringing':
        return '#4ADE80';
      case 'connected':
        return '#10B981';
      case 'ended':
        return '#EF4444';
      default:
        return '#FFD6F2';
    }
  };

  if (!visible || !callData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#1a0b2e', '#2d1b4e', '#4a2c6a']}
        style={styles.container}
      >
        {/* Background blur effect */}
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.callStateText}>{getCallStateText()}</Text>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Avatar
            uri={callData.avatar || callData.photoUrl}
            size={120}
            style={styles.avatar}
          />
          <Text style={styles.userName}>
            {callData.name || `${callData.first_name} ${callData.last_name}`.trim()}
          </Text>
          <Text style={styles.userStatus}>
            {callState === 'ringing' ? 'Incoming voice call' : 'Voice call'}
          </Text>
        </View>

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          {callState === 'ringing' ? (
            // Incoming call controls
            <View style={styles.incomingControls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.declineButton]}
                onPress={handleDeclineCall}
              >
                <Ionicons name="call" size={32} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, styles.acceptButton]}
                onPress={handleAcceptCall}
              >
                <Ionicons name="call" size={32} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            // Active call controls
            <View style={styles.activeControls}>
              {/* Mute button */}
              <TouchableOpacity
                style={[styles.smallControlButton, isMuted && styles.activeControlButton]}
                onPress={handleToggleMute}
              >
                <Ionicons 
                  name={isMuted ? "mic-off" : "mic"} 
                  size={24} 
                  color={isMuted ? "#7C2B86" : "white"} 
                />
              </TouchableOpacity>

              {/* End call button */}
              <TouchableOpacity
                style={[styles.controlButton, styles.endCallButton]}
                onPress={handleEndCall}
              >
                <Ionicons name="call" size={32} color="white" />
              </TouchableOpacity>

              {/* Speaker button (mobile only) */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.smallControlButton, isSpeakerOn && styles.activeControlButton]}
                  onPress={handleToggleSpeaker}
                >
                  <Ionicons 
                    name={isSpeakerOn ? "volume-high" : "volume-medium"} 
                    size={24} 
                    color={isSpeakerOn ? "#7C2B86" : "white"} 
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Call state indicator */}
        <View style={styles.stateIndicator}>
          <View style={[styles.stateIndicatorDot, { backgroundColor: getCallStateColor() }]} />
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  callStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatar: {
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  userStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
    alignItems: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    gap: 30,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  smallControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
    transform: [{ rotate: '135deg' }],
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    transform: [{ rotate: '135deg' }],
  },
  activeControlButton: {
    backgroundColor: 'rgba(255, 214, 242, 0.3)',
  },
  stateIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : StatusBar.currentHeight + 40,
    right: 20,
  },
  stateIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default VoiceCallModal;
