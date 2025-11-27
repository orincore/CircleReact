import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import { SvgUri } from 'react-native-svg';

/**
 * Chat header component for blind date conversations
 * Shows anonymized profile info and reveal progress
 */
const BlindDateChatHeader = ({
  otherUser,
  match,
  canReveal,
  messagesUntilReveal,
  hasRevealedSelf,
  otherHasRevealed,
  onRevealPress,
  onInfoPress,
  onBackPress,
}) => {
  const { theme, isDarkMode } = useTheme();
  
  // Animation for reveal notification
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Calculate progress
    if (match) {
      const progress = Math.min(match.message_count / match.reveal_threshold, 1);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [match?.message_count]);
  
  useEffect(() => {
    // Pulse animation when can reveal
    if (canReveal && !hasRevealedSelf) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [canReveal, hasRevealedSelf]);
  
  const isRevealed = match?.status === 'revealed';
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Anonymous/Revealed Badge */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {isRevealed && otherUser?.profile_photo_url ? (
              <Image 
                source={{ uri: otherUser.profile_photo_url }}
                style={styles.avatar}
              />
            ) : otherUser?.profile_photo_url ? (
              // Show blurry profile picture for anonymous mode
              <View style={styles.blurryAvatarContainer}>
                <Image 
                  source={{ uri: otherUser.profile_photo_url }}
                  style={[styles.avatar, styles.blurryAvatar]}
                  blurRadius={15}
                />
                <View style={styles.blurOverlay} />
              </View>
            ) : (
              <View style={[styles.anonymousAvatar, { backgroundColor: theme.primary + '20' }]}>
                {otherUser?.anonymous_avatar ? (
                  <SvgUri
                    width={48}
                    height={48}
                    uri={otherUser.anonymous_avatar}
                  />
                ) : (
                  <Ionicons name="person" size={28} color={theme.primary} />
                )}
              </View>
            )}
            
            {/* Anonymous/Revealed indicator */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: isRevealed ? theme.success : theme.primary }
            ]}>
              <Ionicons 
                name={isRevealed ? "eye" : "eye-off"} 
                size={12} 
                color="white" 
              />
            </View>
          </View>
          
          {/* Name & Status */}
          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>
              {isRevealed 
                ? `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim()
                : `${otherUser?.first_name || '***'} ${otherUser?.last_name || '***'}`.trim()}
            </Text>
            <View style={styles.statusRow}>
              {isRevealed ? (
                <View style={styles.statusContent}>
                  <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                  <Text style={[styles.statusText, { color: theme.success }]}>Identity Revealed</Text>
                </View>
              ) : (
                <>
                  <View style={styles.statusContent}>
                    <Ionicons name="shield" size={12} color={theme.textSecondary} />
                    <Text style={[styles.statusText, { color: theme.textSecondary }]}>Anonymous Chat</Text>
                  </View>
                  {/* Show gender, age, and preference */}
                  {(otherUser?.gender || otherUser?.age || (otherUser?.needs && otherUser.needs.length > 0)) && (
                    <View style={styles.infoRow}>
                      {otherUser?.gender && (
                        <View style={styles.infoChip}>
                          <Ionicons name="person" size={10} color={theme.textSecondary} />
                          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            {otherUser.gender === 'male' ? 'Male' : otherUser.gender === 'female' ? 'Female' : otherUser.gender}
                          </Text>
                        </View>
                      )}
                      {otherUser?.age && (
                        <View style={styles.infoChip}>
                          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            {otherUser.age} years
                          </Text>
                        </View>
                      )}
                      {otherUser?.needs && otherUser.needs.length > 0 && (
                        <View style={[styles.infoChip, { backgroundColor: theme.primary + '15' }]}>
                          <Ionicons name="heart" size={10} color={theme.primary} />
                          <Text style={[styles.infoText, { color: theme.primary }]}>
                            {otherUser.needs[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
        
        {/* Info Button */}
        <TouchableOpacity onPress={onInfoPress} style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {/* Reveal Progress Bar (only show if not revealed) */}
      {!isRevealed && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              {canReveal 
                ? '✨ Ready to reveal!' 
                : `${messagesUntilReveal} more messages to unlock reveal`}
            </Text>
            <Text style={[styles.progressCount, { color: theme.primary }]}>
              {match?.message_count || 0}/{match?.reveal_threshold || 30}
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <Animated.View 
              style={[
                styles.progressFill,
                { 
                  backgroundColor: canReveal ? theme.success : theme.primary,
                  width: progressWidth
                }
              ]}
            />
          </View>
          
          {/* Reveal Button */}
          {canReveal && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                onPress={onRevealPress}
                disabled={hasRevealedSelf}
                style={[
                  styles.revealButton,
                  hasRevealedSelf && styles.revealButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={hasRevealedSelf 
                    ? [theme.textSecondary, theme.textSecondary] 
                    : [theme.primary, theme.decorative1]}
                  style={styles.revealGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons 
                    name={hasRevealedSelf ? "checkmark" : "eye"} 
                    size={16} 
                    color="white" 
                  />
                  <Text style={styles.revealButtonText}>
                    {hasRevealedSelf 
                      ? (otherHasRevealed ? 'Both Revealed!' : 'Waiting for them...')
                      : (otherHasRevealed ? 'They revealed! Reveal yours' : 'Reveal Identity')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
          
          {/* Other user revealed notification */}
          {otherHasRevealed && !hasRevealedSelf && !canReveal && (
            <View style={[styles.notificationBanner, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="sparkles" size={16} color={theme.primary} />
              <Text style={[styles.notificationText, { color: theme.primary }]}>
                Your match is ready to reveal! Keep chatting to unlock.
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* AI Protection Notice */}
      {!isRevealed && (
        <View style={[styles.aiNotice, { backgroundColor: theme.background }]}>
          <Ionicons name="shield-checkmark" size={14} color={theme.textSecondary} />
          <Text style={[styles.aiNoticeText, { color: theme.textSecondary }]}>
            AI monitors messages to protect your identity
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  blurryAvatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
  },
  anonymousAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 10,
    fontWeight: '500',
  },
  infoButton: {
    padding: 8,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  revealButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  revealButtonDisabled: {
    opacity: 0.7,
  },
  revealGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  revealButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  notificationText: {
    flex: 1,
    fontSize: 12,
  },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  aiNoticeText: {
    fontSize: 11,
  },
});

export default BlindDateChatHeader;

