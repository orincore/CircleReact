import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVerification } from '@/contexts/VerificationContext';

/**
 * VerificationGuard - Blocks content until user is verified
 * Wrap any feature that requires verification with this component
 */
export default function VerificationGuard({ children, feature = 'this feature' }) {
  const router = useRouter();
  const { needsVerification, loading, isVerified } = useVerification();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A16AE8" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
      </View>
    );
  }

  if (needsVerification) {
    return (
      <LinearGradient colors={['#1a0b2e', '#2d1b4e']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#A16AE8" />
            </View>

            <Text style={styles.title}>Verification Required</Text>
            <Text style={styles.message}>
              You need to verify your identity to access {feature}
            </Text>

            <View style={styles.featuresList}>
              <FeatureItem icon="checkmark-circle" text="Unlock all features" />
              <FeatureItem icon="people" text="Connect with others" />
              <FeatureItem icon="chatbubbles" text="Send messages" />
              <FeatureItem icon="heart" text="Like and match" />
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={() => router.push('/auth/verify-face')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FF6FB5', '#A16AE8']} style={styles.buttonGradient}>
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Verify Now</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.secureText}>
              <Ionicons name="lock-closed" size={14} color="rgba(255, 255, 255, 0.5)" />
              {' '}Your video is secure and will be deleted after verification
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // User is verified, show the content
  return <>{children}</>;
}

function FeatureItem({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color="#10B981" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a0b2e',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(161, 106, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(161, 106, 232, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secureText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
