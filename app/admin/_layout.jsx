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

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: 'grid', path: '/admin/dashboard' },
    { name: 'Users', icon: 'people', path: '/admin/users' },
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

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
        <LinearGradient
          colors={['#1F1147', '#7C2B86']}
          style={styles.sidebarGradient}
        >
          {/* Logo/Header */}
          <View style={styles.sidebarHeader}>
            {!sidebarCollapsed && (
              <Text style={styles.logo}>Circle Admin</Text>
            )}
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
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.removeItem('token');
                      router.replace('/admin/login');
                    },
                  },
                ]
              );
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
      <View style={styles.mainContent}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
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
    paddingTop: 20,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  collapseButton: {
    padding: 8,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 12,
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
  },
  menuItemText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 16,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#FFD6F2',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  logoutButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logoutText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    ...Platform.select({
      web: {
        marginLeft: 250,
      },
    }),
  },
});
