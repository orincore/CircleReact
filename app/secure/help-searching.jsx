import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Alert,
  AppState,
  Vibration,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSocket } from '@/src/api/socket';
import { promptMatchingApi } from '@/src/api/promptMatching';
import * as Notifications from 'expo-notifications';
import { useBackgroundSearch } from '@/src/hooks/useBackgroundSearch';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const HelpSearchingScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const requestIdParam = params?.requestId;
  const promptParam = params?.prompt;
  const initialStatusParam = params?.initialStatus;
  const initialMessageParam = params?.initialMessage;
  const matchedGiverParam = params?.matchedGiver;
  const requestId = Array.isArray(requestIdParam) ? requestIdParam[0] : requestIdParam;
  const prompt = Array.isArray(promptParam) ? promptParam[0] : promptParam;
  const initialStatus = Array.isArray(initialStatusParam) ? initialStatusParam[0] : initialStatusParam;
  const initialMessage = Array.isArray(initialMessageParam) ? initialMessageParam[0] : initialMessageParam;
  const matchedGiverJson = Array.isArray(matchedGiverParam) ? matchedGiverParam[0] : matchedGiverParam;

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [status, setStatus] = useState('analyzing'); // analyzing, searching, matching, found, waiting, connected, error
  const [statusMessage, setStatusMessage] = useState('Analyzing your request with AI...');
  const [progress, setProgress] = useState(10);
  const [canGoBack, setCanGoBack] = useState(false);
  const [backgroundSearch, setBackgroundSearch] = useState(false);
  const [matchedGiver, setMatchedGiver] = useState(null);

  const getMaskedBeaconLabel = (giver) => {
    const rawId = giver?.giver_user_id || giver?.giverUserId || giver?.id || '';
    if (!rawId || typeof rawId !== 'string') return 'Beacon Helper';
    const compact = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const suffix = compact.slice(-4) || '0000';
    return `Beacon Helper • #${suffix}`;
  };

  const getMatchPercent = (giver) => {
    const score = giver?.similarityScore ?? giver?.similarity_score;
    if (typeof score !== 'number' || Number.isNaN(score)) return null;
    return Math.max(0, Math.min(100, Math.round(score * 100)));
  };

  useEffect(() => {
    if (matchedGiverJson) {
      try {
        setMatchedGiver(JSON.parse(matchedGiverJson));
      } catch (e) {
        // ignore malformed param
      }
    }

    if (initialStatus === 'matched') {
      setStatus('found');
      setStatusMessage(initialMessage || 'Beacon found! Waiting for response...');
      setProgress(prev => Math.max(prev, 80));
    } else if (initialStatus === 'searching') {
      setStatus('searching');
      setStatusMessage(initialMessage || 'Looking for the best Beacon match...');
      setProgress(prev => Math.max(prev, 25));
    }
  }, [initialStatus, initialMessage, matchedGiverJson]);

  // Fetch current request status on mount if resuming existing request
  useEffect(() => {
    const fetchCurrentStatus = async () => {
      if (!requestId || initialStatus) return; // Skip if we already have initial status
      
      try {
        const response = await promptMatchingApi.getHelpRequestStatus(requestId);
        if (response) {
          const reqStatus = response.status;
          const chatRoomId = response.chatRoomId;
          const matchedGiverId = response.matchedGiverId;
          const matchedGiverData = response.matchedGiver;
          
          if (reqStatus === 'matched' && chatRoomId) {
            // Already connected, navigate to chat
            router.replace({
              pathname: '/secure/chat-conversation',
              params: { chatId: chatRoomId },
            });
          } else if (reqStatus === 'matched' && matchedGiverId) {
            // Matched, waiting for giver response
            setStatus('found');
            setStatusMessage('Beacon found! Waiting for response...');
            setProgress(80);
            
            // Set matchedGiver data if available
            if (matchedGiverData) {
              setMatchedGiver(matchedGiverData);
            }
          } else if (reqStatus === 'searching') {
            // Still searching
            setStatus('searching');
            setStatusMessage('Looking for the best Beacon match...');
            setProgress(40);
          } else if (reqStatus === 'cancelled' || reqStatus === 'expired') {
            setStatus('error');
            setStatusMessage('Request was cancelled or expired');
          }
        }
      } catch (error) {
        console.log('Failed to fetch initial status:', error);
      }
    };

    fetchCurrentStatus();
  }, [requestId, initialStatus, router]);
  
  const { addBackgroundSearch, removeBackgroundSearch } = useBackgroundSearch();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(10)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Status-specific messages for fallback
  const statusMessages = {
    analyzing: { title: 'Analyzing with AI...', subtitle: 'Understanding your request' },
    searching: { title: 'Searching for Beacons...', subtitle: 'Finding the best match' },
    matching: { title: 'AI Matching...', subtitle: 'Comparing with available Beacons' },
    found: { title: 'Beacon Found!', subtitle: 'Waiting for their response...' },
    waiting: { title: 'Waiting for response...', subtitle: 'Your Beacon is reviewing' },
    connected: { title: 'Connected!', subtitle: 'Opening chat...' },
    error: { title: 'Something went wrong', subtitle: 'Please try again' },
  };

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Polling fallback - check status via HTTP if socket events aren't received
  useEffect(() => {
    if (!requestId || status === 'connected' || status === 'error') return;

    const pollStatus = async () => {
      try {
        const response = await promptMatchingApi.getHelpRequestStatus(requestId);
        if (response) {
          // Backend returns flat fields: { requestId, status, attemptsCount, chatRoomId, ... }
          const reqStatus = response.status;
          const chatRoomId = response.chatRoomId;
          
          // Update status based on HTTP response
          if (reqStatus === 'matched' && chatRoomId) {
            setStatus('connected');
            setStatusMessage('Connected! Opening chat...');
            setProgress(100);
            
            // Navigate to chat
            setTimeout(() => {
              router.replace({
                pathname: '/secure/chat-conversation',
                params: { chatId: chatRoomId },
              });
            }, 1500);
          } else if (reqStatus === 'matched') {
            // Matched giver selected, waiting for giver accept -> show found/waiting state
            setStatus('found');
            setStatusMessage('Beacon found! Waiting for response...');
            setProgress(prev => Math.max(prev, 80));
          } else if (reqStatus === 'searching') {
            // Still searching - update progress if stuck
            if (progress < 50) {
              setProgress(prev => Math.min(prev + 10, 50));
              setStatus('searching');
              setStatusMessage('Looking for the best Beacon match...');
            }
          } else if (reqStatus === 'cancelled' || reqStatus === 'expired') {
            setStatus('error');
            setStatusMessage('Request was cancelled or expired');
          }
        }
      } catch (error) {
        console.log('Polling status check failed:', error);
      }
    };

    // Poll every 5 seconds as fallback
    const pollInterval = setInterval(pollStatus, 5000);
    
    // Initial poll after 3 seconds to catch any missed socket events
    const initialPoll = setTimeout(pollStatus, 3000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialPoll);
    };
  }, [requestId, status, progress, router]);

  useEffect(() => {
    // Allow going back after 5 seconds of searching
    const backTimer = setTimeout(() => {
      setCanGoBack(true);
    }, 5000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation (slower when found)
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: status === 'found' || status === 'waiting' ? 6000 : 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation for 'found' status
    if (status === 'found' || status === 'waiting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }

    return () => {
      clearTimeout(backTimer);
    };
  }, [status]);

  useEffect(() => {
    // Listen for socket events - pass token to ensure socket is authenticated
    if (!token) return;
    const socket = getSocket(token);
    
    // Real-time search status updates from AI matching
    const handleSearchStatus = (data) => {
      console.log('🔍 Search status:', data);
      
      if (data.requestId && requestId && data.requestId !== requestId) return;
      
      setStatus(data.status);
      setStatusMessage(data.message);
      if (typeof data.progress === 'number') {
        setProgress(data.progress);
      }
      
      if (data.matchedGiver) {
        setMatchedGiver(data.matchedGiver);
      }
      
      // Haptic feedback on status changes
      if (data.status === 'found') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          Vibration.vibrate(200);
        }
      } else if (data.status === 'error') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (e) {
          Vibration.vibrate([0, 100, 100, 100]);
        }
      }
    };
    
    const handleAccepted = (data) => {
      if (data.requestId === requestId) {
        setStatus('connected');
        setStatusMessage('Connected! Opening chat...');
        setProgress(100);
        setBackgroundSearch(false);
        
        // Haptic feedback
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
          Vibration.vibrate(300);
        }
        
        // Show local notification if app is in background
        if (AppState.currentState !== 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🎉 Helper Found!',
              body: 'Someone is ready to help you. Tap to start chatting!',
              data: { chatId: data.chatId, type: 'match_found' },
            },
            trigger: null,
          });
        }
        
        // Navigate to chat
        setTimeout(() => {
          router.replace({
            pathname: '/secure/chat-conversation',
            params: { chatId: data.chatId },
          });
        }, 1500);
      }
    };

    const handleDeclined = (data) => {
      if (data.requestId === requestId && data.searching) {
        // Status will be updated via help_search_status event
        // If in background, show notification about continued search
        if (backgroundSearch && AppState.currentState !== 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🔍 Still Searching',
              body: 'We\'re still looking for the perfect helper for you.',
              data: { requestId, type: 'search_update' },
            },
            trigger: null,
          });
        }
      }
    };

    socket.on('help_search_status', handleSearchStatus);
    socket.on('help_request_accepted', handleAccepted);
    socket.on('help_request_declined', handleDeclined);

    return () => {
      socket.off('help_search_status', handleSearchStatus);
      socket.off('help_request_accepted', handleAccepted);
      socket.off('help_request_declined', handleDeclined);
    };
  }, [requestId, backgroundSearch, token]);

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this help request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await promptMatchingApi.cancelHelpRequest(requestId);
              await removeBackgroundSearch(requestId);
              setBackgroundSearch(false);
              router.back();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleBackgroundSearch = () => {
    Alert.alert(
      'Continue in Background',
      'We\'ll keep searching for a helper and notify you when someone is available. You can return to the app anytime.',
      [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'Search in Background',
          onPress: async () => {
            setBackgroundSearch(true);
            await addBackgroundSearch(requestId);
            router.back();
          },
        },
      ]
    );
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Get current display message
  const currentMessage = statusMessages[status] || statusMessages.searching;
  const displayTitle = statusMessage || currentMessage.title;
  const displaySubtitle = currentMessage.subtitle;
  const maskedBeaconLabel = matchedGiver ? getMaskedBeaconLabel(matchedGiver) : null;
  const matchPercent = matchedGiver ? getMatchPercent(matchedGiver) : null;
  const beaconPreview = matchedGiver?.beaconPreview || null;
  const beaconMaskedName = beaconPreview?.maskedName || null;
  const beaconAge = beaconPreview?.age;
  const beaconGender = beaconPreview?.gender;
  const beaconPhoto = beaconPreview?.profilePhotoUrl;
  const beaconHelpTopics = Array.isArray(beaconPreview?.helpTopics) ? beaconPreview.helpTopics : [];

  // Get icon based on status
  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return 'sparkles';
      case 'searching':
        return 'search';
      case 'matching':
        return 'git-compare';
      case 'found':
      case 'waiting':
        return 'person-circle';
      case 'connected':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'search';
    }
  };

  // Get icon color based on status
  const getStatusColor = () => {
    switch (status) {
      case 'found':
      case 'waiting':
        return '#4CAF50';
      case 'connected':
        return '#2196F3';
      case 'error':
        return '#F44336';
      default:
        return theme.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { 
                backgroundColor: getStatusColor(),
                width: progressWidth 
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progress}%
        </Text>
      </View>

      {(status === 'found' || status === 'waiting') && beaconPreview && (
        <View style={[styles.beaconCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.beaconRow}>
            <View style={styles.beaconAvatarContainer}>
              {beaconPhoto ? (
                <View style={styles.beaconAvatarWrapper}>
                  <Image source={{ uri: beaconPhoto }} style={styles.beaconAvatar} />
                  <BlurView intensity={35} tint="default" style={StyleSheet.absoluteFill} />
                </View>
              ) : (
                <View style={[styles.beaconAvatarPlaceholder, { backgroundColor: theme.border }]}>
                  <Ionicons name="person" size={26} color={theme.textSecondary} />
                </View>
              )}
            </View>

            <View style={styles.beaconMeta}>
              <Text style={[styles.beaconName, { color: theme.textPrimary }]} numberOfLines={1}>
                {beaconMaskedName || 'Beacon Helper'}
              </Text>
              <Text style={[styles.beaconSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {[
                  typeof beaconAge === 'number' ? `${beaconAge}` : null,
                  beaconGender ? `${beaconGender}` : null,
                ].filter(Boolean).join(' • ') || 'Details hidden until accepted'}
              </Text>
            </View>
          </View>

          {beaconHelpTopics.length > 0 && (
            <View style={styles.helpTopicsContainer}>
              <Text style={[styles.helpTopicsLabel, { color: theme.textSecondary }]}>
                Can help with
              </Text>
              <View style={styles.helpTopicsChips}>
                {beaconHelpTopics.slice(0, 6).map((topic, idx) => (
                  <View key={`${topic}-${idx}`} style={[styles.helpChip, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.helpChipText, { color: theme.primary }]} numberOfLines={1}>
                      {topic}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Animated Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: status === 'connected' ? '0deg' : spin },
              { translateY },
            ],
          },
        ]}
      >
        {/* Glow effect for found status */}
        {(status === 'found' || status === 'waiting') && (
          <Animated.View 
            style={[
              styles.glowCircle, 
              { 
                backgroundColor: '#4CAF50',
                opacity: glowOpacity 
              }
            ]} 
          />
        )}
        <View style={[styles.iconCircle, { backgroundColor: getStatusColor() + '20' }]}>
          <Ionicons 
            name={getStatusIcon()} 
            size={70} 
            color={getStatusColor()} 
          />
        </View>
      </Animated.View>

      {/* Messages */}
      <View style={styles.messageContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {displayTitle}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {displaySubtitle}
        </Text>
      </View>

      {/* AI Badge */}
      <View style={[styles.aiBadge, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="sparkles" size={14} color={theme.primary} />
        <Text style={[styles.aiBadgeText, { color: theme.primary }]}>
          AI-Powered Matching
        </Text>
      </View>

      {/* Your Request */}
      <View style={[styles.requestCard, { 
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: status === 'found' ? '#4CAF50' + '50' : theme.border
      }]}>
        <Text style={[styles.requestLabel, { color: theme.textSecondary }]}>
          Your Request:
        </Text>
        <Text style={[styles.requestText, { color: theme.textPrimary }]} numberOfLines={3}>
          "{prompt}"
        </Text>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Ionicons 
            name={status === 'found' || status === 'waiting' || status === 'connected' ? 'checkmark-circle' : 'time'} 
            size={20} 
            color={status === 'found' || status === 'waiting' || status === 'connected' ? '#4CAF50' : theme.primary} 
          />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {status === 'found' || status === 'waiting' 
              ? 'Beacon found! Waiting for response...' 
              : status === 'connected' 
                ? 'Connected!' 
                : 'AI is searching for the best Beacon match...'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Identity protected until you both agree
          </Text>
        </View>
        {matchedGiver && (status === 'found' || status === 'waiting') && (
          <View style={[styles.matchInfoRow, { backgroundColor: '#4CAF50' + '10' }]}>
            <Ionicons name="person" size={18} color="#4CAF50" />
            <Text style={[styles.matchInfoText, { color: '#4CAF50' }]}>
              {maskedBeaconLabel}{matchPercent !== null ? ` • ${matchPercent}% match` : ''}
            </Text>
          </View>
        )}
        {(status === 'found' || status === 'waiting') && (
          <View style={[styles.waitingBanner, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="hourglass" size={16} color={theme.primary} />
            <Text style={[styles.waitingText, { color: theme.primary }]}>
              Request sent! Waiting for Beacon response...
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {status !== 'connected' && (
        <View style={styles.actionButtons}>
          {canGoBack && (
            <TouchableOpacity
              style={[styles.backgroundButton, { 
                backgroundColor: theme.primary,
              }]}
              onPress={handleBackgroundSearch}
            >
              <Ionicons name="notifications" size={20} color="#fff" />
              <Text style={styles.backgroundButtonText}>
                Continue in Background
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.cancelButton, { 
              borderColor: theme.border,
              backgroundColor: theme.surface
            }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>
              {status === 'found' || status === 'waiting' ? 'Cancel & Stop Waiting' : 'Cancel Request'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info */}
      <View style={[styles.infoBox, { 
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border
      }]}>
        <Ionicons name="information-circle" size={18} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          {status === 'found' || status === 'waiting'
            ? 'Your matched helper is reviewing your request. They\'ll respond shortly!'
            : 'Our AI is analyzing your request and finding the perfect person to help you.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  iconContainer: {
    marginBottom: 30,
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -10,
    left: -10,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  requestLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  requestText: {
    fontSize: 15,
    lineHeight: 21,
  },
  statusContainer: {
    width: '100%',
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    gap: 8,
  },
  matchInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  waitingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  backgroundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  backgroundButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HelpSearchingScreen;
