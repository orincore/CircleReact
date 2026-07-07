import SignupScreenLayout, { PRIMARY_BUTTON_COLOR } from '@/components/signup/SignupScreenLayout';
import SignupOtpInput from '@/components/signup/SignupOtpInput';
import { SignupPrimaryButton } from '@/components/signup/SignupButton';
import { useTheme } from '@/contexts/ThemeContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (email) sendOTP();
  }, []);

  const sendOTP = async () => {
    try {
      setResending(true);
      await http.post('/api/auth/forgot-password', { email });

      if (Platform.OS !== 'web') {
        Alert.alert('Code Sent! 📧', `We've sent a 6-digit reset code to ${email}`, [{ text: 'OK' }]);
      }
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      console.error('Send reset code error:', error);
      const errorMessage = error.message || 'Failed to send reset code';
      if (Platform.OS !== 'web') Alert.alert('Error', errorMessage);
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) verifyOTP(newOtp.join(''));
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
      await http.post('/api/auth/verify-reset-otp', { email, otp: otpCode });
      setSuccess(true);

      setTimeout(() => {
        router.push({
          pathname: '/auth/new-password',
          params: { email, resetToken: otpCode },
        });
      }, 1000);
    } catch (error) {
      console.error('Verify reset OTP error:', error);
      setError(error.message || 'Invalid reset code. Please try again.');
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

  return (
    <SignupScreenLayout
      onBack={() => router.back()}
      title="Verify reset code"
      subtitle={`We've sent a 6-digit reset code to ${email}. Enter it below to continue.`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark" size={40} color={PRIMARY_BUTTON_COLOR} />
      </View>

      {success && (
        <View style={[styles.successBanner, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10b981' }]}>
          <Ionicons name="checkmark-circle" size={22} color="#10b981" />
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { color: '#10b981' }]}>Code verified</Text>
            <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
              Redirecting to set your new password.
            </Text>
          </View>
        </View>
      )}

      {!!error && !success && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SignupOtpInput
        otp={otp}
        onChange={handleOtpChange}
        onKeyPress={handleKeyPress}
        inputRefs={inputRefs}
        disabled={loading}
      />

      <SignupPrimaryButton
        label={loading ? 'Verifying...' : 'Verify code'}
        onPress={() => verifyOTP()}
        disabled={loading || otp.join('').length !== 6}
        loading={loading}
      />

      <View style={styles.resendSection}>
        <Text style={[styles.resendText, { color: theme.textSecondary }]}>Didn't receive the code?</Text>
        {canResend ? (
          <TouchableOpacity onPress={resendOTP} disabled={resending}>
            <Text style={[styles.resendLink, { color: PRIMARY_BUTTON_COLOR }]}>
              {resending ? 'Sending...' : 'Resend code'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.countdownText, { color: theme.textTertiary }]}>Resend in {countdown}s</Text>
        )}
      </View>

      <View
        style={[
          styles.spamWarningBanner,
          { backgroundColor: isDarkMode ? 'rgba(255,244,230,0.12)' : '#FFF4E6', borderColor: '#FF6B00' },
        ]}
      >
        <Ionicons name="warning" size={20} color="#FF6B00" />
        <View style={styles.warningTextContainer}>
          <Text style={[styles.warningTitle, { color: '#FF6B00' }]}>Check your spam folder</Text>
          <Text style={[styles.warningText, { color: theme.textSecondary }]}>
            OTP emails may land in spam. Please check your spam/junk folder if you don't see the email in your inbox.
          </Text>
        </View>
      </View>
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    fontWeight: '500',
    color: '#ef4444',
    flex: 1,
  },
  resendSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  resendText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    marginBottom: 6,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
  countdownText: {
    fontSize: 13,
    fontFamily: 'Poppins',
  },
  spamWarningBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
});
