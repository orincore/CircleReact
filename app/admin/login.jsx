import { API_BASE_URL } from '@/src/api/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// This screen only submits credentials and stores the resulting token.
// It does not attempt to detect an existing session and auto-redirect -
// that responsibility belongs solely to AdminAuthGuard (which wraps every
// route under app/admin/_layout.jsx). Two independent redirect mechanisms
// here previously raced each other and produced an infinite reload loop.
export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const authResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });
      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || 'Login failed');
      }

      const token = authData.access_token || authData.token;
      await AsyncStorage.setItem('authToken', token);

      const adminCheckResponse = await fetch(`${API_BASE_URL}/api/admin/check`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const adminData = await adminCheckResponse.json();

      if (!adminCheckResponse.ok) {
        await AsyncStorage.removeItem('authToken');
        Alert.alert(
          'Authentication Error',
          adminData.error || 'Failed to verify admin status. Please try again.'
        );
        setLoading(false);
        return;
      }

      if (!adminData.isAdmin) {
        await AsyncStorage.removeItem('authToken');
        Alert.alert(
          'Access Denied',
          `You do not have admin privileges. Your email (${email}) is not in the admin list. Please contact a system administrator.`
        );
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('adminRole', adminData.role);
      await AsyncStorage.setItem('isAdmin', 'true');

      // A client-side router.replace() between two routes under the same
      // /admin layout can unreliably resolve back to /admin/login (an
      // expo-router web segments race). A hard navigation lands on the
      // target URL unambiguously.
      if (Platform.OS === 'web') {
        window.location.href = '/admin/dashboard';
      } else {
        router.replace('/admin/dashboard');
      }
    } catch (error) {
      console.error('Admin login error:', error);

      let errorMessage = 'An error occurred during login';
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Login Failed', errorMessage);
      setLoading(false);
    }
  };

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
