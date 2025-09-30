import { Platform, Alert } from 'react-native';
import { getSocket } from '@/src/api/socket';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// WebRTC imports with platform detection and Expo Go compatibility
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices;
let isExpoGo = false;
try {
  // Only consider Expo Go on mobile platforms, never on web
  if (Platform.OS !== 'web') {
    isExpoGo = Constants.appOwnership === 'expo' || __DEV__;
  } else {
    isExpoGo = false; // Web browsers should never use Expo Go mode
  }
} catch (error) {
  // If Constants is not available, assume not Expo Go (likely web)
  isExpoGo = Platform.OS !== 'web' ? true : false;
}

if (Platform.OS === 'web') {
  // Browser WebRTC - check if running in browser environment
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
    RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
    mediaDevices = navigator.mediaDevices;
    
    // Detect iOS browsers
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && isSafari;
    
    console.log('✅ VoiceCallService: Browser WebRTC loaded');
    console.log('📱 Browser info:', {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: isIOS,
      isSafari: isSafari,
      isIOSSafari: isIOSSafari,
      hasWebRTC: !!RTCPeerConnection,
      hasMediaDevices: !!mediaDevices,
      hasGetUserMedia: !!mediaDevices?.getUserMedia,
      isSecureContext: window.isSecureContext,
      isExpoGo: isExpoGo,
      platform: Platform.OS
    });
    
    // iOS browser specific warnings and development mode detection
    if (isIOS) {
      const isDevelopmentIP = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
      const isHTTP = window.location.protocol === 'http:';
      
      console.log('🍎 iOS browser detected - applying iOS-specific configurations');
      console.log('🔍 Development context check:', {
        isDevelopmentIP,
        isHTTP,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        href: window.location.href,
        isSecureContext: window.isSecureContext
      });
      
      if (!window.isSecureContext) {
        if (isDevelopmentIP && isHTTP) {
          console.warn('⚠️ iOS development mode: HTTP on IP address detected');
          console.warn('⚠️ WebRTC may not work on iOS with HTTP. Consider using HTTPS or localhost.');
        } else {
          console.error('❌ iOS browsers require HTTPS for WebRTC!');
        }
      }
    }
  } else {
    // Running on server-side (SSR) - WebRTC not available
    console.warn('⚠️ VoiceCallService: Running in server environment, WebRTC not available');
    RTCPeerConnection = null;
    RTCIceCandidate = null;
    RTCSessionDescription = null;
    mediaDevices = null;
  }
} else if (!isExpoGo) {
  // Native WebRTC (development build only)
  try {
    const {
      RTCPeerConnection: NativeRTCPeerConnection,
      RTCIceCandidate: NativeRTCIceCandidate,
      RTCSessionDescription: NativeRTCSessionDescription,
      mediaDevices: nativeMediaDevices,
    } = require('react-native-webrtc');
    
    RTCPeerConnection = NativeRTCPeerConnection;
    RTCIceCandidate = NativeRTCIceCandidate;
    RTCSessionDescription = NativeRTCSessionDescription;
    mediaDevices = nativeMediaDevices;
    
    console.log('✅ VoiceCallService: Native WebRTC loaded successfully');
  } catch (error) {
    console.error('❌ VoiceCallService: Failed to load react-native-webrtc:', error);
    RTCPeerConnection = null;
    RTCIceCandidate = null;
    RTCSessionDescription = null;
    mediaDevices = null;
  }
} else {
  // Expo Go - use fallback audio recording/playback
  console.log('📱 VoiceCallService: Running in Expo Go - using audio fallback');
  RTCPeerConnection = null;
  RTCIceCandidate = null;
  RTCSessionDescription = null;
  mediaDevices = null;
}

// Enhanced STUN/TURN servers for better NAT traversal and cross-network connectivity
const ICE_SERVERS = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional STUN servers for better connectivity
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.voxgratia.org' },
    
    // OpenRelay TURN servers (free public TURN servers)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  // Enhanced ICE configuration for better connectivity
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

