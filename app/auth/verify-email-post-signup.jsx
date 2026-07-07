import SignupScreenLayout, { PRIMARY_BUTTON_COLOR } from '@/components/signup/SignupScreenLayout';
import SignupOtpInput from '@/components/signup/SignupOtpInput';
import { SignupPrimaryButton } from '@/components/signup/SignupButton';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyEmailPostSignup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, name } = params;
  const { user, completeEmailVerification } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  const handleEmailVerificationSuccess = async (message = 'Your email has been successfully verified. Welcome to Circle!') => {
    if (Platform.OS === 'web') {
      try {
        await completeEmailVerification();
      } catch (error) {
        console.error('❌ Email verification completion failed:', error);
        router.replace('/secure/(tabs)/match');
      }
    } else {
      Alert.alert('Email Verified! 🎉', message, [
        {
          text: 'Continue to App',
          onPress: async () => {
            try {
              await completeEmailVerification();
            } catch (error) {
              console.error('❌ Email verification completion failed:', error);
              router.replace('/secure/(tabs)/match');
            }
          },
        },
      ]);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    const checkEmailStatus = async () => {
      if (email || user?.email) {
        try {
          const targetEmail = email || user?.email;
          const statusResponse = await http.get(`/api/auth/otp-status/${encodeURIComponent(targetEmail)}`);
          if (statusResponse.isVerified) {
            await handleEmailVerificationSuccess('Your email has already been verified. Welcome to Circle!');
            return;
          }
        } catch (error) {
          // proceed to send OTP
        }
        sendOTP();
      }
    };
    checkEmailStatus();
  }, []);

  const sendOTP = async () => {
    try {
      setResending(true);
      const targetEmail = email || user?.email;
      const targetName = name || user?.firstName || 'User';

      await http.post('/api/auth/send-otp', { email: targetEmail, name: targetName });

      setOtp(['', '', '', '', '', '']);

      if (Platform.OS === 'web') {
        window.alert(`OTP Sent! 📧\n\nWe've sent a 6-digit verification code to ${targetEmail}`);
      } else {
        Alert.alert('OTP Sent! 📧', `We've sent a 6-digit verification code to ${targetEmail}`, [{ text: 'OK' }]);
      }
      setCountdown(60);
      setCanResend(false);

      setTimeout(() => { inputRefs.current[0]?.focus(); }, 100);
    } catch (error) {
      console.error('Send OTP error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Failed to send OTP. Please check your connection.');
      } else {
        Alert.alert('Error', 'Failed to send OTP. Please check your connection.');
      }
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
    if (newOtp.every(digit => digit !== '') && !loading) verifyOTP(newOtp.join(''));
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      if (Platform.OS === 'web') window.alert('Invalid OTP\n\nPlease enter all 6 digits');
      else Alert.alert('Invalid OTP', 'Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const targetEmail = email || user?.email;
      await http.post('/api/auth/verify-otp', { email: targetEmail, otp: otpCode });
      await handleEmailVerificationSuccess();
    } catch (error) {
      console.error('Verify OTP error:', error);
      if (error.message && error.message.toLowerCase().includes('already verified')) {
        await handleEmailVerificationSuccess('Your email has already been verified. Welcome to Circle!');
        return;
      }
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => { inputRefs.current[0]?.focus(); }, 100);
      if (Platform.OS === 'web') window.alert('Error: Invalid OTP. Please try again.');
      else Alert.alert('Error', 'Invalid OTP. Please try again.');
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
      title="Check your email"
      subtitle={`We've sent a 6-digit verification code to ${email || user?.email}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="mail" size={40} color={PRIMARY_BUTTON_COLOR} />
      </View>

      <SignupOtpInput
        otp={otp}
        onChange={handleOtpChange}
        onKeyPress={handleKeyPress}
        inputRefs={inputRefs}
        disabled={loading}
      />

      <SignupPrimaryButton
        label={loading ? 'Verifying...' : 'Verify email'}
        onPress={() => verifyOTP()}
        disabled={loading || otp.some(digit => !digit)}
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
  resendSection: {
    alignItems: 'center',
    marginTop: 20,
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
