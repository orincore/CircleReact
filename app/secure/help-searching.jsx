import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSocket } from '@/src/api/socket';
import { promptMatchingApi } from '@/src/api/promptMatching';
import * as Notifications from 'expo-notifications';
import { useBackgroundSearch } from '@/src/hooks/useBackgroundSearch';

const HelpSearchingScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const { requestId, prompt } = params;

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [status, setStatus] = useState('searching');
  const [canGoBack, setCanGoBack] = useState(false);
  const [backgroundSearch, setBackgroundSearch] = useState(false);
  
  const { addBackgroundSearch, removeBackgroundSearch } = useBackgroundSearch();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const searchingMessages = [
    { title: "Finding the perfect person…", subtitle: "Analyzing your request..." },
    { title: "Matching with helpers…", subtitle: "Searching for the best match..." },
    { title: "Analyzing interests…", subtitle: "Finding someone who can help..." },
    { title: "Connecting…", subtitle: "Almost there..." },
    { title: "Looking for experts…", subtitle: "Finding the right person..." },
  ];

  useEffect(() => {
    // Allow going back after 10 seconds of searching
    const backTimer = setTimeout(() => {
      setCanGoBack(true);
    }, 10000);

    // Message rotation
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % searchingMessages.length);
    }, 3000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      clearTimeout(backTimer);
      clearInterval(messageInterval);
    };
  }, []);

  useEffect(() => {
    // Listen for socket events
    const socket = getSocket();
    
    const handleAccepted = (data) => {
      if (data.requestId === requestId) {
        setStatus('matched');
        setBackgroundSearch(false);
        
        // Show local notification if app is in background
        if (AppState.currentState !== 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🎉 Helper Found!',
              body: 'Someone is ready to help you. Tap to start chatting!',
              data: { chatId: data.chatId, type: 'match_found' },
            },
            trigger: null, // Show immediately
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
        // Continue searching
        setStatus('searching');
        
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

    socket.on('help_request_accepted', handleAccepted);
    socket.on('help_request_declined', handleDeclined);

    return () => {
      socket.off('help_request_accepted', handleAccepted);
      socket.off('help_request_declined', handleDeclined);
    };
  }, [requestId, backgroundSearch]);

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
    outputRange: [0, -20],
  });

  const currentMessage = searchingMessages[currentMessageIndex];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Animated Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: spin },
              { translateY },
            ],
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons 
            name={status === 'matched' ? 'checkmark-circle' : 'search'} 
            size={80} 
            color={theme.primary} 
          />
        </View>
      </Animated.View>

      {/* Messages */}
      <View style={styles.messageContainer}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {status === 'matched' ? 'Match Found!' : currentMessage.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {status === 'matched' ? 'Connecting you to chat...' : currentMessage.subtitle}
        </Text>
      </View>

      {/* Your Request */}
      <View style={[styles.requestCard, { 
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border
      }]}>
        <Text style={[styles.requestLabel, { color: theme.textSecondary }]}>
          Your Request:
        </Text>
        <Text style={[styles.requestText, { color: theme.textPrimary }]}>
          "{prompt}"
        </Text>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Ionicons 
            name={status === 'matched' ? 'checkmark-circle' : 'time'} 
            size={20} 
            color={status === 'matched' ? '#4CAF50' : theme.primary} 
          />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            {status === 'matched' ? 'Helper found!' : 'Searching for helpers...'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            Identity protected
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      {status === 'searching' && (
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
                Search in Background
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
              Cancel Request
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
          We're finding the best person to help you. This may take a few moments.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 40,
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
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  requestCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  requestLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  requestText: {
    fontSize: 16,
    lineHeight: 22,
  },
  statusContainer: {
    width: '100%',
    marginBottom: 30,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  backgroundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backgroundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HelpSearchingScreen;
