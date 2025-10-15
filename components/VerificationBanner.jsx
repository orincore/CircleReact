import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVerification } from '@/contexts/VerificationContext';

export default function VerificationBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { needsVerification, isPending, isRejected } = useVerification();
  const [visible, setVisible] = React.useState(true);

  if (!needsVerification || !visible) {
    return null;
  }

  const handleVerify = () => {
    router.push('/auth/verify-face');
  };

  const getBannerConfig = () => {
    if (isPending) {
      return {
        colors: ['#F59E0B', '#F97316'],
        icon: 'time-outline',
        title: 'Verification Pending',
        message: 'Your verification is being reviewed',
        buttonText: null
      };
    }

    if (isRejected) {
      return {
        colors: ['#EF4444', '#DC2626'],
        icon: 'close-circle-outline',
        title: 'Verification Failed',
        message: 'Please try again to access all features',
        buttonText: 'Retry Verification'
      };
    }

    return {
      colors: ['#8B5CF6', '#A16AE8'],
      icon: 'shield-checkmark-outline',
      title: 'Verification Required',
      message: 'Verify your identity to unlock all features',
      buttonText: 'Verify Now'
    };
  };

  const config = getBannerConfig();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={config.colors} style={styles.banner}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={config.icon} size={24} color="#FFFFFF" />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.message}>{config.message}</Text>
          </View>

          {config.buttonText && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleVerify}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{config.buttonText}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setVisible(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
});
