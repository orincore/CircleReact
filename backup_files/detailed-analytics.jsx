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

export default function DetailedAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Analytics data states
  const [screenViews, setScreenViews] = useState([]);
  const [userActions, setUserActions] = useState([]);
  const [matchInteractions, setMatchInteractions] = useState([]);
  const [messageActivity, setMessageActivity] = useState([]);
  const [friendActivity, setFriendActivity] = useState([]);
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [searchActivity, setSearchActivity] = useState([]);
  const [locationActivity, setLocationActivity] = useState([]);
  const [featureUsage, setFeatureUsage] = useState([]);
  const [buttonClicks, setButtonClicks] = useState([]);
  const [timeOnScreen, setTimeOnScreen] = useState([]);
  const [errors, setErrors] = useState([]);
  const [appStateChanges, setAppStateChanges] = useState([]);

  useEffect(() => {
    loadDetailedAnalytics();
  }, [timeRange, selectedCategory]);

  const loadDetailedAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 };
      const days = daysMap[timeRange] || 7;

      console.log('📊 Loading detailed analytics...');

      // Load screen analytics
      const screensResponse = await fetch(`${API_BASE_URL}/api/analytics/screens?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (screensResponse.ok) {
        const data = await screensResponse.json();
        setScreenViews(data.screens || []);
      }

      // Load popular features
      const featuresResponse = await fetch(`${API_BASE_URL}/api/analytics/features/popular?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (featuresResponse.ok) {
        const data = await featuresResponse.json();
        setFeatureUsage(data.popularFeatures || []);
      }

      // Load event-specific analytics
      await loadEventsByType(token, days);

    } catch (error) {
      console.error('Error loading detailed analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventsByType = async (token, days) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log('📈 Loading event-specific data...');

      // Load events summary to get counts for all event types
      const summaryResponse = await fetch(`${API_BASE_URL}/api/analytics/events-summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log('📊 Events summary:', summaryData);

        // Map event types to state
        summaryData.summary?.forEach(event => {
          const eventData = {
            name: event.eventName,
            count: event.totalEvents,
            uniqueUsers: event.uniqueUsers,
          };

          switch (event.eventName) {
            case 'screen_view':
              setScreenViews(prev => [...prev, eventData]);
              break;
            case 'user_action':
              setUserActions(prev => [...prev, eventData]);
              break;
            case 'match_action':
              setMatchInteractions(prev => [...prev, eventData]);
              break;
            case 'message_action':
              setMessageActivity(prev => [...prev, eventData]);
              break;
            case 'friend_action':
              setFriendActivity(prev => [...prev, eventData]);
              break;
            case 'profile_update':
              setProfileUpdates(prev => [...prev, eventData]);
              break;
            case 'search':
              setSearchActivity(prev => [...prev, eventData]);
              break;
            case 'location_action':
              setLocationActivity(prev => [...prev, eventData]);
              break;
            case 'feature_usage':
              setFeatureUsage(prev => [...prev, eventData]);
              break;
            case 'button_click':
              setButtonClicks(prev => [...prev, eventData]);
              break;
            case 'time_on_screen':
              setTimeOnScreen(prev => [...prev, eventData]);
              break;
            case 'error':
              setErrors(prev => [...prev, eventData]);
              break;
            case 'app_state':
              setAppStateChanges(prev => [...prev, eventData]);
              break;
          }
        });
      }
      
    } catch (error) {
      console.error('Error loading events by type:', error);
    }
  };

  const EventCategoryCard = ({ title, icon, count, color, onPress, trend }) => (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <LinearGradient colors={[color, color + 'CC']} style={styles.categoryGradient}>
        <View style={styles.categoryHeader}>
          <Ionicons name={icon} size={32} color="#FFFFFF" />
          {trend && (
            <View style={styles.trendBadge}>
              <Ionicons 
                name={trend > 0 ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={trend > 0 ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
            </View>
          )}
        </View>
        <Text style={styles.categoryCount}>{count.toLocaleString()}</Text>
        <Text style={styles.categoryTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const DetailedEventList = ({ title, data, icon, color }) => (
    <View style={styles.detailSection}>
      <View style={styles.detailHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.detailTitle}>{title}</Text>
        <Text style={styles.detailCount}>({data.length})</Text>
      </View>
      <View style={styles.detailList}>
        {data.slice(0, 10).map((item, index) => (
          <View key={index} style={styles.detailItem}>
            <View style={styles.detailItemLeft}>
              <View style={[styles.detailDot, { backgroundColor: color }]} />
              <Text style={styles.detailItemName}>
                {item.name || item.screen || item.feature || item.action || 'Unknown'}
              </Text>
            </View>
            <View style={styles.detailItemRight}>
              <Text style={styles.detailItemValue}>
                {item.count || item.views || item.usage_count || 0}
              </Text>
              {item.avgTimeSeconds && (
                <Text style={styles.detailItemTime}>{item.avgTimeSeconds}s avg</Text>
              )}
            </View>
          </View>
        ))}
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
        <Text style={styles.loadingText}>Loading detailed analytics...</Text>
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
          <Text style={styles.headerTitle}>Detailed Analytics</Text>
          <Text style={styles.headerSubtitle}>User behavior & event tracking</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TimeRangeButton label="7 Days" value="7d" />
          <TimeRangeButton label="30 Days" value="30d" />
          <TimeRangeButton label="90 Days" value="90d" />
          <TimeRangeButton label="All Time" value="all" />
        </View>

        {/* Event Categories Grid */}
        <Text style={styles.sectionTitle}>Event Categories</Text>
        <View style={styles.categoriesGrid}>
          <EventCategoryCard
            title="Screen Views"
            icon="eye"
            count={screenViews.reduce((sum, s) => sum + (s.count || s.views || 0), 0)}
            color="#2196F3"
            trend={12}
          />
          <EventCategoryCard
            title="User Actions"
            icon="hand-left"
            count={userActions.reduce((sum, a) => sum + (a.count || 0), 0)}
            color="#4CAF50"
            trend={8}
          />
          <EventCategoryCard
            title="Match Interactions"
            icon="heart"
            count={matchInteractions.reduce((sum, m) => sum + (m.count || 0), 0)}
            color="#E91E63"
            trend={-5}
          />
          <EventCategoryCard
            title="Messages"
            icon="chatbubbles"
            count={messageActivity.reduce((sum, m) => sum + (m.count || 0), 0)}
            color="#FF9800"
            trend={15}
          />
          <EventCategoryCard
            title="Friend Activity"
            icon="people"
            count={friendActivity.reduce((sum, f) => sum + (f.count || 0), 0)}
            color="#9C27B0"
            trend={10}
          />
          <EventCategoryCard
            title="Profile Updates"
            icon="person-circle"
            count={profileUpdates.reduce((sum, p) => sum + (p.count || 0), 0)}
            color="#00BCD4"
            trend={3}
          />
          <EventCategoryCard
            title="Search Activity"
            icon="search"
            count={searchActivity.reduce((sum, s) => sum + (s.count || 0), 0)}
            color="#FF5722"
            trend={7}
          />
          <EventCategoryCard
            title="Location Activity"
            icon="location"
            count={locationActivity.reduce((sum, l) => sum + (l.count || 0), 0)}
            color="#8BC34A"
            trend={-2}
          />
          <EventCategoryCard
            title="Feature Usage"
            icon="apps"
            count={featureUsage.reduce((sum, f) => sum + (f.count || 0), 0)}
            color="#673AB7"
            trend={20}
          />
          <EventCategoryCard
            title="Button Clicks"
            icon="radio-button-on"
            count={buttonClicks.reduce((sum, b) => sum + (b.count || 0), 0)}
            color="#3F51B5"
            trend={5}
          />
          <EventCategoryCard
            title="Time on Screen"
            icon="time"
            count={timeOnScreen.reduce((sum, t) => sum + (t.count || 0), 0)}
            color="#009688"
            trend={-3}
          />
          <EventCategoryCard
            title="Errors"
            icon="warning"
            count={errors.reduce((sum, e) => sum + (e.count || 0), 0)}
            color="#F44336"
            trend={-15}
          />
        </View>

        {/* Screen Views Details */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="eye" size={24} color="#2196F3" />
            <Text style={styles.detailTitle}>Most Viewed Screens</Text>
            <Text style={styles.detailCount}>({screenViews.length})</Text>
          </View>
          {screenViews.length > 0 ? (
            <View style={styles.detailList}>
              {screenViews.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <View style={[styles.detailDot, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.detailItemName}>
                      {item.screen || item.name || 'Screen'}
                    </Text>
                  </View>
                  <View style={styles.detailItemRight}>
                    <Text style={styles.detailItemValue}>
                      {item.views || item.count || 0}
                    </Text>
                    {item.avgTimeSeconds && (
                      <Text style={styles.detailItemTime}>{item.avgTimeSeconds}s avg</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No screen view data available</Text>
          )}
        </View>

        {/* Feature Usage Details */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="apps" size={24} color="#673AB7" />
            <Text style={styles.detailTitle}>Most Used Features</Text>
            <Text style={styles.detailCount}>({featureUsage.length})</Text>
          </View>
          {featureUsage.length > 0 ? (
            <View style={styles.detailList}>
              {featureUsage.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <View style={[styles.detailDot, { backgroundColor: '#673AB7' }]} />
                    <Text style={styles.detailItemName}>
                      {item.feature || item.name || 'Feature'}
                    </Text>
                  </View>
                  <View style={styles.detailItemRight}>
                    <Text style={styles.detailItemValue}>
                      {item.count || 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No feature usage data available</Text>
          )}
        </View>

        {/* Popular Actions */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.detailTitle}>Popular User Actions</Text>
            <Text style={styles.detailCount}>({userActions.length})</Text>
          </View>
          {userActions.length > 0 ? (
            <View style={styles.actionsList}>
              {userActions.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.actionItem}>
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' + '20' }]}>
                      <Ionicons name="hand-left" size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.actionName}>{item.name || 'User Action'}</Text>
                  </View>
                  <Text style={styles.actionCount}>{(item.count || 0).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No user action data available</Text>
          )}
        </View>

        {/* Match Interactions */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="heart" size={24} color="#E91E63" />
            <Text style={styles.detailTitle}>Match Interactions</Text>
            <Text style={styles.detailCount}>({matchInteractions.length})</Text>
          </View>
          {matchInteractions.length > 0 ? (
            <View style={styles.detailList}>
              {matchInteractions.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <View style={[styles.detailDot, { backgroundColor: '#E91E63' }]} />
                    <Text style={styles.detailItemName}>
                      {item.action || item.name || 'Match Action'}
                    </Text>
                  </View>
                  <View style={styles.detailItemRight}>
                    <Text style={styles.detailItemValue}>
                      {item.count || 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No match interaction data available</Text>
          )}
        </View>

        {/* Message Activity */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="chatbubbles" size={24} color="#FF9800" />
            <Text style={styles.detailTitle}>Message Activity</Text>
            <Text style={styles.detailCount}>({messageActivity.length})</Text>
          </View>
          {messageActivity.length > 0 ? (
            <View style={styles.detailList}>
              {messageActivity.slice(0, 10).map((item, index) => (
                <View key={index} style={styles.detailItem}>
                  <View style={styles.detailItemLeft}>
                    <View style={[styles.detailDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.detailItemName}>
                      {item.action || item.name || 'Message Action'}
                    </Text>
                  </View>
                  <View style={styles.detailItemRight}>
                    <Text style={styles.detailItemValue}>
                      {item.count || 0}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>No message activity data available</Text>
          )}
        </View>

        {/* Error Tracking */}
        <View style={styles.detailSection}>
          <View style={styles.detailHeader}>
            <Ionicons name="warning" size={24} color="#F44336" />
            <Text style={styles.detailTitle}>Error Tracking</Text>
            <View style={styles.errorBadge}>
              <Text style={styles.errorBadgeText}>{errors.length} errors</Text>
            </View>
          </View>
          <View style={styles.errorsList}>
            {errors.length === 0 ? (
              <View style={styles.noErrors}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.noErrorsText}>No errors in selected period</Text>
              </View>
            ) : (
              errors.slice(0, 5).map((error, index) => (
                <View key={index} style={styles.errorItem}>
                  <View style={styles.errorLeft}>
                    <Ionicons name="alert-circle" size={20} color="#F44336" />
                    <Text style={styles.errorText}>{error.name || 'Error'}</Text>
                  </View>
                  <Text style={styles.errorCount}>{(error.count || 0)}x</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Engagement Insights - Only show if we have data */}
        {(screenViews.length > 0 || userActions.length > 0 || featureUsage.length > 0) && (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>📊 Key Insights</Text>
            <View style={styles.insightsList}>
              {featureUsage.length > 0 && (
                <View style={styles.insightItem}>
                  <Ionicons name="apps" size={20} color="#673AB7" />
                  <Text style={styles.insightText}>
                    {featureUsage.length} different features being used
                  </Text>
                </View>
              )}
              {screenViews.length > 0 && (
                <View style={styles.insightItem}>
                  <Ionicons name="eye" size={20} color="#2196F3" />
                  <Text style={styles.insightText}>
                    {screenViews.reduce((sum, s) => sum + (s.count || s.views || 0), 0)} total screen views tracked
                  </Text>
                </View>
              )}
              {userActions.length > 0 && (
                <View style={styles.insightItem}>
                  <Ionicons name="hand-left" size={20} color="#4CAF50" />
                  <Text style={styles.insightText}>
                    {userActions.reduce((sum, a) => sum + (a.count || 0), 0)} user actions recorded
                  </Text>
                </View>
              )}
              {errors.length === 0 && (
                <View style={styles.insightItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.insightText}>
                    No errors reported in selected time period
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

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
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 150 : (width - 56) / 3,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    flex: 1,
  },
  detailCount: {
    fontSize: 14,
    color: '#999',
  },
  detailList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailItemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  detailItemRight: {
    alignItems: 'flex-end',
  },
  detailItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
  },
  detailItemTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  actionsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  actionCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
  },
  errorBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
  },
  errorsList: {
    gap: 12,
  },
  noErrors: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noErrorsText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 12,
    fontWeight: '600',
  },
  errorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  errorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
  },
  errorCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336',
  },
  insightsCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E1BEE7',
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2B86',
    marginBottom: 16,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#6A1B9A',
    flex: 1,
    fontWeight: '500',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});
