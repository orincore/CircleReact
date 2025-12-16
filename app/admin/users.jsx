import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function AdminUsers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const loadUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        status: statusFilter,
        ...(search && { search })
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const getVerificationChip = (user) => {
    const status = (user?.verification_status || 'pending').toString();
    const isVerified = status === 'verified';
    return {
      label: isVerified ? 'VERIFIED' : status.toUpperCase(),
      style: isVerified ? styles.chipSuccess : styles.chipMuted,
      textStyle: isVerified ? styles.chipSuccessText : styles.chipMutedText,
      icon: isVerified ? 'checkmark-circle' : 'alert-circle'
    };
  };

  const getAccountStateChips = (user) => {
    const chips = [];
    if (user?.deleted_at) {
      chips.push({ label: 'DELETED', style: styles.chipDanger, textStyle: styles.chipDangerText, icon: 'trash' });
      return chips;
    }
    if (user?.is_suspended) {
      chips.push({ label: 'SUSPENDED', style: styles.chipWarning, textStyle: styles.chipWarningText, icon: 'ban' });
    } else {
      chips.push({ label: 'ACTIVE', style: styles.chipInfo, textStyle: styles.chipInfoText, icon: 'radio-button-on' });
    }
    if (user?.email_verified) {
      chips.push({ label: 'EMAIL', style: styles.chipInfo, textStyle: styles.chipInfoText, icon: 'mail' });
    }
    return chips;
  };

  const handleSuspendUser = async (userId, userName) => {
    Alert.alert(
      'Suspend User',
      `Are you sure you want to suspend ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/suspend`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: 'Admin suspension' }),
              });

              if (response.ok) {
                Alert.alert('Success', 'User suspended successfully');
                loadUsers();
              } else {
                Alert.alert('Error', 'Failed to suspend user');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to suspend user');
            }
          },
        },
      ]
    );
  };

  const handleUnsuspendUser = async (userId, userName) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        Alert.alert('Success', 'User unsuspended successfully');
        loadUsers();
      } else {
        Alert.alert('Error', 'Failed to unsuspend user');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unsuspend user');
    }
  };

  const handleViewUser = (userId) => {
    router.push(`/admin/users/${userId}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0D0524', '#1F1147', '#7C2B86']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Users</Text>
            <Text style={styles.headerSubtitle}>Search, review, and manage accounts</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.75)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, email, username, phone"
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setPage(1);
                  loadUsers();
                }}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSearch} style={styles.iconButton}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['all', 'active', 'suspended', 'deleted'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterPill, statusFilter === status && styles.filterPillActive]}
                onPress={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                <Text style={[styles.filterPillText, statusFilter === status && styles.filterPillTextActive]}>
                  {status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Users List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />}
      >
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No users found</Text>
          </View>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <TouchableOpacity style={styles.userCardTop} onPress={() => handleViewUser(user.id)}>
                <Image
                  source={{ uri: user.profile_photo_url || 'https://via.placeholder.com/56' }}
                  style={styles.avatar}
                />

                <View style={styles.userInfo}>
                  <View style={styles.userTopRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.first_name} {user.last_name}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>

                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                  <Text style={styles.userMeta} numberOfLines={1}>
                    {(user.age || 'N/A')} • {(user.gender || 'N/A')} • @{user.username}
                  </Text>

                  <View style={styles.chipsRow}>
                    {(() => {
                      const v = getVerificationChip(user);
                      return (
                        <View style={[styles.chip, v.style]}>
                          <Ionicons name={v.icon} size={14} color={v.textStyle.color} />
                          <Text style={[styles.chipText, v.textStyle]}>{v.label}</Text>
                        </View>
                      );
                    })()}
                    {getAccountStateChips(user).map((c) => (
                      <View key={c.label} style={[styles.chip, c.style]}>
                        <Ionicons name={c.icon} size={14} color={c.textStyle.color} />
                        <Text style={[styles.chipText, c.textStyle]}>{c.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.userActions}>
                {!user.deleted_at && (
                  <TouchableOpacity
                    style={[styles.actionButton, user.is_suspended ? styles.actionPrimary : styles.actionWarning]}
                    onPress={() =>
                      user.is_suspended
                        ? handleUnsuspendUser(user.id, user.first_name)
                        : handleSuspendUser(user.id, user.first_name)
                    }
                  >
                    <Ionicons
                      name={user.is_suspended ? 'checkmark-circle' : 'ban'}
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionButtonText}>
                      {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionNeutral]}
                  onPress={() => handleViewUser(user.id)}
                >
                  <Ionicons name="eye" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
              onPress={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? '#CCC' : '#7C2B86'} />
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Page {page} of {pagination.totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, page === pagination.totalPages && styles.paginationButtonDisabled]}
              onPress={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              <Ionicons name="chevron-forward" size={20} color={page === pagination.totalPages ? '#CCC' : '#7C2B86'} />
            </TouchableOpacity>
          </View>
        )}

        {pagination && (
          <Text style={styles.totalCount}>
            Total: {pagination.total} users
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B061C',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B061C',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: { padding: 10 },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  toolbar: {
    marginTop: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterRow: {
    gap: 10,
    paddingRight: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 214, 242, 0.18)',
    borderColor: 'rgba(255, 214, 242, 0.28)',
  },
  filterPillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterPillTextActive: {
    color: '#FFD6F2',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  userCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userEmail: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  userMeta: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  chipMuted: {
    backgroundColor: 'rgba(156, 163, 175, 0.10)',
    borderColor: 'rgba(156, 163, 175, 0.22)',
  },
  chipMutedText: {
    color: '#9CA3AF',
  },
  chipSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  chipSuccessText: {
    color: '#10B981',
  },
  chipWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.22)',
  },
  chipWarningText: {
    color: '#F59E0B',
  },
  chipDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  chipDangerText: {
    color: '#EF4444',
  },
  chipInfo: {
    backgroundColor: 'rgba(96, 165, 250, 0.14)',
    borderColor: 'rgba(96, 165, 250, 0.22)',
  },
  chipInfoText: {
    color: '#60A5FA',
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  actionNeutral: {
    backgroundColor: 'rgba(156, 163, 175, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.22)',
  },
  actionWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.26)',
  },
  actionPrimary: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.26)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '800',
  },
  totalCount: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
  },
});
