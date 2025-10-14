import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordOTP() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
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
    if (otpCode.length !== 6) {
      const message = 'Please enter all 6 digits';
      if (Platform.OS === 'web') {
        console.error(message);
      } else {
        Alert.alert('Invalid OTP', message);
      }
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/auth/verify-reset-otp', {
        email: email,
        otp: otpCode,
      });
      
      // Navigate to new password page
      router.push({
        pathname: '/auth/new-password',
        params: {
          email: email,
          resetToken: otpCode, // Use OTP as temporary reset token
        }
      });

    } catch (error) {
      console.error('Verify reset OTP error:', error);
      const errorMessage = error.message || 'Invalid reset code. Please try again.';
      
      if (Platform.OS === 'web') {
        console.error(errorMessage);
      } else {
        Alert.alert('Verification Failed', errorMessage);
      }
      
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
          <Text style={styles.headerTitle}>Verify Reset Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#7C2B86" />
          </View>

          <Text style={styles.title}>Enter Reset Code 🔐</Text>
          <Text style={styles.description}>
            We've sent a 6-digit reset code to {email}. Enter it below to continue.
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  loading && styles.otpInputDisabled
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
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={() => verifyOTP()}
            disabled={loading || otp.join('').length !== 6}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.verifyButtonText}>Verifying...</Text>
              </>
            ) : (
              <>
                <Text style={styles.verifyButtonText}>Verify Code</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={resendOTP} disabled={resending}>
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>
                Resend in {countdown}s
              </Text>
            )}
          </View>
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
    outline: 'none',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#7C2B86',
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#A0A0A0',
    shadowColor: '#A0A0A0',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendText: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 8,
  },
  resendLink: {
    fontSize: 16,
    color: '#7C2B86',
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 16,
    color: '#A0A0A0',
  },
});
