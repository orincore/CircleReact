import SignupScreenLayout, { PRIMARY_BUTTON_COLOR } from '@/components/signup/SignupScreenLayout';
import SignupInput from '@/components/signup/SignupInput';
import { SignupPrimaryButton } from '@/components/signup/SignupButton';
import { useTheme } from '@/contexts/ThemeContext';
import { http } from '@/src/api/http';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NewPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, resetToken } = params;
  const { theme, isDarkMode } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (password) => (password.length < 6 ? 'Password must be at least 6 characters long' : null);

  const handleResetPassword = async () => {
    setError('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/auth/reset-password', { email, resetToken, newPassword: password });
      setSuccess(true);

      if (Platform.OS === 'web') {
        setTimeout(() => { router.replace('/login'); }, 3000);
      } else {
        Alert.alert(
          'Success! 🎉',
          'Password reset successfully! You can now sign in with your new password.',
          [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, text: '', color: '#A0A0A0' };
    if (password.length < 6) return { strength: 1, text: 'Weak', color: '#FF6B6B' };
    if (password.length < 8) return { strength: 2, text: 'Fair', color: '#FFD93D' };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 3, text: 'Strong', color: '#6BCF7F' };
    }
    return { strength: 2, text: 'Good', color: '#4ECDC4' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Restrict hardware back on this password reset screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  return (
    <SignupScreenLayout
      title="Create a new password"
      subtitle="Choose a strong password that you haven't used before. You'll use this to sign in next time."
    >
      <View style={styles.iconWrap}>
        <Ionicons name="key" size={40} color={PRIMARY_BUTTON_COLOR} />
      </View>

      {!!error && (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SignupInput label="New password">
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter new password"
          placeholderTextColor={theme.textPlaceholder}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={[styles.input, { color: theme.textPrimary }]}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </SignupInput>
      {password.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={[styles.strengthBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.25)' }]}>
            <View style={[styles.strengthFill, { width: `${(passwordStrength.strength / 3) * 100}%`, backgroundColor: passwordStrength.color }]} />
          </View>
          <Text style={[styles.strengthText, { color: passwordStrength.color }]}>{passwordStrength.text}</Text>
        </View>
      )}

      <SignupInput label="Confirm password">
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          placeholderTextColor={theme.textPlaceholder}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={[styles.input, { color: theme.textPrimary }]}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading} hitSlop={8}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </SignupInput>
      {confirmPassword.length > 0 && (
        <View style={styles.matchContainer}>
          <Ionicons
            name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={password === confirmPassword ? '#10b981' : '#ef4444'}
          />
          <Text style={[styles.matchText, { color: password === confirmPassword ? '#10b981' : '#ef4444' }]}>
            {password === confirmPassword ? 'Passwords match' : "Passwords don't match"}
          </Text>
        </View>
      )}

      <SignupPrimaryButton
        label={loading ? 'Resetting password...' : 'Reset password'}
        onPress={handleResetPassword}
        disabled={loading || !password || !confirmPassword || password !== confirmPassword}
        loading={loading}
      />

      <View style={styles.securityNote}>
        <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
        <Text style={[styles.securityText, { color: theme.textSecondary }]}>
          Your password is encrypted and stored securely.
        </Text>
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
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    padding: 0,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 16,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 16,
    gap: 8,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  securityText: {
    fontSize: 13,
    fontFamily: 'Poppins',
  },
});
