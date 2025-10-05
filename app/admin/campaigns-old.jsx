import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

export default function AdminCampaigns() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'push_notification',
    subject: '',
    content: '',
  });

  useEffect(() => {
    console.log('🌐 API_BASE_URL:', API_BASE_URL);
    console.log('📍 Campaigns endpoint:', `${API_BASE_URL}/api/admin/campaigns`);
    loadCampaigns();
  }, [page, statusFilter, typeFilter]);

  const loadCampaigns = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
        type: typeFilter,
      });

      console.log('📡 Fetching campaigns from:', `${API_BASE_URL}/api/admin/campaigns?${params}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/admin/campaigns?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('📊 Campaigns response status:', response.status);

      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Auth failed, redirecting to login');
        router.replace('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Campaigns load failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Campaigns loaded:', data);
      setCampaigns(data.campaigns || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      if (!newCampaign.name || !newCampaign.content) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCampaign),
      });

      if (response.ok) {
        Alert.alert('Success', 'Campaign created successfully');
        setShowCreateModal(false);
        setNewCampaign({ name: '', type: 'push_notification', subject: '', content: '' });
        loadCampaigns();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      Alert.alert('Error', 'Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId, campaignName) => {
    Alert.alert(
      'Send Campaign',
      `Are you sure you want to send "${campaignName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              console.log('🚀 Sending campaign:', campaignId);
              console.log('📍 API URL:', `${API_BASE_URL}/api/admin/campaigns/${campaignId}/send`);
              
              const response = await fetch(
                `${API_BASE_URL}/api/admin/campaigns/${campaignId}/send`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              console.log('📡 Response status:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('✅ Campaign sent successfully:', data);
                Alert.alert('Success', data.message || 'Campaign sent successfully');
                loadCampaigns();
              } else {
                const errorText = await response.text();
                console.error('❌ Send failed:', response.status, errorText);
                
                let errorMessage = 'Failed to send campaign';
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                  errorMessage = errorText || errorMessage;
                }
                
                Alert.alert('Error', `${errorMessage}\n\nStatus: ${response.status}`);
              }
            } catch (error) {
              console.error('❌ Error sending campaign:', error);
              Alert.alert('Error', `Failed to send campaign: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCampaign = async (campaignId, campaignName) => {
    Alert.alert(
      'Delete Campaign',
      `Are you sure you want to delete "${campaignName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(
                `${API_BASE_URL}/api/admin/campaigns/${campaignId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Campaign deleted successfully');
                loadCampaigns();
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to delete campaign');
              }
            } catch (error) {
              console.error('Error deleting campaign:', error);
              Alert.alert('Error', 'Failed to delete campaign');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return '#9E9E9E';
      case 'scheduled':
        return '#FF9800';
      case 'sending':
        return '#2196F3';
      case 'sent':
        return '#4CAF50';
      case 'paused':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'push_notification':
        return 'notifications';
      case 'email':
        return 'mail';
      case 'in_app':
        return 'phone-portrait';
      default:
        return 'megaphone';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading campaigns...</Text>
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
          <Text style={styles.headerTitle}>Marketing Campaigns</Text>
          <Text style={styles.headerSubtitle}>
            {pagination?.total || 0} total campaigns
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Status Filters */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {['draft', 'scheduled', 'sent'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Type Filters */}
          <View style={styles.filterDivider} />
          <TouchableOpacity
            style={[
              styles.filterChip,
              typeFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setTypeFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                typeFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All Types
            </Text>
          </TouchableOpacity>
          {['push_notification', 'email', 'in_app'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                typeFilter === type && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Ionicons
                name={getTypeIcon(type)}
                size={16}
                color={typeFilter === type ? '#7C2B86' : '#666'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === type && styles.filterChipTextActive,
                ]}
              >
                {type.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Campaigns List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadCampaigns();
            }} 
          />
        }
      >
        {campaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No campaigns found</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first campaign to engage users
            </Text>
          </View>
        ) : (
          campaigns.map((campaign) => (
            <View key={campaign.id} style={styles.campaignCard}>
              <View style={styles.campaignHeader}>
                <View style={styles.campaignTitleRow}>
                  <Ionicons
                    name={getTypeIcon(campaign.type)}
                    size={20}
                    color="#7C2B86"
                  />
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(campaign.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(campaign.status) },
                    ]}
                  >
                    {campaign.status}
                  </Text>
                </View>
              </View>

              {campaign.subject && (
                <Text style={styles.campaignSubject}>{campaign.subject}</Text>
              )}
              <Text style={styles.campaignContent} numberOfLines={2}>
                {campaign.content}
              </Text>

              {/* Analytics */}
              {campaign.campaign_analytics && campaign.campaign_analytics.length > 0 && (
                <View style={styles.analyticsRow}>
                  <View style={styles.analyticItem}>
                    <Ionicons name="send" size={16} color="#666" />
                    <Text style={styles.analyticText}>
                      {campaign.campaign_analytics[0].total_sent || 0} sent
                    </Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Ionicons name="eye" size={16} color="#666" />
                    <Text style={styles.analyticText}>
                      {campaign.campaign_analytics[0].opened || 0} opened
                    </Text>
                  </View>
                  <View style={styles.analyticItem}>
                    <Ionicons name="hand-left" size={16} color="#666" />
                    <Text style={styles.analyticText}>
                      {campaign.campaign_analytics[0].clicked || 0} clicked
                    </Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.campaignActions}>
                {campaign.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={() => handleSendCampaign(campaign.id, campaign.name)}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Send</Text>
                  </TouchableOpacity>
                )}
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteCampaign(campaign.id, campaign.name)}
                  >
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                {campaign.status === 'sent' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      // Navigate to analytics
                      Alert.alert('Analytics', 'Campaign analytics coming soon');
                    }}
                  >
                    <Ionicons name="stats-chart" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Analytics</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.campaignDate}>
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              onPress={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? '#CCC' : '#7C2B86'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>
              Page {page} of {pagination.totalPages}
            </Text>
            <TouchableOpacity
              style={[
                styles.pageButton,
                page === pagination.totalPages && styles.pageButtonDisabled,
              ]}
              onPress={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={page === pagination.totalPages ? '#CCC' : '#7C2B86'}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Campaign Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Campaign</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Campaign Name *</Text>
              <TextInput
                style={styles.input}
                value={newCampaign.name}
                onChangeText={(text) => setNewCampaign({ ...newCampaign, name: text })}
                placeholder="e.g., Weekend Special Promotion"
              />

              <Text style={styles.inputLabel}>Type *</Text>
              <View style={styles.typeSelector}>
                {['push_notification', 'email', 'in_app'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newCampaign.type === type && styles.typeOptionActive,
                    ]}
                    onPress={() => setNewCampaign({ ...newCampaign, type })}
                  >
                    <Ionicons
                      name={getTypeIcon(type)}
                      size={20}
                      color={newCampaign.type === type ? '#7C2B86' : '#666'}
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        newCampaign.type === type && styles.typeOptionTextActive,
                      ]}
                    >
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newCampaign.type === 'email' && (
                <>
                  <Text style={styles.inputLabel}>Subject *</Text>
                  <TextInput
                    style={styles.input}
                    value={newCampaign.subject}
                    onChangeText={(text) =>
                      setNewCampaign({ ...newCampaign, subject: text })
                    }
                    placeholder="Email subject line"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newCampaign.content}
                onChangeText={(text) => setNewCampaign({ ...newCampaign, content: text })}
                placeholder="Campaign message..."
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.createCampaignButton}
                onPress={handleCreateCampaign}
              >
                <Text style={styles.createCampaignButtonText}>Create Campaign</Text>
              </TouchableOpacity>
            </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#FFD6F2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  campaignCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  campaignTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  campaignSubject: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  campaignContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  analyticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticText: {
    fontSize: 12,
    color: '#666',
  },
  campaignActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  viewButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  campaignDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  typeOptionActive: {
    borderColor: '#7C2B86',
    backgroundColor: '#FFD6F2',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  typeOptionTextActive: {
    color: '#7C2B86',
    fontWeight: '600',
  },
  createCampaignButton: {
    backgroundColor: '#7C2B86',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  createCampaignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
