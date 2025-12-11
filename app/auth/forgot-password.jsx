import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { http } from '@/src/api/http';
import { useTheme } from '@/contexts/ThemeContext';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { theme, isDarkMode } = useTheme();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetCode = async () => {
    setError('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/auth/forgot-password', {
        email: email.toLowerCase().trim(),
      });

      setSuccess(true);
      
      // Navigate to OTP verification page after a short delay
      setTimeout(() => {
        router.push({
          pathname: '/auth/reset-password-otp',
          params: {
            email: email.toLowerCase().trim(),
          }
        });
      }, 1500);

    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.message || 'Failed to send reset code. Please try again.';
      setError(errorMessage);
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

          {/* Success Message */}
          {success && (
            <View style={styles.webSuccessContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <View style={styles.webSuccessTextContainer}>
                <Text style={styles.webSuccessTitle}>Reset Code Sent! 📧</Text>
                <Text style={styles.webSuccessText}>
                  Check your email for the 6-digit code. Redirecting...
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && !success && (
            <View style={styles.webErrorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.webErrorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.webInputContainer}>
            <Text style={styles.webInputLabel}>Email Address</Text>
            <TextInput
              style={[styles.webInput, error && styles.webInputError]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="Enter your email address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !success}
              autoComplete="email"
            />
          </View>

          {/* Send Code Button */}
          <TouchableOpacity
            style={[
              styles.webSendButton,
              (loading || success) && styles.webSendButtonDisabled
            ]}
            onPress={handleSendResetCode}
            disabled={loading || success}
          >
            {loading ? (
              <View style={styles.webButtonContent}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.webSendButtonText}>Sending Code...</Text>
              </View>
            ) : success ? (
              <View style={styles.webButtonContent}>
                <Ionicons name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.webSendButtonText}>Code Sent!</Text>
              </View>
            ) : (
              <Text style={styles.webSendButtonText}>Send Reset Code</Text>
            )}
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

  // Mobile UI with new theme-based design
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { borderColor: theme.border }]}> 
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Image 
              source={require('@/assets/logo/circle-logo.png')} 
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Circle</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Title and Description */}
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Reset your password</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Enter your email address and we'll send you a verification code to reset your password.
                </Text>
              </View>

              {/* Main card */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Success Message */}
                {success && (
                  <View style={[styles.successBanner, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', borderColor: '#10b981' }]}>
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                    <View style={styles.successTextContainer}>
                      <Text style={[styles.successTitle, { color: '#10b981' }]}>Reset code sent</Text>
                      <Text style={[styles.successText, { color: theme.textSecondary }]}>
                        Check your email for the 6-digit code. Redirecting...
                      </Text>
                    </View>
                  </View>
                )}

                {/* Error Message */}
                {error && !success && (
                  <View style={[styles.errorBanner, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
                  </View>
                )}

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email address</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.background,
                        borderColor: error ? '#ef4444' : theme.border,
                      },
                    ]}
                  >
                    <Ionicons name="mail-outline" size={18} color={error ? '#ef4444' : theme.primary} />
                    <TextInput
                      style={[styles.input, { color: theme.textPrimary }]}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setError('');
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading && !success}
                    />
                  </View>
                </View>

                {/* Send Code Button */}
                <TouchableOpacity
                  style={[styles.sendButton, (loading || success) && styles.sendButtonDisabled]}
                  onPress={handleSendResetCode}
                  disabled={loading || success}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.sendButtonText}>Sending code...</Text>
                    </>
                  ) : success ? (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      <Text style={styles.sendButtonText}>Code sent</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.sendButtonText}>Send reset code</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Back to Login */}
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.back()}
              >
                <Text style={[styles.backToLoginText, { color: theme.textSecondary }]}>
                  Remember your password?{' '}
                  <Text style={[styles.backToLoginLink, { color: theme.primary }]}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
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
  webSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  webSuccessTextContainer: {
    flex: 1,
  },
  webSuccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  webSuccessText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  webErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  webErrorText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
  webInputError: {
    borderColor: '#ef4444',
  },
  webButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // Mobile styles (new theme-based)
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
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  titleBlock: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#A16AE8',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#A16AE8',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToLoginButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backToLoginText: {
    fontSize: 14,
  },
  backToLoginLink: {
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#ef4444',
  },
});
