import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../src/hooks/useSocket';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

// The backend can send activity timestamps straight from Postgres's default
// timestamptz text form, e.g. "2026-07-09 12:39:28.289+00" -- a space instead
// of "T" and a bare 2-digit offset instead of "+00:00"/"Z". That's not valid
// ISO-8601: lenient engines (V8 in a browser) parse it fine, but React
// Native's Hermes engine doesn't and silently produces an Invalid Date,
// which turned into "NaNd ago" once fed through the diff math below.
// Normalize before parsing (same fix as ActiveSessionsSection.jsx).
function toParseableDate(value) {
  if (value instanceof Date) return value;
  if (!value) return new Date();
  const s = String(value).replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(s);
}

const LiveActivityFeed = ({ isVisible = true, maxItems = 5 }) => {
  const { theme, isDarkMode } = useTheme();
  const [activities, setActivities] = useState([]);
  const [displayedActivities, setDisplayedActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const pulseDot = useRef(new Animated.Value(0)).current;
  const socket = useSocket();

  const ITEMS_PER_PAGE = maxItems;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDot, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseDot, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseDot]);

  // Activity types and their configurations
  const activityConfig = {
    user_matched: {
      icon: 'heart',
      color: '#FF6B9D',
      format: (data) => `${data.user1_name} matched with ${data.user2_name}`,
    },
    user_joined: {
      icon: 'person-add',
      color: '#4ECDC4',
      format: (data) => `${data.user_name} just joined Circle`,
    },
    profile_visited: {
      icon: 'eye',
      color: '#45B7D1',
      format: (data) => `${data.visitor_name} visited ${data.profile_name}'s profile`,
    },
    friend_request_sent: {
      icon: 'person-add-outline',
      color: '#96CEB4',
      format: (data) => `${data.sender_name} sent a friend request to ${data.receiver_name}`,
    },
    friends_connected: {
      icon: 'people',
      color: '#FFEAA7',
      format: (data) => `${data.user1_name} and ${data.user2_name} are now friends`,
    },
    location_updated: {
      icon: 'location',
      color: '#DDA0DD',
      format: (data) => `${data.user_name} is now in ${data.location}`,
    },
    chat_started: {
      icon: 'chatbubbles',
      color: '#FFB6C1',
      format: (data) => `${data.user1_name} started chatting with ${data.user2_name}`,
    },
    interest_updated: {
      icon: 'star',
      color: '#F7DC6F',
      format: (data) => `${data.user_name} updated their interests`,
    },
  };

  // Update displayed activities based on current page
  const updateDisplayedActivities = (allActivities, page) => {
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageActivities = allActivities.slice(startIndex, endIndex);
    setDisplayedActivities(pageActivities);
  };

  // Add new activity with animation
  const addActivity = (activity) => {
    if (activity.type === 'profile_visited') {
      return;
    }

    const newActivity = {
      id: Date.now() + Math.random(),
      ...activity,
      timestamp: new Date(),
      isNew: true, // Mark as new for highlighting
    };

    setActivities(prev => {
      // Check for duplicates to prevent the same activity from being added multiple times
      const isDuplicate = prev.some(existing => 
        existing.type === activity.type && 
        JSON.stringify(existing.data) === JSON.stringify(activity.data) &&
        Math.abs(new Date(existing.timestamp) - new Date()) < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) return prev;

      const updated = [newActivity, ...prev];
      const limitedUpdated = updated.slice(0, maxItems); // Keep only latest items
      
      // If we're on the first page and there's a new activity, stay on first page
      if (currentPage === 0) {
        updateDisplayedActivities(limitedUpdated, 0);
      }
      
      return limitedUpdated;
    });

    // Remove "new" flag after animation
    setTimeout(() => {
      setActivities(prev => {
        const updated = prev.map(item => 
          item.id === newActivity.id ? { ...item, isNew: false } : item
        );
        // Update displayed activities if we're on the current page
        updateDisplayedActivities(updated, currentPage);
        return updated;
      });
    }, 3000);
  };

  // Pagination handlers
  const goToNextPage = () => {
    const nextPage = currentPage + 1;
    const maxPage = Math.max(0, Math.ceil(activities.length / ITEMS_PER_PAGE) - 1);
    if (nextPage <= maxPage) {
      setCurrentPage(nextPage);
      updateDisplayedActivities(activities, nextPage);
    }
  };

  const goToPreviousPage = () => {
    const prevPage = Math.max(0, currentPage - 1);
    setCurrentPage(prevPage);
    updateDisplayedActivities(activities, prevPage);
  };

  const goToFirstPage = () => {
    setCurrentPage(0);
    updateDisplayedActivities(activities, 0);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleActivity = (activityData) => {
      addActivity(activityData);
    };

    // Listen to all activity events (global activities visible to all users)
    const activityEvents = [
      'activity:user_matched',
      'activity:user_joined',
      'activity:friend_request_sent',
      'activity:friends_connected',
      'activity:location_updated',
      'activity:chat_started',
      'activity:interest_updated',
    ];

    activityEvents.forEach(event => {
      socket.on(event, handleActivity);
    });

    // Request initial activities when socket connects
    const requestActivities = () => {
      if (socket && socket.connected) {
        socket.emit('activity:get_recent', { limit: maxItems });
      }
    };

    // Request immediately if connected
    requestActivities();

    // Also request on reconnection
    socket.on('connect', requestActivities);

    return () => {
      activityEvents.forEach(event => {
        socket.off(event, handleActivity);
      });
      socket.off('connect', requestActivities);
    };
  }, [socket, maxItems]);

  // Handle initial activities load
  useEffect(() => {
    if (!socket) return;

    const handleInitialActivities = (data) => {
      if (data.activities && Array.isArray(data.activities)) {
        const processedActivities = data.activities
          .filter(activity => activity.type !== 'profile_visited')
          .map(activity => ({
            ...activity,
            id: activity.id || Date.now() + Math.random(),
            timestamp: toParseableDate(activity.timestamp),
            isNew: false, // Initial activities are not new
          }));
        
        setActivities(processedActivities);
        setCurrentPage(0); // Reset to first page
        updateDisplayedActivities(processedActivities, 0);
      }
    };

    socket.on('activity:recent_list', handleInitialActivities);

    return () => {
      socket.off('activity:recent_list', handleInitialActivities);
    };
  }, [socket]);

  // Retry fetching activities if none loaded after a delay
  useEffect(() => {
    if (!socket || activities.length > 0) return;

    const retryTimer = setTimeout(() => {
      if (socket && socket.connected && activities.length === 0) {
        socket.emit('activity:get_recent', { limit: maxItems });
      }
    }, 3000); // Retry after 3 seconds if no activities

    return () => clearTimeout(retryTimer);
  }, [socket, activities.length, maxItems]);

  // Update displayed activities when activities or currentPage changes
  useEffect(() => {
    updateDisplayedActivities(activities, currentPage);
  }, [activities, currentPage]);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const then = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(then.getTime())) return 'just now';

    const now = new Date();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Get avatar URL from activity data
  const getAvatarUrl = (activity) => {
    const { data } = activity;
    // Try to get avatar from different possible fields
    return data.user1_avatar || data.user2_avatar || data.visitor_avatar || 
           data.sender_avatar || data.user_avatar || data.profile_avatar || null;
  };

  // Render activity item
  const renderActivity = (activity, index) => {
    const config = activityConfig[activity.type] || {
      icon: 'notifications',
      color: '#8B5CF6',
      format: () => 'Something happened',
    };

    const avatarUrl = getAvatarUrl(activity);
    const isLast = index === displayedActivities.length - 1;

    return (
      <View
        key={activity.id}
        style={[
          styles.activityItem,
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          },
        ]}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={[styles.activityAvatar, { borderColor: config.color + '55' }]} />
        ) : (
          <View style={[styles.activityIcon, { backgroundColor: config.color + '22' }]}>
            <Ionicons name={config.icon} size={13} color={config.color} />
          </View>
        )}
        <Text style={[styles.activityText, { color: isDarkMode ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)' }]} numberOfLines={1}>
          {config.format(activity.data)}
        </Text>
        <Text style={[styles.activityTime, { color: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)' }]}>
          {formatTimeAgo(activity.timestamp)}
        </Text>
      </View>
    );
  };

  if (!isVisible || activities.length === 0) return null;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDarkMode ? '#0C0C16' : '#F5F3FF',
        borderColor: isDarkMode ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.1)',
      },
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.liveDot, {
          opacity: pulseDot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ scale: pulseDot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.2] }) }],
        }]} />
        <Text style={[styles.headerTitle, { color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }]}>
          LIVE PULSE
        </Text>
        <View style={styles.headerFlex} />
        <Text style={[styles.headerCount, { color: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)' }]}>
          {activities.length} events
        </Text>
      </View>

      {/* Activity rows */}
      {displayedActivities.map((activity, index) => renderActivity(activity, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  headerFlex: {
    flex: 1,
  },
  headerCount: {
    fontSize: 10,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
  },
  activityIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    flexShrink: 0,
    borderWidth: 1.5,
  },
  activityText: {
    fontSize: 12,
    lineHeight: 15,
    flex: 1,
  },
  activityTime: {
    fontSize: 10,
    flexShrink: 0,
  },
});

export default LiveActivityFeed;
