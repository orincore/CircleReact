// NEW SIMPLIFIED VOICE CALL SERVICE - BUILT FROM SCRATCH
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSocket } from '../api/socket';
import { callAudioManager } from './CallAudioManager';
import { ensureNotificationPermission, ensureMicrophonePermission } from '@/utils/permissionGate';

// Import WebRTC for React Native (development build)
let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices;

// Check if we're in a browser environment (client-side only)
const isBrowser = typeof window !== 'undefined';

if (Platform.OS === 'web' && isBrowser) {
  // Browser WebRTC (client-side only)
  RTCPeerConnection = window.RTCPeerConnection;
  RTCSessionDescription = window.RTCSessionDescription;
  RTCIceCandidate = window.RTCIceCandidate;
  mediaDevices = navigator.mediaDevices;
  //console.log('✅ Browser WebRTC loaded successfully');
} else if (Platform.OS !== 'web') {
  // React Native WebRTC (development build)
  try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
    //console.log('✅ react-native-webrtc loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load react-native-webrtc:', error);
    console.error('⚠️ Voice calls will not work without react-native-webrtc in development build');
  }
}

class VoiceCallService {
  constructor() {
    // Core state
    this.socket = null;
    this.currentCallId = null;
    this.callState = 'idle'; // idle, incoming, calling, connecting, connected, ended
    this.isInitiator = false;
    this.isSpeakerOn = false;
    
    // WebRTC
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.processingOffer = false; // Flag to prevent duplicate offer processing
    this.processingAnswer = false; // Flag to prevent duplicate answer processing
    this.creatingOffer = false; // Flag to prevent duplicate offer creation
    
    // Callbacks
    this.onIncomingCall = null;
    this.onCallStateChange = null;
    this.onCallEnded = null;
    this.onError = null;
    
    // Call timer
    this.callStartTime = null;
    this.callDurationInterval = null;
    
    // Notification loop
    this.notificationLoopInterval = null;
    this.currentNotificationId = null;
    
    // Call timeout (1 minute for incoming calls)
    this.callTimeoutTimer = null;
    
    // Check WebRTC availability
    this.isWebRTCAvailable = !!(RTCPeerConnection && mediaDevices);
    
   
  }

  // Initialize socket connection
  async initializeSocket(token) {
    try {
      // Request notification permissions for Android
      if (Platform.OS === 'android') {
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted') {
            const { status } = await ensureNotificationPermission();
            finalStatus = status;
          }
          
          if (finalStatus !== 'granted') {
            console.warn('⚠️ Notification permission not granted');
          } else {
            //console.log('✅ Notification permissions granted');
          }
        } catch (error) {
          console.error('❌ Failed to request notification permissions:', error);
        }
      }
      
      this.socket = getSocket();
      
      if (!this.socket) {
        console.error('❌ Failed to get socket');
        return false;
      }

