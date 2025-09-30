// NEW SIMPLIFIED VOICE CALL SERVICE - BUILT FROM SCRATCH
import { getSocket } from '../api/socket';

class VoiceCallService {
  constructor() {
    // Core state
    this.socket = null;
    this.currentCallId = null;
    this.callState = 'idle'; // idle, incoming, calling, connecting, connected, ended
    this.isInitiator = false;
    
    // WebRTC
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    
    // Callbacks
    this.onIncomingCall = null;
    this.onCallStateChange = null;
    this.onCallEnded = null;
    this.onError = null;
    
    // Call timer
    this.callStartTime = null;
    this.callDurationInterval = null;
    
    console.log('✅ VoiceCallService initialized');
  }

  // Initialize socket connection
  initializeSocket(token) {
    try {
      this.socket = getSocket();
      
      if (!this.socket) {
        console.error('❌ Failed to get socket');
        return false;
      }

      console.log('✅ Socket initialized for voice calls:', {
        connected: this.socket.connected,
        id: this.socket.id
      });

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
    this.socket.on('voice:incoming-call', (data) => {
      console.log('📞 Incoming call received:', data);
      
      this.currentCallId = data.callId;
      this.isInitiator = false;
      this.setCallState('incoming');
      
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
      console.log('✅ Call accepted:', data);
      this.setCallState('connecting');
      
      if (this.isInitiator) {
        this.createOffer();
      }
    });

    // Call declined
    this.socket.on('voice:call-declined', () => {
      console.log('❌ Call declined');
      this.setCallState('ended');
      this.cleanup();
    });

    // WebRTC offer
    this.socket.on('voice:offer', async (data) => {
      console.log('📨 Received WebRTC offer');
      await this.handleOffer(data.offer);
    });

    // WebRTC answer
    this.socket.on('voice:answer', async (data) => {
      console.log('📨 Received WebRTC answer');
      await this.handleAnswer(data.answer);
    });

    // ICE candidate
    this.socket.on('voice:ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate');
      await this.handleIceCandidate(data.candidate);
    });

    // Call ended
    this.socket.on('voice:call-ended', (data) => {
      console.log('📞 Call ended by other user');
      this.setCallState('ended');
      this.cleanup();
      
      if (this.onCallEnded) {
        this.onCallEnded(data);
      }
    });
  }

  // Start a new call
  async startCall(receiverId, token) {
    try {
      console.log('📞 Starting call to:', receiverId);
      
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected');
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
      
      console.log('✅ Call request sent');
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
      console.log('✅ Accepting call:', this.currentCallId);
      
      if (!this.currentCallId) {
        throw new Error('No active call to accept');
      }

      this.setCallState('connecting');
      
      this.socket.emit('voice:accept-call', {
        callId: this.currentCallId
      });
      
      // Wait for offer from initiator
      console.log('⏳ Waiting for WebRTC offer...');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      if (this.onError) this.onError(error.message);
      return false;
    }
  }

  // Decline incoming call
  declineCall() {
    console.log('❌ Declining call');
    
    if (this.currentCallId) {
      this.socket.emit('voice:decline-call', {
        callId: this.currentCallId
      });
    }
    
    this.cleanup();
  }

  // End active call
  endCall() {
    console.log('📞 Ending call');
    
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
    try {
      console.log('📤 Creating WebRTC offer...');
      
      await this.setupPeerConnection();
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      this.socket.emit('voice:offer', {
        callId: this.currentCallId,
        offer: offer
      });
      
      console.log('✅ Offer sent');
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      if (this.onError) this.onError(error.message);
    }
  }

  // WebRTC: Handle offer
  async handleOffer(offer) {
    try {
      console.log('📥 Handling WebRTC offer...');
      
      await this.setupPeerConnection();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.socket.emit('voice:answer', {
        callId: this.currentCallId,
        answer: answer
      });
      
      console.log('✅ Answer sent');
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      if (this.onError) this.onError(error.message);
    }
  }

  // WebRTC: Handle answer
  async handleAnswer(answer) {
    try {
      console.log('📥 Handling WebRTC answer...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Answer processed');
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      if (this.onError) this.onError(error.message);
    }
  }

  // WebRTC: Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('✅ ICE candidate added');
      }
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  // Setup WebRTC peer connection
  async setupPeerConnection() {
    if (this.peerConnection) {
      console.log('⚠️ Peer connection already exists');
      return;
    }

    console.log('🔧 Setting up peer connection...');
    
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Get local audio stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      console.log('🎤 Got local audio stream');
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    } catch (error) {
      console.error('❌ Failed to get local stream:', error);
      throw error;
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('🔊 Received remote stream');
      this.remoteStream = event.streams[0];
      
      // Play remote audio
      const audioElement = new Audio();
      audioElement.srcObject = this.remoteStream;
      audioElement.play();
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Sending ICE candidate');
        this.socket.emit('voice:ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'connected') {
        this.setCallState('connected');
        this.startCallTimer();
      } else if (this.peerConnection.connectionState === 'failed' || 
                 this.peerConnection.connectionState === 'disconnected') {
        this.endCall();
      }
    };

    console.log('✅ Peer connection setup complete');
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

  // Set call state
  setCallState(newState) {
    console.log('📞 Call state:', this.callState, '->', newState);
    this.callState = newState;
    
    if (this.onCallStateChange) {
      this.onCallStateChange(newState);
    }
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up call resources...');
    
    this.stopCallTimer();
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Reset state
    this.currentCallId = null;
    this.isInitiator = false;
    this.callStartTime = null;
    
    this.setCallState('idle');
    
    console.log('✅ Cleanup complete');
  }

  // Get current state
  getCallState() {
    return this.callState;
  }
}

// Export singleton instance
export const voiceCallService = new VoiceCallService();
export default voiceCallService;
