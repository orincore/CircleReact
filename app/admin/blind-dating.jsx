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
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function BlindDatingAdmin() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [blockedMessages, setBlockedMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [matchingResults, setMatchingResults] = useState(null);
  const [showMatchingModal, setShowMatchingModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      await Promise.all([
        loadStats(token),
        loadUsers(token),
        loadMatches(token),
        loadBlockedMessages(token),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async (token) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/blind-dating/users?filter=${userFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMatches = async (token) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/blind-dating/matches?status=${matchFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.matches) {
        setMatches(data.matches);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadBlockedMessages = async (token) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/blind-dating/blocked-messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.messages) {
        setBlockedMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading blocked messages:', error);
    }
  };

  const handleEnableForAll = async () => {
    const confirmMessage = 'This will enable blind dating for ALL users. Continue?';
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      return new Promise((resolve) => {
        Alert.alert('Enable for All', confirmMessage, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Enable', onPress: () => resolve(true) },
        ]);
      });
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/enable-for-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to enable');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable blind dating for all users');
    } finally {
      setProcessing(false);
    }
  };

  const handleForceMatchAll = async () => {
    const confirmMessage = 'This will attempt to create matches for all eligible users. Continue?';
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      return new Promise((resolve) => {
        Alert.alert('Force Match All', confirmMessage, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Match', onPress: () => resolve(true) },
        ]);
      });
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/force-match-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to match');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to force match users');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessDaily = async () => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/process-daily`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to process');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process daily matches');
    } finally {
      setProcessing(false);
    }
  };

  const handleRunDetailedMatching = async () => {
    const confirmMessage = 'This will run detailed matching for ALL users and show why each user was matched or not. Continue?';
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/run-detailed-matching`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setMatchingResults(data);
        setShowMatchingModal(true);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to run matching');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to run detailed matching');
    } finally {
      setProcessing(false);
    }
  };

  const handleEndMatch = async (matchId) => {
    const confirmMessage = 'Are you sure you want to end this match?';
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/match/${matchId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'admin_ended' }),
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Match ended');
        loadData();
        setSelectedMatch(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to end match');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to end match');
    }
  };

  const handleEndAllActiveMatches = async () => {
    const confirmMessage = 'Are you sure you want to END ALL ACTIVE MATCHES? This will end all current blind dates but keep the history.';
    
    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/end-all-active-matches`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'admin_bulk_end' }),
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to end matches');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to end all active matches');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetAllMatches = async () => {
    const confirmMessage = 'DANGER: This will DELETE ALL BLIND DATE DATA including matches, messages, and history. This cannot be undone. Type "RESET_ALL_BLIND_DATES" to confirm.';
    
    let userInput = '';
    if (Platform.OS === 'web') {
      userInput = window.prompt(confirmMessage);
      if (userInput !== 'RESET_ALL_BLIND_DATES') {
        Alert.alert('Cancelled', 'Reset cancelled - confirmation text did not match');
        return;
      }
    } else {
      // For mobile, show a simpler confirmation
      Alert.alert(
        'DANGER: Reset All Blind Dates',
        'This will DELETE ALL blind date data permanently. Are you absolutely sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'DELETE ALL', 
            style: 'destructive',
            onPress: () => performResetAllMatches()
          }
        ]
      );
      return;
    }

    performResetAllMatches();
  };

  const performResetAllMatches = async () => {
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/blind-dating/reset-all-matches`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirm: 'RESET_ALL_BLIND_DATES' }),
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `Reset completed: ${data.deletedCounts.matches} matches, ${data.deletedCounts.messages} messages deleted`);
        loadData();
      } else {
        Alert.alert('Error', data.error || 'Failed to reset matches');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reset all matches');
    } finally {
      setProcessing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderOverview = () => (
    <View>
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="people"
          label="Users Enabled"
          value={stats?.usersWithBlindDatingEnabled || 0}
          total={stats?.totalUsers || 0}
          color="#4CAF50"
        />
        <StatCard
          icon="heart"
          label="Active Matches"
          value={stats?.activeMatches || 0}
          color="#E91E63"
        />
        <StatCard
          icon="checkmark-circle"
          label="Revealed"
          value={stats?.revealedMatches || 0}
          color="#9C27B0"
        />
        <StatCard
          icon="close-circle"
          label="Ended"
          value={stats?.endedMatches || 0}
          color="#FF5722"
        />
        <StatCard
          icon="today"
          label="Today"
          value={stats?.matchesToday || 0}
          color="#2196F3"
        />
        <StatCard
          icon="calendar"
          label="This Week"
          value={stats?.matchesThisWeek || 0}
          color="#00BCD4"
        />
        <StatCard
          icon="trending-up"
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          color="#8BC34A"
        />
        <StatCard
          icon="ban"
          label="Blocked Msgs"
          value={stats?.blockedMessages || 0}
          color="#F44336"
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleEnableForAll}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Enable for All</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E91E63' }]}
            onPress={handleForceMatchAll}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Force Match All</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={handleProcessDaily}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Process Daily</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9C27B0', marginTop: 8, flex: 1 }]}
            onPress={handleRunDetailedMatching}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Run Detailed Matching (with Reasons)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Dangerous Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 16, color: '#FF5722' }]}>⚠️ Dangerous Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800', flex: 1 }]}
            onPress={handleEndAllActiveMatches}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="pause-circle" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>End All Active Matches</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F44336', flex: 1, marginLeft: 8 }]}
            onPress={handleResetAllMatches}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Reset All Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Eligibility Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eligibility Status</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Total Users" value={stats?.totalUsers || 0} />
          <InfoRow label="Blind Dating Enabled" value={stats?.usersWithBlindDatingEnabled || 0} />
          <InfoRow label="Auto-Match Enabled" value={stats?.usersWithAutoMatch || 0} />
          <InfoRow label="Eligible for New Matches" value={stats?.eligibleForNewMatches || 0} />
          <InfoRow label="At Max Matches" value={stats?.usersAtMaxMatches || 0} />
          <InfoRow label="Recent Matches (24h)" value={stats?.recentMatches || 0} />
        </View>
      </View>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.section}>
      <View style={styles.filterRow}>
        <Text style={styles.sectionTitle}>Users ({users.length})</Text>
        <View style={styles.filterButtons}>
          {['all', 'enabled', 'disabled'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                userFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => {
                setUserFilter(filter);
                loadData();
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  userFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {users.map((user) => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.user?.first_name} {user.user?.last_name}
            </Text>
            <Text style={styles.userEmail}>{user.user?.email}</Text>
            <Text style={styles.userMeta}>
              @{user.user?.username} • {user.user?.age}y • {user.user?.gender}
            </Text>
          </View>
          <View style={styles.userStats}>
            <View style={[styles.badge, user.is_enabled ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.badgeText}>
                {user.is_enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Text style={styles.matchCount}>
              {user.activeMatchCount}/{user.max_active_matches} active
            </Text>
            <Text style={styles.totalMatches}>
              {user.totalMatchCount} total matches
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderMatches = () => (
    <View style={styles.section}>
      <View style={styles.filterRow}>
        <Text style={styles.sectionTitle}>Matches ({matches.length})</Text>
        <View style={styles.filterButtons}>
          {['all', 'active', 'revealed', 'ended'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                matchFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => {
                setMatchFilter(filter);
                loadData();
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  matchFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {matches.map((match) => (
        <TouchableOpacity
          key={match.id}
          style={styles.matchCard}
          onPress={() => setSelectedMatch(match)}
        >
          <View style={styles.matchUsers}>
            <View style={styles.matchUser}>
              <Text style={styles.matchUserName}>
                {match.user_a_profile?.first_name} {match.user_a_profile?.last_name}
              </Text>
              <Text style={styles.matchUserEmail}>{match.user_a_profile?.email}</Text>
              {match.user_a_revealed && (
                <Ionicons name="eye" size={14} color="#9C27B0" />
              )}
            </View>
            <Ionicons name="heart" size={24} color="#E91E63" />
            <View style={styles.matchUser}>
              <Text style={styles.matchUserName}>
                {match.user_b_profile?.first_name} {match.user_b_profile?.last_name}
              </Text>
              <Text style={styles.matchUserEmail}>{match.user_b_profile?.email}</Text>
              {match.user_b_revealed && (
                <Ionicons name="eye" size={14} color="#9C27B0" />
              )}
            </View>
          </View>
          <View style={styles.matchMeta}>
            <View style={[styles.badge, getStatusBadgeStyle(match.status)]}>
              <Text style={styles.badgeText}>{match.status}</Text>
            </View>
            <Text style={styles.matchScore}>
              Score: {match.compatibility_score?.toFixed(1)}
            </Text>
            <Text style={styles.matchMessages}>
              {match.message_count}/{match.reveal_threshold} msgs
            </Text>
            <Text style={styles.matchDate}>
              {new Date(match.matched_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBlockedMessages = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Blocked Messages ({blockedMessages.length})</Text>
      
      {blockedMessages.map((msg) => (
        <View key={msg.id} style={styles.blockedCard}>
          <View style={styles.blockedHeader}>
            <Text style={styles.blockedSender}>
              {msg.sender?.first_name} {msg.sender?.last_name}
            </Text>
            <Text style={styles.blockedDate}>
              {new Date(msg.created_at).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.blockedMessage}>{msg.original_message}</Text>
          <Text style={styles.blockedReason}>
            <Ionicons name="warning" size={12} color="#F44336" /> {msg.blocked_reason}
          </Text>
          <Text style={styles.blockedConfidence}>
            Confidence: {(msg.detection_confidence * 100).toFixed(0)}%
          </Text>
        </View>
      ))}
    </View>
  );

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return styles.badgeBlue;
      case 'revealed':
        return styles.badgePurple;
      case 'ended':
        return styles.badgeRed;
      default:
        return styles.badgeGray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading Blind Dating Data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.header}>
        <Text style={styles.headerTitle}>🎭 Blind Dating</Text>
        <Text style={styles.headerSubtitle}>Manage anonymous matchmaking</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'overview', title: 'Overview', icon: 'grid' },
          { id: 'users', title: 'Users', icon: 'people' },
          { id: 'matches', title: 'Matches', icon: 'heart' },
          { id: 'blocked', title: 'Blocked', icon: 'ban' },
        ].map((tab) => (
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
            <Text
              style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />
        }
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'matches' && renderMatches()}
        {activeTab === 'blocked' && renderBlockedMessages()}
      </ScrollView>

      {/* Match Detail Modal */}
      <Modal visible={!!selectedMatch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Details</Text>
              <TouchableOpacity onPress={() => setSelectedMatch(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedMatch && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>User A</Text>
                  <Text style={styles.modalValue}>
                    {selectedMatch.user_a_profile?.first_name} {selectedMatch.user_a_profile?.last_name}
                  </Text>
                  <Text style={styles.modalSubValue}>{selectedMatch.user_a_profile?.email}</Text>
                  <Text style={styles.modalSubValue}>
                    Revealed: {selectedMatch.user_a_revealed ? 'Yes' : 'No'}
                  </Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>User B</Text>
                  <Text style={styles.modalValue}>
                    {selectedMatch.user_b_profile?.first_name} {selectedMatch.user_b_profile?.last_name}
                  </Text>
                  <Text style={styles.modalSubValue}>{selectedMatch.user_b_profile?.email}</Text>
                  <Text style={styles.modalSubValue}>
                    Revealed: {selectedMatch.user_b_revealed ? 'Yes' : 'No'}
                  </Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Match Info</Text>
                  <Text style={styles.modalSubValue}>Status: {selectedMatch.status}</Text>
                  <Text style={styles.modalSubValue}>
                    Compatibility: {selectedMatch.compatibility_score?.toFixed(1)}
                  </Text>
                  <Text style={styles.modalSubValue}>
                    Messages: {selectedMatch.message_count}/{selectedMatch.reveal_threshold}
                  </Text>
                  <Text style={styles.modalSubValue}>
                    Matched: {new Date(selectedMatch.matched_at).toLocaleString()}
                  </Text>
                  {selectedMatch.revealed_at && (
                    <Text style={styles.modalSubValue}>
                      Revealed: {new Date(selectedMatch.revealed_at).toLocaleString()}
                    </Text>
                  )}
                  {selectedMatch.ended_at && (
                    <Text style={styles.modalSubValue}>
                      Ended: {new Date(selectedMatch.ended_at).toLocaleString()}
                    </Text>
                  )}
                </View>
                
                {selectedMatch.status === 'active' && (
                  <TouchableOpacity
                    style={styles.endMatchButton}
                    onPress={() => handleEndMatch(selectedMatch.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#FFF" />
                    <Text style={styles.endMatchButtonText}>End Match</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Detailed Matching Results Modal */}
      <Modal visible={showMatchingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Matching Results</Text>
              <TouchableOpacity onPress={() => setShowMatchingModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {matchingResults && (
              <ScrollView>
                {/* Summary */}
                <View style={styles.matchingSummary}>
                  <Text style={styles.matchingSummaryTitle}>Summary</Text>
                  <View style={styles.matchingSummaryGrid}>
                    <View style={styles.matchingSummaryItem}>
                      <Text style={styles.matchingSummaryValue}>{matchingResults.summary?.totalUsers || 0}</Text>
                      <Text style={styles.matchingSummaryLabel}>Total Users</Text>
                    </View>
                    <View style={[styles.matchingSummaryItem, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={[styles.matchingSummaryValue, { color: '#4CAF50' }]}>{matchingResults.summary?.matched || 0}</Text>
                      <Text style={styles.matchingSummaryLabel}>Matched</Text>
                    </View>
                    <View style={[styles.matchingSummaryItem, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={[styles.matchingSummaryValue, { color: '#FF9800' }]}>{matchingResults.summary?.skipped || 0}</Text>
                      <Text style={styles.matchingSummaryLabel}>Skipped</Text>
                    </View>
                    <View style={[styles.matchingSummaryItem, { backgroundColor: '#FFEBEE' }]}>
                      <Text style={[styles.matchingSummaryValue, { color: '#F44336' }]}>{matchingResults.summary?.noMatch || 0}</Text>
                      <Text style={styles.matchingSummaryLabel}>No Match</Text>
                    </View>
                  </View>
                </View>

                {/* Results List */}
                <Text style={styles.matchingResultsTitle}>Detailed Results</Text>
                {(matchingResults.results || []).map((result, index) => (
                  <View 
                    key={result.userId || index} 
                    style={[
                      styles.matchingResultCard,
                      result.status === 'matched' && styles.matchingResultMatched,
                      result.status === 'disabled' && styles.matchingResultDisabled,
                      result.status === 'skipped' && styles.matchingResultSkipped,
                      result.status === 'no_match' && styles.matchingResultNoMatch,
                      result.status === 'error' && styles.matchingResultError,
                    ]}
                  >
                    <View style={styles.matchingResultHeader}>
                      <View>
                        <Text style={styles.matchingResultName}>{result.userName}</Text>
                        <Text style={styles.matchingResultEmail}>{result.userEmail}</Text>
                      </View>
                      <View style={[styles.matchingResultBadge, getMatchingStatusStyle(result.status)]}>
                        <Text style={styles.matchingResultBadgeText}>{result.status?.toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.matchingResultReason}>
                      <Ionicons 
                        name={result.status === 'matched' ? 'checkmark-circle' : 'information-circle'} 
                        size={14} 
                        color={result.status === 'matched' ? '#4CAF50' : '#666'} 
                      /> {result.reason}
                    </Text>
                    
                    {result.details && (
                      <View style={styles.matchingResultDetails}>
                        {result.details.blindDatingEnabled !== undefined && (
                          <Text style={styles.matchingResultDetail}>
                            Enabled: {result.details.blindDatingEnabled ? '✅ Yes' : '❌ No'}
                          </Text>
                        )}
                        {result.details.activeMatchesCount !== undefined && (
                          <Text style={styles.matchingResultDetail}>
                            Active Matches: {result.details.activeMatchesCount}/{result.details.maxActiveMatches}
                          </Text>
                        )}
                        {result.details.eligibleCandidatesCount !== undefined && (
                          <Text style={styles.matchingResultDetail}>
                            Eligible Candidates: {result.details.eligibleCandidatesCount}
                          </Text>
                        )}
                        {result.details.matchedWithUserName && (
                          <Text style={[styles.matchingResultDetail, { color: '#4CAF50', fontWeight: '600' }]}>
                            ❤️ Matched with: {result.details.matchedWithUserName}
                          </Text>
                        )}
                        {result.details.compatibilityScore !== undefined && (
                          <Text style={styles.matchingResultDetail}>
                            Compatibility Score: {result.details.compatibilityScore?.toFixed(1)}
                          </Text>
                        )}
                        {result.details.candidatesExcludedReasons?.length > 0 && (
                          <View style={styles.excludedReasons}>
                            <Text style={styles.excludedReasonsTitle}>Why others were excluded:</Text>
                            {result.details.candidatesExcludedReasons.map((reason, i) => (
                              <Text key={i} style={styles.excludedReason}>• {reason}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getMatchingStatusStyle = (status) => {
  switch (status) {
    case 'matched': return { backgroundColor: '#4CAF50' };
    case 'disabled': return { backgroundColor: '#9E9E9E' };
    case 'skipped': return { backgroundColor: '#FF9800' };
    case 'no_match': return { backgroundColor: '#F44336' };
    case 'error': return { backgroundColor: '#E91E63' };
    default: return { backgroundColor: '#9E9E9E' };
  }
};

// Stat Card Component
function StatCard({ icon, label, value, total, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      {total !== undefined && (
        <Text style={styles.statTotal}>/ {total}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Info Row Component
function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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
  },
  activeTabText: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
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
  statTotal: {
    fontSize: 14,
    color: '#666',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#7C2B86',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  userMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  userStats: {
    alignItems: 'flex-end',
  },
  matchCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  totalMatches: {
    fontSize: 11,
    color: '#999',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  badgeGreen: {
    backgroundColor: '#4CAF50',
  },
  badgeRed: {
    backgroundColor: '#F44336',
  },
  badgeBlue: {
    backgroundColor: '#2196F3',
  },
  badgePurple: {
    backgroundColor: '#9C27B0',
  },
  badgeGray: {
    backgroundColor: '#9E9E9E',
  },
  matchCard: {
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
  matchUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  matchUser: {
    flex: 1,
    alignItems: 'center',
  },
  matchUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    textAlign: 'center',
  },
  matchUserEmail: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchScore: {
    fontSize: 12,
    color: '#666',
  },
  matchMessages: {
    fontSize: 12,
    color: '#666',
  },
  matchDate: {
    fontSize: 11,
    color: '#999',
  },
  blockedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockedSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
  blockedDate: {
    fontSize: 11,
    color: '#999',
  },
  blockedMessage: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFF3F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  blockedReason: {
    fontSize: 12,
    color: '#F44336',
  },
  blockedConfidence: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
  },
  modalSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  modalSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  endMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  endMatchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // Matching Results Styles
  matchingSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  matchingSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  matchingSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchingSummaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  matchingSummaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
  },
  matchingSummaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  matchingResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  matchingResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9E9E9E',
  },
  matchingResultMatched: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  matchingResultDisabled: {
    borderLeftColor: '#9E9E9E',
    backgroundColor: '#FAFAFA',
  },
  matchingResultSkipped: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  matchingResultNoMatch: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  matchingResultError: {
    borderLeftColor: '#E91E63',
    backgroundColor: '#FCE4EC',
  },
  matchingResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  matchingResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  matchingResultEmail: {
    fontSize: 12,
    color: '#666',
  },
  matchingResultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchingResultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchingResultReason: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  matchingResultDetails: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  matchingResultDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  excludedReasons: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  excludedReasonsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  excludedReason: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
});