      this.setupSocketListeners();
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      return false;
    }
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    // Incoming call
    this.socket.on('voice:incoming-call', async (data) => {
      //console.log('📞 Incoming call received:', data);
      
      // Only prevent duplicate if we're already in an active call with the same ID
      // Allow new calls even from the same user after previous call ended
      if (this.currentCallId === data.callId && this.callState !== 'idle' && this.callState !== 'ended') {
        //console.log('⚠️ Duplicate incoming call event for same call ID, ignoring');
        return;
      }
      
      // If there's an active call with a different ID, ignore new incoming calls
      if (this.currentCallId && this.currentCallId !== data.callId && 
          this.callState !== 'idle' && this.callState !== 'ended') {
        //console.log('⚠️ Already in another call, ignoring new incoming call');
        return;
      }
      
      // Clean up any previous call state before accepting new call
      if (this.callState !== 'idle') {
        //console.log('🧹 Cleaning up previous call state before accepting new call');
        this.cleanup();
      }
      
      this.currentCallId = data.callId;
      this.isInitiator = false;
      this.setCallState('incoming');
      
      // Start 1-minute timeout for incoming call
      this.startCallTimeout();
      
      // Trigger callback immediately to show full-screen call UI
      if (this.onIncomingCall) {
        this.onIncomingCall({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar
        });
      }
    });

    // Call accepted
    this.socket.on('voice:call-accepted', (data) => {
      //console.log('✅ Call accepted:', data);
      
      // Update call ID with the one from backend
      if (data.callId) {
        this.currentCallId = data.callId;
        //console.log('📞 Updated call ID from backend:', this.currentCallId);
      }
      
      this.setCallState('connecting');
      
      if (this.isInitiator) {
        this.createOffer();
      }
    });

    // Call declined
    this.socket.on('voice:call-declined', () => {
      //console.log('❌ Call declined');
      this.setCallState('ended');
      this.cleanup();
    });

    // WebRTC offer
    this.socket.on('voice:offer', async (data) => {
      //console.log('📨 Received WebRTC offer');
      await this.handleOffer(data.offer);
    });

    // WebRTC answer
    this.socket.on('voice:answer', async (data) => {
      //console.log('📨 Received WebRTC answer');
      await this.handleAnswer(data.answer);
    });

    // ICE candidate
    this.socket.on('voice:ice-candidate', async (data) => {
      //console.log('🧊 Received ICE candidate');
      await this.handleIceCandidate(data.candidate);
    });

    // Call ended
    this.socket.on('voice:call-ended', (data) => {
      //console.log('📞 Call ended by other user');
      this.setCallState('ended');
      this.cleanup();
      
      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
    });

    // Generic voice errors (busy, permission issues, backend failures, etc.)
    this.socket.on('voice:error', (data) => {
      const message = data?.error || 'Call error occurred';
      //console.error('❌ Voice call error from backend:', data);
      this.setCallState('ended');
      this.cleanup();
      if (this.onError) {
        this.onError(message);
      }
    });
  }

  // Start a new call
  async startCall(receiverId, token) {
    try {
      //console.log('📞 Starting call to:', receiverId);
      
      if (!this.isWebRTCAvailable) {
        throw new Error('WebRTC is not available. Voice calls require a development build with react-native-webrtc.');
      }

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected');
      }

      const { status: micStatus } = await ensureMicrophonePermission();
      if (micStatus !== 'granted') {
        throw new Error('Microphone permission is required to make a call.');
      }

      // Generate call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentCallId = callId;
      this.isInitiator = true;
      
      // Set state
      this.setCallState('calling');
      
      // Send call request with correct call type
      this.socket.emit('voice:start-call', {
        callId,
        receiverId,
        callType: this.isExpoGo ? 'audio-fallback' : 'webrtc'
      });
      
      //console.log('✅ Call request sent');
      return true;
    } catch (error) {
      console.error('❌ Failed to start call:', error);
      if (this.onError) this.onError(error.message);
      return false;
    }
  }

  // Accept incoming call
  async acceptCall() {
    try {
      //console.log('✅ Accepting call:', this.currentCallId);
      
      // Stop notification loop and timeout when call is accepted
      this.stopNotificationLoop();
      this.stopCallTimeout();
      
      if (!this.isWebRTCAvailable) {
        throw new Error('WebRTC is not available. Voice calls require a development build with react-native-webrtc.');
      }
      
      if (!this.currentCallId) {
        throw new Error('No active call to accept');
      }

      // Prevent multiple accept calls
      if (this.callState !== 'incoming') {
        //console.log('⚠️ Call already accepted or in wrong state:', this.callState);
        return false;
      }

      const { status: micStatus } = await ensureMicrophonePermission();
      if (micStatus !== 'granted') {
        if (this.onError) this.onError('Microphone permission is required to accept a call.');
        this.declineCall();
        return false;
      }

      this.setCallState('connecting');
      
      this.socket.emit('voice:accept-call', {
        callId: this.currentCallId
      });
      
      // Wait for offer from initiator
      //console.log('⏳ Waiting for WebRTC offer...');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      if (this.onError) this.onError(error.message);
      return false;
    }
  }

  // Decline incoming call
  declineCall() {
    //console.log('❌ Declining call');
    
    // Stop notification loop and timeout when call is declined
    this.stopNotificationLoop();
    this.stopCallTimeout();
    
    if (this.currentCallId) {
      this.socket.emit('voice:decline-call', {
        callId: this.currentCallId
      });
    }
    
    this.setCallState('ended');
    this.cleanup();
  }

  // End active call
  endCall() {
    //console.log('📞 Ending call');
    
    // Stop all media tracks IMMEDIATELY before anything else
    if (this.localStream) {
      //console.log('🎤 Stopping microphone immediately...');
      this.localStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }
    
    if (this.currentCallId) {
      this.socket.emit('voice:end-call', {
        callId: this.currentCallId
      });
    }
    
    this.setCallState('ended');
    this.cleanup();
  }

  // WebRTC: Create offer
  async createOffer() {
    // Prevent duplicate offer creation
    if (this.creatingOffer) {
      //console.log('⚠️ Already creating offer, skipping duplicate call');
      return;
    }
    
    this.creatingOffer = true;
    
    try {
      //console.log('📤 Creating WebRTC offer...');
      
      // Only setup peer connection if it doesn't exist
      if (!this.peerConnection) {
        //console.log('⚠️ Peer connection not ready, setting up...');
        await this.setupPeerConnection();
      }
      
      // Double check peer connection exists after setup
      if (!this.peerConnection) {
        throw new Error('Failed to setup peer connection');
      }
      
      // Check signaling state before creating offer
      if (this.peerConnection.signalingState !== 'stable' && 
          this.peerConnection.signalingState !== 'have-local-offer') {
        //console.log('⚠️ Peer connection not in correct state for offer:', this.peerConnection.signalingState);
        return;
      }
      
      //console.log('📝 Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      //console.log('✅ Offer created');
      
      //console.log('📝 Setting local description (offer)...');
      await this.peerConnection.setLocalDescription(offer);
      //console.log('✅ Local description set');
      
      this.socket.emit('voice:offer', {
        callId: this.currentCallId,
        offer: offer
      });
      
      //console.log('✅ Offer sent to receiver');
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Only show error to user if it's a fatal error, not duplicate/state errors
      const isFatalError = !error.message.includes('Called in wrong state') && 
                          !error.message.includes('no pending remote description') &&
                          !error.message.includes('Local fingerprint does not match') &&
                          !error.message.includes('order of m-lines') &&
                          !error.message.includes('null');
      
      if (isFatalError && this.onError) {
        this.onError(error.message);
      }
    } finally {
      this.creatingOffer = false;
    }
  }

  // WebRTC: Handle offer
  async handleOffer(offer) {
    try {
      //console.log('📥 Handling WebRTC offer...');
      
      // Prevent processing duplicate offers
      if (this.processingOffer) {
        //console.log('⚠️ Already processing an offer, ignoring duplicate');
        return;
      }
      
      // If we already have a stable connection, ignore new offers
      if (this.peerConnection && this.peerConnection.signalingState === 'stable') {
        //console.log('⚠️ Already in stable state, ignoring duplicate offer');
        return;
      }
      
      // Set flag to prevent concurrent processing
      this.processingOffer = true;
      
      // Only setup peer connection if it doesn't exist
      if (!this.peerConnection) {
        await this.setupPeerConnection();
      } else {
        //console.log('✅ Using existing peer connection');
      }
      
      //console.log('📝 Current signaling state before offer:', this.peerConnection.signalingState);
      //console.log('📝 Setting remote description (offer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      //console.log('✅ Remote description set, new state:', this.peerConnection.signalingState);
      
      // Check state before creating answer
      if (this.peerConnection.signalingState !== 'have-remote-offer') {
        //console.log('⚠️ Wrong state after setting remote offer:', this.peerConnection.signalingState);
        return;
      }
      
      //console.log('📝 Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      //console.log('✅ Answer created');
      
      //console.log('📝 Setting local description (answer)...');
      //console.log('📝 Current state before setLocalDescription:', this.peerConnection.signalingState);
      await this.peerConnection.setLocalDescription(answer);
      //console.log('✅ Local description set, new state:', this.peerConnection.signalingState);
      
      this.socket.emit('voice:answer', {
        callId: this.currentCallId,
        answer: answer
      });
      
      //console.log('✅ Answer sent to caller');
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Only show error to user if it's a fatal error, not duplicate/state errors
      const isFatalError = !error.message.includes('Called in wrong state') && 
                          !error.message.includes('no pending remote description') &&
                          !error.message.includes('Local fingerprint does not match');
      
      if (isFatalError && this.onError) {
        this.onError(error.message);
      }
    } finally {
      this.processingOffer = false;
    }
  }

  // WebRTC: Handle answer
  async handleAnswer(answer) {
    try {
      //console.log('📥 Handling WebRTC answer...');
      
      // Check if peer connection exists
      if (!this.peerConnection) {
        console.error('❌ No peer connection available');
        return;
      }
      
      // Check if we're already processing an answer
      if (this.processingAnswer) {
        //console.log('⚠️ Already processing an answer, ignoring duplicate');
        return;
      }
      
      // Check if we already have a remote description (already in stable state)
      if (this.peerConnection.signalingState === 'stable') {
        //console.log('⚠️ Already in stable state, ignoring duplicate answer');
        return;
      }
      
      // Check if we're in the correct state to receive an answer
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        //console.log('⚠️ Not in correct state to receive answer:', this.peerConnection.signalingState);
        return;
      }
      
      // Set flag to prevent concurrent processing
      this.processingAnswer = true;
      
      //console.log('📝 Current signaling state:', this.peerConnection.signalingState);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      //console.log('✅ Answer processed, new state:', this.peerConnection.signalingState);
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Only show error to user if it's a fatal error, not duplicate/state errors
      const isFatalError = !error.message.includes('Called in wrong state') && 
                          !error.message.includes('no pending remote description') &&
                          !error.message.includes('Local fingerprint does not match');
      
      if (isFatalError && this.onError) {
        this.onError(error.message);
      }
    } finally {
      // Always clear the flag
      this.processingAnswer = false;
    }
  }

  // WebRTC: Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        //console.log('✅ ICE candidate added');
      }
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  // Setup WebRTC peer connection
  async setupPeerConnection() {
    if (this.peerConnection) {
      //console.log('⚠️ Peer connection already exists, reusing it');
      return;
    }
    
    // If already setting up, wait for it to complete
    if (this.settingUpPeerConnection) {
      //console.log('⚠️ Already setting up peer connection, waiting...');
      // Wait up to 5 seconds for setup to complete
      let attempts = 0;
      while (this.settingUpPeerConnection && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.peerConnection) {
        //console.log('✅ Peer connection ready after waiting');
        return;
      }
      
      console.error('❌ Peer connection setup timed out');
      throw new Error('Peer connection setup timed out');
    }
    
    this.settingUpPeerConnection = true;
    //console.log('🔧 Setting up peer connection...');
    
    // Get local audio stream first
    try {
      if (!mediaDevices) {
        this.settingUpPeerConnection = false;
        throw new Error('mediaDevices not available - WebRTC not properly initialized');
      }
      
      this.localStream = await mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      //console.log('🎤 Got local audio stream');
    } catch (error) {
      console.error('❌ Failed to get local stream:', error);
      this.settingUpPeerConnection = false;
      throw error;
    }

    // Create peer connection after we have the stream
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      //console.log('🔊 Received remote stream');
      this.remoteStream = event.streams[0];
      
      // Play remote audio
      if (Platform.OS === 'web' && isBrowser) {
        // Browser: use Audio element
        try {
          const audioElement = new Audio();
          audioElement.srcObject = this.remoteStream;
          audioElement.autoplay = true;
          audioElement.play().catch(err => {
            console.warn('⚠️ Audio autoplay blocked, user interaction may be required:', err);
          });
          //console.log('🔊 Browser audio element created and playing');
        } catch (error) {
          console.error('❌ Failed to create audio element:', error);
        }
      } else {
        // React Native: audio plays automatically through device speakers
        // No need to manually play - react-native-webrtc handles this
        //console.log('🔊 Remote audio stream received (will play automatically on native)');
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        //console.log('🧊 Sending ICE candidate');
        this.socket.emit('voice:ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return; // Guard against null after cleanup
      
      //console.log('🔄 Connection state:', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'connected') {
        //console.log('✅ WebRTC connection established!');
        this.setCallState('connected');
        this.startCallTimer();
        callAudioManager.start();
        this.isSpeakerOn = false;
      } else if (this.peerConnection.connectionState === 'failed') {
        console.error('❌ Connection failed');
        this.endCall();
      } else if (this.peerConnection.connectionState === 'disconnected') {
        //console.log('⚠️ Connection disconnected');
        this.endCall();
      } else if (this.peerConnection.connectionState === 'closed') {
        //console.log('🔒 Connection closed');
        this.cleanup();
      }
    };
    
    // Also handle ICE connection state for better debugging
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return; // Guard against null after cleanup
      
      //console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
      
      if (this.peerConnection.iceConnectionState === 'connected' || 
          this.peerConnection.iceConnectionState === 'completed') {
        //console.log('✅ ICE connection established');
      } else if (this.peerConnection.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed');
      }
    };

    this.settingUpPeerConnection = false;
    //console.log('✅ Peer connection setup complete');
  }

  // Start call timer
  startCallTimer() {
    this.callStartTime = Date.now();
    
    this.callDurationInterval = setInterval(() => {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      if (this.onCallStateChange) {
        this.onCallStateChange('connected', { duration });
      }
    }, 1000);
  }

  // Stop call timer
  stopCallTimer() {
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
      this.callDurationInterval = null;
    }
  }

  // Start notification loop (for incoming calls)
  startNotificationLoop(callData) {
    if (Platform.OS !== 'android') return;
    
    //console.log('🔔 Starting notification loop for 1 minute');
    
    // Clear any existing loop
    this.stopNotificationLoop();
    
    // Store call data for the loop
    this.loopCallData = callData;
    
    // Track notification count
    this.notificationCount = 0;
    this.maxNotifications = 20; // 20 notifications in 1 minute (every 3 seconds)
    
    // Trigger notification immediately
    if (this.onNotificationNeeded) {
      this.onNotificationNeeded(callData);
      this.notificationCount++;
    }
    
    // Set up interval to repeat notification every 3 seconds
    this.notificationLoopInterval = setInterval(() => {
      this.notificationCount++;
      //console.log(`🔔 Repeating notification... (${this.notificationCount}/${this.maxNotifications})`);
      
      // Check if we've reached max notifications or call state changed
      if (this.notificationCount >= this.maxNotifications) {
        //console.log('⏰ Reached maximum notifications (1 minute)');
        this.stopNotificationLoop();
        return;
      }
      
      if (this.onNotificationNeeded && this.callState === 'incoming') {
        this.onNotificationNeeded(callData);
      } else {
        // Stop loop if call state changed
        this.stopNotificationLoop();
      }
    }, 3000); // Repeat every 3 seconds
  }

  // Stop notification loop
  stopNotificationLoop() {
    if (this.notificationLoopInterval) {
      //console.log('🔕 Stopping notification loop');
      clearInterval(this.notificationLoopInterval);
      this.notificationLoopInterval = null;
    }
    
    // Dismiss any active notifications
    if (this.currentNotificationId && Platform.OS === 'android') {
      try {
        Notifications.dismissNotificationAsync(this.currentNotificationId);
      } catch (error) {
        console.error('Failed to dismiss notification:', error);
      }
      this.currentNotificationId = null;
    }
  }

  // Start call timeout (1 minute for incoming calls)
  startCallTimeout() {
    // Clear any existing timeout first (without logging)
    if (this.callTimeoutTimer) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
    
    //console.log('⏰ Starting 1-minute call timeout');
    
    // Set 1-minute timeout
    this.callTimeoutTimer = setTimeout(() => {
      //console.log('⏰ Call timeout reached (1 minute) - no response');
      
      if (this.callState === 'incoming' || this.callState === 'calling') {
        //console.log('📞 Auto-ending call due to timeout');
        
        // Stop notification loop
        this.stopNotificationLoop();
        
        // Emit timeout event to backend
        if (this.socket && this.currentCallId) {
          this.socket.emit('voice:call-timeout', {
            callId: this.currentCallId
          });
        }
        
        // End the call
        this.endCall();
        
        // Notify UI
        if (this.onCallEnded) {
          this.onCallEnded('timeout');
        }
      }
    }, 60000); // 60 seconds = 1 minute
  }

  // Stop call timeout
  stopCallTimeout() {
    if (this.callTimeoutTimer) {
      //console.log('⏰ Stopping call timeout');
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }
  }

  // Set call state
  setCallState(newState) {
    //console.log('📞 Call state:', this.callState, '->', newState);
    this.callState = newState;
    
    if (this.onCallStateChange) {
      this.onCallStateChange(newState);
    }
  }

  // Cleanup
  cleanup() {
    
    
    this.stopCallTimer();
    this.stopNotificationLoop();
    this.stopCallTimeout();
    
    // Stop all media tracks FIRST (critical for microphone release)
    if (this.localStream) {
      //console.log('🎤 Stopping local stream tracks...');
      this.localStream.getTracks().forEach(track => {
        //console.log('🛑 Stopping track:', track.kind, track.label);
        track.stop();
        track.enabled = false; // Ensure track is disabled
      });
      this.localStream = null;
      //console.log('✅ Local stream stopped and cleared');
    }
    
    // Stop remote stream tracks
    if (this.remoteStream) {
      //console.log('🔊 Stopping remote stream tracks...');
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      this.remoteStream = null;
      //console.log('✅ Remote stream stopped and cleared');
    }
    
    // Close peer connection AFTER stopping tracks
    if (this.peerConnection) {
      //console.log('🔌 Closing peer connection...');
      
      // Remove event handlers to prevent errors after cleanup
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      
      this.peerConnection.close();
      this.peerConnection = null;
      //console.log('✅ Peer connection closed');
    }
    
    callAudioManager.stop();
    // Reset state
    const previousCallId = this.currentCallId;
    this.currentCallId = null;
    this.isInitiator = false;
    this.callStartTime = null;
    
    // Reset processing flags
    this.processingOffer = false;
    this.processingAnswer = false;
    this.settingUpPeerConnection = false;
    
    this.setCallState('idle');
    
    
  }

  // Get current state
  getCallState() {
    return this.callState;
  }

  setSpeakerEnabled(enabled) {
    if (Platform.OS === 'web') return;
    this.isSpeakerOn = !!enabled;
    callAudioManager.setSpeakerEnabled(this.isSpeakerOn);
  }

  toggleSpeaker() {
    this.setSpeakerEnabled(!this.isSpeakerOn);
    return this.isSpeakerOn;
  }
}

// Export singleton instance
export const voiceCallService = new VoiceCallService();
export default voiceCallService;
