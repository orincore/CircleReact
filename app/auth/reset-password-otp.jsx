import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

export default function ResetPasswordOTP() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;
  const { theme, isDarkMode } = useTheme();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Auto-send OTP when component mounts
  useEffect(() => {
    if (email) {
      sendOTP();
    }
  }, []);

  const sendOTP = async () => {
    try {
      setResending(true);
      
      await http.post('/api/auth/forgot-password', {
        email: email,
      });
      
      // Show success message based on platform
      if (Platform.OS === 'web') {
        //console.log(`Reset code sent to ${email}`);
      } else {
        Alert.alert(
          'Code Sent! 📧',
          `We've sent a 6-digit reset code to ${email}`,
          [{ text: 'OK' }]
        );
      }
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      console.error('Send reset code error:', error);
      const errorMessage = error.message || 'Failed to send reset code';
      
      if (Platform.OS === 'web') {
        console.error(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpCode = otp.join('')) => {
    setError('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/auth/verify-reset-otp', {
        email: email,
        otp: otpCode,
      });
      
      setSuccess(true);
      
      // Navigate to new password page after a short delay
      setTimeout(() => {
        router.push({
          pathname: '/auth/new-password',
          params: {
            email: email,
            resetToken: otpCode, // Use OTP as temporary reset token
          }
        });
      }, 1000);

    } catch (error) {
      console.error('Verify reset OTP error:', error);
      const errorMessage = error.message || 'Invalid reset code. Please try again.';
      setError(errorMessage);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    await sendOTP();
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
              <Ionicons name="shield-checkmark" size={48} color="#7C2B86" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.webTitle}>Verify Reset Code</Text>
          <Text style={styles.webSubtitle}>
            We've sent a 6-digit reset code to <Text style={styles.webEmail}>{email}</Text>
          </Text>

          {/* Success Message */}
          {success && (
            <View style={styles.webSuccessContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <View style={styles.webSuccessTextContainer}>
                <Text style={styles.webSuccessTitle}>Code Verified! ✅</Text>
                <Text style={styles.webSuccessText}>
                  Redirecting to set your new password...
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

          {/* OTP Input */}
          <View style={styles.webOtpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.webOtpInput,
                  digit && styles.webOtpInputFilled,
                  loading && styles.webOtpInputDisabled
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
                autoComplete="one-time-code"
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.webVerifyButton,
              (loading || otp.join('').length !== 6) && styles.webVerifyButtonDisabled
            ]}
            onPress={() => verifyOTP()}
            disabled={loading || otp.join('').length !== 6}
          >
            <Text style={styles.webVerifyButtonText}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Text>
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.webResendSection}>
            <Text style={styles.webResendText}>Didn't receive the code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={resendOTP} disabled={resending} style={styles.webResendButton}>
                <Text style={styles.webResendLink}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.webCountdownText}>
                Resend in {countdown}s
              </Text>
            )}
          </View>

          {/* Spam Warning Banner */}
          <View style={styles.webSpamWarning}>
            <Ionicons name="warning" size={20} color="#FF6B00" />
            <View style={{ flex: 1 }}>
              <Text style={styles.webSpamWarningTitle}>⚠️ Check Your Spam Folder</Text>
              <Text style={styles.webSpamWarningText}>
                OTP emails may land in spam. Please check your spam/junk folder.
              </Text>
            </View>
          </View>
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
              {/* Title & description */}
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Verify reset code</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  We've sent a 6-digit reset code to {email}. Enter it below to continue.
                </Text>
              </View>

              {/* Card with OTP + state */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Success banner */}
                {success && (
                  <View
                    style={[
                      styles.successBanner,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(16,185,129,0.16)'
                          : 'rgba(16,185,129,0.08)',
                        borderColor: '#10b981',
                      },
                    ]}
                  >
                    <View style={styles.successIconWrapper}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                    <View style={styles.successTextContainer}>
                      <Text style={[styles.successTitle, { color: '#10b981' }]}>Code verified</Text>
                      <Text style={[styles.successText, { color: theme.textSecondary }]}>
                        Redirecting to set your new password.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Error banner */}
                {error && !success && (
                  <View style={[styles.errorBanner, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}> 
                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
                  </View>
                )}

                {/* OTP Input */}
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => inputRefs.current[index] = ref}
                      style={[
                        styles.otpInput,
                        digit && styles.otpInputFilled,
                        loading && styles.otpInputDisabled,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!loading}
                    />
                  ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, (loading || otp.join('').length !== 6) && styles.primaryButtonDisabled]}
                  onPress={() => verifyOTP()}
                  disabled={loading || otp.join('').length !== 6}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.primaryButtonText}>Verifying...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Verify code</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                  <Text style={[styles.resendText, { color: theme.textSecondary }]}>Didn't receive the code?</Text>
                  {canResend ? (
                    <TouchableOpacity onPress={resendOTP} disabled={resending}>
                      <Text style={[styles.resendLink, { color: theme.primary }]}>
                        {resending ? 'Sending...' : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.countdownText, { color: theme.textTertiary }]}>
                      Resend in {countdown}s
                    </Text>
                  )}
                </View>
              </View>

              {/* Spam Warning Banner */}
              <View style={[styles.spamWarningBanner, { backgroundColor: isDarkMode ? 'rgba(255,244,230,0.12)' : '#FFF4E6', borderColor: '#FF6B00' }]}> 
                <View style={styles.warningIconContainer}>
                  <Ionicons name="warning" size={20} color="#FF6B00" />
                </View>
                <View style={styles.warningTextContainer}>
                  <Text style={[styles.warningTitle, { color: '#FF6B00' }]}>Check your spam folder</Text>
                  <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                    OTP emails may land in spam. Please check your spam/junk folder if you don't see the email in your inbox.
                  </Text>
                </View>
              </View>
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
  webEmail: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  webOtpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  webOtpInput: {
    width: 50,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  webOtpInputFilled: {
    borderColor: '#7C2B86',
    backgroundColor: '#faf5ff',
  },
  webOtpInputDisabled: {
    opacity: 0.6,
  },
  webVerifyButton: {
    backgroundColor: '#7C2B86',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webVerifyButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  webVerifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  webResendSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  webResendText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  webResendButton: {
    padding: 4,
  },
  webResendLink: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  webCountdownText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  webSpamWarning: {
    backgroundColor: '#FFF4E6',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
  },
  webSpamWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B00',
    marginBottom: 4,
  },
  webSpamWarningText: {
    fontSize: 12,
    color: '#8B4000',
    lineHeight: 16,
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 18,
    columnGap: 10,
  },
  otpInput: {
    width: 46,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(161, 106, 232, 0.06)',
    borderColor: 'rgba(161, 106, 232, 0.25)',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
  },
  otpInputFilled: {
    borderColor: '#A16AE8',
    backgroundColor: 'rgba(161, 106, 232, 0.14)',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#A16AE8',
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#A16AE8',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 13,
    marginBottom: 6,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 13,
  },
  spamWarningBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
  },
  warningIconContainer: {
    marginTop: 2,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  successIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },
  successText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});
