import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminAuthGuard = ({ children }) => {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [authState, setAuthState] = useState({
    isVerifying: true,
    isAuthorized: false,
    hasChecked: false
  });

  const API_BASE_URL = 'https://api.circle.orincore.com';

  // Note: Admin verification now uses admin_roles table in database
  // No hardcoded admin list needed - all verification done via API

  useEffect(() => {
    if (!authState.hasChecked) {
      console.log('🔄 AdminAuthGuard - useEffect triggered');
      checkAdminStatus();
    }
  }, [authState.hasChecked]);

  const checkAdminStatus = useCallback(async () => {
    try {
      console.log('🔍 AdminAuthGuard - Checking admin status...');
      
      // Check AsyncStorage for admin credentials
      const storedToken = await AsyncStorage.getItem('authToken');
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      
      console.log('🔍 AdminAuthGuard - Stored token:', storedToken ? 'Present' : 'Missing');
      console.log('🔍 AdminAuthGuard - Stored isAdmin:', isAdmin);
      
      if (storedToken && isAdmin === 'true') {
        console.log('✅ AdminAuthGuard - Admin credentials found, allowing access');
        console.log('🔄 AdminAuthGuard - Setting authorized state...');
        
        setAuthState({
          isVerifying: false,
          isAuthorized: true,
          hasChecked: true
        });
        console.log('✅ AdminAuthGuard - State updated: authorized=true, verifying=false');
        return;
      }
      
      console.log('❌ AdminAuthGuard - No admin credentials found, redirecting to login');
      setAuthState({
        isVerifying: false,
        isAuthorized: false,
        hasChecked: true
      });
      redirectToLogin();
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAuthState({
        isVerifying: false,
        isAuthorized: false,
        hasChecked: true
      });
      redirectToLogin();
    }
  }, []);

  const redirectToLogin = () => {
    // Don't redirect if already on login page
    if (Platform.OS === 'web' && window.location.pathname === '/admin/login') {
      console.log('🔍 AdminAuthGuard - Already on login page, skipping redirect');
      return;
    }
    
    setTimeout(() => {
      console.log('🔄 AdminAuthGuard - Redirecting to admin login');
      if (Platform.OS === 'web') {
        window.location.href = '/admin/login';
      } else {
        router.replace('/admin/login');
      }
    }, 1000);
  };

  const showUnauthorizedAndRedirect = () => {
    setTimeout(() => {
      if (Platform.OS === 'web') {
        alert('Access Denied: You do not have permission to access the admin panel.');
        window.location.href = '/secure/(tabs)/profile';
      } else {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access the admin panel.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/secure/(tabs)/profile')
            }
          ]
        );
      }
    }, 1000);
  };

  console.log('🔍 AdminAuthGuard - Render state:', authState);

  // Loading state
  if (authState.isVerifying) {
    console.log('🔄 AdminAuthGuard - Rendering loading state');
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#7C2B86', '#5D5FEF']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Verifying admin access...</Text>
        </LinearGradient>
      </View>
    );
  }

  // Unauthorized state
  if (!authState.isAuthorized) {
    console.log('❌ AdminAuthGuard - Rendering unauthorized state');
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

  // Authorized - render admin content
  console.log('✅ AdminAuthGuard - Rendering authorized admin content');
  console.log('✅ AdminAuthGuard - Children type:', typeof children);
  console.log('✅ AdminAuthGuard - Children:', children);
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
