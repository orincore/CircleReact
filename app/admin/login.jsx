import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated on component mount
  useEffect(() => {
    let fallbackTimeout;
    
    const runAuthCheck = async () => {
      // Fallback timeout to prevent infinite loading
      fallbackTimeout = setTimeout(() => {
        console.log('⚠️ AdminLogin - Fallback timeout reached, showing login form');
        setCheckingAuth(false);
      }, 3000); // 3 second fallback
      
      await checkExistingAuth();
      
      // Clear the fallback timeout if auth check completes
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
    };
    
    runAuthCheck();
    
    return () => {
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
    };
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log('🔍 AdminLogin - Checking existing authentication...');
      
      // Check if we're already on dashboard to prevent redirect loop
      if (Platform.OS === 'web' && window.location.pathname.includes('/admin/dashboard')) {
        console.log('🔍 AdminLogin - Already on dashboard, skipping auth check');
        setCheckingAuth(false);
        return;
      }
      
      const storedToken = await AsyncStorage.getItem('authToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      
      console.log('🔍 AdminLogin - Stored token:', storedToken ? 'Present' : 'Missing');
      console.log('🔍 AdminLogin - Stored isAdmin:', isAdmin);
      
      if (storedToken && isAdmin === 'true') {
        console.log('✅ AdminLogin - User already authenticated, redirecting to dashboard');
        
        // Force redirect using both router and window.location for web
        if (Platform.OS === 'web') {
          window.location.href = '/admin/dashboard';
        } else {
          router.replace('/admin/dashboard');
        }
        return;
      }
      
      console.log('❌ AdminLogin - No valid authentication found, showing login form');
    } catch (error) {
      console.error('Error checking existing auth:', error);
    }
    
    // Always set checkingAuth to false, regardless of redirect
    console.log('🔄 AdminLogin - Setting checkingAuth to false');
    setCheckingAuth(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // First, authenticate the user
      const authResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: email, password }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || 'Login failed');
      }

      // Store the token (backend returns 'access_token')
      const token = authData.access_token || authData.token;
      await AsyncStorage.setItem('authToken', token);

      // Check if user is an admin
      console.log('🔍 Checking admin status for:', email);
      console.log('🔍 Using API URL:', `${API_BASE_URL}/api/admin/check`);
      console.log('🔍 Using token:', token ? 'Token present' : 'No token');
      
      const adminCheckResponse = await fetch(`${API_BASE_URL}/api/admin/check`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔍 Admin check status:', adminCheckResponse.status);
      const adminData = await adminCheckResponse.json();
      console.log('🔍 Admin check response:', adminData);

      if (!adminCheckResponse.ok) {
        // API error, show specific error message
        await AsyncStorage.removeItem('authToken');
        Alert.alert(
          'Authentication Error',
          adminData.error || 'Failed to verify admin status. Please try again.'
        );
        setLoading(false);
        return;
      }

      if (!adminData.isAdmin) {
        // Not an admin, clear token and show error
        await AsyncStorage.removeItem('authToken');
        Alert.alert(
          'Access Denied',
          `You do not have admin privileges. Your email (${email}) is not in the admin list. Please contact a system administrator.`
        );
        setLoading(false);
        return;
      }

      // Store admin info
      await AsyncStorage.setItem('adminRole', adminData.role);
      await AsyncStorage.setItem('isAdmin', 'true');

      // Navigate to admin dashboard
      router.replace('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      
      // More detailed error handling
      let errorMessage = 'An error occurred during login';
      
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while checking existing authentication
  if (checkingAuth) {
    return (
      <LinearGradient
        colors={['#1F1147', '#7C2B86', '#E94B8B']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD6F2" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1F1147', '#7C2B86', '#E94B8B']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={60} color="#FFD6F2" />
            </View>
            <Text style={styles.title}>Circle Admin</Text>
            <Text style={styles.subtitle}>Admin Panel Access</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#FFD6F2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Admin Email"
                placeholderTextColor="rgba(255, 214, 242, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#FFD6F2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 214, 242, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#FFD6F2"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1F1147" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Login to Admin Panel</Text>
                  <Ionicons name="arrow-forward" size={20} color="#1F1147" />
                </>
              )}
            </TouchableOpacity>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#FFD6F2" />
              <Text style={styles.securityText}>
                This area is restricted to authorized administrators only.
                All access attempts are logged.
              </Text>
            </View>
          </View>

          {/* Back to App */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color="#FFD6F2" />
            <Text style={styles.backButtonText}>Back to App</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFD6F2',
    fontSize: 16,
    fontWeight: '500',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 214, 242, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD6F2',
    opacity: 0.8,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#FFD6F2',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#1F1147',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 214, 242, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  securityText: {
    flex: 1,
    color: '#FFD6F2',
    fontSize: 12,
    marginLeft: 8,
    lineHeight: 18,
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
  },
  backButtonText: {
    color: '#FFD6F2',
    fontSize: 16,
    marginLeft: 8,
  },
});
