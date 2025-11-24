import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../src/hooks/useSocket';

const { width } = Dimensions.get('window');

const LiveActivityFeed = ({ isVisible = true, maxItems = 50 }) => {
  const [activities, setActivities] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true); // Keep opened by default
  const [displayedActivities, setDisplayedActivities] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const socket = useSocket();
  
  const ITEMS_PER_PAGE = 5; // Fixed 5 notifications per page

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

    // Request initial activities
    socket.emit('activity:get_recent', { limit: maxItems });

    return () => {
      activityEvents.forEach(event => {
        socket.off(event, handleActivity);
      });
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
            timestamp: new Date(activity.timestamp || Date.now()),
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

  // Update displayed activities when activities or currentPage changes
  useEffect(() => {
    updateDisplayedActivities(activities, currentPage);
  }, [activities, currentPage]);

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000);

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
      color: '#999',
      format: () => 'Unknown activity',
    };

    const avatarUrl = getAvatarUrl(activity);

    return (
      <View
        key={activity.id}
        style={[
          styles.activityItem,
          activity.isNew && styles.newActivityItem, // Highlight new activities
        ]}
      >
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.activityAvatar}
          />
        ) : (
          <View style={[styles.activityIcon, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon} size={16} color="white" />
          </View>
        )}
        
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            {config.format(activity.data)}
          </Text>
          <Text style={styles.activityTime}>
            {formatTimeAgo(activity.timestamp)}
          </Text>
        </View>
        
        {activity.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
    );
  };

  if (!isVisible) return null;

  const totalPages = Math.max(1, Math.ceil(activities.length / ITEMS_PER_PAGE));
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="pulse" size={20} color="#1F1147" />
            <Text style={styles.headerTitle}>Live Activity</Text>
          </View>
          {activities.length > ITEMS_PER_PAGE && (
            <View style={styles.paginationInfo}>
              <Text style={styles.pageInfo}>
                Page {currentPage + 1} of {totalPages}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.feedContainer}>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pulse-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>
              Live updates will appear here as they happen
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {displayedActivities.map((activity, index) => renderActivity(activity, index))}
            </ScrollView>
            
            {activities.length > ITEMS_PER_PAGE && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity 
                  style={[styles.paginationButton, !hasPrevPage && styles.paginationButtonDisabled]}
                  onPress={goToPreviousPage}
                  disabled={!hasPrevPage}
                >
                  <Ionicons name="chevron-back" size={16} color={hasPrevPage ? "#7C2B86" : "#ccc"} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.paginationButton}
                  onPress={goToFirstPage}
                >
                  <Text style={styles.paginationText}>Latest</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.paginationButton, !hasNextPage && styles.paginationButtonDisabled]}
                  onPress={goToNextPage}
                  disabled={!hasNextPage}
                >
                  <Ionicons name="chevron-forward" size={16} color={hasNextPage ? "#7C2B86" : "#ccc"} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
    marginBottom: 24,
  },
  header: {
    marginBottom: 14,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginLeft: 8,
  },
  activityCount: {
    backgroundColor: '#7C2B86',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  activityCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationInfo: {
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  feedContainer: {
    height: 280, // Fixed height for exactly 5 items + pagination
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    position: 'relative',
  },
  newActivityItem: {
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#7C2B86',
    paddingLeft: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#7C2B86',
  },
  activityContent: {
    flex: 1,
    paddingRight: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 4,
    backgroundColor: '#FF6B9D',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 43, 134, 0.1)',
    gap: 16,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  paginationButtonDisabled: {
    backgroundColor: 'rgba(204, 204, 204, 0.1)',
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
});

export default LiveActivityFeed;
