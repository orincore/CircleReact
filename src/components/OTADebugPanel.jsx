/**
 * OTA Debug Panel Component
 * Comprehensive debugging interface for OTA updates (development only)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { otaUpdateService } from '@/src/services/otaUpdateService';

const OTADebugPanel = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    if (visible) {
      loadDiagnosticInfo();
    }
  }, [visible]);

  const loadDiagnosticInfo = async () => {
    try {
      setLoading(true);
      const info = await otaUpdateService.getDiagnosticInfo();
      setDiagnosticInfo(info);
    } catch (error) {
      console.error('Error loading diagnostic info:', error);
      Alert.alert('Error', 'Failed to load diagnostic information');
    } finally {
      setLoading(false);
    }
  };

  const handleForceCheck = async () => {
    try {
      setLoading(true);
      await otaUpdateService.forceCheckForUpdates();
      await loadDiagnosticInfo();
      Alert.alert('Success', 'Update check completed');
    } catch (error) {
      Alert.alert('Error', `Update check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetState = async () => {
    Alert.alert(
      'Reset Update State',
      'This will clear all OTA update data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await otaUpdateService.resetUpdateState();
              await loadDiagnosticInfo();
              Alert.alert('Success', 'Update state reset');
            } catch (error) {
              Alert.alert('Error', `Reset failed: ${error.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTestNetworkConnectivity = async () => {
    try {
      setLoading(true);
      const networkInfo = await otaUpdateService.testNetworkConnectivity();
      
      Alert.alert(
        'Network Test',
        `Connected: ${networkInfo.connected}\n` +
        `Response Time: ${networkInfo.responseTime || 'N/A'}ms\n` +
        `Status: ${networkInfo.status || networkInfo.error}`
      );
    } catch (error) {
      Alert.alert('Error', `Network test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTab = () => (
    <View style={styles.tabContent}>
      {diagnosticInfo?.status && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Service Status
          </Text>
          <View style={styles.infoGrid}>
            <InfoRow 
              label="Initialized" 
              value={diagnosticInfo.status.isInitialized ? 'Yes' : 'No'}
              theme={theme}
            />
            <InfoRow 
              label="Enabled" 
              value={diagnosticInfo.status.isEnabled ? 'Yes' : 'No'}
              theme={theme}
            />
            <InfoRow 
              label="Checking" 
              value={diagnosticInfo.status.isChecking ? 'Yes' : 'No'}
              theme={theme}
            />
            <InfoRow 
              label="Update Available" 
              value={diagnosticInfo.status.isUpdateAvailable ? 'Yes' : 'No'}
              theme={theme}
            />
            <InfoRow 
              label="Runtime Version" 
              value={diagnosticInfo.status.runtimeVersion}
              theme={theme}
            />
            <InfoRow 
              label="Platform" 
              value={diagnosticInfo.status.platform}
              theme={theme}
            />
            <InfoRow 
              label="Retry Count" 
              value={diagnosticInfo.status.retryCount.toString()}
              theme={theme}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      {diagnosticInfo?.history && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Statistics
          </Text>
          <View style={styles.infoGrid}>
            <InfoRow 
              label="Total Checks" 
              value={diagnosticInfo.history.statistics.totalChecks?.toString() || '0'}
              theme={theme}
            />
            <InfoRow 
              label="Successful Updates" 
              value={diagnosticInfo.history.statistics.successfulUpdates?.toString() || '0'}
              theme={theme}
            />
            <InfoRow 
              label="Failed Updates" 
              value={diagnosticInfo.history.statistics.failedUpdates?.toString() || '0'}
              theme={theme}
            />
            <InfoRow 
              label="User Accepts" 
              value={diagnosticInfo.history.statistics.userAccepts?.toString() || '0'}
              theme={theme}
            />
            <InfoRow 
              label="User Declines" 
              value={diagnosticInfo.history.statistics.userDeclines?.toString() || '0'}
              theme={theme}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 20 }]}>
            Recent Activity
          </Text>
          {diagnosticInfo.history.logs?.slice(0, 5).map((log, index) => (
            <View key={index} style={[styles.logEntry, { borderColor: theme.colors.border }]}>
              <Text style={[styles.logActivity, { color: theme.colors.text }]}>
                {log.activity}
              </Text>
              <Text style={[styles.logTime, { color: theme.colors.textSecondary }]}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderDiagnosticsTab = () => (
    <View style={styles.tabContent}>
      {diagnosticInfo?.summary && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            System Health
          </Text>
          <View style={[
            styles.healthIndicator,
            { backgroundColor: diagnosticInfo.summary.healthy ? '#34C759' : '#FF3B30' }
          ]}>
            <Text style={styles.healthText}>
              {diagnosticInfo.summary.healthy ? 'Healthy' : 'Issues Detected'}
            </Text>
          </View>

          {diagnosticInfo.summary.issues?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 20 }]}>
                Issues
              </Text>
              {diagnosticInfo.summary.issues.map((issue, index) => (
                <Text key={index} style={[styles.issueText, { color: '#FF3B30' }]}>
                  • {issue}
                </Text>
              ))}
            </>
          )}

          {diagnosticInfo.summary.recommendations?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 20 }]}>
                Recommendations
              </Text>
              {diagnosticInfo.summary.recommendations.map((rec, index) => (
                <Text key={index} style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>
                  • {rec}
                </Text>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );

  const InfoRow = ({ label, value, theme }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
        {label}:
      </Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]}>
        {value || 'N/A'}
      </Text>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            OTA Debug Panel
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleForceCheck}
            disabled={loading}
          >
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={styles.actionButtonText}>Force Check</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
            onPress={handleTestNetworkConnectivity}
            disabled={loading}
          >
            <Ionicons name="wifi" size={16} color="white" />
            <Text style={styles.actionButtonText}>Test Network</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
            onPress={handleResetState}
            disabled={loading}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionButtonText}>Reset State</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
          {['status', 'history', 'diagnostics'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading diagnostic information...
              </Text>
            </View>
          ) : (
            <>
              {activeTab === 'status' && renderStatusTab()}
              {activeTab === 'history' && renderHistoryTab()}
              {activeTab === 'diagnostics' && renderDiagnosticsTab()}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  logActivity: {
    fontSize: 14,
    flex: 1,
  },
  logTime: {
    fontSize: 12,
  },
  healthIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  healthText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  issueText: {
    fontSize: 14,
    marginVertical: 2,
  },
  recommendationText: {
    fontSize: 14,
    marginVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default OTADebugPanel;