import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { socialAccountsApi } from '@/src/api/social-accounts';

export default function InstagramCallback() {
  const { code, state, error } = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting your Instagram account...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      if (error) {
        setStatus('error');
        setMessage(`Authentication failed: ${error}`);
        setTimeout(() => router.back(), 3000);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Missing authentication parameters');
        setTimeout(() => router.back(), 3000);
        return;
      }

      // Send callback data to backend
      const response = await socialAccountsApi.handleInstagramCallback(code, state, error);
      
      if (response.success) {
        setStatus('success');
        setMessage('Instagram account linked successfully!');
        setTimeout(() => router.back(), 2000);
      } else {
        setStatus('error');
        setMessage(response.message || 'Failed to link Instagram account');
        setTimeout(() => router.back(), 3000);
      }
    } catch (error) {
      console.error('Instagram callback error:', error);
      setStatus('error');
      setMessage('Failed to complete Instagram authentication');
      setTimeout(() => router.back(), 3000);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#00AA55';
      case 'error':
        return '#FF4444';
      default:
        return '#7C2B86';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📸';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={styles.title}>Instagram Authentication</Text>
        <Text style={[styles.message, { color: getStatusColor() }]}>
          {message}
        </Text>
        {status === 'processing' && (
          <ActivityIndicator 
            size="large" 
            color="#E4405F" 
            style={styles.loader}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});
