import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

const { width } = Dimensions.get('window');

export default function AdminAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all
  const [stats, setStats] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [demographics, setDemographics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      // Convert timeRange to days
      const daysMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        'all': 365,
      };
      const days = daysMap[timeRange] || 30;

      console.log('📊 Loading analytics with timeRange:', timeRange, 'days:', days);

      // Load overview stats
      const statsUrl = `${API_BASE_URL}/api/admin/analytics/overview?timeRange=${days}`;
      console.log('📡 Fetching overview from:', statsUrl);
      
      const statsResponse = await fetch(statsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('📊 Overview response status:', statsResponse.status);
      
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        console.error('❌ Overview fetch failed:', statsResponse.status, errorText);
        throw new Error(`Failed to fetch overview: ${statsResponse.status}`);
      }
      
      const statsData = await statsResponse.json();
      console.log('✅ Overview data:', statsData);
      
      // Transform data to match frontend expectations
      const transformedStats = {
        totalUsers: statsData.users?.total || 0,
        newUsers: statsData.users?.new || 0,
        activeUsers: statsData.users?.active || 0,
        totalMessages: statsData.engagement?.totalMessages || 0,
        totalFriendships: statsData.engagement?.totalFriendships || 0,
        userGrowth: 0, // Calculate if needed
        messageGrowth: 0,
        friendshipGrowth: 0,
        messagesPerUser: statsData.users?.total ? Math.round((statsData.engagement?.totalMessages || 0) / statsData.users.total) : 0,
        friendshipsPerUser: statsData.users?.total ? Math.round((statsData.engagement?.totalFriendships || 0) / statsData.users.total) : 0,
        dailyActiveUsers: statsData.users?.active || 0,
        monthlyActiveUsers: statsData.users?.total || 0,
        avgSessionDuration: 15,
        retentionRate: 75,
        topUsers: [],
      };
      
      setStats(transformedStats);
      console.log('✅ Stats set:', transformedStats);

      // Load user growth data
      console.log('📈 Fetching user growth...');
      const growthResponse = await fetch(`${API_BASE_URL}/api/admin/analytics/user-growth?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!growthResponse.ok) {
        console.error('❌ Growth fetch failed:', growthResponse.status);
      } else {
        const growthData = await growthResponse.json();
        console.log('✅ Growth data:', growthData);
        setUserGrowth(growthData.data || []);
      }

      // Load demographics
      console.log('👥 Fetching demographics...');
      const demoResponse = await fetch(`${API_BASE_URL}/api/admin/analytics/demographics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!demoResponse.ok) {
        console.error('❌ Demographics fetch failed:', demoResponse.status);
      } else {
        const demoData = await demoResponse.json();
        console.log('✅ Demographics data:', demoData);
      
      // Transform demographics data
      const totalGender = Object.values(demoData.gender || {}).reduce((a, b) => a + b, 0) || 1;
      const transformedDemo = {
        genderDistribution: {
          male: Math.round(((demoData.gender?.male || 0) / totalGender) * 100),
          female: Math.round(((demoData.gender?.female || 0) / totalGender) * 100),
          other: Math.round(((demoData.gender?.other || 0) / totalGender) * 100),
        },
        ageDistribution: Object.entries(demoData.ageGroups || {}).map(([range, count]) => ({
          range,
          count: count,
          percentage: Math.round((count / (Object.values(demoData.ageGroups || {}).reduce((a, b) => a + b, 0) || 1)) * 100),
        })),
      };
      
      setDemographics(transformedDemo);
      console.log('✅ Demographics set:', transformedDemo);
      }

    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change, icon, color, subtitle }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        {change !== undefined && (
          <View style={styles.statChange}>
            <Ionicons
              name={change >= 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={change >= 0 ? '#4CAF50' : '#F44336'}
            />
            <Text style={[styles.statChangeText, { color: change >= 0 ? '#4CAF50' : '#F44336' }]}>
              {Math.abs(change)}% {timeRange === '7d' ? 'vs last week' : 'vs last period'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const TimeRangeButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.timeButton, timeRange === value && styles.timeButtonActive]}
      onPress={() => setTimeRange(value)}
    >
      <Text style={[styles.timeButtonText, timeRange === value && styles.timeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Comprehensive platform insights</Text>
        </View>
        <TouchableOpacity
          style={styles.detailedButton}
          onPress={() => router.push('/admin/detailed-analytics')}
        >
          <Ionicons name="analytics" size={20} color="#FFFFFF" />
          <Text style={styles.detailedButtonText}>Detailed</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TimeRangeButton label="7 Days" value="7d" />
          <TimeRangeButton label="30 Days" value="30d" />
          <TimeRangeButton label="90 Days" value="90d" />
          <TimeRangeButton label="All Time" value="all" />
        </View>

        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || '0'}
            change={stats?.userGrowth}
            icon="people"
            color="#2196F3"
            subtitle={`${stats?.activeUsers || 0} active today`}
          />
          <StatCard
            title="New Users"
            value={stats?.newUsers?.toLocaleString() || '0'}
            change={stats?.newUserGrowth}
            icon="person-add"
            color="#4CAF50"
            subtitle={`In last ${timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}`}
          />
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages?.toLocaleString() || '0'}
            change={stats?.messageGrowth}
            icon="chatbubbles"
            color="#FF9800"
            subtitle={`${stats?.messagesPerUser || 0} per user avg`}
          />
          <StatCard
            title="Friendships"
            value={stats?.totalFriendships?.toLocaleString() || '0'}
            change={stats?.friendshipGrowth}
            icon="heart"
            color="#E91E63"
            subtitle={`${stats?.friendshipsPerUser || 0} per user avg`}
          />
        </View>

        {/* User Growth Chart */}
        <Text style={styles.sectionTitle}>User Growth Trend</Text>
        <View style={styles.chartCard}>
          {userGrowth.length > 0 ? (
            <View style={styles.simpleChart}>
              {userGrowth.map((point, index) => {
                const maxValue = Math.max(...userGrowth.map(p => p.count));
                const height = (point.count / maxValue) * 150;
                return (
                  <View key={index} style={styles.chartBar}>
                    <View style={[styles.chartBarFill, { height }]}>
                      <LinearGradient
                        colors={['#7C2B86', '#9B4A9F']}
                        style={styles.chartBarGradient}
                      />
                    </View>
                    <Text style={styles.chartLabel}>
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noDataText}>No growth data available</Text>
          )}
        </View>

        {/* Demographics */}
        {demographics && (
          <>
            <Text style={styles.sectionTitle}>User Demographics</Text>
            <View style={styles.demographicsGrid}>
              {/* Gender Distribution */}
              <View style={styles.demoCard}>
                <Text style={styles.demoTitle}>Gender Distribution</Text>
                <View style={styles.demoStats}>
                  <View style={styles.demoItem}>
                    <View style={[styles.demoDot, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.demoLabel}>Male</Text>
                    <Text style={styles.demoValue}>{demographics.genderDistribution?.male || 0}%</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <View style={[styles.demoDot, { backgroundColor: '#E91E63' }]} />
                    <Text style={styles.demoLabel}>Female</Text>
                    <Text style={styles.demoValue}>{demographics.genderDistribution?.female || 0}%</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <View style={[styles.demoDot, { backgroundColor: '#9C27B0' }]} />
                    <Text style={styles.demoLabel}>Other</Text>
                    <Text style={styles.demoValue}>{demographics.genderDistribution?.other || 0}%</Text>
                  </View>
                </View>
              </View>

              {/* Age Distribution */}
              <View style={styles.demoCard}>
                <Text style={styles.demoTitle}>Age Distribution</Text>
                <View style={styles.demoStats}>
                  {demographics.ageDistribution?.map((age, index) => (
                    <View key={index} style={styles.demoItem}>
                      <View style={[styles.demoDot, { backgroundColor: '#FF9800' }]} />
                      <Text style={styles.demoLabel}>{age.range}</Text>
                      <Text style={styles.demoValue}>{age.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Engagement Metrics */}
        <Text style={styles.sectionTitle}>Engagement Metrics</Text>
        <View style={styles.engagementGrid}>
          <View style={styles.engagementCard}>
            <Ionicons name="time" size={32} color="#7C2B86" />
            <Text style={styles.engagementValue}>{stats?.avgSessionDuration || '0'} min</Text>
            <Text style={styles.engagementLabel}>Avg Session Duration</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="repeat" size={32} color="#7C2B86" />
            <Text style={styles.engagementValue}>{stats?.dailyActiveUsers || '0'}</Text>
            <Text style={styles.engagementLabel}>Daily Active Users</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="calendar" size={32} color="#7C2B86" />
            <Text style={styles.engagementValue}>{stats?.monthlyActiveUsers || '0'}</Text>
            <Text style={styles.engagementLabel}>Monthly Active Users</Text>
          </View>
          <View style={styles.engagementCard}>
            <Ionicons name="trophy" size={32} color="#7C2B86" />
            <Text style={styles.engagementValue}>{stats?.retentionRate || '0'}%</Text>
            <Text style={styles.engagementLabel}>Retention Rate</Text>
          </View>
        </View>

        {/* Top Users */}
        <Text style={styles.sectionTitle}>Most Active Users</Text>
        <View style={styles.topUsersCard}>
          {stats?.topUsers?.map((user, index) => (
            <View key={user.id} style={styles.topUserItem}>
              <View style={styles.topUserRank}>
                <Text style={styles.topUserRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.topUserInfo}>
                <Text style={styles.topUserName}>{user.name}</Text>
                <Text style={styles.topUserStats}>
                  {user.messageCount} messages • {user.friendCount} friends
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          )) || <Text style={styles.noDataText}>No user data available</Text>}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  detailedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  detailedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#7C2B86',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 250 : width / 2 - 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  simpleChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
    paddingTop: 20,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    minHeight: 20,
  },
  chartBarGradient: {
    flex: 1,
  },
  chartLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 8,
    transform: [{ rotate: '-45deg' }],
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 40,
  },
  demographicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  demoCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 300 : width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  demoStats: {
    gap: 12,
  },
  demoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  demoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  demoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  demoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
  },
  engagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  engagementCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 200 : width / 2 - 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  engagementValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
    marginTop: 12,
    marginBottom: 4,
  },
  engagementLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  topUsersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  topUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topUserRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topUserRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2B86',
  },
  topUserInfo: {
    flex: 1,
  },
  topUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  topUserStats: {
    fontSize: 12,
    color: '#999',
  },
});
