import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#1F1147', '#2D1B69', '#1F1147']}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Animated Background Elements */}
          <Animated.View 
            style={[
              styles.backgroundCircle,
              styles.circle1,
              { transform: [{ rotate: spin }] }
            ]}
          />
          <Animated.View 
            style={[
              styles.backgroundCircle,
              styles.circle2,
              { transform: [{ rotate: spin }] }
            ]}
          />

          {/* Main Content */}
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: floatAnim }]
              }
            ]}
          >
            {/* 404 Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="search-circle" size={isLargeScreen ? 120 : 80} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* 404 Text */}
            <Text style={[styles.errorCode, isLargeScreen && styles.errorCodeLarge]}>
              404
            </Text>

            {/* Title */}
            <Text style={[styles.title, isLargeScreen && styles.titleLarge]}>
              Oops! Page Not Found
            </Text>

            {/* Description */}
            <Text style={[styles.description, isLargeScreen && styles.descriptionLarge]}>
              The page you're looking for seems to have wandered off. 
              {'\n'}
              Don't worry, we'll help you find your way back!
            </Text>

            {/* Suggestions */}
            <View style={styles.suggestions}>
              <View style={styles.suggestionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.suggestionText}>Check the URL for typos</Text>
              </View>
              <View style={styles.suggestionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.suggestionText}>Go back to the homepage</Text>
              </View>
              <View style={styles.suggestionItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.suggestionText}>Use the navigation menu</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={[styles.actions, isLargeScreen && styles.actionsLarge]}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = '/';
                  } else {
                    router.replace('/');
                  }
                }}
              >
                <LinearGradient
                  colors={['#FF6FB5', '#A16AE8']}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="home" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Go to Homepage</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#FFE8FF" />
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Links */}
            <View style={styles.quickLinks}>
              <Text style={styles.quickLinksTitle}>Quick Links:</Text>
              <View style={styles.quickLinksRow}>
                <TouchableOpacity 
                  style={styles.quickLink}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.location.href = '/features';
                    }
                  }}
                >
                  <Ionicons name="sparkles" size={16} color="#FFD6F2" />
                  <Text style={styles.quickLinkText}>Features</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickLink}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.location.href = '/login';
                    } else {
                      router.push('/login');
                    }
                  }}
                >
                  <Ionicons name="log-in" size={16} color="#FFD6F2" />
                  <Text style={styles.quickLinkText}>Login</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickLink}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.location.href = '/signup';
                    } else {
                      router.push('/signup');
                    }
                  }}
                >
                  <Ionicons name="person-add" size={16} color="#FFD6F2" />
                  <Text style={styles.quickLinkText}>Sign Up</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickLink}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.location.href = '/contact';
                    }
                  }}
                >
                  <Ionicons name="mail" size={16} color="#FFD6F2" />
                  <Text style={styles.quickLinkText}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 Circle by ORINCORE Technologies
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.1,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#FF6FB5',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#5D5FEF',
    bottom: -50,
    left: -50,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  errorCode: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: 'rgba(255, 111, 181, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
    letterSpacing: -2,
  },
  errorCodeLarge: {
    fontSize: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  titleLarge: {
    fontSize: 36,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 500,
  },
  descriptionLarge: {
    fontSize: 17,
    lineHeight: 26,
  },
  suggestions: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.15)',
    marginBottom: 32,
    gap: 12,
    maxWidth: 400,
    width: '100%',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  actionsLarge: {
    flexDirection: 'row',
    maxWidth: 500,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    flex: 1,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 242, 0.25)',
    flex: 1,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFE8FF',
    letterSpacing: 0.3,
  },
  quickLinks: {
    alignItems: 'center',
    gap: 16,
  },
  quickLinksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.15)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
