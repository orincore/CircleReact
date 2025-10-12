import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import AdminAuthGuard from './AdminAuthGuard';

const AISettingsPanel = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    // AI Behavior Settings
    enableTypingIndicators: true,
    averageResponseTime: 2.5,
    enableMultiPartMessages: true,
    enableEmpatheticResponses: true,
    
    // Escalation Settings
    autoEscalationEnabled: true,
    criticalEscalationThreshold: 0.8,
    highEscalationThreshold: 0.6,
    maxResolutionAttempts: 3,
    
    // Multilingual Settings
    autoLanguageDetection: true,
    defaultLanguage: 'en',
    enableTranslation: true,
    
    // Satisfaction Settings
    enableSatisfactionSurveys: true,
    surveyTriggerThreshold: 3,
    followUpLowRatings: true,
    
    // Proactive Support Settings
    enableProactiveSupport: true,
    proactiveCheckInterval: 24,
    churnRiskThreshold: 0.7,
    
    // Analytics Settings
    enableRealTimeMetrics: true,
    dataRetentionDays: 90,
    enableDetailedLogging: true
  });

  const [agents, setAgents] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'https://api.circle.orincore.com';

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAgents(),
        loadSupportedLanguages()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/escalation/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadSupportedLanguages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-admin/supported-languages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setLanguages(Object.entries(data.languages).map(([code, info]) => ({
          code,
          name: info.name,
          native: info.native
        })));
      }
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const renderSettingSection = (title, children) => (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderToggleSetting = (label, key, description) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: '#E5E7EB', true: '#7C2B86' }}
        thumbColor={settings[key] ? '#FFFFFF' : '#9CA3AF'}
      />
    </View>
  );

  const renderNumberSetting = (label, key, min, max, step, unit) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{settings[key]} {unit}</Text>
      </View>
      <View style={styles.numberControls}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => updateSetting(key, Math.max(min, settings[key] - step))}
        >
          <Ionicons name="remove" size={16} color="#7C2B86" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => updateSetting(key, Math.min(max, settings[key] + step))}
        >
          <Ionicons name="add" size={16} color="#7C2B86" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPickerSetting = (label, key, options) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              settings[key] === option.value && styles.pickerOptionSelected
            ]}
            onPress={() => updateSetting(key, option.value)}
          >
            <Text style={[
              styles.pickerOptionText,
              settings[key] === option.value && styles.pickerOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <AdminAuthGuard>
      <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#7C2B86', '#5D5FEF']} style={styles.header}>
        <Text style={styles.headerTitle}>AI System Settings</Text>
        <TouchableOpacity onPress={saveSettings} style={styles.saveButton} disabled={loading}>
          <Ionicons name="save" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* AI Behavior Settings */}
        {renderSettingSection('AI Behavior', (
          <>
            {renderToggleSetting(
              'Typing Indicators',
              'enableTypingIndicators',
              'Show typing animation during AI responses'
            )}
            {renderNumberSetting(
              'Average Response Time',
              'averageResponseTime',
              0.5, 10, 0.5, 'seconds'
            )}
            {renderToggleSetting(
              'Multi-Part Messages',
              'enableMultiPartMessages',
              'Split long responses into multiple messages'
            )}
            {renderToggleSetting(
              'Empathetic Responses',
              'enableEmpatheticResponses',
              'Use emotional intelligence in responses'
            )}
          </>
        ))}

        {/* Escalation Settings */}
        {renderSettingSection('Escalation System', (
          <>
            {renderToggleSetting(
              'Auto Escalation',
              'autoEscalationEnabled',
              'Automatically escalate based on sentiment analysis'
            )}
            {renderNumberSetting(
              'Critical Escalation Threshold',
              'criticalEscalationThreshold',
              0.1, 1.0, 0.1, ''
            )}
            {renderNumberSetting(
              'High Escalation Threshold',
              'highEscalationThreshold',
              0.1, 1.0, 0.1, ''
            )}
            {renderNumberSetting(
              'Max Resolution Attempts',
              'maxResolutionAttempts',
              1, 10, 1, 'attempts'
            )}
          </>
        ))}

        {/* Multilingual Settings */}
        {renderSettingSection('Multilingual Support', (
          <>
            {renderToggleSetting(
              'Auto Language Detection',
              'autoLanguageDetection',
              'Automatically detect user language'
            )}
            {renderPickerSetting(
              'Default Language',
              'defaultLanguage',
              languages.slice(0, 5).map(lang => ({ value: lang.code, label: lang.name }))
            )}
            {renderToggleSetting(
              'Enable Translation',
              'enableTranslation',
              'Translate responses to user language'
            )}
          </>
        ))}

        {/* Satisfaction Settings */}
        {renderSettingSection('Satisfaction Tracking', (
          <>
            {renderToggleSetting(
              'Enable Satisfaction Surveys',
              'enableSatisfactionSurveys',
              'Show satisfaction surveys after conversations'
            )}
            {renderNumberSetting(
              'Survey Trigger Threshold',
              'surveyTriggerThreshold',
              1, 5, 1, 'rating or below'
            )}
            {renderToggleSetting(
              'Follow Up Low Ratings',
              'followUpLowRatings',
              'Automatically schedule follow-up for low ratings'
            )}
          </>
        ))}

        {/* Proactive Support Settings */}
        {renderSettingSection('Proactive Support', (
          <>
            {renderToggleSetting(
              'Enable Proactive Support',
              'enableProactiveSupport',
              'Proactively reach out to users with potential issues'
            )}
            {renderNumberSetting(
              'Check Interval',
              'proactiveCheckInterval',
              1, 168, 1, 'hours'
            )}
            {renderNumberSetting(
              'Churn Risk Threshold',
              'churnRiskThreshold',
              0.1, 1.0, 0.1, ''
            )}
          </>
        ))}

        {/* Analytics Settings */}
        {renderSettingSection('Analytics & Monitoring', (
          <>
            {renderToggleSetting(
              'Real-Time Metrics',
              'enableRealTimeMetrics',
              'Enable real-time dashboard metrics'
            )}
            {renderNumberSetting(
              'Data Retention',
              'dataRetentionDays',
              30, 365, 30, 'days'
            )}
            {renderToggleSetting(
              'Detailed Logging',
              'enableDetailedLogging',
              'Log detailed conversation analytics'
            )}
          </>
        ))}

        {/* Agent Management */}
        {renderSettingSection('Available Agents', (
          <View style={styles.agentsList}>
            {agents.map((agent, index) => (
              <View key={index} style={styles.agentItem}>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentDetails}>
                    {agent.specialties.join(', ')} • {agent.languages.join(', ')}
                  </Text>
                </View>
                <View style={[styles.agentStatus, {
                  backgroundColor: agent.availability === 'available' ? '#4CAF50' : '#FF9800'
                }]}>
                  <Text style={styles.agentStatusText}>{agent.availability}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* System Status */}
        {renderSettingSection('System Status', (
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statusLabel}>AI Service</Text>
              <Text style={styles.statusValue}>Online</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="analytics" size={24} color="#2196F3" />
              <Text style={styles.statusLabel}>Analytics</Text>
              <Text style={styles.statusValue}>Active</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="globe" size={24} color="#FF9800" />
              <Text style={styles.statusLabel}>Translation</Text>
              <Text style={styles.statusValue}>Ready</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="shield-checkmark" size={24} color="#9C27B0" />
              <Text style={styles.statusLabel}>Security</Text>
              <Text style={styles.statusValue}>Secure</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
    </AdminAuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  settingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingValue: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '600',
  },
  numberControls: {
    flexDirection: 'row',
    gap: 8,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    marginTop: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  pickerOptionSelected: {
    backgroundColor: '#7C2B86',
  },
  pickerOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
  agentsList: {
    gap: 12,
  },
  agentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  agentDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  agentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  agentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
});

export default AISettingsPanel;
