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
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';
import AIDashboard from '@/app/secure/admin/ai-dashboard';

const { width } = Dimensions.get('window');

function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMetrics, setAiMetrics] = useState(null);

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

      // Load both regular stats and AI metrics
      await Promise.all([
        loadRegularStats(token),
        loadAIMetrics(token)
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRegularStats = async (token) => {
    try {

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
      const actionsResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard/recent-actions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const actionsData = await actionsResponse.json();
      setRecentActions(actionsData.actions || []);
    } catch (error) {
      console.error('Error loading regular stats:', error);
    }
  };

  const loadAIMetrics = async (token) => {
    try {
      // Load AI real-time metrics
      const aiResponse = await fetch(`${API_BASE_URL}/api/ai-admin/analytics/real-time`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setAiMetrics(aiData.metrics);
      }
    } catch (error) {
      console.error('Error loading AI metrics:', error);
      // Don't show error for AI metrics as it's optional
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout from admin panel?')) {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('isAdmin');
        await AsyncStorage.removeItem('adminRole');
        router.replace('/admin/login');
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout from admin panel?',
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
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Render functions for each section
  const renderOverviewSection = () => (
    <View>
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
        {aiMetrics && (
          <>
            <StatCard
              icon="sparkles"
              label="AI Conversations"
              value={aiMetrics.activeConversations || 0}
              color="#7C2B86"
            />
            <StatCard
              icon="star"
              label="AI Satisfaction"
              value={aiMetrics.currentSatisfactionScore?.toFixed(1) || '0.0'}
              color="#FFD700"
            />
          </>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionButton
            icon="sparkles"
            label="AI Dashboard"
            onPress={() => setActiveSection('ai')}
            color="#7C2B86"
          />
          <ActionButton
            icon="people"
            label="User Management"
            onPress={() => setActiveSection('users')}
            color="#4CAF50"
          />
          <ActionButton
            icon="flag"
            label="Reports"
            onPress={() => router.push('/admin/reports')}
            color="#FF5722"
          />
          <ActionButton
            icon="stats-chart"
            label="Analytics"
            onPress={() => setActiveSection('analytics')}
            color="#2196F3"
          />
        </View>
      </View>

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
          {recentActions.slice(0, 5).map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Text style={styles.actionText}>{action.action}</Text>
              <Text style={styles.actionTime}>
                {new Date(action.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAISection = () => (
    <View style={styles.aiSection}>
      <AIDashboard />
    </View>
  );

  const renderUsersSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>User Management</Text>
      <View style={styles.actionsGrid}>
        <ActionButton
          icon="people"
          label="All Users"
          onPress={() => router.push('/admin/users')}
          color="#4CAF50"
        />
        <ActionButton
          icon="person-add"
          label="Add User"
          onPress={() => Alert.alert('Coming Soon', 'Add user feature')}
          color="#2196F3"
        />
        <ActionButton
          icon="shield"
          label="Admin Roles"
          onPress={() => Alert.alert('Coming Soon', 'Admin roles feature')}
          color="#FF9800"
        />
        <ActionButton
          icon="ban"
          label="Banned Users"
          onPress={() => Alert.alert('Coming Soon', 'Banned users feature')}
          color="#F44336"
        />
      </View>
    </View>
  );

  const renderAnalyticsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Analytics & Reports</Text>
      <View style={styles.actionsGrid}>
        <ActionButton
          icon="stats-chart"
          label="User Analytics"
          onPress={() => router.push('/admin/analytics')}
          color="#2196F3"
        />
        <ActionButton
          icon="trending-up"
          label="Revenue Reports"
          onPress={() => router.push('/admin/revenue')}
          color="#4CAF50"
        />
        <ActionButton
          icon="flag"
          label="Content Reports"
          onPress={() => router.push('/admin/reports')}
          color="#FF5722"
        />
        <ActionButton
          icon="megaphone"
          label="Campaign Analytics"
          onPress={() => router.push('/admin/campaigns')}
          color="#9C27B0"
        />
      </View>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>System Settings</Text>
      <View style={styles.actionsGrid}>
        <ActionButton
          icon="settings"
          label="General Settings"
          onPress={() => router.push('/admin/settings')}
          color="#6B7280"
        />
        <ActionButton
          icon="shield-checkmark"
          label="Security Settings"
          onPress={() => Alert.alert('Coming Soon', 'Security settings')}
          color="#7C2B86"
        />
        <ActionButton
          icon="notifications"
          label="Notifications"
          onPress={() => Alert.alert('Coming Soon', 'Notification settings')}
          color="#FF9800"
        />
        <ActionButton
          icon="download"
          label="Export Data"
          onPress={() => Alert.alert('Coming Soon', 'Data export feature')}
          color="#4CAF50"
        />
      </View>
    </View>
  );

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

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'overview', title: 'Overview', icon: 'grid' },
          { id: 'ai', title: 'AI Dashboard', icon: 'sparkles' },
          { id: 'users', title: 'Users', icon: 'people' },
          { id: 'analytics', title: 'Analytics', icon: 'stats-chart' },
          { id: 'settings', title: 'Settings', icon: 'settings' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeSection === tab.id && styles.activeTab]}
            onPress={() => setActiveSection(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeSection === tab.id ? '#7C2B86' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeSection === tab.id && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />
        }
      >
        {activeSection === 'overview' && renderOverviewSection()}
        {activeSection === 'ai' && renderAISection()}
        {activeSection === 'users' && renderUsersSection()}
        {activeSection === 'analytics' && renderAnalyticsSection()}
        {activeSection === 'settings' && renderSettingsSection()}
      </ScrollView>

      {/* AI Dashboard Modal */}
      <Modal
        visible={showAIModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <AIDashboard />
        <TouchableOpacity 
          style={styles.closeModalButton}
          onPress={() => setShowAIModal(false)}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color = '#7C2B86' }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Action Button Component
function ActionButton({ icon, label, onPress, color = '#7C2B86' }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.actionGradient}
      >
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <Text style={styles.actionLabel}>{label}</Text>
      </LinearGradient>
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
  // New styles for unified dashboard
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7C2B86',
  },
  tabText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  aiSection: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1000,
  },
  actionButton: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});

export default AdminDashboard;
