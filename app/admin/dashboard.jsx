import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActions, setRecentActions] = useState([]);

  useEffect(() => {
    checkAdminAccess();
    loadDashboardData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const isAdmin = await AsyncStorage.getItem('isAdmin');
      if (isAdmin !== 'true') {
        router.replace('/admin/login');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.replace('/admin/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      // Load admin profile
      const profileResponse = await fetch(`${API_BASE_URL}/api/admin/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const profileData = await profileResponse.json();
      setAdminProfile(profileData);

      // Load dashboard stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      // Load recent actions
      const actionsResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard/recent-actions?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const actionsData = await actionsResponse.json();
      setRecentActions(actionsData.actions || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('isAdmin');
            await AsyncStorage.removeItem('adminRole');
            router.replace('/admin/login');
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1F1147', '#7C2B86']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {adminProfile?.admin?.role?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FFD6F2" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="people"
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="#4CAF50"
          />
          <StatCard
            icon="pulse"
            label="Active Users"
            value={stats?.activeUsers || 0}
            color="#2196F3"
          />
          <StatCard
            icon="person-add"
            label="New Users"
            value={stats?.newUsers || 0}
            color="#FF9800"
          />
          <StatCard
            icon="warning"
            label="Pending Reports"
            value={stats?.pendingReports || 0}
            color="#F44336"
          />
          <StatCard
            icon="chatbubbles"
            label="Messages (24h)"
            value={stats?.recentMessages || 0}
            color="#9C27B0"
          />
          <StatCard
            icon="heart"
            label="Friendships"
            value={stats?.totalFriendships || 0}
            color="#E91E63"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="people-outline"
              label="User Management"
              onPress={() => router.push('/admin/users')}
            />
            <ActionButton
              icon="flag-outline"
              label="Reports"
              onPress={() => router.push('/admin/reports')}
            />
            <ActionButton
              icon="bar-chart-outline"
              label="Analytics"
              onPress={() => Alert.alert('Coming Soon', 'Analytics feature')}
            />
            <ActionButton
              icon="megaphone-outline"
              label="Campaigns"
              onPress={() => router.push('/admin/campaigns')}
            />
            <ActionButton
              icon="settings-outline"
              label="Settings"
              onPress={() => Alert.alert('Coming Soon', 'System settings feature')}
            />
            <ActionButton
              icon="shield-checkmark-outline"
              label="Admins"
              onPress={() => Alert.alert('Coming Soon', 'Admin management feature')}
            />
          </View>
        </View>

        {/* Recent Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
          {recentActions.length > 0 ? (
            recentActions.map((action, index) => (
              <View key={action.id || index} style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
                <View style={styles.actionDetails}>
                  <Text style={styles.actionText}>{action.action}</Text>
                  <Text style={styles.actionTime}>
                    {new Date(action.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No recent actions</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Action Button Component
function ActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={28} color="#7C2B86" />
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFD6F2',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonLabel: {
    fontSize: 12,
    color: '#1F1147',
    marginTop: 8,
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionDetails: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#1F1147',
    fontWeight: '500',
  },
  actionTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 24,
  },
});
