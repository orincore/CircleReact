import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const GiverRequestModal = ({ 
  visible, 
  onClose, 
  onAccept, 
  onDecline,
  requestData 
}) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);

  if (!requestData) return null;

  const {
    receiverUsername,
    receiverFirstName,
    receiverPhoto,
    prompt,
    summary,
    similarityScore,
    isTargetedMatch,
    requestId,
  } = requestData;

  // Generate masked name
  const getMaskedName = () => {
    const id = requestId || receiverUsername || 'unknown';
    return `User #${id.toString().substring(0, 4).toUpperCase()}`;
  };

  const handleAccept = async () => {
    setAction('accept');
    setLoading(true);
    try {
      await onAccept();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDecline = async () => {
    setAction('decline');
    setLoading(true);
    try {
      await onDecline();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const matchPercentage = Math.round((similarityScore || 0.85) * 100);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#0a0a0a' : '#f8f9fa' }]}>
        {/* Background Gradient */}
        <LinearGradient
          colors={isDarkMode 
            ? ['#1a1a2e', '#16213e', '#0f0f23'] 
            : ['#667eea', '#764ba2', '#f093fb']
          }
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Close Button */}
        <TouchableOpacity 
          onPress={onClose} 
          style={[styles.closeButton, { top: insets.top + 10 }]}
        >
          <View style={[styles.closeButtonInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="close" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={[styles.headerSection, { marginTop: insets.top + 60 }]}>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={16} color="#FFD700" />
              <Text style={styles.aiBadgeText}>AI Match</Text>
            </View>
            <Text style={styles.headerTitle}>Someone Needs Your Help!</Text>
            <Text style={styles.headerSubtitle}>
              You've been matched as the perfect helper
            </Text>
          </View>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)' }]}>
            {/* Blurred Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarContainer, { backgroundColor: isDarkMode ? '#2a2a3e' : '#e8e8f0' }]}>
                <Ionicons name="person" size={40} color={isDarkMode ? '#8888aa' : '#9999bb'} />
              </View>
              <BlurView intensity={Platform.OS === 'ios' ? 20 : 100} style={styles.avatarBlur}>
                <Ionicons name="eye-off" size={24} color="rgba(255,255,255,0.8)" />
              </BlurView>
              {/* Match Badge */}
              <View style={styles.matchBadgeContainer}>
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.matchBadge}
                >
                  <Text style={styles.matchBadgeText}>{matchPercentage}%</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Masked Name */}
            <Text style={[styles.maskedName, { color: isDarkMode ? '#fff' : '#1a1a2e' }]}>
              {getMaskedName()}
            </Text>
            <View style={styles.anonymousBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#4CAF50" />
              <Text style={styles.anonymousText}>Anonymous Request</Text>
            </View>
          </View>

          {/* Request Card */}
          <View style={[styles.requestCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)' }]}>
            <View style={styles.requestHeader}>
              <Ionicons name="chatbubble-ellipses" size={20} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
              <Text style={[styles.requestLabel, { color: isDarkMode ? '#a78bfa' : '#7c3aed' }]}>
                They need help with:
              </Text>
            </View>

            {/* AI Summary */}
            {summary && (
              <View style={[styles.summaryBox, { backgroundColor: isDarkMode ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)' }]}>
                <Ionicons name="sparkles" size={16} color={isDarkMode ? '#a78bfa' : '#7c3aed'} />
                <Text style={[styles.summaryText, { color: isDarkMode ? '#a78bfa' : '#7c3aed' }]}>
                  {summary}
                </Text>
              </View>
            )}

            {/* Full Prompt */}
            <Text style={[styles.promptText, { color: isDarkMode ? '#e0e0e0' : '#333' }]} numberOfLines={5}>
              "{prompt}"
            </Text>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)' }]}>
            <Ionicons name="lock-closed" size={18} color="#4CAF50" />
            <Text style={[styles.infoText, { color: isDarkMode ? '#a5d6a7' : '#2e7d32' }]}>
              Your identity stays hidden until you both agree to reveal
            </Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Buttons */}
        <View style={[styles.bottomContainer, { 
          paddingBottom: insets.bottom + 16,
          backgroundColor: isDarkMode ? 'rgba(10,10,10,0.95)' : 'rgba(248,249,250,0.95)'
        }]}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.skipButton, { 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                opacity: loading && action === 'decline' ? 0.7 : 1,
              }]}
              onPress={handleDecline}
              disabled={loading}
            >
              {loading && action === 'decline' ? (
                <ActivityIndicator color={isDarkMode ? '#fff' : '#333'} />
              ) : (
                <>
                  <Ionicons name="shuffle" size={20} color={isDarkMode ? '#fff' : '#333'} />
                  <Text style={[styles.skipButtonText, { color: isDarkMode ? '#fff' : '#333' }]}>
                    Skip
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptButton, { opacity: loading && action === 'accept' ? 0.7 : 1 }]}
              onPress={handleAccept}
              disabled={loading}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.acceptButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading && action === 'accept' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept & Help</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={[styles.skipHint, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
            Skipping will find another helper for them
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  aiBadgeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  matchBadgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  maskedName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  anonymousBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anonymousText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
  },
  requestCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requestLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  promptText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 0.6,
  },
  acceptButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default GiverRequestModal;
