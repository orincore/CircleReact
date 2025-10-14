import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const RefundsScreen = () => {
  const [token, setToken] = useState(null)
  const [refunds, setRefunds] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedRefund, setSelectedRefund] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadToken()
  }, [])

  useEffect(() => {
    if (token) {
      loadRefunds()
      loadStats()
    }
  }, [filter, token])

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken')
      setToken(storedToken)
    } catch (error) {
      console.error('Error loading token:', error)
    }
  }

  const loadRefunds = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      //console.log('Loading refunds with token:', token ? 'Token available' : 'No token')
      
      const statusParam = filter === 'all' ? '' : `?status=${filter}`
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com'
      const url = `${apiUrl}/api/refunds/admin/all${statusParam}`
      //console.log('Fetching from URL:', url)
      //console.log('API Base URL:', apiUrl)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      //console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        //console.log('Refunds data:', data)
        setRefunds(data.refunds || [])
      } else {
        const errorData = await response.text()
        console.error('Failed to load refunds:', response.status, errorData.substring(0, 200))
        
        // Check if it's an HTML response (404 page)
        if (errorData.includes('<!DOCTYPE html>')) {
          console.error('Received HTML instead of JSON - API endpoint not found')
          console.warn('Using mock data until API is available')
          // Use mock data for now
          setRefunds([])
          setStats({
            total_requests: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            processed: 0,
            failed: 0,
            total_amount: 0,
            pending_amount: 0
          })
        } else {
          Alert.alert('Error', `Failed to load refunds: ${response.status}`)
          setRefunds([]) // Set empty array on error
        }
      }
    } catch (error) {
      console.error('Error loading refunds:', error)
      Alert.alert('Error', `Network error: ${error.message}`)
      setRefunds([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!token) return
    
    try {
      //console.log('Loading refund stats...')
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com'
      const statsUrl = `${apiUrl}/api/refunds/admin/stats`
      //console.log('Stats URL:', statsUrl)
      
      const response = await fetch(statsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      //console.log('Stats response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        //console.log('Stats data:', data)
        setStats(data)
      } else {
        console.error('Failed to load stats:', response.status)
        // Don't show alert for stats failure, just log it
        setStats(null)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(null)
    }
  }

  const processRefund = async (refundId, action) => {
    if (!token) return
    
    try {
      setProcessing(true)
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/refunds/admin/process/${refundId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          admin_notes: adminNotes
        })
      })

      if (response.ok) {
        Alert.alert('Success', `Refund ${action}d successfully`)
        setModalVisible(false)
        setAdminNotes('')
        loadRefunds()
        loadStats()
      } else {
        const error = await response.json()
        Alert.alert('Error', error.error || `Failed to ${action} refund`)
      }
    } catch (error) {
      console.error(`Error ${action}ing refund:`, error)
      Alert.alert('Error', `Failed to ${action} refund`)
    } finally {
      setProcessing(false)
    }
  }

  const processPayment = async (refundId) => {
    try {
      setProcessing(true)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com'
      const response = await fetch(`${apiUrl}/api/refunds/admin/process-payment/${refundId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        Alert.alert('Success', 'Refund payment processed successfully')
        loadRefunds()
        loadStats()
      } else {
        const error = await response.json()
        Alert.alert('Error', error.error || 'Failed to process payment')
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      Alert.alert('Error', 'Failed to process payment')
    } finally {
      setProcessing(false)
    }
  }

  const openRefundModal = (refund) => {
    setSelectedRefund(refund)
    setAdminNotes('')
    setModalVisible(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA726'
      case 'approved': return '#66BB6A'
      case 'rejected': return '#EF5350'
      case 'processed': return '#42A5F5'
      case 'failed': return '#FF7043'
      default: return '#9E9E9E'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline'
      case 'approved': return 'checkmark-circle'
      case 'rejected': return 'close-circle'
      case 'processed': return 'card'
      case 'failed': return 'alert-circle'
      default: return 'help-circle'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading && refunds.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading refunds...</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(false)
            if (token) {
              loadRefunds()
              loadStats()
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#7C2B86', '#A16AE8']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Refund Management</Text>
        <Text style={styles.headerSubtitle}>Manage subscription refund requests</Text>
      </LinearGradient>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: '#FFA726' }]}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#66BB6A' }]}>
              <Text style={styles.statNumber}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: '#42A5F5' }]}>
              <Text style={styles.statNumber}>{stats.processed}</Text>
              <Text style={styles.statLabel}>Processed</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#EF5350' }]}>
              <Text style={styles.statNumber}>{stats.rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
          <View style={styles.totalAmountCard}>
            <Text style={styles.totalAmountLabel}>Total Refunded</Text>
            <Text style={styles.totalAmount}>{formatCurrency(stats.total_amount)}</Text>
            <Text style={styles.pendingAmount}>
              Pending: {formatCurrency(stats.pending_amount)}
            </Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'pending', 'approved', 'rejected', 'processed', 'failed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                filter === status && styles.activeFilterTab
              ]}
              onPress={() => setFilter(status)}
            >
              <Text style={[
                styles.filterTabText,
                filter === status && styles.activeFilterTabText
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Refunds List */}
      <View style={styles.refundsContainer}>
        {refunds.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No refunds found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'all' ? 'No refund requests have been made yet' : `No ${filter} refunds found`}
            </Text>
          </View>
        ) : (
          refunds.map((refund) => (
            <TouchableOpacity
              key={refund.id}
              style={styles.refundCard}
              onPress={() => openRefundModal(refund)}
            >
              <View style={styles.refundHeader}>
                <View style={styles.refundUser}>
                  <Text style={styles.refundUsername}>{refund.user?.username || 'Unknown User'}</Text>
                  <Text style={styles.refundEmail}>{refund.user?.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(refund.status) }]}>
                  <Ionicons name={getStatusIcon(refund.status)} size={12} color="white" />
                  <Text style={styles.statusText}>{refund.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.refundDetails}>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Plan:</Text>
                  <Text style={styles.refundValue}>{refund.subscription?.plan_type || 'Unknown'}</Text>
                </View>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Amount:</Text>
                  <Text style={styles.refundValue}>{formatCurrency(refund.amount, refund.currency)}</Text>
                </View>
                <View style={styles.refundRow}>
                  <Text style={styles.refundLabel}>Requested:</Text>
                  <Text style={styles.refundValue}>{formatDate(refund.requested_at)}</Text>
                </View>
                {refund.reason && (
                  <View style={styles.refundRow}>
                    <Text style={styles.refundLabel}>Reason:</Text>
                    <Text style={styles.refundValue} numberOfLines={2}>{refund.reason}</Text>
                  </View>
                )}
              </View>

              {refund.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => openRefundModal(refund)}
                  >
                    <Ionicons name="checkmark" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Review</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {refund.status === 'approved' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.processButton]}
                    onPress={() => processPayment(refund.id)}
                  >
                    <Ionicons name="card" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Process Payment</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Refund Processing Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Process Refund</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRefund && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.refundInfo}>
                  <Text style={styles.modalLabel}>User: {selectedRefund.user?.username}</Text>
                  <Text style={styles.modalLabel}>Email: {selectedRefund.user?.email}</Text>
                  <Text style={styles.modalLabel}>Plan: {selectedRefund.subscription?.plan_type}</Text>
                  <Text style={styles.modalLabel}>Amount: {formatCurrency(selectedRefund.amount, selectedRefund.currency)}</Text>
                  <Text style={styles.modalLabel}>Requested: {formatDate(selectedRefund.requested_at)}</Text>
                  {selectedRefund.reason && (
                    <Text style={styles.modalLabel}>Reason: {selectedRefund.reason}</Text>
                  )}
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Admin Notes (Optional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    multiline
                    numberOfLines={4}
                    placeholder="Add notes about this refund decision..."
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveModalButton]}
                    onPress={() => processRefund(selectedRefund.id, 'approve')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="white" />
                        <Text style={styles.modalButtonText}>Approve Refund</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectModalButton]}
                    onPress={() => processRefund(selectedRefund.id, 'reject')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="white" />
                        <Text style={styles.modalButtonText}>Reject Refund</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#7C2B86',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F1147',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  totalAmountCard: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalAmountLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7C2B86',
  },
  pendingAmount: {
    fontSize: 14,
    color: '#FFA726',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeFilterTab: {
    backgroundColor: '#7C2B86',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterTabText: {
    color: 'white',
  },
  refundsContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  refundCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  refundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  refundUser: {
    flex: 1,
  },
  refundUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  refundEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 4,
  },
  refundDetails: {
    marginBottom: 12,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  refundLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  refundValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F1147',
    flex: 2,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  approveButton: {
    backgroundColor: '#66BB6A',
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F1147',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  refundInfo: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  approveModalButton: {
    backgroundColor: '#66BB6A',
  },
  rejectModalButton: {
    backgroundColor: '#EF5350',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
})

export default RefundsScreen
