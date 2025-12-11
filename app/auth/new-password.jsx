import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView, ScrollView, Image, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { http } from '@/src/api/http';
import { useTheme } from '@/contexts/ThemeContext';

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

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleResetPassword = async () => {
    // Clear previous error
    setError('');
    
    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await http.post('/api/auth/reset-password', {
        email,
        resetToken,
        newPassword: password,
      });

      // Success
      setSuccess(true);
      
      if (Platform.OS === 'web') {
        // Redirect to login after showing success for 3 seconds
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      } else {
        Alert.alert(
          'Success! 🎉',
          'Password reset successfully! You can now sign in with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
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
      const onBackPress = () => {
        // Consume back press so user can't navigate back into the reset flow
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

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
              <Ionicons name="key" size={48} color="#7C2B86" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.webTitle}>Create New Password</Text>
          <Text style={styles.webSubtitle}>
            Your new password must be different from your previous password and at least 6 characters long.
          </Text>

          {/* Success Message */}
          {success && (
            <View style={styles.webSuccessContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <View style={styles.webSuccessTextContainer}>
                <Text style={styles.webSuccessTitle}>Password Reset Successfully! 🎉</Text>
                <Text style={styles.webSuccessText}>
                  You can now sign in with your new password. Redirecting to login...
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.webErrorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.webErrorText}>{error}</Text>
            </View>
          )}

          {/* Password Input */}
          <View style={styles.webInputContainer}>
            <Text style={styles.webInputLabel}>New Password</Text>
            <View style={styles.webPasswordContainer}>
              <TextInput
                style={styles.webPasswordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.webEyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.webStrengthContainer}>
                <View style={styles.webStrengthBar}>
                  <View 
                    style={[
                      styles.webStrengthFill, 
                      { 
                        width: `${(passwordStrength.strength / 3) * 100}%`, 
                        backgroundColor: passwordStrength.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.webStrengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.webInputContainer}>
            <Text style={styles.webInputLabel}>Confirm Password</Text>
            <View style={styles.webPasswordContainer}>
              <TextInput
                style={styles.webPasswordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.webEyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.webMatchContainer}>
                <Ionicons
                  name={password === confirmPassword ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={password === confirmPassword ? "#10b981" : "#ef4444"}
                />
                <Text style={[
                  styles.webMatchText,
                  { color: password === confirmPassword ? "#10b981" : "#ef4444" }
                ]}>
                  {password === confirmPassword ? "Passwords match" : "Passwords don't match"}
                </Text>
              </View>
            )}
          </View>

          {/* Reset Password Button */}
          <TouchableOpacity
            style={[
              styles.webResetButton,
              (loading || !password || !confirmPassword || password !== confirmPassword) && styles.webResetButtonDisabled
            ]}
            onPress={handleResetPassword}
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          >
            <Text style={styles.webResetButtonText}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.webSecurityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#7C2B86" />
            <Text style={styles.webSecurityText}>
              Your password is encrypted and stored securely
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Mobile UI with new theme-based design and no back navigation
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header (no back action) */}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <View style={styles.brandRow}>
            <Image 
              source={require('@/assets/logo/circle-logo.png')} 
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Circle</Text>
          </View>
          <View style={styles.headerSide} />
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
                <Text style={[styles.title, { color: theme.textPrimary }]}>Create a new password</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  Choose a strong password that you haven't used before. You'll use this to sign in next time.
                </Text>
              </View>

              {/* Card with fields */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Error banner */}
                {error ? (
                  <View style={[styles.errorBanner, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}> 
                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
                  </View>
                ) : null}

                {/* New password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New password</Text>
                  <View
                    style={[
                      styles.passwordContainer,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.passwordInput, { color: theme.textPrimary }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={theme.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={[styles.strengthBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(148,163,184,0.25)' }]}>
                        <View
                          style={[
                            styles.strengthFill,
                            {
                              width: `${(passwordStrength.strength / 3) * 100}%`,
                              backgroundColor: passwordStrength.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.text}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm password</Text>
                  <View
                    style={[
                      styles.passwordContainer,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.passwordInput, { color: theme.textPrimary }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor={theme.textTertiary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={theme.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password Match Indicator */}
                  {confirmPassword.length > 0 && (
                    <View style={styles.matchContainer}>
                      <Ionicons
                        name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={password === confirmPassword ? '#10b981' : '#ef4444'}
                      />
                      <Text
                        style={[
                          styles.matchText,
                          { color: password === confirmPassword ? '#10b981' : '#ef4444' },
                        ]}
                      >
                        {password === confirmPassword ? 'Passwords match' : "Passwords don't match"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Reset Password Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (loading || !password || !confirmPassword || password !== confirmPassword) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.primaryButtonText}>Resetting password...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Reset password</Text>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Security Note */}
                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.primary} />
                  <Text style={[styles.securityText, { color: theme.textSecondary }]}>
                    Your password is encrypted and stored securely.
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
    maxWidth: 450,
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
  webPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  webPasswordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  webEyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  webStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  webStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  webStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  webStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  webMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  webMatchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webResetButton: {
    backgroundColor: '#7C2B86',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  webResetButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  webResetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  webSecurityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  webSecurityText: {
    fontSize: 14,
    color: '#64748b',
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
  headerSide: {
    width: 36,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '500',
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  securityText: {
    fontSize: 13,
  },
});
