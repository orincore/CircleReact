import { useAuth } from "@/contexts/AuthContext";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { Linking } from "react-native";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  useWindowDimensions,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();
  const { logIn } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Animation values - only for web/desktop
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Only animate on web/desktop to avoid lag on mobile
    if (Platform.OS === 'web' || isLargeScreen) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLargeScreen]);

  const handleLogin = async () => {
    // Validate inputs
    if (!email || typeof email !== 'string' || !email.trim()) {
      setError("Please enter your email or username.");
      return;
    }
    
    if (!password || typeof password !== 'string' || !password.trim()) {
      setError("Please enter your password.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Add timeout to prevent hanging
      const loginPromise = logIn(email.trim(), password);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timeout. Please check your connection.')), 30000)
      );
      
      await Promise.race([loginPromise, timeoutPromise]);
    } catch (e) {
      console.error('[Login] Error:', e);
      
      // Provide user-friendly error messages
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#7C2B86', '#A16AE8', '#5D5FEF']}
          locations={[0, 0.5, 1]}
          style={[styles.loginSection, isLargeScreen && styles.loginSectionLarge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="box-none"
        >
          <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
              behavior={Platform.select({ ios: "padding", android: undefined })}
              style={styles.keyboardView}
            >
              <Animated.View 
                style={[
                  styles.loginContent,
                  isLargeScreen && styles.loginContentLarge,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {isLargeScreen ? (
                  // Desktop Layout
                  <View style={styles.desktopGrid}>
                    {/* Left Side - Branding */}
                    <View style={styles.desktopLeft}>
                      <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                      >
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                      
                      <View style={styles.brandingSection}>
                        <Image 
                          source={require('@/assets/logo/circle-logo.png')} 
                          style={styles.brandLogo}
                          resizeMode="contain"
                        />
                        <Text style={styles.brandName}>Circle</Text>
                        <Text style={styles.brandTagline}>
                          Welcome back to your circle of connections
                        </Text>
                      </View>
                      
                      <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                          <LinearGradient
                            colors={['#FF6FB5', '#FF8CC5']}
                            style={styles.featureIconSmall}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="heart" size={20} color="#FFFFFF" />
                          </LinearGradient>
                          <Text style={styles.featureText}>Smart Matching</Text>
                        </View>
                        <View style={styles.featureItem}>
                          <LinearGradient
                            colors={['#A16AE8', '#B88EF0']}
                            style={styles.featureIconSmall}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                          </LinearGradient>
                          <Text style={styles.featureText}>Real-time Chat</Text>
                        </View>
                        <View style={styles.featureItem}>
                          <LinearGradient
                            colors={['#10B981', '#34D399']}
                            style={styles.featureIconSmall}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                          </LinearGradient>
                          <Text style={styles.featureText}>Safe & Secure</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Right Side - Login Form */}
                    <View style={styles.desktopRight}>
                      <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Log In</Text>
                        <Text style={styles.formSubtitle}>
                          Enter your credentials to continue
                        </Text>
                        
                        {error ? (
                          <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                          </View>
                        ) : null}
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Email or Username</Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={20} color="#A16AE8" />
                            <TextInput
                              value={email}
                              onChangeText={setEmail}
                              placeholder="you@example.com"
                              placeholderTextColor="rgba(31, 17, 71, 0.4)"
                              keyboardType="email-address"
                              autoCapitalize="none"
                              style={styles.input}
                            />
                          </View>
                        </View>
                        
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Password</Text>
                          <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={20} color="#A16AE8" />
                            <TextInput
                              value={password}
                              onChangeText={setPassword}
                              placeholder="Enter your password"
                              placeholderTextColor="rgba(31, 17, 71, 0.4)"
                              secureTextEntry={!showPassword}
                              style={styles.input}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                              <Ionicons 
                                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                size={20} 
                                color="#A16AE8" 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        <TouchableOpacity 
                          style={styles.forgotPassword}
                          onPress={() => router.push('/auth/forgot-password')}
                        >
                          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                          onPress={handleLogin}
                          disabled={submitting}
                        >
                          <Text style={styles.primaryButtonText}>
                            {submitting ? "Logging in..." : "Log In"}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        <View style={styles.divider}>
                          <View style={styles.dividerLine} />
                          <Text style={styles.dividerText}>or</Text>
                          <View style={styles.dividerLine} />
                        </View>
                        
                        <GoogleSignInButton
                          mode="signin"
                          disabled={submitting}
                          onSuccess={(result) => {
                            // Google auth handled in the component
                            console.log('Google sign-in successful');
                          }}
                          onError={(error) => {
                            setError('Google sign-in failed. Please try again.');
                          }}
                        />
                        
                        <View style={styles.signupPrompt}>
                          <Text style={styles.signupPromptText}>Don't have an account? </Text>
                          <Link href="/signup" asChild>
                            <TouchableOpacity>
                              <Text style={styles.signupLink}>Sign Up</Text>
                            </TouchableOpacity>
                          </Link>
                        </View>
                        
                        {/* Legal Documents Links */}
                        <View style={styles.legalLinks}>
                          <TouchableOpacity onPress={() => {
                            if (Platform.OS === 'web') {
                              router.push('/terms');
                            } else {
                              Linking.openURL('https://circle.orincore.com/terms.html');
                            }
                          }}>
                            <Text style={styles.legalLink}>Terms of Service</Text>
                          </TouchableOpacity>
                          <Text style={styles.legalSeparator}> • </Text>
                          <TouchableOpacity onPress={() => {
                            if (Platform.OS === 'web') {
                              router.push('/legal/privacy-policy');
                            } else {
                              Linking.openURL('https://circle.orincore.com/privacy.html');
                            }
                          }}>
                            <Text style={styles.legalLink}>Privacy Policy</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Mobile Layout
                  <View style={styles.mobileLayout}>
                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={styles.backButtonMobile}
                    >
                      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <View style={styles.mobileHeader}>
                      <Image 
                        source={require('@/assets/logo/circle-logo.png')} 
                        style={styles.mobileLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.mobileTitle}>Welcome Back</Text>
                      <Text style={styles.mobileSubtitle}>
                        Log in to continue your journey
                      </Text>
                    </View>
                    
                    <View style={styles.mobileFormCard}>
                      {error ? (
                        <View style={styles.errorBox}>
                          <Ionicons name="alert-circle" size={18} color="#EF4444" />
                          <Text style={styles.errorText}>{error}</Text>
                        </View>
                      ) : null}
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email or Username</Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="mail-outline" size={18} color="#A16AE8" />
                          <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor="rgba(31, 17, 71, 0.4)"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                            removeClippedSubviews={true}
                          />
                        </View>
                      </View>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.inputWrapper}>
                          <Ionicons name="lock-closed-outline" size={18} color="#A16AE8" />
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor="rgba(31, 17, 71, 0.4)"
                            secureTextEntry={!showPassword}
                            autoCorrect={false}
                            style={styles.input}
                            removeClippedSubviews={true}
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons 
                              name={showPassword ? "eye-off-outline" : "eye-outline"} 
                              size={18} 
                              color="#A16AE8" 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                        onPress={handleLogin}
                        disabled={submitting}
                      >
                        <Text style={styles.primaryButtonText}>
                          {submitting ? "Logging in..." : "Log In"}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                      </View>
                      
                      <GoogleSignInButton
                        mode="signin"
                        disabled={submitting}
                        onSuccess={(result) => {
                          // Google auth handled in the component
                          console.log('Google sign-in successful');
                        }}
                        onError={(error) => {
                          setError('Google sign-in failed. Please try again.');
                        }}
                      />
                    </View>
                    
                    <View style={styles.mobileSignupPrompt}>
                      <Text style={styles.mobileSignupText}>Don't have an account? </Text>
                      <Link href="/signup" asChild>
                        <TouchableOpacity>
                          <Text style={styles.mobileSignupLink}>Sign Up</Text>
                        </TouchableOpacity>
                      </Link>
                    </View>
                    
                    {/* Legal Documents Links */}
                    <View style={styles.mobileLegalLinks}>
                      <TouchableOpacity onPress={() => {
                        if (Platform.OS === 'web') {
                          router.push('/terms');
                        } else {
                          Linking.openURL('https://circle.orincore.com/terms.html');
                        }
                      }}>
                        <Text style={styles.mobileLegalLink}>Terms of Service</Text>
                      </TouchableOpacity>
                      <Text style={styles.mobileLegalSeparator}> • </Text>
                      <TouchableOpacity onPress={() => {
                        if (Platform.OS === 'web') {
                          router.push('/legal/privacy-policy');
                        } else {
                          Linking.openURL('https://circle.orincore.com/privacy.html');
                        }
                      }}>
                        <Text style={styles.mobileLegalLink}>Privacy Policy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Animated.View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loginSection: {
    minHeight: '100%',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  loginSectionLarge: {
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loginContentLarge: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  
  // Desktop Layout
  desktopGrid: {
    flexDirection: 'row',
    gap: 60,
    alignItems: 'center',
  },
  desktopLeft: {
    flex: 1,
  },
  desktopRight: {
    flex: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandingSection: {
    marginBottom: 48,
  },
  brandLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  brandTagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 26,
  },
  featureList: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    elevation: 20,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F1147',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.7)',
    marginBottom: 32,
  },
  
  // Mobile Layout
  mobileLayout: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  backButtonMobile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mobileLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  mobileTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  mobileSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  mobileFormCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Form Elements
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C2B86',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(161, 106, 232, 0.2)',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A16AE8',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A16AE8',
    borderRadius: 999,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#A16AE8',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupPromptText: {
    fontSize: 15,
    color: 'rgba(31, 17, 71, 0.7)',
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A16AE8',
  },
  mobileSignupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  mobileSignupText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  mobileSignupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFD6F2',
  },
  
  // Legal Links - Desktop
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  legalLink: {
    fontSize: 13,
    color: 'rgba(31, 17, 71, 0.7)',
    fontWeight: '500',
  },
  legalSeparator: {
    fontSize: 13,
    color: 'rgba(31, 17, 71, 0.5)',
  },
  
  // Legal Links - Mobile
  mobileLegalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  mobileLegalLink: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  mobileLegalSeparator: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  
  // Divider styles
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(31, 17, 71, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
    fontWeight: '500',
  },
});
