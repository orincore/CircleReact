import { API_BASE_URL } from '@/src/api/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // App Configuration
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [matchmakingEnabled, setMatchmakingEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  
  // Limits
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState('1000');
  const [maxFriendsPerUser, setMaxFriendsPerUser] = useState('500');
  
  // Security
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  
  // Content Moderation
  const [autoModeration, setAutoModeration] = useState(true);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [imageModeration, setImageModeration] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      //console.log('📥 Loading admin settings...');
      const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        //console.log('✅ Settings loaded:', data);
        
        // Apply loaded settings
        setMaintenanceMode(data.maintenance_mode ?? false);
        setRegistrationEnabled(data.registration_enabled ?? true);
        setMatchmakingEnabled(data.matchmaking_enabled ?? true);
        setChatEnabled(data.chat_enabled ?? true);
        setMaxFileSize(String(data.max_file_size ?? 10));
        setMaxMessagesPerDay(String(data.max_messages_per_day ?? 1000));
        setMaxFriendsPerUser(String(data.max_friends_per_user ?? 500));
        setSessionTimeout(String(data.session_timeout ?? 30));
        setMaxLoginAttempts(String(data.max_login_attempts ?? 5));
        setRequireEmailVerification(data.require_email_verification ?? true);
        setAutoModeration(data.auto_moderation ?? true);
        setProfanityFilter(data.profanity_filter ?? true);
        setImageModeration(data.image_moderation ?? true);
      } else {
        console.error('Failed to load settings:', response.status);
        Alert.alert('Error', 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const settings = {
        maintenanceMode,
        registrationEnabled,
        matchmakingEnabled,
        chatEnabled,
        maxFileSize: parseInt(maxFileSize),
        maxMessagesPerDay: parseInt(maxMessagesPerDay),
        maxFriendsPerUser: parseInt(maxFriendsPerUser),
        sessionTimeout: parseInt(sessionTimeout),
        maxLoginAttempts: parseInt(maxLoginAttempts),
        requireEmailVerification,
        autoModeration,
        profanityFilter,
        imageModeration,
      };

      //console.log('💾 Saving settings:', settings);
      const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const result = await response.json();
        //console.log('✅ Settings saved:', result);
        Alert.alert('Success', result.message || 'Settings saved successfully');
      } else {
        const error = await response.json();
        console.error('❌ Save failed:', error);
        Alert.alert('Error', error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear System Cache',
      'This will clear all cached data including user sessions, matchmaking cache, and temporary files. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Cache', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/settings/clear-cache`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Success', result.message || 'System cache cleared successfully');
              } else {
                const error = await response.json();
                Alert.alert('Error', error.error || 'Failed to clear cache');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        },
      ]
    );
  };

  const handleResetStatistics = () => {
    Alert.alert(
      'Reset All Statistics',
      'This will permanently delete ALL analytics data, user activity events, and statistics. This action cannot be undone!\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Statistics', 
          style: 'destructive', 
          onPress: () => {
            // Double confirmation for this dangerous action
            Alert.alert(
              'Final Confirmation',
              'This will delete ALL analytics data permanently. Type "RESET" to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Reset',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const token = await AsyncStorage.getItem('authToken');
                      const response = await fetch(`${API_BASE_URL}/api/admin/settings/reset-statistics`, {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ confirmReset: true }),
                      });

                      if (response.ok) {
                        const result = await response.json();
                        Alert.alert('Success', result.message || 'Statistics reset successfully');
                      } else {
                        const error = await response.json();
                        Alert.alert('Error', error.error || 'Failed to reset statistics');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to reset statistics');
                    }
                  }
                }
              ]
            );
          }
        },
      ]
    );
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const SettingRow = ({ label, description, children }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>System Settings</Text>
          <Text style={styles.headerSubtitle}>Configure app behavior and limits</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Configuration */}
        <SettingSection title="App Configuration">
          <SettingRow
            label="Maintenance Mode"
            description="Disable app access for maintenance"
          >
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>

          <SettingRow
            label="User Registration"
            description="Allow new users to sign up"
          >
            <Switch
              value={registrationEnabled}
              onValueChange={setRegistrationEnabled}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>

          <SettingRow
            label="Matchmaking System"
            description="Enable automatic matchmaking"
          >
            <Switch
              value={matchmakingEnabled}
              onValueChange={setMatchmakingEnabled}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>

          <SettingRow
            label="Chat System"
            description="Enable messaging between users"
          >
            <Switch
              value={chatEnabled}
              onValueChange={setChatEnabled}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>
        </SettingSection>

        {/* Limits & Quotas */}
        <SettingSection title="Limits & Quotas">
          <SettingRow
            label="Max File Size (MB)"
            description="Maximum upload file size"
          >
            <TextInput
              style={styles.input}
              value={maxFileSize}
              onChangeText={setMaxFileSize}
              keyboardType="numeric"
              placeholder="10"
            />
          </SettingRow>

          <SettingRow
            label="Max Messages Per Day"
            description="Daily message limit per user"
          >
            <TextInput
              style={styles.input}
              value={maxMessagesPerDay}
              onChangeText={setMaxMessagesPerDay}
              keyboardType="numeric"
              placeholder="1000"
            />
          </SettingRow>

          <SettingRow
            label="Max Friends Per User"
            description="Maximum number of friends"
          >
            <TextInput
              style={styles.input}
              value={maxFriendsPerUser}
              onChangeText={setMaxFriendsPerUser}
              keyboardType="numeric"
              placeholder="500"
            />
          </SettingRow>
        </SettingSection>

        {/* Security Settings */}
        <SettingSection title="Security Settings">
          <SettingRow
            label="Session Timeout (minutes)"
            description="Auto-logout after inactivity"
          >
            <TextInput
              style={styles.input}
              value={sessionTimeout}
              onChangeText={setSessionTimeout}
              keyboardType="numeric"
              placeholder="30"
            />
          </SettingRow>

          <SettingRow
            label="Max Login Attempts"
            description="Before account lockout"
          >
            <TextInput
              style={styles.input}
              value={maxLoginAttempts}
              onChangeText={setMaxLoginAttempts}
              keyboardType="numeric"
              placeholder="5"
            />
          </SettingRow>

          <SettingRow
            label="Email Verification"
            description="Require email verification for new users"
          >
            <Switch
              value={requireEmailVerification}
              onValueChange={setRequireEmailVerification}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>
        </SettingSection>

        {/* Content Moderation */}
        <SettingSection title="Content Moderation">
          <SettingRow
            label="Auto Moderation"
            description="Automatically flag suspicious content"
          >
            <Switch
              value={autoModeration}
              onValueChange={setAutoModeration}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>

          <SettingRow
            label="Profanity Filter"
            description="Filter inappropriate language"
          >
            <Switch
              value={profanityFilter}
              onValueChange={setProfanityFilter}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>

          <SettingRow
            label="Image Moderation"
            description="AI-powered image content detection"
          >
            <Switch
              value={imageModeration}
              onValueChange={setImageModeration}
              trackColor={{ false: '#ccc', true: '#7C2B86' }}
              thumbColor="#FFFFFF"
            />
          </SettingRow>
        </SettingSection>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearCache}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={styles.dangerButtonText}>Clear System Cache</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetStatistics}
          >
            <Ionicons name="refresh" size={20} color="#F44336" />
            <Text style={styles.dangerButtonText}>Reset Statistics</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  input: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1F1147',
    textAlign: 'center',
  },
  dangerZone: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F44336',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
  },
});
