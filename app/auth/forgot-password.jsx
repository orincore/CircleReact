import SignupScreenLayout, { PRIMARY_BUTTON_COLOR } from '@/components/signup/SignupScreenLayout';
import SignupInput from '@/components/signup/SignupInput';
import { SignupPrimaryButton } from '@/components/signup/SignupButton';
import { useTheme } from '@/contexts/ThemeContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
      await http.post('/api/auth/forgot-password', { email: email.toLowerCase().trim() });
      setSuccess(true);

      setTimeout(() => {
        router.push({
          pathname: '/auth/reset-password-otp',
          params: { email: email.toLowerCase().trim() },
        });
      }, 1500);
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignupScreenLayout
      onBack={() => router.back()}
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a verification code to reset your password."
    >
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={40} color={PRIMARY_BUTTON_COLOR} />
      </View>

      {success && (
        <View style={[styles.successBanner, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10b981' }]}>
          <Ionicons name="checkmark-circle" size={22} color="#10b981" />
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { color: '#10b981' }]}>Reset code sent</Text>
            <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
              Check your email for the 6-digit code. Redirecting...
            </Text>
          </View>
        </View>
      )}

      {!!error && !success && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SignupInput label="Email address">
        <Ionicons name="mail-outline" size={20} color={theme.primary} />
        <TextInput
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          placeholder="you@example.com"
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading && !success}
          style={[styles.input, { color: theme.textPrimary }]}
        />
      </SignupInput>

      <SignupPrimaryButton
        label={loading ? 'Sending code...' : success ? 'Code sent' : 'Send reset code'}
        onPress={handleSendResetCode}
        disabled={loading || success}
        loading={loading}
      />

      <TouchableOpacity style={styles.backToLoginButton} onPress={() => router.back()}>
        <Text style={[styles.backToLoginText, { color: theme.textSecondary }]}>
          Remember your password?{' '}
          <Text style={[styles.backToLoginLink, { color: PRIMARY_BUTTON_COLOR }]}>Sign in</Text>
        </Text>
      </TouchableOpacity>
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
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    padding: 0,
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
  backToLoginButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backToLoginText: {
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  backToLoginLink: {
    fontWeight: '700',
  },
});
