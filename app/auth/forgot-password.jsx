import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { http } from '@/src/api/http';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      if (Platform.OS === 'web') {
        console.error('Please enter your email address');
      } else {
        Alert.alert('Error', 'Please enter your email address');
      }
      return;
    }

    if (!validateEmail(email)) {
      if (Platform.OS === 'web') {
        console.error('Please enter a valid email address');
      } else {
        Alert.alert('Error', 'Please enter a valid email address');
      }
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/auth/forgot-password', {
        email: email.toLowerCase().trim(),
      });

      // Navigate to OTP verification page
      router.push({
        pathname: '/auth/reset-password-otp',
        params: {
          email: email.toLowerCase().trim(),
        }
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.message || 'Failed to send reset code. Please try again.';
      
      if (Platform.OS === 'web') {
        console.error(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render web-optimized UI for browsers
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webCard}>
          {/* Header */}
          <View style={styles.webHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.webBackButton}>
              <Ionicons name="arrow-back" size={20} color="#7C2B86" />
              <Text style={styles.webBackText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Logo/Icon */}
          <View style={styles.webIconContainer}>
            <View style={styles.webIcon}>
              <Ionicons name="lock-closed" size={48} color="#7C2B86" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.webTitle}>Forgot Your Password?</Text>
          <Text style={styles.webSubtitle}>
            No worries! Enter your email address and we'll send you a verification code to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.webInputContainer}>
            <Text style={styles.webInputLabel}>Email Address</Text>
            <TextInput
              style={styles.webInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              autoComplete="email"
            />
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[
              styles.webSendButton,
              loading && styles.webSendButtonDisabled
            ]}
            onPress={handleSendResetCode}
            disabled={loading}
          >
            <Text style={styles.webSendButtonText}>
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </Text>
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.webBackToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.webBackToLoginText}>
              Remember your password? <Text style={styles.webBackToLoginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mobile UI (existing design)
  return (
    <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={64} color="#7C2B86" />
          </View>

          {/* Title and Description */}
          <Text style={styles.title}>Forgot Your Password? 🔒</Text>
          <Text style={styles.description}>
            No worries! Enter your email address and we'll send you a verification code to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#A0A0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendResetCode}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.sendButtonText}>Sending Code...</Text>
              </>
            ) : (
              <>
                <Text style={styles.sendButtonText}>Send Reset Code</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>
              Remember your password? <Text style={styles.backToLoginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Web-specific styles
  webContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  webCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
  },
  webHeader: {
    marginBottom: 20,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  webBackText: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
  },
  webIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  webIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  webInputContainer: {
    marginBottom: 24,
  },
  webInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  webInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    outline: 'none',
  },
  webSendButton: {
    backgroundColor: '#7C2B86',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  webSendButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  webSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  webBackToLoginButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  webBackToLoginText: {
    fontSize: 14,
    color: '#64748b',
  },
  webBackToLoginLink: {
    color: '#7C2B86',
    fontWeight: '600',
  },

  // Mobile styles (existing)
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sendButton: {
    backgroundColor: '#7C2B86',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#7C2B86',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0A0A0',
    shadowColor: '#A0A0A0',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToLoginButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 16,
    color: '#E0E0E0',
  },
  backToLoginLink: {
    color: '#7C2B86',
    fontWeight: '600',
  },
});
