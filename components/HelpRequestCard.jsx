import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Card component to display a help request
 * Shows user info, prompt, and action buttons
 */
const HelpRequestCard = ({ request, onHelp, showHelpButton = true }) => {
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();

  const handleUserPress = () => {
    router.push({
      pathname: '/secure/profile-view',
      params: { userId: request.user.id }
    });
  };

  const handleHelpPress = () => {
    if (onHelp) {
      onHelp(request);
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
      {/* Header with user info */}
      <TouchableOpacity onPress={handleUserPress} style={styles.header}>
        <Image
          source={{ 
            uri: request.user.profilePhotoUrl || 'https://i.pravatar.cc/100?img=' + (request.user.id?.slice(-1) || '1')
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>
            {request.user.firstName} {request.user.lastName}
          </Text>
          <View style={styles.userMeta}>
            <Text style={[styles.userAge, { color: theme.textSecondary }]}>
              {request.user.age} years old
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
      </TouchableOpacity>

      {/* Help request prompt */}
      <View style={styles.promptContainer}>
        <Text style={[styles.prompt, { color: theme.textPrimary }]}>
          "{request.prompt}"
        </Text>
      </View>

      {/* Interests tags */}
      {displayInterests.length > 0 && (
        <View style={styles.interestsContainer}>
          {displayInterests.map((interest, index) => (
            <View key={index} style={[styles.interestTag, { 
              backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.primary + '15',
              borderColor: theme.primary + '30'
            }]}>
              <Text style={[styles.interestText, { 
                color: isDarkMode ? theme.textSecondary : theme.primary 
              }]}>
                {interest}
              </Text>
            </View>
          ))}
          {request.user.interests?.length > 3 && (
            <Text style={[styles.moreInterests, { color: theme.textTertiary }]}>
              +{request.user.interests.length - 3} more
            </Text>
          )}
        </View>
      )}

      {/* Action buttons */}
      {showHelpButton && request.status === 'searching' && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleHelpPress} style={styles.helpButton}>
            <LinearGradient
              colors={['#7C2B86', '#5D5FEF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.helpButtonGradient}
            >
              <Ionicons name="hand-left" size={16} color="#FFFFFF" />
              <Text style={styles.helpButtonText}>Offer Help</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleUserPress} style={[styles.viewButton, { 
            backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.surface,
            borderColor: theme.border
          }]}>
            <Ionicons name="person" size={16} color={theme.textSecondary} />
            <Text style={[styles.viewButtonText, { color: theme.textSecondary }]}>
              View Profile
            </Text>
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
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minWidth: 120,
  },
  viewButtonText: {
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
});

export default HelpRequestCard;
