import { API_BASE_URL } from '@/src/api/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'push_notification',
    subject: '',
    content: '',
    htmlContent: '',
    useHtmlTemplate: false,
    pushTitle: '',
    pushBody: '',
  });

  useEffect(() => {
    //console.log('🌐 API_BASE_URL:', API_BASE_URL);
    //console.log('📍 Campaigns endpoint:', `${API_BASE_URL}/api/admin/campaigns`);
    loadCampaigns();
  }, [page, statusFilter, typeFilter]);

  const loadCampaigns = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
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

      //console.log('📡 Fetching campaigns from:', `${API_BASE_URL}/api/admin/campaigns?${params}`);
      
      const response = await fetch(
        `${API_BASE_URL}/api/admin/campaigns?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      //console.log('📊 Campaigns response status:', response.status);

      if (response.status === 401 || response.status === 403) {
        //console.log('🔒 Auth failed, redirecting to login');
        router.replace('/admin/login');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Campaigns load failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      //console.log('✅ Campaigns loaded:', data);
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
      // Validate required fields
      const content = newCampaign.type === 'email' && newCampaign.useHtmlTemplate
        ? newCampaign.htmlContent
        : newCampaign.content;

      if (!newCampaign.name || !content) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (newCampaign.type === 'email' && !newCampaign.subject) {
        Alert.alert('Error', 'Email subject is required');
        return;
      }

      if (newCampaign.type === 'push_notification') {
        if (!newCampaign.pushTitle || !newCampaign.pushBody) {
          Alert.alert('Error', 'For push notifications, Message title and Message body are required');
          return;
        }
        if (newCampaign.pushTitle.trim() === newCampaign.pushBody.trim()) {
          Alert.alert('Error', 'Message title and Message body must be different for push notifications');
          return;
        }
      }

      const token = await AsyncStorage.getItem('authToken');
      
      // Prepare campaign data
      const campaignData = {
        name: newCampaign.name,
        type: newCampaign.type,
        subject: newCampaign.subject,
        content: content,
        // For push campaigns, send explicit push title/body fields
        ...(newCampaign.type === 'push_notification'
          ? {
              push_title: newCampaign.pushTitle,
              push_body: newCampaign.pushBody,
            }
          : {}),
      };
      
      const response = await fetch(`${API_BASE_URL}/api/admin/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewCampaign({
          name: '',
          type: 'push_notification',
          subject: '',
          content: '',
          htmlContent: '',
          useHtmlTemplate: false,
          pushTitle: '',
          pushBody: '',
        });
        loadCampaigns();
        Alert.alert('Success', 'Campaign created successfully');
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
    const confirmed = window.confirm(
      `Are you sure you want to send "${campaignName}"?\n\nThis action cannot be undone and will send the campaign to all users.`
    );
    
    if (!confirmed) {
      //console.log('❌ Send cancelled by user');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      //console.log('🚀 Sending campaign:', campaignId);
      //console.log('📍 API URL:', `${API_BASE_URL}/api/admin/campaigns/${campaignId}/send`);
      
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

      //console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        //console.log('✅ Campaign sent successfully:', data);
        window.alert(`Success!\n\n${data.message || 'Campaign sent successfully'}`);
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
        
        window.alert(`Error!\n\n${errorMessage}\n\nStatus: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error sending campaign:', error);
      window.alert(`Error!\n\nFailed to send campaign: ${error.message}`);
    }
  };

  const handleDeleteCampaign = async (campaignId, campaignName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${campaignName}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      //console.log('❌ Delete cancelled by user');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      //console.log('🗑️ Deleting campaign:', campaignId);
      
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
        //console.log('✅ Campaign deleted successfully');
        window.alert('Success!\n\nCampaign deleted successfully');
        loadCampaigns();
      } else {
        const error = await response.json();
        console.error('❌ Delete failed:', error);
        window.alert(`Error!\n\n${error.error || 'Failed to delete campaign'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting campaign:', error);
      window.alert(`Error!\n\nFailed to delete campaign: ${error.message}`);
    }
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

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

              <View style={styles.campaignActions}>
                {campaign.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={() => {
                      //console.log('🔘 Send button clicked for campaign:', campaign.id, campaign.name);
                      handleSendCampaign(campaign.id, campaign.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Send</Text>
                  </TouchableOpacity>
                )}
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      //console.log('🗑️ Delete button clicked for campaign:', campaign.id, campaign.name);
                      handleDeleteCampaign(campaign.id, campaign.name);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                {campaign.status === 'sent' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => {
                      setSelectedCampaign(campaign);
                      setShowAnalyticsModal(true);
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
                <React.Fragment>
                  <Text style={styles.inputLabel}>Subject *</Text>
                  <TextInput
                    style={styles.input}
                    value={newCampaign.subject}
                    onChangeText={(text) =>
                      setNewCampaign({ ...newCampaign, subject: text })
                    }
                    placeholder="Email subject line"
                  />

                  <View style={styles.htmlToggleContainer}>
                    <TouchableOpacity
                      style={styles.htmlToggle}
                      onPress={() =>
                        setNewCampaign({
                          ...newCampaign,
                          useHtmlTemplate: !newCampaign.useHtmlTemplate,
                        })
                      }
                    >
                      <Ionicons
                        name={newCampaign.useHtmlTemplate ? 'checkbox' : 'square-outline'}
                        size={24}
                        color="#7C2B86"
                      />
                      <Text style={styles.htmlToggleText}>Use HTML Template</Text>
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              )}

              <Text style={styles.inputLabel}>
                {newCampaign.type === 'email' && newCampaign.useHtmlTemplate
                  ? 'HTML Content *'
                  : 'Content *'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={
                  newCampaign.type === 'email' && newCampaign.useHtmlTemplate
                    ? newCampaign.htmlContent
                    : newCampaign.content
                }
                onChangeText={(text) =>
                  newCampaign.type === 'email' && newCampaign.useHtmlTemplate
                    ? setNewCampaign({ ...newCampaign, htmlContent: text })
                    : setNewCampaign({ ...newCampaign, content: text })
                }
                placeholder={
                  newCampaign.type === 'email' && newCampaign.useHtmlTemplate
                    ? 'Enter HTML code here...\n\nExample:\n<h1>Welcome!</h1>\n<p>Your message here</p>\n<a href="#">Click here</a>'
                    : 'Campaign message...'
                }
                multiline
                numberOfLines={newCampaign.useHtmlTemplate ? 10 : 4}
              />

              {newCampaign.type === 'push_notification' && (
                <>
                  <Text style={styles.inputLabel}>Message title *</Text>
                  <TextInput
                    style={styles.input}
                    value={newCampaign.pushTitle}
                    onChangeText={(text) =>
                      setNewCampaign({ ...newCampaign, pushTitle: text })
                    }
                    placeholder="Short title shown in notification, e.g., Weekend offer"
                  />

                  <Text style={styles.inputLabel}>Message body *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newCampaign.pushBody}
                    onChangeText={(text) =>
                      setNewCampaign({ ...newCampaign, pushBody: text })
                    }
                    placeholder="Detailed message shown in notification body"
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {newCampaign.type === 'email' && newCampaign.useHtmlTemplate && (
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => setShowHtmlEditor(true)}
                >
                  <Ionicons name="eye" size={20} color="#7C2B86" />
                  <Text style={styles.previewButtonText}>Preview HTML</Text>
                </TouchableOpacity>
              )}

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

      {/* HTML Preview Modal */}
      <Modal
        visible={showHtmlEditor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHtmlEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>HTML Preview</Text>
              <TouchableOpacity onPress={() => setShowHtmlEditor(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Rendered Preview:</Text>
                <View style={styles.htmlPreview}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      srcDoc={newCampaign.htmlContent}
                      style={{
                        width: '100%',
                        minHeight: 400,
                        border: '1px solid #E0E0E0',
                        borderRadius: 8,
                      }}
                      title="Email Preview"
                    />
                  ) : (
                    <Text style={styles.previewNote}>
                      HTML preview is only available on web. Your HTML will be rendered
                      correctly in emails.
                    </Text>
                  )}
                </View>

                <Text style={styles.previewLabel}>HTML Code:</Text>
                <View style={styles.codePreview}>
                  <Text style={styles.codeText}>{newCampaign.htmlContent}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        visible={showAnalyticsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnalyticsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Campaign Analytics</Text>
              <TouchableOpacity onPress={() => setShowAnalyticsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedCampaign && (
                <View>
                  {/* Campaign Info */}
                  <View style={styles.analyticsHeader}>
                    <Text style={styles.analyticsTitle}>{selectedCampaign.name}</Text>
                    <View style={styles.analyticsBadge}>
                      <Text style={styles.analyticsBadgeText}>
                        {selectedCampaign.type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Key Metrics */}
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <View style={[styles.metricIcon, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="send" size={24} color="#2196F3" />
                      </View>
                      <Text style={styles.metricValue}>
                        {selectedCampaign.campaign_analytics?.[0]?.total_sent || 0}
                      </Text>
                      <Text style={styles.metricLabel}>Total Sent</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={[styles.metricIcon, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
                      </View>
                      <Text style={styles.metricValue}>
                        {selectedCampaign.campaign_analytics?.[0]?.delivered || 0}
                      </Text>
                      <Text style={styles.metricLabel}>Delivered</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={[styles.metricIcon, { backgroundColor: '#FFF3E0' }]}>
                        <Ionicons name="eye" size={24} color="#FF9800" />
                      </View>
                      <Text style={styles.metricValue}>
                        {selectedCampaign.campaign_analytics?.[0]?.opened || 0}
                      </Text>
                      <Text style={styles.metricLabel}>Opened</Text>
                    </View>

                    <View style={styles.metricCard}>
                      <View style={[styles.metricIcon, { backgroundColor: '#F3E5F5' }]}>
                        <Ionicons name="hand-left" size={24} color="#9C27B0" />
                      </View>
                      <Text style={styles.metricValue}>
                        {selectedCampaign.campaign_analytics?.[0]?.clicked || 0}
                      </Text>
                      <Text style={styles.metricLabel}>Clicked</Text>
                    </View>
                  </View>

                  {/* Engagement Rates */}
                  <View style={styles.ratesSection}>
                    <Text style={styles.sectionTitle}>Engagement Rates</Text>
                    
                    <View style={styles.rateItem}>
                      <View style={styles.rateInfo}>
                        <Text style={styles.rateName}>Delivery Rate</Text>
                        <Text style={styles.rateValue}>
                          {selectedCampaign.campaign_analytics?.[0]?.total_sent > 0
                            ? Math.round(
                                ((selectedCampaign.campaign_analytics[0].delivered || 0) /
                                  selectedCampaign.campaign_analytics[0].total_sent) *
                                  100
                              )
                            : 0}
                          %
                        </Text>
                      </View>
                      <View style={styles.rateBar}>
                        <View
                          style={[
                            styles.rateBarFill,
                            {
                              width: `${
                                selectedCampaign.campaign_analytics?.[0]?.total_sent > 0
                                  ? Math.round(
                                      ((selectedCampaign.campaign_analytics[0].delivered || 0) /
                                        selectedCampaign.campaign_analytics[0].total_sent) *
                                        100
                                    )
                                  : 0
                              }%`,
                              backgroundColor: '#4CAF50',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.rateItem}>
                      <View style={styles.rateInfo}>
                        <Text style={styles.rateName}>Open Rate</Text>
                        <Text style={styles.rateValue}>
                          {selectedCampaign.campaign_analytics?.[0]?.delivered > 0
                            ? Math.round(
                                ((selectedCampaign.campaign_analytics[0].opened || 0) /
                                  selectedCampaign.campaign_analytics[0].delivered) *
                                  100
                              )
                            : 0}
                          %
                        </Text>
                      </View>
                      <View style={styles.rateBar}>
                        <View
                          style={[
                            styles.rateBarFill,
                            {
                              width: `${
                                selectedCampaign.campaign_analytics?.[0]?.delivered > 0
                                  ? Math.round(
                                      ((selectedCampaign.campaign_analytics[0].opened || 0) /
                                        selectedCampaign.campaign_analytics[0].delivered) *
                                        100
                                    )
                                  : 0
                              }%`,
                              backgroundColor: '#FF9800',
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.rateItem}>
                      <View style={styles.rateInfo}>
                        <Text style={styles.rateName}>Click Rate</Text>
                        <Text style={styles.rateValue}>
                          {selectedCampaign.campaign_analytics?.[0]?.opened > 0
                            ? Math.round(
                                ((selectedCampaign.campaign_analytics[0].clicked || 0) /
                                  selectedCampaign.campaign_analytics[0].opened) *
                                  100
                              )
                            : 0}
                          %
                        </Text>
                      </View>
                      <View style={styles.rateBar}>
                        <View
                          style={[
                            styles.rateBarFill,
                            {
                              width: `${
                                selectedCampaign.campaign_analytics?.[0]?.opened > 0
                                  ? Math.round(
                                      ((selectedCampaign.campaign_analytics[0].clicked || 0) /
                                        selectedCampaign.campaign_analytics[0].opened) *
                                        100
                                    )
                                  : 0
                              }%`,
                              backgroundColor: '#9C27B0',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Campaign Details */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Campaign Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.detailValue, { color: getStatusColor(selectedCampaign.status) }]}>
                        {selectedCampaign.status}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sent At:</Text>
                      <Text style={styles.detailValue}>
                        {selectedCampaign.sent_at
                          ? new Date(selectedCampaign.sent_at).toLocaleString()
                          : 'Not sent yet'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedCampaign.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
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
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40,
    minWidth: 80,
    justifyContent: 'center',
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
  htmlToggleContainer: {
    marginBottom: 16,
  },
  htmlToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  htmlToggleText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C2B86',
    marginBottom: 16,
  },
  previewButtonText: {
    fontSize: 16,
    color: '#7C2B86',
    fontWeight: '600',
    marginLeft: 8,
  },
  previewContainer: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  htmlPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    minHeight: 200,
  },
  previewNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  codePreview: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#333',
  },
  analyticsHeader: {
    marginBottom: 24,
  },
  analyticsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 8,
  },
  analyticsBadge: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  analyticsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
    textTransform: 'capitalize',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  ratesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  rateItem: {
    marginBottom: 16,
  },
  rateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rateName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2B86',
  },
  rateBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailsSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