export class VoiceCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.currentCallId = null;
    this.isInitiator = false;
    this.callState = 'idle'; // idle, calling, ringing, connected, ended
    this.isMuted = false;
    this.isWebRTCAvailable = RTCPeerConnection !== null && mediaDevices !== null;
    this.isExpoGo = isExpoGo;
    this.isSocketInitialized = false;
    
    // Audio recording/playback for Expo Go fallback
    this.audioRecording = null;
    this.audioSound = null;
    
    // Call timer properties
    this.callStartTime = null;
    this.callTimer = null;
    this.recordingUri = null;
    this.audioStreamingInterval = null;
    
    // Connection timeout and retry handling
    this.connectionTimeout = null;
    this.connectionRetryCount = 0;
    this.maxConnectionRetries = 3;
    this.connectionTimeoutMs = 15000; // Reduced to 15 seconds for faster recovery
    
    // ICE gathering state tracking
    this.iceGatheringComplete = false;
    this.iceGatheringTimeout = null;
    
    // Debug WebRTC availability
    console.log('🎙️ VoiceCallService initialized:', {
      platform: Platform.OS,
      isWebRTCAvailable: this.isWebRTCAvailable,
      hasRTCPeerConnection: RTCPeerConnection !== null,
      hasMediaDevices: mediaDevices !== null
    });
    
    // Socket event listeners
    this.onIncomingCall = null;
    this.onCallAccepted = null;
    this.onCallDeclined = null;
    this.onCallEnded = null;
    this.onRemoteStream = null;
    this.onCallStateChange = null;
    this.onError = null;
    
    // Socket reconnection handling
    this.socketReconnectAttempts = 0;
    this.maxSocketReconnectAttempts = 5;
    this.pendingOffer = null;
    this.pendingAnswer = null;
    
    // Audio elements for web
    this.localAudioElement = null;
    this.remoteAudioElement = null;
    this.pendingRemoteAudioPlay = false;
  }

  // Incoming call handler getter/setter with debugging
  set onIncomingCall(handler) {
    console.log('📞 Setting incoming call handler:', !!handler);
    this._onIncomingCall = handler;
  }

  get onIncomingCall() {
    return this._onIncomingCall;
  }

  // Public method to check WebRTC availability
  checkWebRTCAvailability() {
    let details;
    
    if (this.isWebRTCAvailable) {
      details = 'WebRTC is available and ready for voice calls';
    } else if (this.isExpoGo) {
      details = 'Running in Expo Go - using audio recording/playback for voice calls';
    } else if (Platform.OS === 'web') {
      details = 'WebRTC is not available in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
    } else {
      details = 'WebRTC is not available on this device. Please ensure react-native-webrtc is properly installed and configured.';
    }
    
    return {
      isAvailable: this.isWebRTCAvailable || this.isExpoGo,
      platform: Platform.OS,
      isExpoGo: this.isExpoGo,
      hasRTCPeerConnection: RTCPeerConnection !== null,
      hasMediaDevices: mediaDevices !== null,
      details: details
    };
  }

  // Initialize WebRTC peer connection
  async initializePeerConnection() {
    try {
      console.log('🔄 Initializing WebRTC peer connection...');
      
      if (!RTCPeerConnection) {
        throw new Error('WebRTC not available on this platform');
      }
      
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
      
      // Handle ICE candidates with enhanced logging and gathering state tracking
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📡 ICE candidate generated:', {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            priority: event.candidate.priority
          });
          
          if (this.socket && this.currentCallId) {
            this.socket.emit('voice:ice-candidate', {
              callId: this.currentCallId,
              candidate: event.candidate
            });
          }
        } else {
          // ICE gathering complete
          console.log('✅ ICE gathering completed');
          this.iceGatheringComplete = true;
          if (this.iceGatheringTimeout) {
            clearTimeout(this.iceGatheringTimeout);
            this.iceGatheringTimeout = null;
          }
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('🎵 Received remote stream');
        console.log('🎵 Remote stream tracks:', event.streams[0].getTracks().length);
        console.log('🎵 Audio tracks:', event.streams[0].getAudioTracks().length);
        
        this.remoteStream = event.streams[0];
        
        // For web browsers, create audio element to play remote stream
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          this.createRemoteAudioElement(this.remoteStream);
        }
        
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle connection state changes with enhanced retry logic
      this.peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state changed:', this.peerConnection.connectionState);
        console.log('🔗 ICE connection state:', this.peerConnection.iceConnectionState);
        console.log('🔗 ICE gathering state:', this.peerConnection.iceGatheringState);
        console.log('🔗 Signaling state:', this.peerConnection.signalingState);
        
        // Clear connection timeout when connected
        if (this.peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC connection established successfully!');
          this.clearConnectionTimeout();
          this.connectionRetryCount = 0;
          this.verifyAudioStreams();
          this.setCallState('connected');
        } else if (this.peerConnection.connectionState === 'connecting') {
          console.log('🔄 WebRTC connection in progress...');
          this.startConnectionTimeout();
        } else if (this.peerConnection.connectionState === 'disconnected') {
          console.warn('⚠️ WebRTC connection disconnected');
          // Try to reconnect if not too many attempts
          if (this.connectionRetryCount < this.maxConnectionRetries) {
            console.log(`🔄 Attempting to reconnect (${this.connectionRetryCount + 1}/${this.maxConnectionRetries})`);
            this.connectionRetryCount++;
            this.attemptReconnection();
          } else {
            console.error('❌ Max reconnection attempts reached');
            this.endCall();
          }
        } else if (this.peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed');
          if (this.connectionRetryCount < this.maxConnectionRetries) {
            console.log(`🔄 Connection failed, attempting restart (${this.connectionRetryCount + 1}/${this.maxConnectionRetries})`);
            this.connectionRetryCount++;
            this.restartIce();
          } else {
            console.error('❌ Max connection attempts reached, ending call');
            this.endCall();
          }
        }
      };
      
      // Enhanced ICE connection state monitoring with retry logic
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
        
        if (this.peerConnection.iceConnectionState === 'connected' || 
            this.peerConnection.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established');
          this.clearConnectionTimeout();
        } else if (this.peerConnection.iceConnectionState === 'checking') {
          console.log('🔍 ICE connectivity checks in progress...');
        } else if (this.peerConnection.iceConnectionState === 'disconnected') {
          console.warn('⚠️ ICE connection disconnected, may reconnect...');
        } else if (this.peerConnection.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed');
          if (this.connectionRetryCount < this.maxConnectionRetries) {
            console.log(`🔄 ICE failed, restarting ICE (${this.connectionRetryCount + 1}/${this.maxConnectionRetries})`);
            this.connectionRetryCount++;
            this.restartIce();
          }
        }
      };
      
      // ICE gathering state monitoring
      this.peerConnection.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', this.peerConnection.iceGatheringState);
        
        if (this.peerConnection.iceGatheringState === 'complete') {
          console.log('✅ ICE gathering completed');
          this.iceGatheringComplete = true;
          if (this.iceGatheringTimeout) {
            clearTimeout(this.iceGatheringTimeout);
            this.iceGatheringTimeout = null;
          }
        }
      };

      console.log('✅ WebRTC peer connection initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize peer connection:', error);
      if (this.onError) this.onError('Failed to initialize call connection');
      return false;
    }
  }

  // Initialize Expo Audio for Expo Go fallback
  async initializeExpoAudio() {
    try {
      console.log('🎤 Initializing Expo Audio for voice calls...');
      
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission denied');
      }
      
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
      
      console.log('✅ Expo Audio initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Expo Audio:', error);
      if (this.onError) this.onError('Audio initialization failed: ' + error.message);
      throw error;
    }
  }

  // Get user media (microphone)
  async getUserMedia() {
    try {
      console.log('🎤 Requesting microphone access...');
      
      // Check if mediaDevices is available
      if (!mediaDevices || !mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Check for secure context (required for mobile browsers)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.isSecureContext) {
        console.warn('⚠️ Not in secure context - microphone access may be blocked');
        console.warn('⚠️ Mobile browsers require HTTPS for microphone access');
      }
      
      // Enhanced audio constraints with iOS Safari compatibility
      const isMobile = Platform.OS === 'web' && typeof navigator !== 'undefined' && 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = Platform.OS === 'web' && typeof navigator !== 'undefined' && 
        /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = Platform.OS === 'web' && typeof navigator !== 'undefined' && 
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOSSafari = isIOS && isSafari;
      
      // iOS Safari requires simpler constraints
      const constraints = {
        audio: isIOSSafari ? {
          // Simplified constraints for iOS Safari
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : {
          // Full constraints for other browsers
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // More permissive constraints for better compatibility
          sampleRate: { ideal: 44100, min: 8000, max: 48000 },
          sampleSize: { ideal: 16, min: 8, max: 32 },
          channelCount: { ideal: 1, min: 1, max: 2 },
          // Additional constraints for mobile (non-iOS)
          ...(isMobile && !isIOS && {
            latency: { ideal: 0.01, max: 0.05 },
            volume: { ideal: 1.0, min: 0.0, max: 1.0 }
          })
        },
        video: false // Voice calls only
      };
      
      console.log('🎤 Audio constraints for platform:', {
        isMobile,
        isIOS,
        isSafari,
        isIOSSafari,
        constraints
      });

      console.log('🎤 Using constraints:', constraints);
      
      // iOS browser specific pre-flight check
      if (isIOS) {
        const isDevelopmentIP = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
        const isHTTP = window.location.protocol === 'http:';
        
        console.log('🍎 iOS browser - requesting microphone permission...');
        console.log('🔍 Context check:', {
          isDevelopmentIP,
          isHTTP,
          isSecureContext: window.isSecureContext,
          hostname: window.location.hostname
        });
        
        // Check if we're in a secure context or development mode
        if (!window.isSecureContext) {
          if (isDevelopmentIP && isHTTP) {
            console.warn('⚠️ iOS HTTP development mode - microphone access may be blocked');
            console.warn('⚠️ If microphone access fails, this is expected behavior on iOS with HTTP');
          } else {
            throw new Error('iOS browsers require HTTPS for microphone access. Please use a secure connection.');
          }
        }
        
        // Additional iOS-specific checks
        if (!mediaDevices.getUserMedia) {
          throw new Error('getUserMedia is not supported on this iOS device.');
        }
      }
      
      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('✅ Microphone access granted');
      console.log('🎤 Local stream tracks:', this.localStream.getTracks().length);
      console.log('🎤 Audio tracks:', this.localStream.getAudioTracks().length);
      
      // Verify audio tracks are active
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track, index) => {
        console.log(`🎤 Audio track ${index}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings ? track.getSettings() : 'N/A'
        });
      });
      
      // For web browsers, create local audio element for monitoring
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        this.createLocalAudioElement(this.localStream);
      }
      
      // Add local stream to peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          console.log('📤 Adding track to peer connection:', track.kind, track.id);
          const sender = this.peerConnection.addTrack(track, this.localStream);
          console.log('📤 Track sender:', sender);
        });
        
        // Log current senders
        const senders = this.peerConnection.getSenders();
        console.log('📤 Total senders after adding tracks:', senders.length);
        senders.forEach((sender, index) => {
          console.log(`📤 Sender ${index}:`, {
            track: sender.track ? {
              id: sender.track.id,
              kind: sender.track.kind,
              enabled: sender.track.enabled
            } : null
          });
        });
      }
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });
      
      let userMessage = 'Microphone access denied';
      if (error.name === 'NotAllowedError') {
        userMessage = 'Please allow microphone access to make voice calls';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No microphone found on this device';
      } else if (error.name === 'NotSupportedError') {
        userMessage = 'Voice calls are not supported in this browser';
      }
      
      if (this.onError) this.onError(userMessage);
      throw error;
    }
  }

  // Initialize socket connection for signaling
  initializeSocket(token) {
    try {
      // Prevent multiple initializations
      if (this.isSocketInitialized && this.socket) {
        console.log('🔄 Voice call socket already initialized');
        return true;
      }

      console.log('🔌 Initializing voice call socket connection...');
      this.socket = getSocket(token);
      
      if (!this.socket) {
        throw new Error('Socket connection not available');
      }

      // Set up socket event listeners
      this.setupSocketListeners();
      this.isSocketInitialized = true;
      console.log('✅ Voice call socket initialized and listening for incoming calls');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      this.isSocketInitialized = false;
      if (this.onError) this.onError('Connection failed');
      return false;
    }
  }

  // Set up socket event listeners for call signaling
  setupSocketListeners() {
    if (!this.socket) {
      console.error('❌ Cannot setup socket listeners - no socket available');
      return;
    }

    console.log('🔗 Setting up voice call socket listeners...');
    console.log('🔗 Socket connected:', this.socket.connected);
    console.log('🔗 Socket ID:', this.socket.id);

    // Enhanced socket connection handling with reconnection
    this.socket.on('connect', () => {
      console.log('🔌 Voice call socket connected:', this.socket.id);
      this.socketReconnectAttempts = 0;
      
      // Resend pending offer/answer if reconnected during call setup
      if (this.pendingOffer && this.currentCallId) {
        console.log('🔄 Resending pending offer after reconnection');
        this.socket.emit('voice:offer', {
          callId: this.currentCallId,
          offer: this.pendingOffer
        });
        this.pendingOffer = null;
      }
      
      if (this.pendingAnswer && this.currentCallId) {
        console.log('🔄 Resending pending answer after reconnection');
        this.socket.emit('voice:answer', {
          callId: this.currentCallId,
          answer: this.pendingAnswer
        });
        this.pendingAnswer = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Voice call socket disconnected:', reason);
      
      // Handle disconnection during active call
      if (this.isCallActive() && this.socketReconnectAttempts < this.maxSocketReconnectAttempts) {
        console.log(`🔄 Attempting socket reconnection (${this.socketReconnectAttempts + 1}/${this.maxSocketReconnectAttempts})`);
        this.socketReconnectAttempts++;
        
        // Try to reconnect after a short delay
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            console.log('🔄 Attempting to reconnect socket...');
            this.socket.connect();
          }
        }, 2000);
      } else if (this.socketReconnectAttempts >= this.maxSocketReconnectAttempts) {
        console.error('❌ Max socket reconnection attempts reached');
        if (this.onError) this.onError('Connection lost - unable to reconnect');
        this.endCall();
      }
    });

    this.socket.on('reconnect', () => {
      console.log('✅ Socket reconnected successfully');
      this.socketReconnectAttempts = 0;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      if (this.isCallActive()) {
        if (this.onError) this.onError('Connection error during call');
      }
    });

    // Incoming call
    console.log('🎙️ Setting up voice:incoming-call listener...');
    this.socket.on('voice:incoming-call', async (data) => {
      console.log('🚨 INCOMING CALL RECEIVED BY VOICE CALL SERVICE! 🚨');
      console.log('📞 Call data:', data);
      console.log('📞 Caller ID:', data.callerId);
      console.log('📞 Call ID:', data.callId);
      console.log('📞 Caller Name:', data.callerName);
      console.log('📞 Call Type:', data.callType);
      
      // Prevent duplicate calls - ignore if already in a call
      if (this.currentCallId && this.currentCallId !== data.callId) {
        console.log('⚠️ Ignoring incoming call - already in call:', this.currentCallId);
        return;
      }
      
      // Prevent duplicate call screens for same call ID
      if (this.currentCallId === data.callId && this.callState === 'incoming') {
        console.log('⚠️ Ignoring duplicate incoming call event for same call ID');
        return;
      }
      
      this.currentCallId = data.callId;
      this.isInitiator = false;
      this.setCallState('incoming');
      
      // Navigate to voice call screen
      if (this.onIncomingCall) {
        console.log('📞 Calling onIncomingCall handler...');
        console.log('📞 Handler function exists:', typeof this.onIncomingCall);
        this.onIncomingCall(data);
      } else {
        console.warn('❌ No onIncomingCall handler set!');
      }
    });

    // Call accepted
    this.socket.on('voice:call-accepted', async (data) => {
      console.log('✅ Call accepted by other user');
      console.log('📞 Call acceptance data:', data);
      console.log('🔍 CALLER DEBUG: Received voice:call-accepted event');
      console.log('🔍 CALLER DEBUG: Current state - isInitiator:', this.isInitiator, 'callState:', this.callState);
      console.log('🔍 CALLER DEBUG: Current call ID:', this.currentCallId, 'Event call ID:', data.callId);
      
      // Set the call ID for the caller (initiator)
      if (data.callId && !this.currentCallId) {
        console.log('📞 Setting call ID for caller:', data.callId);
        this.currentCallId = data.callId;
      }
      
      this.setCallState('connecting');
      
      if (this.isInitiator) {
        console.log('📞 Creating WebRTC offer as call initiator...');
        console.log('📞 Current call ID before offer:', this.currentCallId);
        console.log('🔍 CALLER DEBUG: About to call createOffer()');
        await this.createOffer();
        console.log('🔍 CALLER DEBUG: createOffer() completed');
      } else {
        console.log('📞 Waiting for WebRTC offer as call receiver...');
      }
      
      // Start call timer when call is accepted
      setTimeout(() => {
        if (this.callState === 'connected') {
          this.startCallTimer();
        }
      }, 2000); // Wait 2 seconds for connection to establish
    });

    // Call declined
    this.socket.on('voice:call-declined', (data) => {
      console.log('❌ Call declined by other user');
      console.log('📞 Call decline data:', data);
      this.setCallState('ended');
      this.cleanup();
    });

    // WebRTC offer received
    this.socket.on('voice:offer', async (data) => {
      console.log('📨 Received WebRTC offer for call:', data.callId);
      console.log('📨 Current call ID:', this.currentCallId);
      console.log('📨 Call state:', this.callState);
      console.log('🔍 RECEIVER DEBUG: Received voice:offer event');
      console.log('🔍 RECEIVER DEBUG: isInitiator:', this.isInitiator, 'peerConnection state:', this.peerConnection?.connectionState);
      
      // Test backend connection when we receive an offer
      console.log('🧪 TESTING: Sending test event to backend...');
      this.socket.emit('test:backend-connection', {
        message: 'Testing backend connection from receiver',
        timestamp: Date.now(),
        callId: this.currentCallId
      });
      if (data.callId === this.currentCallId) {
        await this.handleOffer(data.offer);
      } else {
        console.warn('⚠️ Ignoring offer for different call ID');
      }
    });

    // WebRTC answer received
    this.socket.on('voice:answer', async (data) => {
      console.log('📨 Received WebRTC answer for call:', data.callId);
      console.log('📨 Current call ID:', this.currentCallId);
      console.log('📨 Call state:', this.callState);
      if (data.callId === this.currentCallId) {
        await this.handleAnswer(data.answer);
      } else {
        console.warn('⚠️ Ignoring answer for different call ID');
      }
    });

    // Test backend response
    this.socket.on('test:backend-response', (data) => {
      console.log('✅ TESTING: Received response from backend:', data);
    });
    
    // Keep-alive response
    this.socket.on('voice:keep-alive-pong', (data) => {
      console.log('💓 KEEP-ALIVE: Received pong from backend for call:', data.callId);
    });
    
    // Monitor socket connection status
    this.socket.on('connect', () => {
      console.log('✅ VOICE CALL: Socket connected', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ VOICE CALL: Socket disconnected:', reason);
      if (this.callState === 'incoming' || this.callState === 'connecting') {
        console.log('🔄 VOICE CALL: Attempting auto-reconnect during call...');
        setTimeout(() => {
          if (!this.socket.connected) {
            console.log('🔄 VOICE CALL: Auto-reconnecting socket...');
            this.socket.connect();
          }
        }, 1000);
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ VOICE CALL: Socket connection error:', error);
    });
    
    // ICE candidate received
    this.socket.on('voice:ice-candidate', async (data) => {
      console.log('📡 Received ICE candidate for call:', data.callId);
      console.log('📡 Current call ID:', this.currentCallId);
      if (data.callId === this.currentCallId) {
        await this.handleIceCandidate(data.candidate);
      } else {
        console.warn('⚠️ Ignoring ICE candidate for different call ID');
      }
    });

    // Call ended by remote user
    this.socket.on('voice:call-ended', () => {
      console.log('📞 Call ended by remote user');
      this.endCall();
    });

    // Call error
    this.socket.on('voice:error', (data) => {
      console.error('❌ Call error received:', data.error);
      console.error('❌ Current call state:', this.callState);
      console.error('❌ Current call ID:', this.currentCallId);
      
      // Don't automatically end call for "Call not found" errors during acceptance
      // This might be a temporary backend issue
      if (data.error && data.error.includes('Call not found') && this.callState === 'connecting') {
        console.log('⚠️ Call not found error during connection - keeping call alive for retry');
        if (this.onError) this.onError(`Backend error: ${data.error}. Call may still work.`);
        return;
      }
      
      // For other errors, end the call
      if (this.onError) this.onError(data.error);
      this.endCall();
    });

    // Audio chunk received (for Expo Go)
    this.socket.on('voice:audio-chunk', async (data) => {
      console.log('🎵 Received audio chunk');
      if (data.callId === this.currentCallId && data.audioUri) {
        // Play the received audio chunk
        await this.playAudio(data.audioUri);
      }
    });

    // Call ended by other user
    this.socket.on('voice:call-ended', (data) => {
      console.log('📞 Call ended by other user');
      console.log('📞 Call duration:', data.duration, 'seconds');
      this.stopCallTimer();
      this.setCallState('ended');
      this.cleanup();
      
      // Show notification that call ended
      if (this.onCallEndedByOther) {
        this.onCallEndedByOther(data);
      }
    });
  }

  // Start a voice call
  async startCall(receiverId, token) {
    try {
      console.log('📞 Starting voice call to:', receiverId);
      
      // Prevent duplicate calls
      if (this.isCallActive()) {
        console.warn('⚠️ Call already in progress, ignoring duplicate request');
        return false;
      }
      
      // Enhanced iOS browser detection and validation
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOSSafari = isIOS && isSafari;
        const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
        const isDevelopmentIP = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
        const isHTTP = window.location.protocol === 'http:';
        
        console.log('🍎 iOS browser check:', {
          isIOS,
          isSafari,
          isIOSSafari,
          isIOSChrome,
          isDevelopmentIP,
          isHTTP,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          isSecureContext: window.isSecureContext,
          hasWebRTC: !!RTCPeerConnection,
          hasMediaDevices: !!mediaDevices,
          hasGetUserMedia: !!mediaDevices?.getUserMedia
        });
        
        // iOS browser specific checks with development mode handling
        if (isIOS) {
          if (!window.isSecureContext) {
            if (isDevelopmentIP && isHTTP) {
              // Development mode on HTTP IP - show warning but allow attempt
              console.warn('⚠️ DEVELOPMENT MODE: HTTP on IP address detected on iOS');
              console.warn('⚠️ WebRTC may fail on iOS with HTTP. This is expected behavior.');
              console.warn('⚠️ For production, use HTTPS. For development, consider using localhost or HTTPS.');
              
              // Still check if WebRTC components are available
              if (!mediaDevices || !mediaDevices.getUserMedia) {
                throw new Error('Microphone access is not available on this iOS device with HTTP. Please use HTTPS or check browser settings.');
              }
              
              console.log('⚠️ Proceeding with iOS HTTP development mode (may fail)');
            } else {
              throw new Error('Voice calls require HTTPS on iOS browsers. Please use a secure connection.');
            }
          } else {
            // Secure context - normal checks
            if (!mediaDevices || !mediaDevices.getUserMedia) {
              throw new Error('Microphone access is not available on this iOS device. Please check your browser settings.');
            }
            
            console.log('✅ iOS browser WebRTC checks passed');
          }
        }
      }
      
      // Check if voice calls are supported
      if (!this.isWebRTCAvailable && !this.isExpoGo) {
        let errorMsg = 'Voice calls are not available on this device.';
        
        if (Platform.OS === 'web') {
          const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isDevelopmentIP = typeof window !== 'undefined' && /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(window.location.href);
          const isHTTP = typeof window !== 'undefined' && window.location.protocol === 'http:';
          
          if (isIOS) {
            if (isDevelopmentIP && isHTTP) {
              errorMsg = `Voice calls on iOS don't work with HTTP on IP addresses (${window.location.hostname}). This is a browser security restriction.\n\nSolutions:\n1. Use HTTPS instead of HTTP\n2. Use localhost instead of IP address\n3. Test on Android or desktop browsers for HTTP development`;
            } else {
              errorMsg = 'Voice calls on iOS require Safari 11+ and HTTPS. Please ensure you\'re using a supported browser with a secure connection.';
            }
          } else if (isMobile) {
            errorMsg = 'Voice calls require a modern mobile browser. Please try Chrome, Firefox, or Safari on your mobile device.';
          } else {
            errorMsg = 'WebRTC is not available in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
          }
        }
        
        console.error('❌ Voice calls not available:', {
          platform: Platform.OS,
          isExpoGo: this.isExpoGo,
          hasRTCPeerConnection: RTCPeerConnection !== null,
          hasMediaDevices: mediaDevices !== null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        });
        
        throw new Error(errorMsg);
      }
      
      // Initialize socket with enhanced browser handling
      if (!this.initializeSocket(token)) {
        throw new Error('Failed to initialize connection');
      }
      
      // For browsers (especially MacBook), ensure socket is truly connected
      if (Platform.OS === 'web') {
        console.log('🌐 Browser detected - performing enhanced socket connection check');
        let retryCount = 0;
        const maxRetries = 3;
        
        while ((!this.socket || !this.socket.connected) && retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Browser socket retry attempt ${retryCount}/${maxRetries}`);
          
          if (this.socket) {
            // Force disconnect and reconnect for browsers
            this.socket.disconnect();
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            this.socket.connect();
          }
          
          // Wait for connection with timeout
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Browser socket connection timeout (attempt ${retryCount})`));
              }, 3000);
              
              if (this.socket.connected) {
                clearTimeout(timeout);
                resolve();
                return;
              }
              
              this.socket.once('connect', () => {
                clearTimeout(timeout);
                console.log(`✅ Browser socket connected on attempt ${retryCount}`);
                resolve();
              });
              
              this.socket.once('connect_error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Browser socket connection failed: ${error.message}`));
              });
            });
            break; // Success, exit retry loop
          } catch (error) {
            console.warn(`⚠️ Browser socket attempt ${retryCount} failed:`, error.message);
            if (retryCount >= maxRetries) {
              throw new Error(`Failed to establish browser socket connection after ${maxRetries} attempts`);
            }
          }
        }
        
        // Final verification for browsers
        if (!this.socket || !this.socket.connected) {
          throw new Error('Browser socket connection verification failed');
        }
        
        console.log('✅ Browser socket connection verified:', {
          connected: this.socket.connected,
          id: this.socket.id,
          transport: this.socket.io?.engine?.transport?.name || 'unknown'
        });
      }

      if (this.isExpoGo) {
        // Expo Go fallback - show user-friendly message and use audio recording
        Alert.alert(
          'Voice Call',
          'Voice calls in Expo Go use audio recording. For full WebRTC support, please use a development build.',
          [{ text: 'Continue', onPress: () => {} }]
        );
        await this.initializeExpoAudio();
      } else {
        // Full WebRTC
        if (!await this.initializePeerConnection()) {
          throw new Error('Failed to initialize call connection');
        }
        await this.getUserMedia();
      }

      // Set call state and flags
      this.isInitiator = true;
      this.setCallState('calling');

      // Send call request through socket
      const callData = {
        receiverId: receiverId,
        callType: this.isExpoGo ? 'audio-fallback' : 'webrtc'
      };

      console.log('📤 Sending voice:start-call event to backend...');
      console.log('📤 Socket connected:', this.socket.connected);
      console.log('📤 Socket ID:', this.socket.id);
      console.log('📤 Call data:', callData);
      
      // Enhanced socket connection check (especially for MacBook browsers)
      if (!this.socket || !this.socket.connected) {
        console.warn('⚠️ Socket not connected before call, attempting emergency reconnection...');
        
        if (Platform.OS === 'web') {
          // MacBook browsers need more aggressive reconnection
          console.log('🖥️ MacBook browser emergency reconnection protocol');
          
          let reconnectAttempts = 0;
          const maxReconnectAttempts = 2;
          
          while (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`🔄 Emergency reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
            
            try {
              if (this.socket) {
                // Force disconnect first
                this.socket.disconnect();
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Reconnect
                this.socket.connect();
                
                // Wait for connection
                await new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error(`Emergency reconnection timeout (attempt ${reconnectAttempts})`));
                  }, 4000);
                  
                  if (this.socket.connected) {
                    clearTimeout(timeout);
                    resolve();
                    return;
                  }
                  
                  this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    console.log(`✅ Emergency reconnection successful (attempt ${reconnectAttempts})`);
                    resolve();
                  });
                  
                  this.socket.once('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`Emergency reconnection failed: ${error.message}`));
                  });
                });
                
                break; // Success, exit retry loop
              } else {
                throw new Error('Socket instance not available');
              }
            } catch (error) {
              console.error(`❌ Emergency reconnection attempt ${reconnectAttempts} failed:`, error.message);
              if (reconnectAttempts >= maxReconnectAttempts) {
                throw new Error(`MacBook browser socket connection failed after ${maxReconnectAttempts} emergency attempts`);
              }
            }
          }
        } else {
          // Standard reconnection for non-browser platforms
          if (this.socket) {
            this.socket.connect();
            
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Socket connection timeout'));
              }, 5000);
              
              this.socket.once('connect', () => {
                clearTimeout(timeout);
                console.log('✅ Socket reconnected successfully');
                resolve();
              });
              
              this.socket.once('connect_error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Socket connection failed: ${error.message}`));
              });
            });
          } else {
            throw new Error('Socket connection not available');
          }
        }
      }
      
      // Double-check socket is connected before emitting
      if (!this.socket.connected) {
        throw new Error('Socket connection failed - unable to start call');
      }
      
      console.log('📤 Final socket state before sending:', {
        connected: this.socket.connected,
        id: this.socket.id,
        transport: this.socket.io?.engine?.transport?.name || 'unknown',
        readyState: this.socket.io?.engine?.readyState || 'unknown'
      });
      
      // MacBook browser: Add connection health verification
      if (Platform.OS === 'web') {
        console.log('🖥️ MacBook browser: Performing final connection health check');
        
        // Test connection with a ping before sending call
        const connectionHealthy = await new Promise((resolve) => {
          const healthTimeout = setTimeout(() => {
            console.warn('⚠️ Connection health check timeout');
            resolve(false);
          }, 2000);
          
          // Send a test ping
          this.socket.emit('ping', { test: 'connection-health', timestamp: Date.now() });
          
          // Listen for pong response
          const pongHandler = () => {
            clearTimeout(healthTimeout);
            this.socket.off('pong', pongHandler);
            console.log('✅ Connection health check passed');
            resolve(true);
          };
          
          this.socket.once('pong', pongHandler);
          
          // Also resolve if already healthy
          if (this.socket.connected && this.socket.id) {
            clearTimeout(healthTimeout);
            this.socket.off('pong', pongHandler);
            resolve(true);
          }
        });
        
        if (!connectionHealthy) {
          throw new Error('MacBook browser connection health check failed - socket may be unstable');
        }
      }
      
      this.socket.emit('voice:start-call', callData);

      console.log('✅ Call request sent to backend via socket');
      
      // MacBook browser: Set a backup timeout to prevent infinite connecting state
      if (Platform.OS === 'web') {
        console.log('🖥️ MacBook browser: Setting backup call timeout protection');
        
        const callTimeoutProtection = setTimeout(() => {
          if (this.callState === 'calling') {
            console.error('❌ MacBook browser call timeout - call stuck in calling state');
            if (this.onError) {
              this.onError('Call timed out - this may be a MacBook browser connection issue. Please try again.');
            }
            this.endCall();
          }
        }, 30000); // 30 second timeout
        
        // Clear timeout when call state changes
        const originalSetCallState = this.setCallState.bind(this);
        this.setCallState = (newState) => {
          if (newState !== 'calling') {
            clearTimeout(callTimeoutProtection);
            this.setCallState = originalSetCallState; // Restore original method
          }
          originalSetCallState(newState);
        };
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to start call:', error);
      if (this.onError) this.onError(error.message);
      this.cleanup();
      return false;
    }
  }

  // Accept an incoming call
  async acceptCall(token) {
    try {
      console.log('✅ Accepting incoming call');
      console.log('🔍 Accept call debug info:', {
        isWebRTCAvailable: this.isWebRTCAvailable,
        isExpoGo: this.isExpoGo,
        platform: Platform.OS,
        hasRTCPeerConnection: !!RTCPeerConnection,
        hasMediaDevices: !!mediaDevices
      });
      
      // Check if voice calls are supported
      if (!this.isWebRTCAvailable && !this.isExpoGo) {
        const errorMsg = Platform.OS === 'web' 
          ? 'WebRTC is not available in this browser. Please use a modern browser like Chrome, Firefox, or Safari.'
          : 'Voice calls are not available on this device.';
        
        console.error('❌ Voice calls not available for accepting call:', {
          platform: Platform.OS,
          isExpoGo: this.isExpoGo,
          hasRTCPeerConnection: RTCPeerConnection !== null,
          hasMediaDevices: mediaDevices !== null
        });
        
        throw new Error(errorMsg);
      }
      
      // Initialize socket if not already done
      if (!this.socket) {
        if (!this.initializeSocket(token)) {
          throw new Error('Failed to initialize connection');
        }
      }

      if (this.isExpoGo) {
        // Expo Go fallback - use audio recording
        console.log('📱 Accepting call in Expo Go mode');
        await this.initializeExpoAudio();
      } else {
        // Full WebRTC
        console.log('🌐 Accepting call in WebRTC mode (browser)');
        try {
          if (!await this.initializePeerConnection()) {
            throw new Error('Failed to initialize call connection');
          }
          console.log('✅ Peer connection initialized successfully');
          
          await this.getUserMedia();
          console.log('✅ User media obtained successfully');
        } catch (webrtcError) {
          console.error('❌ WebRTC initialization failed:', webrtcError);
          throw webrtcError;
        }
      }

      // Accept the call
      console.log('📤 Sending voice:accept-call to backend with callId:', this.currentCallId);
      console.log('🧪 TESTING: Socket connection before accepting call:', {
        connected: this.socket.connected,
        id: this.socket.id,
        hasSocket: !!this.socket
      });
      
      // Check socket connection and reconnect if needed
      if (!this.socket.connected) {
        console.log('⚠️ Socket disconnected, attempting to reconnect...');
        try {
          // Try to reconnect
          this.socket.connect();
          
          // Wait for connection
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
            
            this.socket.once('connect', () => {
              clearTimeout(timeout);
              console.log('✅ Socket reconnected successfully');
              resolve();
            });
            
            this.socket.once('connect_error', (error) => {
              clearTimeout(timeout);
              console.error('❌ Socket reconnection failed:', error);
              reject(error);
            });
          });
        } catch (reconnectError) {
          console.error('❌ Failed to reconnect socket:', reconnectError);
          throw new Error('Cannot accept call - socket connection failed');
        }
      }
      
      // Test backend connection first
      console.log('🧪 TESTING: Sending test event to backend before accept...');
      this.socket.emit('test:backend-connection', {
        message: 'Testing backend connection before accept',
        timestamp: Date.now(),
        callId: this.currentCallId
      });
      
      console.log('📤 Final socket state before accept:', {
        connected: this.socket.connected,
        id: this.socket.id
      });
      
      this.socket.emit('voice:accept-call', {
        callId: this.currentCallId
      });

      this.setCallState('connecting');
      console.log('✅ Call accepted and sent to backend');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        isWebRTCAvailable: this.isWebRTCAvailable,
        isExpoGo: this.isExpoGo
      });
      
      if (this.onError) this.onError(error.message);
      
      // Don't automatically decline - let user try again or handle manually
      this.setCallState('ended');
      this.cleanup();
      return false;
    }
  }

  // Decline an incoming call
  declineCall() {
    console.log('❌ Declining call');
    
    if (this.socket && this.currentCallId) {
      this.socket.emit('voice:decline-call', {
        callId: this.currentCallId
      });
    }
    
    this.setCallState('ended');
    this.cleanup();
  }

  // End the current call
  endCall() {
    console.log('📞 Ending call');
    
    if (this.socket && this.currentCallId) {
      this.socket.emit('voice:end-call', {
        callId: this.currentCallId,
        duration: this.getCallDuration()
      });
    }
    
    this.stopCallTimer();
    this.setCallState('ended');
    this.cleanup();
  }

  // Create WebRTC offer with ICE gathering optimization
  async createOffer() {
    try {
      console.log('📨 Creating WebRTC offer');
      
      // Reset ICE gathering state
      this.iceGatheringComplete = false;
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📨 Offer created, waiting for ICE candidates...');
      
      // Wait for ICE gathering to complete or timeout
      await this.waitForIceGathering();
      
      // Get the final offer with all ICE candidates
      const finalOffer = this.peerConnection.localDescription;
      
      console.log('📤 Sending WebRTC offer for call:', this.currentCallId);
      console.log('📤 Socket connected:', this.socket.connected);
      console.log('📤 Socket ID:', this.socket.id);
      console.log('📤 ICE candidates in offer:', finalOffer.sdp.split('a=candidate:').length - 1);
      
      // Store offer in case we need to resend after reconnection
      this.pendingOffer = finalOffer;
      
      if (this.socket && this.socket.connected) {
        this.socket.emit('voice:offer', {
          callId: this.currentCallId,
          offer: finalOffer
        });
        console.log('✅ WebRTC offer sent to backend');
        // Clear pending offer after successful send
        setTimeout(() => {
          this.pendingOffer = null;
        }, 5000);
      } else {
        console.warn('⚠️ Socket not connected, offer will be sent when reconnected');
      }
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
      if (this.onError) this.onError('Failed to establish connection');
    }
  }

  // Wait for ICE gathering to complete
  async waitForIceGathering(timeoutMs = 5000) {
    return new Promise((resolve) => {
      if (this.iceGatheringComplete || this.peerConnection.iceGatheringState === 'complete') {
        console.log('✅ ICE gathering already complete');
        resolve();
        return;
      }

      console.log('⏳ Waiting for ICE gathering to complete...');
      
      const timeout = setTimeout(() => {
        console.log('⏰ ICE gathering timeout - proceeding with current candidates');
        resolve();
      }, timeoutMs);

      const checkGathering = () => {
        if (this.iceGatheringComplete || this.peerConnection.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          console.log('✅ ICE gathering completed');
          resolve();
        }
      };

      // Check immediately and then periodically
      checkGathering();
      const interval = setInterval(() => {
        checkGathering();
        if (this.iceGatheringComplete) {
          clearInterval(interval);
        }
      }, 100);

      // Clean up interval on timeout
      setTimeout(() => clearInterval(interval), timeoutMs);
    });
  }

  // Handle WebRTC offer with ICE gathering optimization
  async handleOffer(offer) {
    try {
      console.log('📨 Handling WebRTC offer');
      
      if (!RTCSessionDescription) {
        throw new Error('WebRTC not available on this platform');
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('✅ Remote description set');
      
      // Reset ICE gathering state
      this.iceGatheringComplete = false;
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📨 Answer created, waiting for ICE candidates...');
      
      // Wait for ICE gathering to complete or timeout
      await this.waitForIceGathering();
      
      // Get the final answer with all ICE candidates
      const finalAnswer = this.peerConnection.localDescription;
      
      console.log('📤 Sending WebRTC answer for call:', this.currentCallId);
      console.log('📤 Socket connected:', this.socket.connected);
      console.log('📤 Socket ID:', this.socket.id);
      console.log('📤 ICE candidates in answer:', finalAnswer.sdp.split('a=candidate:').length - 1);
      
      // Store answer in case we need to resend after reconnection
      this.pendingAnswer = finalAnswer;
      
      if (this.socket && this.socket.connected) {
        this.socket.emit('voice:answer', {
          callId: this.currentCallId,
          answer: finalAnswer
        });
        console.log('✅ WebRTC answer sent to backend');
        // Clear pending answer after successful send
        setTimeout(() => {
          this.pendingAnswer = null;
        }, 5000);
      } else {
        console.warn('⚠️ Socket not connected, answer will be sent when reconnected');
      }
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
      if (this.onError) this.onError('Failed to establish connection');
    }
  }

  // Handle WebRTC answer
  async handleAnswer(answer) {
    try {
      console.log('📨 Handling WebRTC answer');
      
      if (!RTCSessionDescription) {
        throw new Error('WebRTC not available on this platform');
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ WebRTC answer processed');
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
      if (this.onError) this.onError('Failed to establish connection');
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (!RTCIceCandidate) {
        throw new Error('WebRTC not available on this platform');
      }
      
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  // Create local audio element for web browsers (for monitoring)
  createLocalAudioElement(stream) {
    try {
      if (this.localAudioElement) {
        this.localAudioElement.srcObject = null;
        this.localAudioElement.remove();
      }
      
      this.localAudioElement = document.createElement('audio');
      this.localAudioElement.srcObject = stream;
      this.localAudioElement.muted = true; // Prevent feedback
      this.localAudioElement.autoplay = true;
      this.localAudioElement.style.display = 'none';
      document.body.appendChild(this.localAudioElement);
      
      console.log('🎤 Local audio element created for monitoring');
    } catch (error) {
      console.error('❌ Failed to create local audio element:', error);
    }
  }
  
  // Create remote audio element for web browsers (for playback)
  createRemoteAudioElement(stream) {
    try {
      if (this.remoteAudioElement) {
        this.remoteAudioElement.srcObject = null;
        this.remoteAudioElement.remove();
      }
      
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.srcObject = stream;
      this.remoteAudioElement.muted = false; // Allow playback
      this.remoteAudioElement.autoplay = true;
      this.remoteAudioElement.volume = 1.0;
      this.remoteAudioElement.style.display = 'none';
      
      // iOS Safari specific attributes
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        this.remoteAudioElement.playsInline = true;
        this.remoteAudioElement.controls = false;
        this.remoteAudioElement.preload = 'auto';
        console.log('🍎 Applied iOS-specific audio attributes');
      }
      
      document.body.appendChild(this.remoteAudioElement);
      
      // Add event listeners for debugging
      this.remoteAudioElement.onloadedmetadata = () => {
        console.log('🎵 Remote audio metadata loaded');
      };
      
      this.remoteAudioElement.onplay = () => {
        console.log('🎵 Remote audio started playing');
      };
      
      this.remoteAudioElement.onpause = () => {
        console.log('🎵 Remote audio paused');
      };
      
      this.remoteAudioElement.onerror = (error) => {
        console.error('❌ Remote audio error:', error);
      };
      
      this.remoteAudioElement.oncanplay = () => {
        console.log('🎵 Remote audio can play');
      };
      
      // Enhanced play attempt with iOS Safari handling
      this.attemptRemoteAudioPlay();
      
      console.log('🎵 Remote audio element created for playback');
    } catch (error) {
      console.error('❌ Failed to create remote audio element:', error);
    }
  }
  
  // Attempt to play remote audio with iOS Safari compatibility
  attemptRemoteAudioPlay() {
    if (!this.remoteAudioElement) return;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // For iOS, we need to be more careful about autoplay
    if (isIOS) {
      console.log('🍎 iOS detected - attempting careful audio play');
      
      // Try to play immediately (might work if user just interacted)
      this.remoteAudioElement.play().then(() => {
        console.log('✅ iOS remote audio playback started successfully');
      }).catch(error => {
        console.warn('⚠️ iOS remote audio autoplay blocked:', error.name);
        
        // Store reference for later user interaction
        this.pendingRemoteAudioPlay = true;
        
        // Try again after a short delay
        setTimeout(() => {
          if (this.remoteAudioElement && this.pendingRemoteAudioPlay) {
            this.remoteAudioElement.play().then(() => {
              console.log('✅ iOS remote audio playback started after delay');
              this.pendingRemoteAudioPlay = false;
            }).catch(() => {
              console.log('📱 iOS remote audio requires user interaction');
            });
          }
        }, 1000);
      });
    } else {
      // Non-iOS browsers
      this.remoteAudioElement.play().then(() => {
        console.log('✅ Remote audio playback started successfully');
      }).catch(error => {
        console.warn('⚠️ Remote audio autoplay blocked:', error);
        console.warn('⚠️ User interaction may be required to start audio');
      });
    }
  }
  
  // Force play remote audio (call this on user interaction for iOS)
  forcePlayRemoteAudio() {
    if (this.remoteAudioElement && this.pendingRemoteAudioPlay) {
      console.log('🔄 Force playing remote audio after user interaction');
      this.remoteAudioElement.play().then(() => {
        console.log('✅ Remote audio force play successful');
        this.pendingRemoteAudioPlay = false;
      }).catch(error => {
        console.error('❌ Remote audio force play failed:', error);
      });
    }
  }

  // Enhanced toggle mute with better audio track control
  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        
        console.log('🔇 Mute toggled:', this.isMuted);
        console.log('🔇 Audio track enabled:', audioTrack.enabled);
        console.log('🔇 Audio track state:', {
          id: audioTrack.id,
          kind: audioTrack.kind,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState
        });
        
        return this.isMuted;
      } else {
        console.warn('⚠️ No audio tracks found for muting');
      }
    } else {
      console.warn('⚠️ No local stream available for muting');
    }
    return false;
  }

  // Start audio recording for Expo Go fallback
  async startAudioRecording() {
    try {
      if (this.audioRecording) {
        await this.audioRecording.stopAndUnloadAsync();
      }
      
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      });
      
      this.audioRecording = recording;
      console.log('🎤 Audio recording started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
      return false;
    }
  }

  // Stop audio recording for Expo Go fallback
  async stopAudioRecording() {
    try {
      if (!this.audioRecording) {
        return null;
      }
      
      await this.audioRecording.stopAndUnloadAsync();
      const uri = this.audioRecording.getURI();
      this.recordingUri = uri;
      this.audioRecording = null;
      
      console.log('🎤 Audio recording stopped, URI:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Failed to stop audio recording:', error);
      return null;
    }
  }

  // Play audio for Expo Go fallback
  async playAudio(uri) {
    try {
      if (this.audioSound) {
        await this.audioSound.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );
      this.audioSound = sound;
      
      await sound.playAsync();
      console.log('🔊 Audio playback started');
      return true;
    } catch (error) {
      console.error('❌ Failed to play audio:', error);
      return false;
    }
  }

  // Start continuous audio streaming for Expo Go (simulates real-time communication)
  async startAudioStreaming() {
    if (!this.isExpoGo || this.callState !== 'connected') {
      return false;
    }

    try {
      // Start recording in chunks for real-time feel
      this.audioStreamingInterval = setInterval(async () => {
        if (this.callState === 'connected' && !this.isMuted) {
          // Record a short audio chunk (2 seconds)
          await this.startAudioRecording();
          
          setTimeout(async () => {
            const uri = await this.stopAudioRecording();
            if (uri && this.socket && this.currentCallId) {
              // Send audio chunk to other user
              this.socket.emit('voice:audio-chunk', {
                callId: this.currentCallId,
                audioUri: uri,
                timestamp: Date.now()
              });
            }
          }, 2000); // 2-second chunks
        }
      }, 3000); // Start new recording every 3 seconds (1 second overlap for smoother experience)

      console.log('🎵 Audio streaming started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start audio streaming:', error);
      return false;
    }
  }

  // Stop audio streaming
  stopAudioStreaming() {
    if (this.audioStreamingInterval) {
      clearInterval(this.audioStreamingInterval);
      this.audioStreamingInterval = null;
      console.log('🎵 Audio streaming stopped');
    }
  }

  // Toggle speaker (mobile only)
  toggleSpeaker() {
    if (Platform.OS !== 'web' && this.localStream) {
      // This would require additional native module setup
      // For now, just toggle the flag
      this.isSpeakerOn = !this.isSpeakerOn;
      console.log('🔊 Speaker toggled:', this.isSpeakerOn);
      return this.isSpeakerOn;
    }
    return false;
  }

  // Set call state and notify listeners
  setCallState(newState) {
    console.log('📞 Call state changed:', this.callState, '->', newState);
    this.callState = newState;
    
    // Handle state-specific actions
    if (newState === 'connected') {
      if (this.isExpoGo) {
        // Start audio streaming for Expo Go
        this.startAudioStreaming();
      } else if (Platform.OS === 'web') {
        // For web browsers, especially iOS Safari, try to force play remote audio
        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && this.pendingRemoteAudioPlay) {
          console.log('🍎 iOS call connected - attempting to force play remote audio');
          setTimeout(() => {
            this.forcePlayRemoteAudio();
          }, 500); // Small delay to ensure connection is stable
        }
      }
    } else if (newState === 'ended') {
      // Stop audio streaming
      this.stopAudioStreaming();
      // Reset pending audio play flag
      this.pendingRemoteAudioPlay = false;
    }
    
    if (this.onCallStateChange) {
      this.onCallStateChange(newState);
    }
  }

  // Verify audio streams are properly set up
  verifyAudioStreams() {
    console.log('🔍 Verifying audio streams...');
    
    // Check local stream
    if (this.localStream) {
      const localAudioTracks = this.localStream.getAudioTracks();
      console.log('🎤 Local audio tracks:', localAudioTracks.length);
      localAudioTracks.forEach((track, index) => {
        console.log(`🎤 Local track ${index}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
    } else {
      console.warn('⚠️ No local stream found');
    }
    
    // Check remote stream
    if (this.remoteStream) {
      const remoteAudioTracks = this.remoteStream.getAudioTracks();
      console.log('🎵 Remote audio tracks:', remoteAudioTracks.length);
      remoteAudioTracks.forEach((track, index) => {
        console.log(`🎵 Remote track ${index}:`, {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
    } else {
      console.warn('⚠️ No remote stream found');
    }
    
    // Check peer connection senders and receivers
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      const receivers = this.peerConnection.getReceivers();
      
      console.log('📤 Peer connection senders:', senders.length);
      senders.forEach((sender, index) => {
        console.log(`📤 Sender ${index}:`, {
          track: sender.track ? {
            id: sender.track.id,
            kind: sender.track.kind,
            enabled: sender.track.enabled
          } : null
        });
      });
      
      console.log('📥 Peer connection receivers:', receivers.length);
      receivers.forEach((receiver, index) => {
        console.log(`📥 Receiver ${index}:`, {
          track: receiver.track ? {
            id: receiver.track.id,
            kind: receiver.track.kind,
            enabled: receiver.track.enabled
          } : null
        });
      });
    }
    
    // Check audio elements (web only)
    if (Platform.OS === 'web') {
      if (this.localAudioElement) {
        console.log('🎤 Local audio element:', {
          muted: this.localAudioElement.muted,
          volume: this.localAudioElement.volume,
          paused: this.localAudioElement.paused,
          readyState: this.localAudioElement.readyState
        });
      }
      
      if (this.remoteAudioElement) {
        console.log('🎵 Remote audio element:', {
          muted: this.remoteAudioElement.muted,
          volume: this.remoteAudioElement.volume,
          paused: this.remoteAudioElement.paused,
          readyState: this.remoteAudioElement.readyState
        });
      }
    }
  }
  
  // Get audio level for monitoring (web only)
  getAudioLevel() {
    if (Platform.OS !== 'web' || !this.localStream) {
      return 0;
    }
    
    try {
      // This would require Web Audio API for actual implementation
      // For now, return a placeholder
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        return Math.random() * 100; // Placeholder - would need actual audio analysis
      }
    } catch (error) {
      console.error('❌ Failed to get audio level:', error);
    }
    
    return 0;
  }
  
  // Enhanced cleanup with audio element cleanup
  cleanup() {
    console.log('🧹 Cleaning up voice call resources');
    console.log('🧹 Current call ID before cleanup:', this.currentCallId);
    console.log('🧹 Current call state before cleanup:', this.callState);
    
    // Clear all timeouts
    this.cleanupTimeouts();
    
    // Stop call timer
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    
    // Stop audio streaming
    if (this.audioStreamingInterval) {
      clearInterval(this.audioStreamingInterval);
      this.audioStreamingInterval = null;
    }
    
    // WebRTC cleanup
    if (this.localStream) {
      console.log('🧹 Stopping local stream tracks');
      this.localStream.getTracks().forEach(track => {
        console.log('🧹 Stopping track:', track.kind, track.id);
        track.stop();
      });
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      console.log('🧹 Closing peer connection');
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clean up audio elements (web only)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (this.localAudioElement) {
        console.log('🧹 Cleaning up local audio element');
        this.localAudioElement.srcObject = null;
        this.localAudioElement.remove();
        this.localAudioElement = null;
      }
      
      if (this.remoteAudioElement) {
        console.log('🧹 Cleaning up remote audio element');
        this.remoteAudioElement.srcObject = null;
        this.remoteAudioElement.remove();
        this.remoteAudioElement = null;
      }
    }
    
    // Expo Go audio cleanup
    if (this.isExpoGo) {
      if (this.audioRecording) {
        this.audioRecording.stopAndUnloadAsync().catch(console.error);
        this.audioRecording = null;
      }
      if (this.audioSound) {
        this.audioSound.unloadAsync().catch(console.error);
        this.audioSound = null;
      }
    }
    
    // Reset state
    const previousCallId = this.currentCallId;
    this.currentCallId = null;
    this.isInitiator = false;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.callDuration = 0;
    this.remoteStream = null;
    
    // Clear pending offers/answers
    this.pendingOffer = null;
    this.pendingAnswer = null;
    this.socketReconnectAttempts = 0;
    
    this.setCallState('idle');
    
    console.log('✅ Cleanup completed. Previous call ID:', previousCallId);
  }

  // Get current call state
  getCallState() {
    return this.callState;
  }

  // Check if call is active
  isCallActive() {
    return ['calling', 'ringing', 'connecting', 'connected'].includes(this.callState);
  }

  // Connection timeout management
  startConnectionTimeout() {
    this.clearConnectionTimeout();
    console.log(`⏰ Starting connection timeout (${this.connectionTimeoutMs}ms)`);
    
    this.connectionTimeout = setTimeout(() => {
      console.error('⏰ Connection timeout reached');
      if (this.callState === 'connecting') {
        if (this.connectionRetryCount < this.maxConnectionRetries) {
          console.log(`🔄 Connection timeout, attempting retry (${this.connectionRetryCount + 1}/${this.maxConnectionRetries})`);
          this.connectionRetryCount++;
          this.restartIce();
        } else {
          console.error('❌ Connection timeout - max retries reached');
          if (this.onError) this.onError('Connection timeout - unable to establish call');
          this.endCall();
        }
      }
    }, this.connectionTimeoutMs);
  }

  clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
      console.log('✅ Connection timeout cleared');
    }
  }

  // ICE restart for connection recovery
  async restartIce() {
    if (!this.peerConnection) {
      console.error('❌ Cannot restart ICE - no peer connection');
      return false;
    }

    try {
      console.log('🔄 Restarting ICE connection...');
      
      // Reset ICE gathering state
      this.iceGatheringComplete = false;
      
      // Create new offer with ICE restart
      const offer = await this.peerConnection.createOffer({ 
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      // Send the new offer
      if (this.socket && this.currentCallId) {
        console.log('📤 Sending ICE restart offer');
        this.socket.emit('voice:offer', {
          callId: this.currentCallId,
          offer: offer,
          iceRestart: true
        });
      }
      
      // Set timeout for ICE gathering
      this.iceGatheringTimeout = setTimeout(() => {
        if (!this.iceGatheringComplete) {
          console.warn('⚠️ ICE gathering timeout during restart');
        }
      }, 10000); // 10 second timeout
      
      console.log('✅ ICE restart initiated');
      return true;
    } catch (error) {
      console.error('❌ Failed to restart ICE:', error);
      return false;
    }
  }

  // Attempt reconnection by recreating peer connection
  async attemptReconnection() {
    if (!this.isWebRTCAvailable) {
      console.error('❌ Cannot reconnect - WebRTC not available');
      return false;
    }

    try {
      console.log('🔄 Attempting full reconnection...');
      
      // Close existing peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Reinitialize peer connection
      if (!await this.initializePeerConnection()) {
        throw new Error('Failed to reinitialize peer connection');
      }
      
      // Re-add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('📤 Re-adding track to peer connection:', track.kind, track.id);
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Create new offer if we're the initiator
      if (this.isInitiator) {
        await this.createOffer();
      }
      
      console.log('✅ Reconnection attempt completed');
      return true;
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      return false;
    }
  }

  // Enhanced cleanup with timeout clearing
  cleanupTimeouts() {
    this.clearConnectionTimeout();
    
    if (this.iceGatheringTimeout) {
      clearTimeout(this.iceGatheringTimeout);
      this.iceGatheringTimeout = null;
    }
  }

  // Start call timer
  startCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
    }
    
    this.callStartTime = Date.now();
    this.callTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
      console.log(`🕰️ Call duration: ${duration}s`);
      
      // Send keep-alive ping during active call to prevent socket timeout
      if (this.socket && this.socket.connected && this.callState === 'connected') {
        this.socket.emit('voice:keep-alive', {
          callId: this.currentCallId,
          duration: duration
        });
      }
    }, 10000); // Log every 10 seconds
    
    console.log('⏱️ Call timer started');
  }

  // Stop call timer
  stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.callStartTime = null;
    console.log('⏱️ Call timer stopped');
  }

  // Get call duration in seconds
  getCallDuration() {
    if (!this.callStartTime) return 0;
    return Math.floor((Date.now() - this.callStartTime) / 1000);
  }
}

// Create and export a singleton instance
let voiceCallServiceInstance = null;

export const voiceCallService = (() => {
  if (!voiceCallServiceInstance) {
    console.log('🎙️ Creating VoiceCallService singleton instance');
    voiceCallServiceInstance = new VoiceCallService();
  }
  return voiceCallServiceInstance;
})();

// Global initialization function
export const initializeVoiceCallService = (token) => {
  console.log('🎙️ Globally initializing voice call service...');
  console.log('🎙️ Token available:', !!token);
  console.log('🎙️ Service already initialized:', voiceCallService.isSocketInitialized);
  
  if (token && !voiceCallService.isSocketInitialized) {
    console.log('🎙️ Proceeding with voice call service initialization...');
    const result = voiceCallService.initializeSocket(token);
    console.log('🎙️ Global voice call service initialization result:', result);
    
    // Verify socket listeners are set up
    if (result && voiceCallService.socket) {
      console.log('🎙️ Socket listeners verification:', {
        socketConnected: voiceCallService.socket.connected,
        socketId: voiceCallService.socket.id,
        hasIncomingCallHandler: !!voiceCallService.onIncomingCall
      });
    }
    
    return result;
  } else if (voiceCallService.isSocketInitialized) {
    console.log('🎙️ Voice call service already initialized globally');
    return true;
  } else {
    console.warn('⚠️ Cannot initialize voice call service - no token provided');
    return false;
  }
};

// Test function to verify voice call service status
export const testVoiceCallService = () => {
  console.log('🧪 VOICE CALL SERVICE STATUS TEST:');
  console.log('🧪 Service instance exists:', !!voiceCallService);
  console.log('🧪 Socket initialized:', voiceCallService.isSocketInitialized);
  console.log('🧪 Socket exists:', !!voiceCallService.socket);
  console.log('🧪 Socket connected:', voiceCallService.socket?.connected);
  console.log('🧪 Socket ID:', voiceCallService.socket?.id);
  console.log('🧪 Incoming call handler set:', !!voiceCallService.onIncomingCall);
  console.log('🧪 WebRTC available:', voiceCallService.isWebRTCAvailable);
  console.log('🧪 Is Expo Go:', voiceCallService.isExpoGo);
  console.log('🧪 Current call state:', voiceCallService.callState);
  return {
    serviceExists: !!voiceCallService,
    socketInitialized: voiceCallService.isSocketInitialized,
    socketConnected: voiceCallService.socket?.connected,
    handlerSet: !!voiceCallService.onIncomingCall
  };
};

// VoiceCallService class is already exported above (line 76)
