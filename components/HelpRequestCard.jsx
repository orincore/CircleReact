import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { promptMatchingApi } from '@/src/api/promptMatching';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Card component to display a help request
 * Shows MASKED user info and Accept/Deny buttons for anonymous matching
 */
const HelpRequestCard = ({ request, onHelp, onAccept, onDeny, showHelpButton = true }) => {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);

  // Generate masked display name from request ID
  const getMaskedName = () => {
    const id = request?.id || request?.user?.id || 'unknown';
    return `User #${id.substring(0, 4).toUpperCase()}`;
  };

  const handleAccept = async () => {
    if (loading) return;
    setLoading(true);
    setAction('accept');
    try {
      if (onAccept) {
        await onAccept(request);
      } else {
        // Default: call API to accept and navigate to chat
        const response = await promptMatchingApi.respondToHelpRequest(request.id, true, token);
        if (response?.chatId) {
          router.replace({
            pathname: '/secure/chat-conversation',
            params: { id: response.chatId, isBlindDate: 'true' }
          });
        }
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDeny = async () => {
    if (loading) return;
    setLoading(true);
    setAction('deny');
    try {
      if (onDeny) {
        await onDeny(request);
      } else {
        // Default: call API to decline
        await promptMatchingApi.respondToHelpRequest(request.id, false, token);
      }
    } catch (error) {
      console.error('Error denying request:', error);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'searching':
        return { color: '#FF6B35', icon: 'search', text: 'Looking for help' };
      case 'matched':
        return { color: '#4CAF50', icon: 'checkmark-circle', text: 'Helper found' };
      case 'completed':
        return { color: '#2196F3', icon: 'checkmark-done', text: 'Completed' };
      case 'expired':
        return { color: '#9E9E9E', icon: 'time-outline', text: 'Expired' };
      default:
        return { color: theme.textSecondary, icon: 'help-circle', text: status };
    }
  };

  const statusInfo = getStatusInfo(request.status);

  // Extract first few interests to show
  const displayInterests = request.user.interests?.slice(0, 3) || [];

  return (
    <View style={[styles.card, { 
      backgroundColor: theme.surface,
      borderColor: isDarkMode ? 'transparent' : theme.border,
      shadowColor: theme.shadowColor,
    }]}>
      {/* Header with MASKED user info */}
      <View style={styles.header}>
        <View style={[styles.maskedAvatar, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="person" size={24} color={theme.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>
            {getMaskedName()}
          </Text>
          <View style={styles.userMeta}>
            <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
            <Text style={[styles.anonymousLabel, { color: theme.primary }]}>
              Anonymous Request
            </Text>
            <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>
              • {request.timeAgo}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>
      </View>

      {/* AI-generated summary (if available) */}
      {request.summary && (
        <View style={[styles.summaryContainer, { backgroundColor: theme.primary + '10' }]}>
          <Ionicons name="sparkles" size={14} color={theme.primary} />
          <Text style={[styles.summary, { color: theme.primary }]}>
            {request.summary}
          </Text>
        </View>
      )}

      {/* Help request prompt */}
      <View style={styles.promptContainer}>
        <Text style={[styles.prompt, { color: theme.textPrimary }]} numberOfLines={3}>
          "{request.prompt}"
        </Text>
      </View>

      {/* AI Match indicator */}
      {request.isTargetedMatch && (
        <View style={[styles.matchIndicator, { backgroundColor: '#4CAF50' + '15' }]}>
          <Ionicons name="sparkles" size={14} color="#4CAF50" />
          <Text style={[styles.matchText, { color: '#4CAF50' }]}>
            AI matched you as the perfect helper!
          </Text>
        </View>
      )}

      {/* Action buttons - Accept/Deny for anonymous matching */}
      {showHelpButton && request.status === 'searching' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            onPress={handleAccept} 
            style={[styles.acceptButton, { opacity: loading && action === 'accept' ? 0.7 : 1 }]}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              {loading && action === 'accept' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleDeny} 
            style={[styles.denyButton, { 
              backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.surface,
              borderColor: theme.border,
              opacity: loading && action === 'deny' ? 0.7 : 1
            }]}
            disabled={loading}
          >
            {loading && action === 'deny' ? (
              <ActivityIndicator color={theme.textSecondary} size="small" />
            ) : (
              <>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                <Text style={[styles.denyButtonText, { color: theme.textSecondary }]}>
                  Skip
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Attempts indicator */}
      {request.attemptsCount > 0 && (
        <View style={styles.attemptsContainer}>
          <Ionicons name="people" size={12} color={theme.textTertiary} />
          <Text style={[styles.attemptsText, { color: theme.textTertiary }]}>
            {request.attemptsCount} helper{request.attemptsCount !== 1 ? 's' : ''} contacted
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAge: {
    fontSize: 13,
  },
  timeAgo: {
    fontSize: 13,
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promptContainer: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  prompt: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreInterests: {
    fontSize: 12,
    alignSelf: 'center',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  helpButton: {
    flex: 1,
  },
  helpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  maskedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  matchText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  denyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 4,
  },
  attemptsText: {
    fontSize: 12,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  summary: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

export default HelpRequestCard;
