import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionModal from './SubscriptionModal';

export const InstagramUsername = ({ 
  username, 
  style = {}, 
  showUpgradePrompt = true,
  size = 'medium' 
}) => {
  const { hasFeature } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const canSeeInstagram = hasFeature('instagram_usernames');

  const sizes = {
    small: {
      text: 12,
      icon: 14,
      padding: 6
    },
    medium: {
      text: 14,
      icon: 16,
      padding: 8
    },
    large: {
      text: 16,
      icon: 18,
      padding: 10
    }
  };

  const currentSize = sizes[size] || sizes.medium;

  if (!username) {
    return null;
  }

  if (canSeeInstagram) {
    // Premium user - show Instagram username
    return (
      <View style={[styles.container, style]}>
        <View style={styles.instagramContainer}>
          <Ionicons 
            name="logo-instagram" 
            size={currentSize.icon} 
            color="#E4405F" 
          />
          <Text style={[styles.username, { fontSize: currentSize.text }]}>
            @{username}
          </Text>
        </View>
      </View>
    );
  }

  if (!showUpgradePrompt) {
    // Don't show anything if upgrade prompt is disabled
    return null;
  }

  // Free user - show upgrade prompt
  return (
    <>
      <TouchableOpacity
        style={[styles.container, styles.lockedContainer, style]}
        onPress={() => setShowSubscriptionModal(true)}
      >
        <LinearGradient
          colors={['#7C2B86', '#A16AE8']}
          style={[styles.lockedGradient, { padding: currentSize.padding }]}
        >
          <View style={styles.lockedContent}>
            <Ionicons 
              name="logo-instagram" 
              size={currentSize.icon} 
              color="rgba(255, 255, 255, 0.7)" 
            />
            <Text style={[styles.lockedText, { fontSize: currentSize.text }]}>
              Instagram Hidden
            </Text>
            <Ionicons 
              name="diamond" 
              size={currentSize.icon} 
              color="#FFD700" 
            />
          </View>
          <Text style={[styles.upgradeText, { fontSize: currentSize.text - 2 }]}>
            Tap to upgrade
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        initialPlan="premium"
      />
    </>
  );
};

export const InstagramUsernameList = ({ 
  usernames = [], 
  style = {},
  maxVisible = 3 
}) => {
  const { hasFeature } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const canSeeInstagram = hasFeature('instagram_usernames');

  if (!usernames.length) {
    return null;
  }

  if (canSeeInstagram) {
    const visibleUsernames = usernames.slice(0, maxVisible);
    const remainingCount = Math.max(0, usernames.length - maxVisible);

    return (
      <View style={[styles.listContainer, style]}>
        <Text style={styles.listTitle}>Instagram Accounts:</Text>
        {visibleUsernames.map((username, index) => (
          <InstagramUsername
            key={index}
            username={username}
            size="small"
            showUpgradePrompt={false}
            style={styles.listItem}
          />
        ))}
        {remainingCount > 0 && (
          <Text style={styles.remainingText}>
            +{remainingCount} more
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.listContainer, styles.lockedListContainer, style]}
        onPress={() => setShowSubscriptionModal(true)}
      >
        <LinearGradient
          colors={['#7C2B86', '#A16AE8']}
          style={styles.lockedListGradient}
        >
          <View style={styles.lockedListHeader}>
            <Ionicons name="logo-instagram" size={18} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.lockedListTitle}>
              {usernames.length} Instagram Account{usernames.length !== 1 ? 's' : ''} Hidden
            </Text>
            <Ionicons name="diamond" size={16} color="#FFD700" />
          </View>
          <Text style={styles.lockedListSubtext}>
            Upgrade to Premium to see Instagram usernames
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        initialPlan="premium"
      />
    </>
  );
};

export const InstagramBadge = ({ hasInstagram = false, style = {} }) => {
  const { hasFeature } = useSubscription();
  const canSeeInstagram = hasFeature('instagram_usernames');

  if (!hasInstagram) {
    return null;
  }

  if (canSeeInstagram) {
    return (
      <View style={[styles.badge, styles.instagramBadge, style]}>
        <Ionicons name="logo-instagram" size={12} color="#E4405F" />
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.lockedBadge, style]}>
      <Ionicons name="lock-closed" size={10} color="#7C2B86" />
      <Ionicons name="logo-instagram" size={10} color="#7C2B86" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  instagramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(228, 64, 95, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  username: {
    color: '#E4405F',
    fontWeight: '600',
  },
  lockedContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  lockedGradient: {
    alignItems: 'center',
    borderRadius: 12,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  upgradeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  // List styles
  listContainer: {
    gap: 4,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listItem: {
    marginBottom: 2,
  },
  remainingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  lockedListContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  lockedListGradient: {
    padding: 12,
    alignItems: 'center',
  },
  lockedListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lockedListTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  lockedListSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  instagramBadge: {
    backgroundColor: 'rgba(228, 64, 95, 0.1)',
  },
  lockedBadge: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
  },
});

export default InstagramUsername;
