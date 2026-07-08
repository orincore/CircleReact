import { API_BASE_URL } from '@/src/api/config';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

// Single source of truth for admin access, wrapping every route under
// app/admin/_layout.jsx - including /admin/login itself. Admin sessions are
// independent of the main app's AuthContext: the token, isAdmin flag and
// role all live under their own AsyncStorage keys, set by app/admin/login.jsx
// and verified here against /api/admin/verify.
//
// Being pathname-aware lets this one component own both redirect directions
// (unauthenticated -> /admin/login, and already-authenticated visitor on
// /admin/login -> /admin/dashboard) instead of each page independently
// deciding to redirect, which previously raced and produced an infinite
// reload loop.
const AdminAuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/admin/login';
  const [authState, setAuthState] = useState({
    isVerifying: true,
    isAuthorized: false,
  });

  const goToLogin = useCallback(() => {
    if (isLoginRoute) return;
    // Small delay so the "Access Denied" state is readable rather than an
    // instant flash before the redirect.
    setTimeout(() => {
      if (Platform.OS === 'web') {
        window.location.href = '/admin/login';
      } else {
        router.replace('/admin/login');
      }
    }, 800);
  }, [isLoginRoute, router]);

  const goToDashboard = useCallback(() => {
    if (!isLoginRoute) return;
    router.replace('/admin/dashboard');
  }, [isLoginRoute, router]);

  const checkAdminStatus = useCallback(async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');

      if (!storedToken || isAdmin !== 'true') {
        setAuthState({ isVerifying: false, isAuthorized: false });
        goToLogin();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          setAuthState({ isVerifying: false, isAuthorized: true });
          goToDashboard();
          return;
        }
      }

      // Verification failed (bad/expired token, or role revoked)
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('isAdmin');
      await AsyncStorage.removeItem('adminRole');
      setAuthState({ isVerifying: false, isAuthorized: false });
      goToLogin();
    } catch (error) {
      // Network/API failure: allow cached access rather than lock out an
      // admin whose session is fine but whose backend is briefly unreachable.
      console.warn('AdminAuthGuard - could not verify with backend, allowing cached access:', error);
      setAuthState({ isVerifying: false, isAuthorized: true });
    }
  }, [goToLogin, goToDashboard]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // On the login route itself we never block the form behind a spinner or
  // an "Access Denied" screen - an unauthenticated visitor should just see
  // the form immediately. If a valid session IS found, checkAdminStatus
  // above already kicked off the redirect to the dashboard.
  if (isLoginRoute) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  if (authState.isVerifying) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#7C2B86', '#5D5FEF']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!authState.isAuthorized) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#FF5722', '#F44336']} style={styles.unauthorizedContainer}>
          <Ionicons name="shield-outline" size={64} color="#FFFFFF" />
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            You do not have permission to access the admin panel.
          </Text>
          <Text style={styles.redirectText}>Redirecting...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
};

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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  unauthorizedTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  unauthorizedText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  redirectText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 16,
  },
});

export default AdminAuthGuard;
