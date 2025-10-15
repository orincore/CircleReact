import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/contexts/VerificationContext';
import Alert from '@/utils/alert';
import Constants from 'expo-constants';

const MOVEMENTS = ['left', 'right', 'up', 'down'];
const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.circle.orincore.com';
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const IS_WEB = Platform.OS === 'web';

export default function FaceVerificationScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { refreshStatus } = useVerification();
  const cameraRef = useRef(null);
  const videoElementRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [webCameraPermission, setWebCameraPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentMovement, setCurrentMovement] = useState(0);
  const [completedMovements, setCompletedMovements] = useState([]);
  const [videoUri, setVideoUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(null);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-advance to next movement every 3 seconds
  useEffect(() => {
    if (isRecording && currentMovement < MOVEMENTS.length) {
      const timer = setTimeout(() => {
        handleMovementComplete();
      }, 3000); // 3 seconds per movement
      
      return () => clearTimeout(timer);
    }
  }, [isRecording, currentMovement]);

  // Initialize web camera
  useEffect(() => {
    if (IS_WEB) {
      // Small delay to ensure video element is mounted
      setTimeout(() => {
        initWebCamera();
      }, 100);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initWebCamera = async () => {
    try {
      console.log('🎥 Requesting web camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      console.log('✅ Web camera stream obtained');
      streamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        // Wait for video to be ready
        videoElementRef.current.onloadedmetadata = () => {
          console.log('✅ Web camera ready');
          setWebCameraPermission('granted');
          setIsCameraReady(true);
        };
      } else {
        console.log('✅ Web camera ready (no video element yet)');
        setWebCameraPermission('granted');
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error('❌ Web camera error:', error);
      setWebCameraPermission('denied');
    }
  };

  const requestWebCameraPermission = () => {
    initWebCamera();
  };

  const handleCameraReady = () => {
    // Add longer delay to ensure camera is fully initialized
    setTimeout(() => {
      console.log('✅ Camera ready');
      setIsCameraReady(true);
    }, 1000); // Increased to 1 second
  };

  const startRecording = async () => {
    // Web recording
    if (IS_WEB) {
      return startWebRecording();
    }

    // Native recording
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not available');
      return;
    }

    if (!isCameraReady) {
      Alert.alert('Please Wait', 'Camera is still initializing. Please wait a moment...');
      return;
    }
    
    try {
      console.log('🎥 Starting countdown...');
      
      // Show 3-2-1 countdown
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(0);
      
      console.log('🎥 Starting recording...');
      setIsRecording(true);
      setCurrentMovement(0);
      setCompletedMovements([]);
      
      // Additional delay after countdown
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!cameraRef.current) {
        throw new Error('Camera reference lost');
      }
      
      console.log('📹 Calling recordAsync...');
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: '720p',
      });
      
      console.log('✅ Recording complete:', video.uri);
      setVideoUri(video.uri);
      setIsRecording(false);
    } catch (error) {
      console.error('❌ Recording error:', error);
      setIsRecording(false);
      setCountdown(0);
      
      if (error.message?.includes('not ready')) {
        Alert.alert(
          'Camera Not Ready', 
          'The camera is still initializing. Please wait a few seconds and try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Recording Error', 
          `Failed to record video: ${error.message}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const startWebRecording = async () => {
    if (!streamRef.current) {
      Alert.alert('Error', 'Camera not available');
      return;
    }

    try {
      console.log('🎥 Starting countdown...');
      
      // Show 3-2-1 countdown
      for (let i = 3; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(0);
      
      console.log('🎥 Starting web recording...');
      setIsRecording(true);
      setCurrentMovement(0);
      setCompletedMovements([]);
      recordedChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp8',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUri(url);
        setIsRecording(false);
      };
      
      mediaRecorder.start();
      console.log('📹 Web recording started');
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Web recording error:', error);
      setIsRecording(false);
      setCountdown(0);
      Alert.alert('Recording Error', `Failed to record video: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (IS_WEB && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    } else if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const handleMovementComplete = () => {
    const newCompleted = [...completedMovements, MOVEMENTS[currentMovement]];
    setCompletedMovements(newCompleted);
    
    if (currentMovement < MOVEMENTS.length - 1) {
      setCurrentMovement(currentMovement + 1);
    } else {
      // All movements complete
      stopRecording();
    }
  };

  const submitVerification = async () => {
    if (!videoUri || !token) return;
    
    try {
      setIsSubmitting(true);
      
      // Create form data
      const formData = new FormData();
      
      // For web, we need to convert the blob
      if (Platform.OS === 'web') {
        const response = await fetch(videoUri);
        const blob = await response.blob();
        formData.append('video', blob, 'verification.mp4');
      } else {
        formData.append('video', {
          uri: videoUri,
          type: 'video/mp4',
          name: 'verification.mp4'
        });
      }
      
      const response = await fetch(`${API_URL}/api/verification/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh verification status
        await refreshStatus();
        
        Alert.alert(
          'Verification Successful! ✅',
          'Your account has been verified. You now have full access!',
          [{ 
            text: 'Continue', 
            onPress: () => router.replace('/secure/(tabs)/match') 
          }]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          result.reason || 'Please ensure you complete all head movements clearly.',
          [
            { text: 'Retry', onPress: () => setVideoUri(null) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit verification. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMovementInstruction = () => {
    if (!isRecording) return 'Press Start to begin recording';
    if (currentMovement >= MOVEMENTS.length) return 'Recording complete!';
    const movement = MOVEMENTS[currentMovement];
    return `Turn your head ${movement.toUpperCase()} (${currentMovement + 1}/${MOVEMENTS.length})`;
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A16AE8" />
      </View>
    );
  }

  // Show bypass for Expo Go only (video recording not supported)
  if (IS_EXPO_GO) {
    return (
      <LinearGradient colors={['#1a0b2e', '#2d1b4e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Ionicons name="information-circle-outline" size={80} color="#A16AE8" />
            <Text style={styles.permissionTitle}>Expo Go Limitation</Text>
            <Text style={styles.permissionText}>
              Face verification with video recording requires a native build.{'\n\n'}
              In Expo Go, video recording is not fully supported.{'\n\n'}
              For testing purposes, you can skip verification.
            </Text>
            <TouchableOpacity 
              style={styles.permissionButton} 
              onPress={async () => {
                await refreshStatus();
                router.replace('/secure/(tabs)/match');
              }}
            >
              <LinearGradient colors={['#FF6FB5', '#A16AE8']} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Skip for Now (Testing)</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Web camera permission check
  if (IS_WEB && webCameraPermission === 'denied') {
    return (
      <LinearGradient colors={['#1a0b2e', '#2d1b4e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color="#A16AE8" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to verify your identity
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestWebCameraPermission}>
              <LinearGradient colors={['#FF6FB5', '#A16AE8']} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Grant Permission</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!IS_WEB && !permission.granted) {
    return (
      <LinearGradient colors={['#1a0b2e', '#2d1b4e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color="#A16AE8" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need access to your camera to verify your identity
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <LinearGradient colors={['#FF6FB5', '#A16AE8']} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Grant Permission</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a0b2e', '#2d1b4e']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Face Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        {!videoUri ? (
          <>
            <View style={styles.cameraContainer}>
              {IS_WEB ? (
                <video
                  ref={videoElementRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror for selfie view
                  }}
                />
              ) : (
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="front"
                  onCameraReady={handleCameraReady}
                />
              )}
              <View style={styles.overlay}>
                <View style={styles.faceGuide} />
                {!isCameraReady && !IS_WEB && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FF6FB5" />
                    <Text style={styles.loadingText}>Initializing camera...</Text>
                  </View>
                )}
                {countdown > 0 && (
                  <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                  </View>
                )}
              </View>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording {recordingTime}s</Text>
                </View>
              )}
            </View>

            <View style={styles.instructionsContainer}>
              <Text style={styles.instruction}>{getMovementInstruction()}</Text>
              
              <View style={styles.movementsGrid}>
                {MOVEMENTS.map((movement, index) => (
                  <View key={movement} style={styles.movementItem}>
                    <Ionicons 
                      name={completedMovements.includes(movement) ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={completedMovements.includes(movement) ? "#10B981" : "#FFFFFF50"}
                    />
                    <Text style={styles.movementText}>{movement}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.helpText}>
                Position your face in the circle and follow the instructions
              </Text>
            </View>

            <View style={styles.controls}>
              {!isRecording ? (
                <TouchableOpacity 
                  style={styles.recordButton} 
                  onPress={startRecording}
                  disabled={!isCameraReady}
                >
                  <LinearGradient 
                    colors={isCameraReady ? ['#FF6FB5', '#A16AE8'] : ['#666', '#888']} 
                    style={styles.recordGradient}
                  >
                    <Ionicons name="videocam" size={32} color="#FFFFFF" />
                    <Text style={styles.recordText}>
                      {isCameraReady ? 'Start Recording' : 'Preparing...'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.stopButton} 
                  onPress={stopRecording}
                >
                  <LinearGradient 
                    colors={['#EF4444', '#DC2626']} 
                    style={styles.stopGradient}
                  >
                    <Ionicons name="stop" size={28} color="#FFFFFF" />
                    <Text style={styles.stopText}>Stop Recording</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Review Your Video</Text>
              <Text style={styles.previewText}>
                Make sure your face is clearly visible and all movements were captured
              </Text>
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => setVideoUri(null)}
                disabled={isSubmitting}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={submitVerification}
                disabled={isSubmitting}
              >
                <LinearGradient colors={['#10B981', '#34D399']} style={styles.submitGradient}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitText}>Submit</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    maxHeight: Platform.OS === 'web' ? 600 : undefined,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : undefined,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: Platform.OS === 'web' ? 200 : 250,
    height: Platform.OS === 'web' ? 240 : 300,
    borderRadius: Platform.OS === 'web' ? 100 : 125,
    borderWidth: 3,
    borderColor: '#FF6FB5',
    borderStyle: 'dashed',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 120,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    padding: 20,
  },
  instruction: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  movementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  movementItem: {
    alignItems: 'center',
    gap: 4,
  },
  movementText: {
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  recordButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  recordText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stopButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stopGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  stopText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  submitButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
