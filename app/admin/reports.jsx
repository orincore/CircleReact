import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function AdminReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    loadReports();
  }, [page, statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        status: statusFilter,
        type: typeFilter,
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      setReports(data.reports || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReportDetails = async (reportId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      setSelectedReport(data);
      setShowDetailsModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load report details');
    }
  };

  const handleResolveReport = async () => {
    if (!actionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${selectedReport.report.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Report resolved successfully');
        setShowActionModal(false);
        setShowDetailsModal(false);
        setActionReason('');
        loadReports();
      } else {
        Alert.alert('Error', 'Failed to resolve report');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resolve report');
    }
  };

  const handleDismissReport = async () => {
    if (!actionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${selectedReport.report.id}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: actionReason }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Report dismissed successfully');
        setShowActionModal(false);
        setShowDetailsModal(false);
        setActionReason('');
        loadReports();
      } else {
        Alert.alert('Error', 'Failed to dismiss report');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to dismiss report');
    }
  };

  const getReportTypeColor = (type) => {
    const colors = {
      harassment: '#F44336',
      spam: '#FF9800',
      inappropriate_content: '#E91E63',
      fake_profile: '#9C27B0',
      underage: '#F44336',
      other: '#757575',
    };
    return colors[type] || '#757575';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FF9800',
      reviewing: '#2196F3',
      resolved: '#4CAF50',
      dismissed: '#757575',
    };
    return colors[status] || '#757575';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFD6F2" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Management</Text>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['pending', 'reviewing', 'resolved', 'dismissed', 'all'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => { setStatusFilter(status); setPage(1); }}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Type:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'harassment', 'spam', 'inappropriate_content', 'fake_profile', 'underage', 'other'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
              onPress={() => { setTypeFilter(type); setPage(1); }}
            >
              <Text style={[styles.filterChipText, typeFilter === type && styles.filterChipTextActive]}>
                {type.replace('_', ' ').charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C2B86']} />}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No reports found</Text>
          </View>
        ) : (
          reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => loadReportDetails(report.id)}
            >
              <View style={styles.reportHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getReportTypeColor(report.report_type) }]}>
                  <Text style={styles.typeBadgeText}>
                    {report.report_type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                  <Text style={styles.statusBadgeText}>{report.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.reportContent}>
                <View style={styles.userRow}>
                  <Image
                    source={{ uri: report.reporter?.profile_photo_url || 'https://via.placeholder.com/40' }}
                    style={styles.smallAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userLabel}>Reporter:</Text>
                    <Text style={styles.userName}>
                      {report.reporter?.first_name} {report.reporter?.last_name}
                    </Text>
                  </View>
                </View>

                <Ionicons name="arrow-forward" size={20} color="#999" style={styles.arrowIcon} />

                <View style={styles.userRow}>
                  <Image
                    source={{ uri: report.reported_user?.profile_photo_url || 'https://via.placeholder.com/40' }}
                    style={styles.smallAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userLabel}>Reported:</Text>
                    <Text style={styles.userName}>
                      {report.reported_user?.first_name} {report.reported_user?.last_name}
                    </Text>
                  </View>
                </View>
              </View>

              {report.reason && (
                <Text style={styles.reportReason} numberOfLines={2}>
                  {report.reason}
                </Text>
              )}

              <Text style={styles.reportDate}>
                {new Date(report.created_at).toLocaleDateString()} at{' '}
                {new Date(report.created_at).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
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
      </ScrollView>

      {/* Report Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReport && (
                <>
                  {/* Reporter Info */}
                  <TouchableOpacity 
                    style={styles.userDetailSection}
                    onPress={() => {
                      setShowDetailsModal(false);
                      router.push(`/admin/users/${selectedReport.reporter.id}`);
                    }}
                  >
                    <Text style={styles.detailLabel}>Reporter:</Text>
                    <View style={styles.userDetailRow}>
                      <Image
                        source={{ uri: selectedReport.reporter?.profile_photo_url || 'https://via.placeholder.com/40' }}
                        style={styles.modalAvatar}
                      />
                      <View>
                        <Text style={styles.modalUserName}>
                          {selectedReport.reporter?.first_name} {selectedReport.reporter?.last_name}
                        </Text>
                        <Text style={styles.modalUserEmail}>{selectedReport.reporter?.email}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
                    </View>
                  </TouchableOpacity>

                  {/* Reported User Info */}
                  <TouchableOpacity 
                    style={styles.userDetailSection}
                    onPress={() => {
                      setShowDetailsModal(false);
                      router.push(`/admin/users/${selectedReport.reported_user.id}`);
                    }}
                  >
                    <Text style={styles.detailLabel}>Reported User:</Text>
                    <View style={styles.userDetailRow}>
                      <Image
                        source={{ uri: selectedReport.reported_user?.profile_photo_url || 'https://via.placeholder.com/40' }}
                        style={styles.modalAvatar}
                      />
                      <View>
                        <Text style={styles.modalUserName}>
                          {selectedReport.reported_user?.first_name} {selectedReport.reported_user?.last_name}
                        </Text>
                        <Text style={styles.modalUserEmail}>{selectedReport.reported_user?.email}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReport.report.report_type.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedReport.report.status.toUpperCase()}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Reason:</Text>
                    <Text style={styles.detailValue}>{selectedReport.report.reason || 'No reason provided'}</Text>
                  </View>

                  {selectedReport.report.moderator_notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Moderator Notes:</Text>
                      <Text style={styles.detailValue}>{selectedReport.report.moderator_notes}</Text>
                    </View>
                  )}

                  {selectedReport.previousReportsCount > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Previous Reports:</Text>
                      <Text style={styles.detailValue}>
                        {selectedReport.previousReportsCount} previous reports against this user
                      </Text>
                    </View>
                  )}

                  {selectedReport.report.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.resolveButton]}
                        onPress={() => {
                          setActionType('suspend');
                          setShowActionModal(true);
                        }}
                      >
                        <Ionicons name="ban" size={20} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Resolve & Suspend</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalButton, styles.dismissButton]}
                        onPress={() => {
                          setActionType('dismiss');
                          setShowActionModal(true);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'dismiss' ? 'Dismiss Report' : 'Resolve Report'}
            </Text>
            <Text style={styles.modalSubtitle}>Please provide a reason:</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason..."
              value={actionReason}
              onChangeText={setActionReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowActionModal(false);
                  setActionReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, actionType === 'dismiss' ? styles.dismissButton : styles.resolveButton]}
                onPress={actionType === 'dismiss' ? handleDismissReport : handleResolveReport}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 8,
    marginTop: 8,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#7C2B86',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  reportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: 11,
    color: '#999',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  reportReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
    color: '#1F1147',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 16,
  },
  userDetailSection: {
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#666',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F1147',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  resolveButton: {
    backgroundColor: '#FF9800',
  },
  dismissButton: {
    backgroundColor: '#757575',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  actionModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
