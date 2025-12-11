import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { blindDatingApi } from '@/src/api/blindDating';
import Slider from '@react-native-community/slider';

const BlindDatingSettings = ({ onClose, onEnabledChange }) => {
  const { theme, isDarkMode } = useTheme();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    loadData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes] = await Promise.all([
        blindDatingApi.getSettings(token),
        blindDatingApi.getStats(token),
      ]);
      
      setSettings(settingsRes.settings);
      setStats(statsRes.stats);
    } catch (error) {
      console.error('Error loading blind dating settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleEnabled = async () => {
    try {
      setSaving(true);
      
      if (settings?.is_enabled) {
        const res = await blindDatingApi.disable(token);
        setSettings(res.settings);
        onEnabledChange?.(false);
      } else {
        const res = await blindDatingApi.enable(token);
        setSettings(res.settings);
        onEnabledChange?.(true);
        
        // Show success message
        Alert.alert(
          '🎭 Blind Dating Enabled!',
          'We\'ll start finding anonymous matches for you. You\'ll receive a new match every morning!',
          [{ text: 'Awesome!' }]
        );
      }
    } catch (error) {
      console.error('Error toggling blind dating:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdateSetting = async (key, value) => {
    try {
      setSaving(true);
      const res = await blindDatingApi.updateSettings({ [key]: value }, token);
      setSettings(res.settings);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };
  
  const handleFindMatch = async () => {
    try {
      setSaving(true);
      const res = await blindDatingApi.findMatch(token);
      
      if (res.success && res.match) {
        Alert.alert(
          '🎉 Match Found!',
          'You have a new anonymous match! Go to your matches to start chatting.',
          [{ text: 'View Match', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'No Match Yet',
          res.message || 'No compatible matches found right now. Try again later!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error finding match:', error);
      Alert.alert('Error', 'Failed to find match');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading settings...
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.background,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[theme.primary, theme.decorative1]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="heart-half" size={48} color="white" />
            <Text style={styles.headerTitle}>Blind Connect</Text>
            <Text style={styles.headerSubtitle}>
              Meet someone special anonymously
            </Text>
          </LinearGradient>
        </View>
        
        {/* Main Toggle */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: theme.textPrimary }]}>
                Enable Blind Connect
              </Text>
              <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
                {settings?.is_enabled 
                  ? 'You\'ll receive anonymous matches daily' 
                  : 'Turn on to start receiving anonymous matches'}
              </Text>
            </View>
            <Switch
              value={settings?.is_enabled || false}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings?.is_enabled ? theme.primary : '#f4f3f4'}
              disabled={saving}
            />
          </View>
        </View>
        
        {/* How it Works */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            How It Works
          </Text>
          
          <View style={styles.stepList}>
            <Step 
              icon="search" 
              title="Match" 
              description="We find compatible users with blind dating enabled"
              theme={theme}
            />
            <Step 
              icon="chatbubbles" 
              title="Chat Anonymously" 
              description="All personal info is hidden until you both reveal"
              theme={theme}
            />
            <Step 
              icon="shield-checkmark" 
              title="AI Protection" 
              description="Our AI blocks messages with personal info"
              theme={theme}
            />
            <Step 
              icon="eye" 
              title="Reveal" 
              description={`After ${settings?.preferred_reveal_threshold || 30} messages, you can reveal identities`}
              theme={theme}
            />
          </View>
        </View>
        
        {/* Settings (only show if enabled) */}
        {settings?.is_enabled && (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Settings
              </Text>
              
              {/* Auto Match */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
                    Auto Match
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Automatically find matches each morning
                  </Text>
                </View>
                <Switch
                  value={settings?.auto_match || false}
                  onValueChange={(value) => handleUpdateSetting('auto_match', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '80' }}
                  thumbColor={settings?.auto_match ? theme.primary : '#f4f3f4'}
                  disabled={saving}
                />
              </View>
              
              {/* Notifications */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
                    Notifications
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                    Get notified about new matches
                  </Text>
                </View>
                <Switch
                  value={settings?.notifications_enabled || false}
                  onValueChange={(value) => handleUpdateSetting('notifications_enabled', value)}
                  trackColor={{ false: theme.border, true: theme.primary + '80' }}
                  thumbColor={settings?.notifications_enabled ? theme.primary : '#f4f3f4'}
                  disabled={saving}
                />
              </View>
              
              {/* Reveal Threshold */}
              <View style={styles.sliderSetting}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
                    Messages Before Reveal
                  </Text>
                  <Text style={[styles.sliderValue, { color: theme.primary }]}>
                    {settings?.preferred_reveal_threshold || 30}
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Number of messages needed before you can reveal identities
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={100}
                  step={5}
                  value={settings?.preferred_reveal_threshold || 30}
                  onSlidingComplete={(value) => handleUpdateSetting('preferred_reveal_threshold', value)}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                  disabled={saving}
                />
              </View>
              
              {/* Max Active Matches */}
              <View style={styles.sliderSetting}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>
                    Max Active Matches
                  </Text>
                  <Text style={[styles.sliderValue, { color: theme.primary }]}>
                    {settings?.max_active_matches || 3}
                  </Text>
                </View>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Maximum number of blind connects at once
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={settings?.max_active_matches || 3}
                  onSlidingComplete={(value) => handleUpdateSetting('max_active_matches', value)}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                  disabled={saving}
                />
              </View>
            </View>
            
            {/* Find Match Button */}
            <TouchableOpacity 
              style={[styles.findMatchButton, saving && styles.buttonDisabled]}
              onPress={handleFindMatch}
              disabled={saving}
            >
              <LinearGradient
                colors={[theme.primary, theme.decorative1]}
                style={styles.findMatchGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="search-heart" size={24} color="white" />
                    <Text style={styles.findMatchText}>Find a Match Now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
        
        {/* Stats */}
        {stats && (stats.totalMatches > 0) && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Your Stats
            </Text>
            
            <View style={styles.statsGrid}>
              <StatItem 
                label="Total Matches" 
                value={stats.totalMatches} 
                icon="heart"
                theme={theme}
              />
              <StatItem 
                label="Active" 
                value={stats.activeMatches} 
                icon="flame"
                theme={theme}
              />
              <StatItem 
                label="Revealed" 
                value={stats.revealedMatches} 
                icon="eye"
                theme={theme}
              />
              <StatItem 
                label="Success Rate" 
                value={`${stats.successRate}%`} 
                icon="trophy"
                theme={theme}
              />
            </View>
          </View>
        )}
        
        {/* Privacy Notice */}
        <View style={[styles.privacyCard, { backgroundColor: theme.surface + '80' }]}>
          <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
          <Text style={[styles.privacyText, { color: theme.textSecondary }]}>
            Your identity is completely hidden until both you and your match agree to reveal. 
            Our AI monitors messages to prevent sharing personal information too early.
          </Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
};

// Step component for How it Works
const Step = ({ icon, title, description, theme }) => (
  <View style={styles.step}>
    <View style={[styles.stepIcon, { backgroundColor: theme.primary + '20' }]}>
      <Ionicons name={icon} size={24} color={theme.primary} />
    </View>
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>{description}</Text>
    </View>
  </View>
);

// Stat item component
const StatItem = ({ label, value, icon, theme }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: theme.primary + '15' }]}>
      <Ionicons name={icon} size={20} color={theme.primary} />
    </View>
    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  sliderSetting: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  findMatchButton: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  findMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  findMatchText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});

export default BlindDatingSettings;

