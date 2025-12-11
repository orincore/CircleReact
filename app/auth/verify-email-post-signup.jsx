import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyEmailPostSignup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, name } = params;
  const { user, token, completeEmailVerification } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  // Helper function to complete email verification (web-compatible)
  const handleEmailVerificationSuccess = async (message = 'Your email has been successfully verified. Welcome to Circle!') => {
    //console.log('🔄 Starting email verification completion...');
    
    if (Platform.OS === 'web') {
      // On web, redirect immediately without Alert
      //console.log('🌐 Web platform detected, redirecting directly');
      try {
        await completeEmailVerification();
        //console.log('✅ Email verification completion successful');
      } catch (error) {
        console.error('❌ Email verification completion failed:', error);
        // Fallback: direct navigation
        router.replace('/secure/(tabs)/match');
      }
    } else {
      // On mobile, show Alert as usual
      Alert.alert(
        'Email Verified! 🎉',
        message,
        [
          {
            text: 'Continue to App',
            onPress: async () => {
              try {
                await completeEmailVerification();
                //console.log('✅ Email verification completion successful');
              } catch (error) {
                console.error('❌ Email verification completion failed:', error);
                router.replace('/secure/(tabs)/match');
              }
            },
          },
        ]
      );
    }
  };

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Check if email is already verified, if not send OTP
  useEffect(() => {
    const checkEmailStatus = async () => {
      if (email || user?.email) {
        try {
          // Check if email is already verified
          const targetEmail = email || user?.email;
          const statusResponse = await http.get(`/api/auth/otp-status/${encodeURIComponent(targetEmail)}`);
          
          if (statusResponse.isVerified) {
            //console.log('✅ Email already verified, redirecting to app');
            await handleEmailVerificationSuccess('Your email has already been verified. Welcome to Circle!');
            return;
          }
        } catch (error) {
          //console.log('Could not check email status, proceeding with OTP send');
        }
        
        // If not verified, send OTP
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
      
      const data = await http.post('/api/auth/send-otp', {
        email: targetEmail,
        name: targetName,
      });
      
      // Clear existing OTP inputs when resending
      setOtp(['', '', '', '', '', '']);
      
      // If we reach here, the request was successful
      if (Platform.OS === 'web') {
        window.alert(`OTP Sent! 📧\n\nWe've sent a 6-digit verification code to ${targetEmail}`);
      } else {
        Alert.alert(
          'OTP Sent! 📧',
          `We've sent a 6-digit verification code to ${targetEmail}`,
          [{ text: 'OK' }]
        );
      }
      setCountdown(60);
      setCanResend(false);
      
      // Focus first input after resend
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
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
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all fields are filled
    if (newOtp.every(digit => digit !== '') && !loading) {
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
      if (Platform.OS === 'web') {
        window.alert('Invalid OTP\n\nPlease enter all 6 digits');
      } else {
        Alert.alert('Invalid OTP', 'Please enter all 6 digits');
      }
      return;
    }

    setLoading(true);
    try {
      const targetEmail = email || user?.email;
      
      const data = await http.post('/api/auth/verify-otp', {
        email: targetEmail,
        otp: otpCode,
      });
      
      // If we reach here, the request was successful (http utility throws on error)
      await handleEmailVerificationSuccess();
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      // Handle case where email is already verified
      if (error.message && error.message.toLowerCase().includes('already verified')) {
        //console.log('✅ Email already verified, completing authentication');
        await handleEmailVerificationSuccess('Your email has already been verified. Welcome to Circle!');
        return;
      }
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      
      // Handle other errors
      if (Platform.OS === 'web') {
        window.alert('Error: Invalid OTP. Please try again.');
      } else {
        Alert.alert('Error', 'Invalid OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    await sendOTP();
  };

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
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Verify email</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={48} color={theme.primary} />
            </View>

            <Text style={[styles.title, { color: theme.textPrimary }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }] }>
              We've sent a 6-digit verification code to{'\n'}
              <Text style={[styles.emailText, { color: theme.primary }]}>{email || user?.email}</Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    loading && styles.otpInputDisabled,
                    {
                      color: theme.textPrimary,
                      borderColor: digit ? theme.primary : theme.border,
                    },
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
              style={[styles.primaryButton, (loading || otp.some(digit => !digit)) && styles.primaryButtonDisabled]}
              onPress={() => verifyOTP()}
              disabled={loading || otp.some(digit => !digit)}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>Verifying...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify email</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
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
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emailText: {
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  otpInput: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(161, 106, 232, 0.06)',
  },
  otpInputFilled: {
    backgroundColor: 'rgba(161, 106, 232, 0.14)',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#A16AE8',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
    marginTop: 16,
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
    marginTop: 16,
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
});
