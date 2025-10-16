import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyEmailPostSignup() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, name } = params;
  const { user, token, completeEmailVerification } = useAuth();
  
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
      
      // If we reach here, the request was successful
      Alert.alert(
        'OTP Sent! 📧',
        `We've sent a 6-digit verification code to ${targetEmail}`,
        [{ text: 'OK' }]
      );
      setCountdown(60);
      setCanResend(false);
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please check your connection.');
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
      Alert.alert('Invalid OTP', 'Please enter all 6 digits');
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
      
      // Handle other errors
      Alert.alert('Error', 'Failed to verify OTP. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    await sendOTP();
  };

  return (
    <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Success Card */}
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={64} color="#7C2B86" />
            </View>

            <Text style={styles.title}>Check Your Email 📧</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to{'\n'}
              <Text style={styles.emailText}>{email || user?.email}</Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
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
              disabled={loading || otp.some(digit => !digit)}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
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

            {/* Spam Warning Banner */}
            <View style={styles.spamWarningBanner}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="warning" size={24} color="#FF6B00" />
              </View>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>⚠️ Check Your Spam Folder</Text>
                <Text style={styles.warningText}>
                  OTP emails may land in spam. Please check your spam/junk folder if you don't see the email in your inbox.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailText: {
    fontWeight: '600',
    color: '#7C2B86',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#1F1147',
    backgroundColor: '#F8F9FA',
  },
  otpInputFilled: {
    borderColor: '#7C2B86',
    backgroundColor: '#FFFFFF',
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  verifyButton: {
    backgroundColor: '#7C2B86',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: '#A0A0A0',
    shadowColor: '#A0A0A0',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  countdownText: {
    fontSize: 14,
    color: '#999',
  },
  spamWarningBanner: {
    backgroundColor: '#FFF4E6',
    borderWidth: 2,
    borderColor: '#FF6B00',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  warningIconContainer: {
    marginTop: 2,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B00',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#8B4000',
    lineHeight: 18,
    fontWeight: '500',
  },
});
