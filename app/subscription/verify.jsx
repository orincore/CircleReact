import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import Ionicons from '@expo/vector-icons/Ionicons';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';

export default function VerifyPayment() {
  const router = useRouter();
  const { order_id } = useLocalSearchParams();
  const { token } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Get order_id from URL params or sessionStorage
      const orderId = order_id || (Platform.OS === 'web' ? window.sessionStorage.getItem('pending_order_id') : null);
      
      if (!orderId) {
        setStatus('failed');
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/cashfree/verify-payment`,
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStatus('success');
        // Clear stored order_id
        if (Platform.OS === 'web') {
          window.sessionStorage.removeItem('pending_order_id');
        }
        // Redirect to profile after 3 seconds
        setTimeout(() => {
          router.replace('/secure/(tabs)/profile');
        }, 3000);
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setStatus('failed');
    }
  };

  return (
    <LinearGradient colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {status === 'verifying' && (
            <>
              <ActivityIndicator size="large" color="#FF6FB5" />
              <Text style={styles.title}>Verifying Payment...</Text>
              <Text style={styles.subtitle}>Please wait while we confirm your payment</Text>
            </>
          )}

          {status === 'success' && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              </View>
              <Text style={styles.title}>Payment Successful!</Text>
              <Text style={styles.subtitle}>
                Your subscription has been activated successfully.
                {'\n\n'}
                Redirecting to your profile...
              </Text>
            </>
          )}

          {status === 'failed' && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={80} color="#F44336" />
              </View>
              <Text style={styles.title}>Payment Failed</Text>
              <Text style={styles.subtitle}>
                We couldn't verify your payment. Please try again or contact support.
              </Text>
            </>
          )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
});
