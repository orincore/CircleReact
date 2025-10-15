import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

const { width } = Dimensions.get('window');

export default function ReferralsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [actionType, setActionType] = useState('approve'); // 'approve', 'reject', 'pay', 'edit', 'change_status'
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [editForm, setEditForm] = useState({
    reward_amount: '',
    referral_code: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Load stats
      const statsResponse = await fetch(`${API_BASE_URL}/api/admin/referrals/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Load transactions based on selected tab
      const endpoint = selectedTab === 'pending' 
        ? '/api/admin/referrals/pending'
        : `/api/admin/referrals/transactions?status=${selectedTab}`;
      
      const transResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const transData = await transResponse.json();
      setTransactions(transData.transactions || []);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAction = (transaction, type) => {
    setSelectedTransaction(transaction);
    setActionType(type);
    if (type === 'edit') {
      setEditForm({
        reward_amount: transaction.reward_amount?.toString() || '10',
        referral_code: transaction.referral_code || '',
        notes: transaction.notes || ''
      });
      setShowEditModal(true);
    } else if (type === 'change_status') {
      setNewStatus(transaction.status);
      setShowStatusModal(true);
    } else {
      setShowActionModal(true);
    }
    setRejectionReason('');
    setPaymentReference('');
  };

  const confirmAction = async () => {
    if (actionType === 'reject' && !rejectionReason.trim()) {
      if (Platform.OS === 'web') {
        alert('Please provide a rejection reason');
      }
      return;
    }

    if (actionType === 'pay' && !paymentReference.trim()) {
      if (Platform.OS === 'web') {
        alert('Please provide a payment reference');
      }
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      let endpoint, body;
      if (actionType === 'pay') {
        endpoint = `${API_BASE_URL}/api/admin/referrals/${selectedTransaction.id}/mark-paid`;
        body = { paymentReference };
      } else {
        endpoint = `${API_BASE_URL}/api/admin/referrals/${selectedTransaction.id}/verify`;
        body = {
          status: actionType === 'approve' ? 'approved' : 'rejected',
          rejectionReason: rejectionReason || undefined
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert(`Referral ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'marked as paid'} successfully`);
        }
        setShowActionModal(false);
        loadData();
      } else {
        const error = await response.json();
        if (Platform.OS === 'web') {
          alert(`Error: ${error.error || 'Failed to process action'}`);
        }
      }
    } catch (error) {
      console.error('Error processing action:', error);
      if (Platform.OS === 'web') {
        alert('Failed to process action');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!editForm.reward_amount || parseFloat(editForm.reward_amount) <= 0) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid reward amount');
      }
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/referrals/${selectedTransaction.id}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reward_amount: parseFloat(editForm.reward_amount),
          referral_code: editForm.referral_code,
          notes: editForm.notes
        })
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert('Referral updated successfully');
        }
        setShowEditModal(false);
        loadData();
      } else {
        const error = await response.json();
        if (Platform.OS === 'web') {
          alert(`Error: ${error.error || 'Failed to update referral'}`);
        }
      }
    } catch (error) {
      console.error('Error updating referral:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update referral');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === selectedTransaction.status) {
      if (Platform.OS === 'web') {
        alert('Please select a different status');
      }
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/referrals/${selectedTransaction.id}/change-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (response.ok) {
        if (Platform.OS === 'web') {
          alert(`Status changed to ${newStatus} successfully`);
        }
        setShowStatusModal(false);
        loadData();
      } else {
        const error = await response.json();
        if (Platform.OS === 'web') {
          alert(`Error: ${error.error || 'Failed to change status'}`);
        }
      }
    } catch (error) {
      console.error('Error changing status:', error);
      if (Platform.OS === 'web') {
        alert('Failed to change status');
      }
    } finally {
      setProcessing(false);
    }
  };

  const renderStatCard = (icon, label, value, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderTransaction = (transaction) => {
    const referrer = transaction.referrer || {};
    const referred = transaction.referred || {};
    const statusColor = {
      pending: '#FF9800',
      approved: '#4CAF50',
      rejected: '#F44336',
      paid: '#2196F3'
    }[transaction.status] || '#666';

    return (
      <View key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionNumber}>{transaction.referral_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{transaction.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.rewardAmount}>₹{transaction.reward_amount || 10}</Text>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.detailLabel}>Referrer:</Text>
            <Text style={styles.detailValue}>
              {referrer.first_name} {referrer.last_name} (@{referrer.username})
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-add" size={16} color="#666" />
            <Text style={styles.detailLabel}>Referred:</Text>
            <Text style={styles.detailValue}>
              {referred.first_name} {referred.last_name} (@{referred.username})
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="mail" size={16} color="#666" />
            <Text style={styles.detailLabel}>Referrer Email:</Text>
            <Text style={styles.detailValue}>{referrer.email}</Text>
          </View>

          {/* Show UPI ID if available */}
          {transaction.referrer_upi_id && (
            <View style={styles.detailRow}>
              <Ionicons name="card" size={16} color="#4CAF50" />
              <Text style={styles.detailLabel}>UPI ID:</Text>
              <Text style={[styles.detailValue, styles.upiId]}>{transaction.referrer_upi_id}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>
              {new Date(transaction.created_at).toLocaleDateString()}
            </Text>
          </View>

          {transaction.rejection_reason && (
            <View style={styles.detailRow}>
              <Ionicons name="alert-circle" size={16} color="#F44336" />
              <Text style={styles.detailLabel}>Reason:</Text>
              <Text style={[styles.detailValue, styles.rejectionReason]}>
                {transaction.rejection_reason}
              </Text>
            </View>
          )}

          {transaction.payment_reference && (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.detailLabel}>Payment Ref:</Text>
              <Text style={styles.detailValue}>{transaction.payment_reference}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Change Status button - available for all */}
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => handleAction(transaction, 'change_status')}
          >
            <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Status</Text>
          </TouchableOpacity>

          {/* Edit button - available for all statuses except paid */}
          {transaction.status !== 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleAction(transaction, 'edit')}
            >
              <Ionicons name="create" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
          
          {transaction.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleAction(transaction, 'approve')}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleAction(transaction, 'reject')}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {transaction.status === 'approved' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={() => handleAction(transaction, 'pay')}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading referrals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.header}>
        <Text style={styles.headerTitle}>Referral Management</Text>
        <Text style={styles.headerSubtitle}>Manage and track referral rewards</Text>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard('people', 'Total Referrals', stats?.stats?.total || 0, '#7C2B86')}
        {renderStatCard('time', 'Pending', stats?.stats?.pending || 0, '#FF9800')}
        {renderStatCard('checkmark-circle', 'Approved', stats?.stats?.approved || 0, '#4CAF50')}
        {renderStatCard('card', 'Paid', stats?.stats?.paid || 0, '#2196F3')}
        {renderStatCard('close-circle', 'Rejected', stats?.stats?.rejected || 0, '#F44336')}
        {renderStatCard('cash', 'Pending Earnings', `₹${stats?.earnings?.pending?.toFixed(2) || 0}`, '#FF9800')}
        {renderStatCard('wallet', 'Total Paid', `₹${stats?.earnings?.paid?.toFixed(2) || 0}`, '#4CAF50')}
        {renderStatCard('trending-up', 'Total Earnings', `₹${stats?.earnings?.total?.toFixed(2) || 0}`, '#2196F3')}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {['pending', 'approved', 'paid', 'rejected'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />}
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No {selectedTab} referrals found</Text>
          </View>
        ) : (
          transactions.map(renderTransaction)
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal visible={showActionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'approve' ? 'Approve Referral' : actionType === 'reject' ? 'Reject Referral' : 'Mark as Paid'}
            </Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  Referral: {selectedTransaction.referral_number}
                </Text>
                <Text style={styles.modalInfoText}>
                  Amount: ₹{selectedTransaction.reward_amount || 10}
                </Text>
              </View>
            )}

            {actionType === 'reject' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Rejection Reason *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {actionType === 'pay' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Reference *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter UPI transaction ID or reference"
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowActionModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmAction}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Referral</Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  Referral: {selectedTransaction.referral_number}
                </Text>
                <Text style={styles.modalInfoText}>
                  Status: {selectedTransaction.status}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reward Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter reward amount"
                value={editForm.reward_amount}
                onChangeText={(text) => setEditForm({...editForm, reward_amount: text})}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Referral Code</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Referral code"
                value={editForm.referral_code}
                onChangeText={(text) => setEditForm({...editForm, referral_code: text})}
                editable={false}
              />
              <Text style={styles.helperText}>Referral code cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add notes about this referral"
                value={editForm.notes}
                onChangeText={(text) => setEditForm({...editForm, notes: text})}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleEdit}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Referral Status</Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  Referral: {selectedTransaction.referral_number}
                </Text>
                <Text style={styles.modalInfoText}>
                  Current Status: {selectedTransaction.status.toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Status *</Text>
              <View style={styles.statusOptions}>
                {['pending', 'approved', 'paid', 'rejected'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      newStatus === status && styles.statusOptionSelected
                    ]}
                    onPress={() => setNewStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      newStatus === status && styles.statusOptionTextSelected
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Changing status will update earnings and trigger notifications
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStatusModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleStatusChange}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Change Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '31%',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
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
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7C2B86',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#1F1147',
    flex: 1,
  },
  upiId: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  rejectionReason: {
    color: '#F44336',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  payButton: {
    backgroundColor: '#2196F3',
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  statusButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  modalInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F1147',
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#7C2B86',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: '#7C2B86',
    backgroundColor: '#F3E8FF',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusOptionTextSelected: {
    color: '#7C2B86',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
  },
});
