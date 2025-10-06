import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  // Edit modal states
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Admin authentication required');
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      console.log('🔍 Loading subscriptions from:', `${apiUrl}/api/admin/subscriptions`);
      console.log('🔍 Using token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiUrl}/api/admin/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Subscriptions data:', data);
        setSubscriptions(data.subscriptions || []);
      } else {
        const errorText = await response.text();
        console.error('🔍 Error response:', errorText);
        throw new Error(`Failed to load subscriptions: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const handleEditSubscription = (subscription) => {
    setSelectedSubscription(subscription);
    setEditPlan(subscription.plan_type);
    setEditStatus(subscription.status);
    setEditExpiryDate(subscription.expires_at ? new Date(subscription.expires_at).toISOString().split('T')[0] : '');
    setShowEditModal(true);
  };

  const performCancellation = async (subscriptionId) => {
    console.log('🔍 User confirmed cancellation');
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      
      console.log('🔍 Cancelling subscription:', subscriptionId);
      console.log('🔍 Using token:', token ? 'Present' : 'Missing');
      console.log('🔍 Cancel URL:', `${apiUrl}/api/admin/subscriptions/${subscriptionId}/cancel`);
      
      const response = await fetch(`${apiUrl}/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Cancel response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Cancel success:', result);
        Alert.alert('Success', 'Subscription cancelled successfully');
        loadSubscriptions();
      } else {
        const errorText = await response.text();
        console.error('🔍 Cancel error response:', errorText);
        throw new Error(`Failed to cancel subscription: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      Alert.alert('Error', `Failed to cancel subscription: ${error.message}`);
    }
  };

  const handleCancelSubscription = async (subscriptionId, userId) => {
    console.log('🔍 Cancel button clicked for subscription:', subscriptionId, 'user:', userId);
    
    try {
      console.log('🔍 Attempting to show confirmation dialog...');
      
      // Try using window.confirm as fallback for web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
        console.log('🔍 Using window.confirm for web...');
        const confirmed = window.confirm('Are you sure you want to cancel this subscription?');
        if (confirmed) {
          await performCancellation(subscriptionId);
        } else {
          console.log('🔍 User cancelled the action via window.confirm');
        }
        return;
      }
      
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel this subscription?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('🔍 User cancelled the action')
          },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: () => performCancellation(subscriptionId)
          }
        ]
      );
    } catch (error) {
      console.error('🔍 Error showing confirmation dialog:', error);
      Alert.alert('Error', 'Failed to show confirmation dialog');
    }
  };

  const handleSaveSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      
      console.log('🔍 Updating subscription:', selectedSubscription.id);
      console.log('🔍 Update data:', { plan_type: editPlan, status: editStatus, expires_at: editExpiryDate });
      console.log('🔍 Using token:', token ? 'Present' : 'Missing');
      
      const updateData = {
        plan_type: editPlan,
        status: editStatus,
        expires_at: editExpiryDate ? new Date(editExpiryDate).toISOString() : null,
      };

      const response = await fetch(`${apiUrl}/api/admin/subscriptions/${selectedSubscription.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('🔍 Update response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Update success:', result);
        Alert.alert('Success', 'Subscription updated successfully');
        setShowEditModal(false);
        loadSubscriptions();
      } else {
        const errorText = await response.text();
        console.error('🔍 Update error response:', errorText);
        throw new Error(`Failed to update subscription: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const testAdminAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      
      console.log('🔍 Testing admin auth with token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiUrl}/api/admin/subscriptions/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔍 Admin auth test response:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Admin auth test success:', result);
        Alert.alert('Admin Auth Test', 'Authentication successful!');
      } else {
        const errorText = await response.text();
        console.error('🔍 Admin auth test error:', errorText);
        Alert.alert('Admin Auth Test Failed', `Status: ${response.status}\nError: ${errorText}`);
      }
    } catch (error) {
      console.error('🔍 Admin auth test error:', error);
      Alert.alert('Admin Auth Test Failed', error.message);
    }
  };

  const handleCreateSubscription = () => {
    Alert.alert(
      'Create Subscription',
      'This feature allows you to manually create subscriptions for users.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Test Auth', onPress: testAdminAuth },
        { text: 'Coming Soon', style: 'default' },
      ]
    );
  };

  const getFilteredSubscriptions = () => {
    return subscriptions.filter(sub => {
      const matchesSearch = searchQuery === '' || 
        sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.user_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      const matchesPlan = filterPlan === 'all' || sub.plan_type === filterPlan;
      
      return matchesSearch && matchesStatus && matchesPlan;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'cancelled': return '#F59E0B';
      case 'expired': return '#EF4444';
      case 'pending': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'premium_plus': return '#FFD700';
      case 'premium': return '#7C2B86';
      case 'free': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return amount ? `$${amount.toFixed(2)}` : 'N/A';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="diamond" size={28} color="#FFD6F2" />
            <Text style={styles.headerTitle}>Subscription Management</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateSubscription}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email, username, or ID..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['all', 'active', 'cancelled', 'expired', 'pending'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Plan:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['all', 'free', 'premium', 'premium_plus'].map(plan => (
                  <TouchableOpacity
                    key={plan}
                    style={[styles.filterChip, filterPlan === plan && styles.filterChipActive]}
                    onPress={() => setFilterPlan(plan)}
                  >
                    <Text style={[styles.filterChipText, filterPlan === plan && styles.filterChipTextActive]}>
                      {plan === 'premium_plus' ? 'Premium+' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Subscriptions List */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{subscriptions.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {subscriptions.filter(s => s.status === 'active').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {subscriptions.filter(s => s.plan_type === 'premium' || s.plan_type === 'premium_plus').length}
              </Text>
              <Text style={styles.statLabel}>Premium</Text>
            </View>
          </View>

          {getFilteredSubscriptions().map((subscription) => {
            console.log('🔍 Rendering subscription:', subscription.id, 'status:', subscription.status, 'user_id:', subscription.user_id);
            return (
            <View key={subscription.id} style={styles.subscriptionCard}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionUser}>
                  <Text style={styles.subscriptionEmail}>
                    {subscription.user_email || 'No email'}
                  </Text>
                  <Text style={styles.subscriptionUsername}>
                    @{subscription.user_username || 'unknown'}
                  </Text>
                </View>
                <View style={styles.subscriptionBadges}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                      {subscription.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: getPlanColor(subscription.plan_type) + '20' }]}>
                    <Text style={[styles.planText, { color: getPlanColor(subscription.plan_type) }]}>
                      {subscription.plan_type === 'premium_plus' ? 'PREMIUM+' : subscription.plan_type.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.subscriptionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID:</Text>
                  <Text style={styles.detailValue}>{subscription.id.substring(0, 8)}...</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Started:</Text>
                  <Text style={styles.detailValue}>{formatDate(subscription.started_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expires:</Text>
                  <Text style={styles.detailValue}>{formatDate(subscription.expires_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(subscription.price_paid)}</Text>
                </View>
                {subscription.payment_provider && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Provider:</Text>
                    <Text style={styles.detailValue}>{subscription.payment_provider}</Text>
                  </View>
                )}
              </View>

              <View style={styles.subscriptionActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditSubscription(subscription)}
                >
                  <Ionicons name="create" size={16} color="#7C2B86" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                {subscription.status === 'active' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelSubscription(subscription.id, subscription.user_id)}
                  >
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            );
          })}

          {getFilteredSubscriptions().length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="diamond-outline" size={64} color="#6B7280" />
              <Text style={styles.emptyStateTitle}>No subscriptions found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterStatus !== 'all' || filterPlan !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No subscriptions have been created yet'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Edit Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Subscription</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {selectedSubscription && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>User Information</Text>
                      <Text style={styles.modalUserInfo}>
                        {selectedSubscription.user_email} (@{selectedSubscription.user_username})
                      </Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Plan Type</Text>
                      <View style={styles.planOptions}>
                        {['free', 'premium', 'premium_plus'].map(plan => (
                          <TouchableOpacity
                            key={plan}
                            style={[styles.planOption, editPlan === plan && styles.planOptionActive]}
                            onPress={() => setEditPlan(plan)}
                          >
                            <Text style={[styles.planOptionText, editPlan === plan && styles.planOptionTextActive]}>
                              {plan === 'premium_plus' ? 'Premium+' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Status</Text>
                      <View style={styles.statusOptions}>
                        {['active', 'cancelled', 'expired', 'pending'].map(status => (
                          <TouchableOpacity
                            key={status}
                            style={[styles.statusOption, editStatus === status && styles.statusOptionActive]}
                            onPress={() => setEditStatus(status)}
                          >
                            <Text style={[styles.statusOptionText, editStatus === status && styles.statusOptionTextActive]}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Expiry Date (YYYY-MM-DD)</Text>
                      <TextInput
                        style={styles.dateInput}
                        value={editExpiryDate}
                        onChangeText={setEditExpiryDate}
                        placeholder="2024-12-31"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.saveButton} onPress={handleSaveSubscription}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowEditModal(false)}>
                        <Text style={styles.cancelModalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterRow: {
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#7C2B86',
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  subscriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subscriptionUser: {
    flex: 1,
  },
  subscriptionEmail: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionUsername: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  subscriptionBadges: {
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  planText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#7C2B86',
    fontWeight: '600',
    fontSize: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalUserInfo: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  planOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  planOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  planOptionActive: {
    backgroundColor: '#7C2B86',
  },
  planOptionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  planOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusOptionActive: {
    backgroundColor: '#7C2B86',
  },
  statusOptionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalActions: {
    gap: 12,
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#7C2B86',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelModalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
