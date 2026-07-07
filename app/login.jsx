import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import WavyBackground from '@/components/WavyBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY_BUTTON_COLOR = '#8B5CF6';
const SECONDARY_BORDER_COLOR = '#7C2B86';

export default function Login() {
  const router = useRouter();
  const { logIn } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email?.trim()) {
      setError('Please enter your email or username.');
      return;
    }

    if (!password?.trim()) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const loginPromise = logIn(email.trim(), password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout. Please check your connection.')), 30000)
      );

      await Promise.race([loginPromise, timeoutPromise]);
    } catch (e) {
      console.error('[Login] Error:', e);

      let errorMessage = 'Login failed. Please try again.';

      if (e?.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet and try again.';
      } else if (e?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (e?.message?.includes('credentials') || e?.message?.includes('password')) {
        errorMessage = 'Invalid email/username or password.';
      } else if (e?.message) {
        errorMessage = e.message;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <WavyBackground />

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.content,
              isLargeScreen && styles.contentLarge,
              { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >

            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <Image
                source={require('@/assets/illustration/login-cuate.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

            {/* Form Card */}
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadowColor,
                  shadowOpacity: isDarkMode ? 0.3 : 0.08,
                },
              ]}
            >
              <Text style={[styles.formTitle, { color: theme.textPrimary }]}>Log In</Text>
              <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
                Enter your credentials to continue
              </Text>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email or Username</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.border,
                    },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color={theme.primary} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!submitting}
                    style={[styles.input, { color: theme.textPrimary }]}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.background,
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.border,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={theme.primary} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.textPlaceholder}
                    secureTextEntry={!showPassword}
                    editable={!submitting}
                    style={[styles.input, { color: theme.textPrimary }]}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={submitting}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/auth/forgot-password')}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButtonWrap,
                  { backgroundColor: PRIMARY_BUTTON_COLOR },
                  submitting && styles.primaryButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {submitting ? 'Logging in...' : 'Log In'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signupRow}>
                <Text style={[styles.signupText, { color: theme.textSecondary }]}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text style={[styles.signupLink, { color: SECONDARY_BORDER_COLOR }]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
    zIndex: 1,
  },
  contentLarge: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 30,
  },
  logo: {
    width: 48,
    height: 48,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  illustrationWrap: {
    width: '100%',
    flex: 1,
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  formCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Poppins',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins',
    padding: 0,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  primaryButtonWrap: {
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 48,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'Poppins',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
  },
});
