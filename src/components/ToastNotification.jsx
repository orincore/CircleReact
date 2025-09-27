import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

export default function ToastNotification({ 
  visible, 
  onClose, 
  onPress, 
  title, 
  message, 
  type = 'message', // 'message' or 'reaction'
  avatar,
  duration = 4000 
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Play haptic feedback and sound
      playNotificationEffects();
      
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideNotification();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [visible]);

  const playNotificationEffects = async () => {
    try {
      // Play haptic feedback
      if (Platform.OS === 'ios') {
        // Use different haptic patterns for different notification types
        if (type === 'reaction') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (Platform.OS === 'android') {
        // Android haptic feedback
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Play notification sound
      await playNotificationSound();
    } catch (error) {
      console.error('Failed to play notification effects:', error);
    }
  };

  const playNotificationSound = async () => {
    try {
      // Only play a lightweight beep on web; skip native to avoid missing assets
      if (Platform.OS !== 'web' || typeof window === 'undefined') return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(type === 'reaction' ? 900 : 650, ctx.currentTime);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.24);
      o.onended = () => {
        try { g.disconnect(); o.disconnect(); ctx.close(); } catch {}
      };
    } catch (error) {
      console.error('Failed to play notification sound (web):', error);
    }
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'reaction':
        return 'happy-outline';
      case 'message':
      default:
        return 'chatbubble-outline';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'reaction':
        return ['#FFB347', '#FF8C42', '#FF6B35'];
      case 'message':
      default:
        return ['#FF6FB5', '#A16AE8', '#5D5FEF'];
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={getColors()}
          style={styles.notification}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            {avatar ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {avatar.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <Ionicons 
                name={getIcon()} 
                size={24} 
                color="white" 
              />
            )}
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideNotification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 999,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      maxWidth: 400,
      left: 'auto',
      right: 20,
    }),
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 70,
  },
  iconContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
});
