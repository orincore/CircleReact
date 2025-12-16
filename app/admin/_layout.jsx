import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: 'grid', path: '/admin/dashboard' },
    { name: 'AI Dashboard', icon: 'sparkles', path: '/admin/ai-dashboard' },
    { name: 'Blind Connect', icon: 'heart-half', path: '/admin/blind-dating' },
    { name: 'Users', icon: 'people', path: '/admin/users' },
    { name: 'Referrals', icon: 'gift', path: '/admin/referrals' },
    { name: 'Subscriptions', icon: 'diamond', path: '/admin/subscriptions' },
    { name: 'Revenue', icon: 'trending-up', path: '/admin/revenue' },
    { name: 'Refunds', icon: 'card', path: '/admin/refunds' },
    { name: 'Reports', icon: 'flag', path: '/admin/reports' },
    { name: 'Campaigns', icon: 'megaphone', path: '/admin/campaigns' },
    { name: 'Analytics', icon: 'stats-chart', path: '/admin/analytics' },
    { name: 'Settings', icon: 'settings', path: '/admin/settings' },
  ];

  const isActive = (path) => pathname === path;

  // Don't show sidebar on login page
  if (pathname === '/admin/login' || pathname === '/admin') {
    return <Slot />;
  }

  const getPageTitle = () => {
    const match = menuItems.find((m) => pathname === m.path);
    if (match) return match.name;
    if (pathname.startsWith('/admin/users/')) return 'User Details';
    return 'Admin';
  };

  return (
    <AdminAuthGuard>
      <View style={styles.container}>
      {/* Sidebar */}
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        <LinearGradient
          colors={['#0D0524', '#1F1147', '#7C2B86']}
          style={styles.sidebarGradient}
        >
          {/* Logo/Header */}
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed && <Text style={styles.logo}>Circle</Text>}
            <TouchableOpacity
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={styles.collapseButton}
            >
              <Ionicons
                name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.path}
                style={[
                  styles.menuItem,
                  isActive(item.path) && styles.menuItemActive,
                  sidebarCollapsed && styles.menuItemCollapsed,
                ]}
                onPress={() => router.push(item.path)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive(item.path) ? '#FFD6F2' : 'rgba(255, 255, 255, 0.7)'}
                />
                {!sidebarCollapsed && (
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive(item.path) && styles.menuItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, sidebarCollapsed && styles.logoutButtonCollapsed]}
            onPress={async () => {
              if (Platform.OS === 'web') {
                if (window.confirm('Are you sure you want to logout?')) {
                  await AsyncStorage.removeItem('authToken');
                  await AsyncStorage.removeItem('isAdmin');
                  await AsyncStorage.removeItem('adminRole');
                  router.replace('/admin/login');
                }
              } else {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: async () => {
                        await AsyncStorage.removeItem('authToken');
                        await AsyncStorage.removeItem('isAdmin');
                        await AsyncStorage.removeItem('adminRole');
                        router.replace('/admin/login');
                      },
                    },
                  ]
                );
              }
            }}
          >
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
            {!sidebarCollapsed && (
              <Text style={styles.logoutText}>Logout</Text>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <View
        style={[
          styles.mainContent,
          Platform.OS === 'web' && { marginLeft: sidebarCollapsed ? 80 : 250 }
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{getPageTitle()}</Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarIconButton}
              onPress={() => router.push('/admin/settings')}
            >
              <Ionicons name="settings" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <Slot />
      </View>
    </View>
    </AdminAuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0B061C',
  },
  sidebar: {
    width: 250,
    ...Platform.select({
      web: {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 1000,
      },
    }),
  },
  sidebarCollapsed: {
    width: 80,
  },
  sidebarGradient: {
    flex: 1,
    paddingTop: 18,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.10)',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  collapseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 214, 242, 0.14)',
    borderColor: 'rgba(255, 214, 242, 0.22)',
  },
  menuItemText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 16,
    fontWeight: '700',
  },
  menuItemTextActive: {
    color: '#FFD6F2',
    fontWeight: '800',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  logoutButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logoutText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 16,
    fontWeight: '800',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#0B061C',
  },
  topBar: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
});
