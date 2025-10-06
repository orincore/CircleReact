import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '@/src/api/config';

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [suspensionEndDate, setSuspensionEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPermanentSuspension, setIsPermanentSuspension] = useState(false);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }
      
      // Fetch user details
      const userResponse = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await userResponse.json();
      setUser(userData.user);

      // Fetch user activity
      const activityResponse = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivity(activityData.activity || []);
      }

      // Fetch user subscription history
      const subscriptionResponse = await fetch(`${API_BASE_URL}/api/admin/subscriptions/user/${userId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setSubscriptions(subscriptionData.subscriptions || []);
      }

    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = () => {
    setSuspendReason('');
    setSuspensionEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Reset to 7 days from now
    setIsPermanentSuspension(false);
    setShowSuspendModal(true);
  };

  const confirmSuspend = async () => {
    if (!suspendReason.trim()) {
      Alert.alert('Error', 'Please enter a suspension reason');
      return;
    }
    
    setShowSuspendModal(false);
    
    // Calculate duration in days if not permanent
    let duration = null;
    if (!isPermanentSuspension) {
      const now = new Date();
      const diffTime = suspensionEndDate.getTime() - now.getTime();
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    }
    
    await performSuspension(suspendReason, duration);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSuspensionEndDate(selectedDate);
    }
  };

  const performSuspension = async (reason, duration) => {
    try {
      setActionLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, duration })
      });

      if (!response.ok) {
        throw new Error('Failed to suspend user');
      }

      Alert.alert('Success', 'User suspended successfully');
      loadUserDetails();
    } catch (error) {
      console.error('Error suspending user:', error);
      Alert.alert('Error', 'Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendUser = async () => {
    Alert.alert(
      'Unsuspend User',
      'Are you sure you want to unsuspend this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsuspend',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/unsuspend`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                throw new Error('Failed to unsuspend user');
              }

              Alert.alert('Success', 'User unsuspended successfully');
              loadUserDetails();
            } catch (error) {
              console.error('Error unsuspending user:', error);
              Alert.alert('Error', 'Failed to unsuspend user');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = () => {
    setDeleteReason('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteReason.trim()) {
      Alert.alert('Error', 'Please enter a deletion reason');
      return;
    }
    
    setShowDeleteModal(false);
    
    try {
      setActionLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: deleteReason })
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      Alert.alert('Success', 'User deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreUser = async () => {
    
    // For web, use window.confirm instead of Alert.alert
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to restore this user?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Restore User',
            'Are you sure you want to restore this user?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Restore', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmed) {
      console.log('❌ Restore cancelled by user');
      return;
    }

    try {
      setActionLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        const errorMsg = 'Authentication token not found';
        console.error('❌', errorMsg);
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
        return;
      }

      console.log('🔄 Restoring user:', userId);
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Restore response status:', response.status);
      const data = await response.json();
      console.log('📥 Restore response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore user');
      }

      console.log('✅ User restored successfully');
      if (Platform.OS === 'web') {
        window.alert('User restored successfully');
      } else {
        Alert.alert('Success', 'User restored successfully');
      }
      loadUserDetails();
    } catch (error) {
      console.error('❌ Error restoring user:', error);
      const errorMsg = error.message || 'Failed to restore user';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setActionLoading(false);
    }  };

  // Helper functions for subscription styling
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading user details...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1F1147', '#0D0524']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: user.profile_photo_url || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          {user.is_suspended && (
            <View style={styles.suspendedBadge}>
              <Ionicons name="ban" size={16} color="#FF6B6B" />
              <Text style={styles.suspendedText}>Suspended</Text>
            </View>
          )}
          
          {user.deleted_at && (
            <View style={[styles.suspendedBadge, { backgroundColor: 'rgba(255, 107, 107, 0.2)' }]}>
              <Ionicons name="trash" size={16} color="#FF6B6B" />
              <Text style={styles.suspendedText}>Deleted</Text>
            </View>
          )}
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{user.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username:</Text>
            <Text style={styles.infoValue}>@{user.username}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{user.age || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{user.gender || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Seen:</Text>
            <Text style={styles.infoValue}>
              {user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}
            </Text>
          </View>
        </View>

        {/* Subscription Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          
          {subscriptions.length > 0 ? (
            subscriptions.map((subscription, index) => (
              <View key={subscription.id} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
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
                  {index === 0 && subscription.status === 'active' && (
                    <Text style={styles.currentLabel}>CURRENT</Text>
                  )}
                </View>

                <View style={styles.subscriptionDetails}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plan:</Text>
                    <Text style={styles.infoValue}>
                      {subscription.plan_type === 'premium_plus' ? 'Premium+' : 
                       subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoValue, { color: getStatusColor(subscription.status) }]}>
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Started:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(subscription.started_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {subscription.expires_at && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Expires:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {subscription.price_paid && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Price Paid:</Text>
                      <Text style={styles.infoValue}>
                        ${subscription.price_paid.toFixed(2)} {subscription.currency || 'USD'}
                      </Text>
                    </View>
                  )}
                  
                  {subscription.payment_provider && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Provider:</Text>
                      <Text style={styles.infoValue}>{subscription.payment_provider}</Text>
                    </View>
                  )}
                  
                  {subscription.cancelled_at && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Cancelled:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(subscription.cancelled_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {subscription.status === 'active' && (
                  <TouchableOpacity 
                    style={styles.manageSubscriptionButton}
                    onPress={() => router.push(`/admin/subscriptions?userId=${userId}`)}
                  >
                    <Ionicons name="settings" size={16} color="#7C2B86" />
                    <Text style={styles.manageSubscriptionText}>Manage Subscription</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.noSubscriptionCard}>
              <Ionicons name="diamond-outline" size={32} color="#6B7280" />
              <Text style={styles.noSubscriptionText}>No subscription history found</Text>
              <Text style={styles.noSubscriptionSubtext}>This user has never had a subscription</Text>
            </View>
          )}
        </View>

        {/* Suspension Info */}
        {user.is_suspended && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suspension Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reason:</Text>
              <Text style={styles.infoValue}>{user.suspension_reason || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Suspended At:</Text>
              <Text style={styles.infoValue}>
                {user.suspended_at ? new Date(user.suspended_at).toLocaleString() : 'N/A'}
              </Text>
            </View>
            
            {user.suspension_ends_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ends At:</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.suspension_ends_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Deletion Info */}
        {user.deleted_at && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deletion Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reason:</Text>
              <Text style={styles.infoValue}>{user.deletion_reason || 'N/A'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deleted At:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.deleted_at).toLocaleString()}
              </Text>
            </View>
            
            {user.deleted_by && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Deleted By:</Text>
                <Text style={styles.infoValue}>{user.deleted_by}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {/* Debug info */}
          {console.log('🔍 User state:', { 
            deleted_at: user.deleted_at, 
            is_suspended: user.is_suspended,
            showRestoreButton: !!user.deleted_at 
          })}
          
          {!user.is_suspended ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={handleSuspendUser}
              disabled={actionLoading}
            >
              <Ionicons name="ban" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Suspend User</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.unsuspendButton]}
              onPress={handleUnsuspendUser}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Unsuspend User</Text>
            </TouchableOpacity>
          )}
          
          {!user.deleted_at ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteUser}
              disabled={actionLoading}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Delete User</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.restoreButton]}
              onPress={handleRestoreUser}
              disabled={actionLoading}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Restore User</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activity.map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityText}>{item.action}</Text>
                <Text style={styles.activityTime}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Suspend Modal */}
      <Modal
        visible={showSuspendModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuspendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Suspend User</Text>
            
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter suspension reason..."
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              numberOfLines={3}
            />
            
            {/* Permanent Suspension Toggle */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setIsPermanentSuspension(!isPermanentSuspension)}
            >
              <View style={[styles.checkbox, isPermanentSuspension && styles.checkboxChecked]}>
                {isPermanentSuspension && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Permanent Suspension</Text>
            </TouchableOpacity>
            
            {/* Date Picker Section */}
            {!isPermanentSuspension && (
              <>
                <Text style={styles.inputLabel}>Suspension End Date</Text>
                
                {/* Web: Use native HTML datetime-local input */}
                {Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={suspensionEndDate.toISOString().slice(0, 16)}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setSuspensionEndDate(newDate);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '16px',
                      borderRadius: '12px',
                      border: '1px solid #E0E0E0',
                      backgroundColor: '#F5F5F5',
                      color: '#1F1147',
                      fontFamily: 'inherit',
                      marginBottom: '8px',
                    }}
                  />
                ) : (
                  <>
                    {/* Mobile: Use DateTimePicker */}
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color="#7C2B86" />
                      <Text style={styles.datePickerText}>
                        {suspensionEndDate.toLocaleDateString('en-US', { 
                          weekday: 'short',
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Date Picker */}
                    {(showDatePicker || Platform.OS === 'ios') && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={suspensionEndDate}
                          mode="datetime"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                          textColor="#1F1147"
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity 
                            style={styles.datePickerDoneButton}
                            onPress={() => setShowDatePicker(false)}
                          >
                            <Text style={styles.datePickerDoneText}>Done</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                )}
                
                {/* Duration Info */}
                <Text style={styles.durationInfo}>
                  Duration: {Math.ceil((suspensionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                </Text>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSuspendModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmSuspend}
              >
                <Text style={styles.confirmButtonText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete User</Text>
            <Text style={styles.modalWarning}>This action cannot be undone!</Text>
            
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter deletion reason..."
              value={deleteReason}
              onChangeText={setDeleteReason}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1147',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1147',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#7C2B86',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  suspendedText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  suspendButton: {
    backgroundColor: '#FF9500',
  },
  unsuspendButton: {
    backgroundColor: '#22C55E',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  restoreButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 14,
    color: '#FF6B6B',
    marginBottom: 20,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1F1147',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#FF9500',
  },
  deleteConfirmButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#7C2B86',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C2B86',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1F1147',
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F1147',
    marginLeft: 12,
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginVertical: 8,
  },
  datePickerDoneButton: {
    backgroundColor: '#7C2B86',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  durationInfo: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Subscription styles
  subscriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionBadges: {
    flexDirection: 'row',
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
  currentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subscriptionDetails: {
    gap: 8,
  },
  manageSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  manageSubscriptionText: {
    color: '#7C2B86',
    fontWeight: '600',
    fontSize: 14,
  },
  noSubscriptionCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noSubscriptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  noSubscriptionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
