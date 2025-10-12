import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';

const { width } = Dimensions.get('window');

const AIDashboard = () => {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeMetrics, setRealTimeMetrics] = useState(null);
  const [satisfactionMetrics, setSatisfactionMetrics] = useState(null);
  const [escalationLogs, setEscalationLogs] = useState([]);
  const [conversationAnalytics, setConversationAnalytics] = useState(null);
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [languageStats, setLanguageStats] = useState([]);
  const [agents, setAgents] = useState([]);

  const API_BASE_URL = 'https://api.circle.orincore.com';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadRealTimeMetrics(),
        loadSatisfactionMetrics(),
        loadEscalationLogs(),
        loadConversationAnalytics(),
        loadProactiveAlerts(),
        loadSurveyResponses(),
        loadConversations(),
        loadLanguageStats(),
        loadAgents()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const loadRealTimeMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/analytics/real-time`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setRealTimeMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error loading real-time metrics:', error);
      setRealTimeMetrics(null);
    }
  };

  const loadSatisfactionMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/satisfaction/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSatisfactionMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error loading satisfaction metrics:', error);
      setSatisfactionMetrics(null);
    }
  };

  const loadEscalationLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/escalations/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEscalationLogs(data.escalations || []);
      }
    } catch (error) {
      console.error('Error loading escalation logs:', error);
      setEscalationLogs([]);
    }
  };

  const loadConversationAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/analytics/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setConversationAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading conversation analytics:', error);
      setConversationAnalytics(null);
    }
  };

  const loadProactiveAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/proactive/users-needing-support`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const alertsArray = Object.entries(data.alerts || {}).map(([userId, alerts]) => ({
          userId,
          alerts: alerts || []
        }));
        setProactiveAlerts(alertsArray);
      }
    } catch (error) {
      console.error('Error loading proactive alerts:', error);
      setProactiveAlerts([]);
    }
  };

  const loadSurveyResponses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/satisfaction/survey-responses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSurveyResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Error loading survey responses:', error);
      setSurveyResponses([]);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/conversations/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  const loadLanguageStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/analytics/languages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLanguageStats(data.languages || []);
      }
    } catch (error) {
      console.error('Error loading language stats:', error);
      setLanguageStats([]);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/agents/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents([]);
    }
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        // Browser-compatible confirmation
        const confirmed = window.confirm('Are you sure you want to logout?');
        if (confirmed) {
          await logout();
          window.location.href = '/login';
        }
      } else {
        // Native Alert
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Logout', 
              style: 'destructive',
              onPress: async () => {
                await logout();
                router.replace('/login');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        alert('Error logging out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    }
  };

  const renderMetricCard = (title, value, icon, color, subtitle) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Real-time Metrics */}
      <Text style={styles.sectionTitle}>Real-time Metrics</Text>
      <View style={styles.metricsGrid}>
        {renderMetricCard(
          'Active Conversations',
          realTimeMetrics?.activeConversations || 0,
          'chatbubbles',
          '#4CAF50',
          'Currently ongoing'
        )}
        {renderMetricCard(
          'Queue Length',
          realTimeMetrics?.queueLength || 0,
          'hourglass',
          '#FF9800',
          'Waiting for response'
        )}
        {renderMetricCard(
          'Satisfaction Score',
          realTimeMetrics?.currentSatisfactionScore?.toFixed(1) || '0.0',
          'star',
          '#2196F3',
          'Last 24 hours'
        )}
        {renderMetricCard(
          'Issues Resolved Today',
          realTimeMetrics?.issuesResolvedToday || 0,
          'checkmark-circle',
          '#4CAF50',
          'Successfully closed'
        )}
      </View>

      {/* Conversation Analytics */}
      {conversationAnalytics && (
        <>
          <Text style={styles.sectionTitle}>Conversation Analytics</Text>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Total Conversations</Text>
              <Text style={styles.analyticsValue}>{conversationAnalytics.totalConversations}</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Resolution Rate</Text>
              <Text style={[styles.analyticsValue, { color: '#4CAF50' }]}>
                {conversationAnalytics.resolutionRate?.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>Escalation Rate</Text>
              <Text style={[styles.analyticsValue, { color: '#FF5722' }]}>
                {conversationAnalytics.escalationRate?.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={styles.analyticsLabel}>AI Efficiency Score</Text>
              <Text style={[styles.analyticsValue, { color: '#2196F3' }]}>
                {conversationAnalytics.aiEfficiencyScore}/100
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderEscalationsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Recent Escalations</Text>
      {escalationLogs.map((escalation) => (
        <View key={escalation.id} style={styles.escalationCard}>
          <View style={styles.escalationHeader}>
            <View style={[styles.priorityBadge, { 
              backgroundColor: escalation.priority === 'critical' ? '#FF5722' : '#FF9800' 
            }]}>
              <Text style={styles.priorityText}>{escalation.priority.toUpperCase()}</Text>
            </View>
            <Text style={styles.escalationTime}>{escalation.time}</Text>
          </View>
          <Text style={styles.escalationReason}>{escalation.reason}</Text>
          <Text style={styles.escalationUser}>User: {escalation.user}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderSatisfactionTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Satisfaction Overview</Text>
      {satisfactionMetrics && (
        <View style={styles.satisfactionOverview}>
          <View style={styles.satisfactionStat}>
            <Text style={styles.satisfactionValue}>
              {satisfactionMetrics.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.satisfactionLabel}>Average Rating</Text>
          </View>
          <View style={styles.satisfactionStat}>
            <Text style={styles.satisfactionValue}>
              {satisfactionMetrics.totalResponses || 0}
            </Text>
            <Text style={styles.satisfactionLabel}>Total Responses</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Survey Responses</Text>
      {surveyResponses.map((response) => (
        <View key={response.id} style={styles.surveyCard}>
          <View style={styles.surveyHeader}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={16}
                  color={star <= response.rating ? '#FFD700' : '#E0E0E0'}
                />
              ))}
            </View>
            <Text style={styles.surveyDate}>{response.date}</Text>
          </View>
          <Text style={styles.surveyFeedback}>{response.feedback}</Text>
          <Text style={styles.surveyUser}>- {response.user}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderProactiveTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Proactive Alerts</Text>
      {proactiveAlerts.map((userAlert, index) => (
        <View key={index} style={styles.proactiveCard}>
          <Text style={styles.proactiveUser}>User ID: {userAlert.userId}</Text>
          {userAlert.alerts.map((alert, alertIndex) => (
            <View key={alertIndex} style={styles.alertItem}>
              <View style={[styles.severityBadge, {
                backgroundColor: alert.severity === 'critical' ? '#FF5722' : 
                               alert.severity === 'high' ? '#FF9800' : '#4CAF50'
              }]}>
                <Text style={styles.severityText}>{alert.severity}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          ))}
        </View>
      ))}
      {proactiveAlerts.length === 0 && (
        <Text style={styles.emptyState}>No proactive alerts at this time</Text>
      )}
    </ScrollView>
  );

  const renderConversationsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Recent Conversations</Text>
      
      {/* Filter Options */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={16} color="#7C2B86" />
          <Text style={styles.filterText}>All Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="language" size={16} color="#7C2B86" />
          <Text style={styles.filterText}>All Languages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="time" size={16} color="#7C2B86" />
          <Text style={styles.filterText}>Last 24h</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      {conversations.length > 0 ? conversations.map((conversation) => (
        <View key={conversation.id} style={styles.conversationCard}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationId}>Conv #{conversation.id}</Text>
            <View style={styles.conversationMeta}>
              <Text style={styles.conversationTime}>{conversation.timeAgo || conversation.createdAt}</Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: conversation.status === 'resolved' ? '#4CAF50' : 
                               conversation.status === 'pending' ? '#FF9800' : '#FF5722' 
              }]}>
                <Text style={styles.statusText}>{conversation.status}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.conversationUser}>User: {conversation.userEmail || conversation.userId}</Text>
          <Text style={styles.conversationIntent}>Intent: {conversation.intent || 'general_inquiry'}</Text>
          <View style={styles.conversationStats}>
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles" size={14} color="#6B7280" />
              <Text style={styles.statText}>{conversation.messageCount || 0} messages</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.statText}>{conversation.rating || 'N/A'}/5</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="globe" size={14} color="#2196F3" />
              <Text style={styles.statText}>{conversation.language || 'EN'}</Text>
            </View>
          </View>
        </View>
      )) : (
        <Text style={styles.emptyState}>No recent conversations found</Text>
      )}
    </ScrollView>
  );

  const renderMultilingualTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Language Analytics</Text>
      
      {/* Language Usage Stats */}
      <View style={styles.languageStatsContainer}>
        {languageStats.length > 0 ? languageStats.map((lang) => (
          <View key={lang.code} style={styles.languageCard}>
            <View style={styles.languageHeader}>
              <View style={styles.languageFlag}>
                <Text style={styles.languageCode}>{lang.code}</Text>
              </View>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageConversations}>{lang.conversations} conversations</Text>
              </View>
              <Text style={styles.languageUsage}>{lang.usage}%</Text>
            </View>
            <View style={styles.languageBar}>
              <View style={[styles.languageProgress, { width: `${lang.usage}%` }]} />
            </View>
          </View>
        )) : (
          <Text style={styles.emptyState}>No language statistics available</Text>
        )}
      </View>

      {/* Translation Quality */}
      <Text style={styles.sectionTitle}>Translation Quality</Text>
      <View style={styles.translationQuality}>
        <View style={styles.qualityMetric}>
          <Text style={styles.qualityValue}>94.2%</Text>
          <Text style={styles.qualityLabel}>Accuracy</Text>
        </View>
        <View style={styles.qualityMetric}>
          <Text style={styles.qualityValue}>1.2s</Text>
          <Text style={styles.qualityLabel}>Avg Speed</Text>
        </View>
        <View style={styles.qualityMetric}>
          <Text style={styles.qualityValue}>99.8%</Text>
          <Text style={styles.qualityLabel}>Uptime</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderAgentsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Agent Management</Text>
      
      {/* Agent Performance */}
      {agents.length > 0 ? agents.map((agent, index) => (
        <View key={index} style={styles.agentCard}>
          <View style={styles.agentHeader}>
            <View style={styles.agentAvatar}>
              <Ionicons 
                name={agent.type === 'ai' ? 'sparkles' : 'person'} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.agentDetails}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text style={styles.agentType}>{agent.type.toUpperCase()}</Text>
            </View>
            <View style={[styles.agentStatus, {
              backgroundColor: agent.status === 'active' || agent.status === 'available' ? '#4CAF50' : 
                             agent.status === 'busy' ? '#FF9800' : '#9E9E9E'
            }]}>
              <Text style={styles.agentStatusText}>{agent.status}</Text>
            </View>
          </View>
          <View style={styles.agentMetrics}>
            <View style={styles.agentMetric}>
              <Text style={styles.metricValue}>{agent.conversations}</Text>
              <Text style={styles.metricLabel}>Conversations</Text>
            </View>
            <View style={styles.agentMetric}>
              <Text style={styles.metricValue}>{agent.rating}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            <View style={styles.agentMetric}>
              <Text style={styles.metricValue}>
                {agent.type === 'ai' ? '24/7' : '8h'}
              </Text>
              <Text style={styles.metricLabel}>Availability</Text>
            </View>
          </View>
        </View>
      )) : (
        <Text style={styles.emptyState}>No agents data available</Text>
      )}
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>AI System Settings</Text>
      
      {/* Quick Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Quick Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Enable AI Responses</Text>
          <TouchableOpacity style={styles.toggleButton}>
            <View style={[styles.toggle, { backgroundColor: '#4CAF50' }]}>
              <View style={styles.toggleKnob} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto Language Detection</Text>
          <TouchableOpacity style={styles.toggleButton}>
            <View style={[styles.toggle, { backgroundColor: '#4CAF50' }]}>
              <View style={styles.toggleKnob} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Proactive Support</Text>
          <TouchableOpacity style={styles.toggleButton}>
            <View style={[styles.toggle, { backgroundColor: '#4CAF50' }]}>
              <View style={styles.toggleKnob} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Satisfaction Surveys</Text>
          <TouchableOpacity style={styles.toggleButton}>
            <View style={[styles.toggle, { backgroundColor: '#4CAF50' }]}>
              <View style={styles.toggleKnob} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Advanced Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>Advanced Settings</Text>
        
        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="settings" size={20} color="#7C2B86" />
          <Text style={styles.settingButtonText}>Escalation Rules</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="globe" size={20} color="#7C2B86" />
          <Text style={styles.settingButtonText}>Language Configuration</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="analytics" size={20} color="#7C2B86" />
          <Text style={styles.settingButtonText}>Analytics Settings</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingButton}>
          <Ionicons name="shield" size={20} color="#7C2B86" />
          <Text style={styles.settingButtonText}>Security & Access</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* System Actions */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>System Actions</Text>
        
        <TouchableOpacity style={[styles.settingButton, styles.dangerButton]}>
          <Ionicons name="refresh" size={20} color="#FF5722" />
          <Text style={[styles.settingButtonText, styles.dangerText]}>Restart AI Service</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingButton, styles.dangerButton]}>
          <Ionicons name="download" size={20} color="#FF5722" />
          <Text style={[styles.settingButtonText, styles.dangerText]}>Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingButton, styles.dangerButton]}>
          <Ionicons name="trash" size={20} color="#FF5722" />
          <Text style={[styles.settingButtonText, styles.dangerText]}>Clear Analytics</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const tabs = [
    { id: 'overview', title: 'Overview', icon: 'analytics' },
    { id: 'conversations', title: 'Conversations', icon: 'chatbubbles' },
    { id: 'escalations', title: 'Escalations', icon: 'alert-circle' },
    { id: 'satisfaction', title: 'Satisfaction', icon: 'star' },
    { id: 'proactive', title: 'Proactive', icon: 'shield-checkmark' },
    { id: 'multilingual', title: 'Languages', icon: 'globe' },
    { id: 'agents', title: 'Agents', icon: 'people' },
    { id: 'settings', title: 'Settings', icon: 'settings' }
  ];

  return (
    <AdminAuthGuard>
      <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#7C2B86', '#5D5FEF']} style={styles.header}>
        <Text style={styles.headerTitle}>AI Customer Service Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={loadDashboardData} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#7C2B86' : '#9CA3AF'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'conversations' && renderConversationsTab()}
        {activeTab === 'escalations' && renderEscalationsTab()}
        {activeTab === 'satisfaction' && renderSatisfactionTab()}
        {activeTab === 'proactive' && renderProactiveTab()}
        {activeTab === 'multilingual' && renderMultilingualTab()}
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>
    </View>
    </AdminAuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7C2B86',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  escalationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  escalationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  escalationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  escalationReason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  escalationUser: {
    fontSize: 14,
    color: '#6B7280',
  },
  satisfactionOverview: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 32,
  },
  satisfactionStat: {
    alignItems: 'center',
  },
  satisfactionValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7C2B86',
  },
  satisfactionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  surveyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  surveyDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  surveyFeedback: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  surveyUser: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  proactiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  proactiveUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertMessage: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  emptyState: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 32,
  },
  // New styles for enhanced features
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  filterText: {
    fontSize: 12,
    color: '#7C2B86',
    fontWeight: '500',
  },
  conversationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  conversationUser: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  conversationIntent: {
    fontSize: 14,
    color: '#7C2B86',
    marginBottom: 8,
  },
  conversationStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  languageStatsContainer: {
    marginBottom: 24,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageFlag: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  languageCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  languageConversations: {
    fontSize: 12,
    color: '#6B7280',
  },
  languageUsage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2B86',
  },
  languageBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  languageProgress: {
    height: 4,
    backgroundColor: '#7C2B86',
    borderRadius: 2,
  },
  translationQuality: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
  },
  qualityMetric: {
    alignItems: 'center',
  },
  qualityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C2B86',
  },
  qualityLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  agentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentDetails: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  agentType: {
    fontSize: 12,
    color: '#6B7280',
  },
  agentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  agentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  agentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  agentMetric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  toggleButton: {
    padding: 4,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  settingButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  dangerButton: {
    borderBottomColor: '#FEE2E2',
  },
  dangerText: {
    color: '#FF5722',
  },
});

export default AIDashboard;
