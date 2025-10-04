import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  RefreshControl
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';
import { notificationApi } from '@/src/api/notifications';
import { useLocalNotificationCount } from '@/src/hooks/useLocalNotificationCount';
import { friendsApi } from '@/src/api/friends';
import Avatar from './Avatar';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function NotificationPanel({ visible, onClose }) {
  const { user, token } = useAuth();
  const { resetCount: resetNotificationCount } = useLocalNotificationCount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState('All');

  // Filter notifications based on selected tab
  const getFilteredNotifications = () => {
    switch (selectedTab) {
      case 'All':
        return notifications;
      case 'Friend Requests':
        return notifications.filter(n => 
          n.type === 'friend_request' || 
          n.type === 'friend_accepted' || 
          n.type === 'friend_request_accepted'
        );
      case 'Profile Visits':
        return notifications.filter(n => n.type === 'profile_visit');
      case 'Suggestions':
        return notifications.filter(n => n.type === 'new_user_suggestion' || n.type === 'profile_suggestion');
      default:
        return notifications;
    }
  };

  const getTabCounts = () => {
    return {
      'All': notifications.length,
      'Friend Requests': notifications.filter(n => 
        n.type === 'friend_request' || 
        n.type === 'friend_accepted' || 
        n.type === 'friend_request_accepted'
      ).length,
      'Profile Visits': notifications.filter(n => n.type === 'profile_visit').length,
      'Suggestions': notifications.filter(n => n.type === 'new_user_suggestion' || n.type === 'profile_suggestion').length,
    };
  };

  useEffect(() => {
    if (!token || !visible) return;

    loadNotifications();
    loadUnreadCount();
    setupSocketListeners();

    // Reset local notification count when panel is opened
    resetNotificationCount();

    return () => {
      cleanupSocketListeners();
    };
  }, [token, visible, resetNotificationCount]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      console.log('📱 Loading notifications from API...');
      const response = await notificationApi.getNotifications(token);
      
      if (response.success) {
        console.log('✅ Loaded notifications:', response.notifications.length);
        setNotifications(response.notifications);
      } else {
        console.error('❌ Failed to load notifications:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationApi.getUnreadCount(token);
      if (response.success) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const setupSocketListeners = () => {
    const socket = getSocket(token);
    
    // Listen for new notifications
    socket.on('notification:new', ({ notification }) => {
      console.log('🔔 New notification received:', notification);
      if (notification && notification.id) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      } else {
        console.error('❌ Invalid notification data:', notification);
      }
    });
    
    // Listen for notification removals (when requests are cancelled)
    socket.on('notification:removed', ({ type, sender_id, requestId }) => {
      console.log('🗑️ Notification removed:', { type, sender_id, requestId });
      setNotifications(prev => prev.filter(notification => {
        // Remove notifications that match the cancelled request
        return !(
          notification.type === type && 
          notification.sender?.id === sender_id &&
          notification.data?.requestId === requestId
        );
      }));
    });

    // Listen for friend request notification removal (accept/decline)
    socket.on('notification:friend_request_removed', ({ otherUserId }) => {
      console.log('🗑️ Friend request notification removed for user:', otherUserId);
      setNotifications(prev => prev.filter(notification => {
        // Remove friend request notifications from this user
        return !(
          notification.type === 'friend_request' && 
          notification.sender?.id === otherUserId
        );
      }));
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Listen for single notification deletion
    socket.on('notification:deleted', ({ notificationId }) => {
      console.log('🗑️ Notification deleted:', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Keep existing friend request listeners for compatibility
    socket.on('friend:request:received', ({ request, sender }) => {
      console.log('🤝 Friend request received:', { request, sender });
      
      // Extract sender from request object if not provided separately
      const actualSender = sender || request?.sender;
      
      // Add null checks to prevent errors
      if (!request || !actualSender) {
        console.error('❌ Invalid friend request data:', { request, sender: actualSender });
        return;
      }

      const senderName = actualSender.first_name ? 
        actualSender.first_name + (actualSender.last_name ? ` ${actualSender.last_name}` : '') : 
        actualSender.name || 'Unknown User';

      const newNotification = {
        id: `friend_request_${request.id}`,
        type: 'friend_request',
        sender: {
          id: actualSender.id || actualSender.user_id,
          name: senderName,
          first_name: actualSender.first_name || actualSender.name?.split(' ')[0],
          last_name: actualSender.last_name || actualSender.name?.split(' ')[1],
          profile_photo_url: actualSender.profile_photo_url || actualSender.avatar,
          avatar: actualSender.profile_photo_url || actualSender.avatar
        },
        data: {
          requestId: request.id,
          userName: senderName,
          userId: actualSender.id || actualSender.user_id
        },
        timestamp: new Date().toISOString(),
        read: false
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('friend:request:accept:confirmed', ({ request, newFriend }) => {
      console.log('✅ Friend request accepted confirmed:', { request, newFriend });
      if (request?.id) {
        setNotifications(prev => prev.filter(notif => notif.id !== `friend_request_${request.id}`));
      }
    });

    socket.on('friend:request:decline:confirmed', ({ request }) => {
      console.log('❌ Friend request declined confirmed:', { request });
      if (request?.id) {
        setNotifications(prev => prev.filter(notif => notif.id !== `friend_request_${request.id}`));
      }
    });
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notification:new');
    socket.off('notification:removed');
    socket.off('notification:friend_request_removed');
    socket.off('notification:deleted');
    socket.off('friend:request:received');
    socket.off('friend:request:accept:confirmed');
    socket.off('friend:request:decline:confirmed');
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await notificationApi.deleteNotification(notificationId, token);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        const deletedNotification = notifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const SwipeableNotification = ({ item, onDelete }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteButton, setShowDeleteButton] = useState(false);

    const handleGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const handleGestureStateChange = (event) => {
      const { translationX, state } = event.nativeEvent;
      
      if (state === State.END) {
        if (translationX < -80) {
          // Show delete button
          setShowDeleteButton(true);
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
          // Hide delete button
          setShowDeleteButton(false);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    const handleDeletePress = () => {
      setIsDeleting(true);
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDelete(item.id);
      });
    };

    return (
      <View style={styles.swipeableWrapper}>
        {/* Delete button background - only show when swiped */}
        {showDeleteButton && (
          <TouchableOpacity 
            style={styles.deleteAction}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={20} color="white" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}

        <PanGestureHandler 
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
        >
          <Animated.View 
            style={[
              styles.swipeableContainer,
              { transform: [{ translateX }] }
            ]}
          >
            <TouchableOpacity 
              style={[styles.notificationItem, !item.read && styles.unreadNotification]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={1}
            >
              <View style={styles.notificationContent}>
                {/* User Avatar */}
                <Avatar 
                  user={{
                    id: item.sender?.id || item.data?.userId,
                    first_name: item.sender?.first_name || item.sender?.name?.split(' ')[0] || item.data?.userName?.split(' ')[0],
                    last_name: item.sender?.last_name || item.sender?.name?.split(' ')[1] || item.data?.userName?.split(' ')[1],
                    profile_photo_url: item.sender?.avatar || item.sender?.profile_photo_url || item.avatar,
                    name: item.sender?.name || item.data?.userName
                  }}
                  size={44}
                  style={styles.notificationAvatar}
                  showOnlineStatus={false}
                />
                
                <View style={styles.textContent}>
                  <Text style={styles.notificationText}>
                    {item.type === 'friend_accepted' ? (
                      <>
                        <Text style={styles.successText}>
                          {item.message || `You are now friends with ${item.sender?.name || item.data?.userName}!`}
                        </Text>
                        <Text style={styles.timeText}> {formatTimeAgo(item.timestamp)}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.usernameText}>
                          {item.sender?.name || item.data?.userName || 'Someone'}
                        </Text>
                        <Text style={styles.actionText}> {getNotificationActionText(item.type, item)}</Text>
                        <Text style={styles.timeText}> {formatTimeAgo(item.timestamp)}</Text>
                      </>
                    )}
                  </Text>
                  
                  {/* Message preview for message notifications */}
                  {item.type === 'message' && item.message && (
                    <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
                  )}
                  
                  {/* Match description */}
                  {(item.type === 'match' || item.type === 'new_match') && (
                    <Text style={styles.messageText}>You both liked each other!</Text>
                  )}
                </View>
                
                {/* Right side content */}
                <View style={styles.rightContent}>
                  {!item.read && <View style={styles.unreadIndicator} />}
                  {getNotificationRightContent(item)}
                </View>
              </View>
              
              {/* Action buttons for specific notification types */}
              {item.type === 'friend_request' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAcceptRequest(item);
                    }}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeclineRequest(item);
                    }}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  };

  const handleNotificationPress = (item) => {
    // Handle notification press logic here
    console.log('Notification pressed:', item);
  };

  const handleAcceptRequest = async (item) => {
    try {
      console.log('Accepting friend request:', item);
      
      // Extract request ID from the notification
      const requestId = item.data?.requestId || item.id?.replace('friend_request_', '');
      
      if (!requestId) {
        console.error('No request ID found in notification:', item);
        Alert.alert('Error', 'Unable to process friend request');
        return;
      }

      // Accept the friend request
      const response = await friendsApi.acceptFriendRequest(requestId, token);
      
      if (response.success) {
        // Remove the friend request notification from local state
        setNotifications(prev => prev.filter(n => n.id !== item.id));
        
        // Delete the notification from the server if it has a server ID
        if (item.id && !item.id.startsWith('friend_request_')) {
          try {
            await notificationApi.deleteNotification(item.id, token);
            console.log('✅ Friend request notification deleted from server');
          } catch (deleteError) {
            console.error('❌ Failed to delete notification from server:', deleteError);
            // Don't show error to user, this is not critical
          }
        }
        
        // Add a success notification
        const successNotification = {
          id: `friend_accepted_${Date.now()}`,
          type: 'friend_accepted',
          sender: item.sender,
          data: {
            userName: item.sender?.name || item.data?.userName,
            userId: item.sender?.id || item.data?.userId
          },
          timestamp: new Date().toISOString(),
          read: false,
          message: `You are now friends with ${item.sender?.name || item.data?.userName}!`,
          autoRemove: true // Mark for auto-removal
        };
        
        setNotifications(prev => [successNotification, ...prev]);
        
        // Auto-remove the success notification after 5 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== successNotification.id));
        }, 5000);
        
        console.log('✅ Friend request accepted successfully');
      } else {
        console.error('Failed to accept friend request:', response.error);
        Alert.alert('Error', 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (item) => {
    try {
      console.log('Declining friend request:', item);
      
      // Extract request ID from the notification
      const requestId = item.data?.requestId || item.id?.replace('friend_request_', '');
      
      if (!requestId) {
        console.error('No request ID found in notification:', item);
        Alert.alert('Error', 'Unable to process friend request');
        return;
      }

      // Decline the friend request
      const response = await friendsApi.rejectFriendRequest(requestId, token);
      
      if (response.success) {
        // Remove the friend request notification from local state
        setNotifications(prev => prev.filter(n => n.id !== item.id));
        
        // Delete the notification from the server if it has a server ID
        if (item.id && !item.id.startsWith('friend_request_')) {
          try {
            await notificationApi.deleteNotification(item.id, token);
            console.log('✅ Friend request notification deleted from server');
          } catch (deleteError) {
            console.error('❌ Failed to delete notification from server:', deleteError);
            // Don't show error to user, this is not critical
          }
        }
        
        console.log('✅ Friend request declined successfully');
      } else {
        console.error('Failed to decline friend request:', response.error);
        Alert.alert('Error', 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const getNotificationActionText = (type, item) => {
    switch (type) {
      case 'friend_request':
        return 'sent you a friend request';
      case 'friend_accepted':
      case 'friend_request_accepted':
        return 'accepted your friend request';
      case 'new_user_suggestion':
        return 'just joined Circle';
      case 'message':
        return 'sent you a message';
      case 'match':
        return 'matched with you';
      case 'like':
        return 'liked your profile';
      case 'profile_visit':
        return 'visited your profile';
      default:
        return 'sent you a notification';
    }
  };

  const getNotificationRightContent = (item) => {
    // Return any right-side content for the notification
    return null;
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadUnreadCount();
    setRefreshing(false);
  };

  const markAllAsRead = async () => {
    try {
      const response = await notificationApi.markAllAsRead(token);
      if (response.success) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        resetNotificationCount();
        console.log('✅ All notifications marked as read');
      }
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const renderNotification = ({ item }) => {
    return (
      <SwipeableNotification 
        item={item} 
        onDelete={handleDeleteNotification}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.fullScreenContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Notifications</Text>
          
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.markAllButton}
                  onPress={markAllAsRead}
                >
                  <Ionicons name="checkmark-done" size={20} color="#7C2B86" />
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {['All', 'Friend Requests', 'Profile Visits', 'Suggestions'].map((tab) => {
              const count = getTabCounts()[tab];
              const isSelected = selectedTab === tab;
              
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterTab, isSelected && styles.filterTabActive]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                    {tab}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterTabBadge, isSelected && styles.filterTabBadgeActive]}>
                      <Text style={[styles.filterTabBadgeText, isSelected && styles.filterTabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C2B86" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : getFilteredNotifications().length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-outline" size={64} color="#C7C7CC" />
              </View>
              <Text style={styles.emptyTitle}>
                {selectedTab === 'All' ? 'No Notifications Yet' : `No ${selectedTab}`}
              </Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'All' 
                  ? 'When someone interacts with you, you\'ll see it here.'
                  : `No ${selectedTab.toLowerCase()} notifications to show.`
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredNotifications()}
              keyExtractor={(item) => item.id}
              renderItem={renderNotification}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#7C2B86']}
                  tintColor="#7C2B86"
                />
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    backgroundColor: '#DBDBDB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTabBadgeTextActive: {
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingVertical: 8,
  },
  swipeableWrapper: {
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  swipeableContainer: {
    backgroundColor: '#FFFFFF',
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEEEEE',
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationAvatar: {
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 20,
  },
  usernameText: {
    fontWeight: '600',
    color: '#000',
  },
  actionText: {
    color: '#666',
  },
  successText: {
    color: '#10B981',
    fontWeight: '600',
  },
  timeText: {
    color: '#999',
    fontSize: 14,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  declineButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
});
