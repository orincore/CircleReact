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
  Modal,
  Dimensions,
  Animated,
  PanGestureHandler,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';
import { notificationApi } from '@/src/api/notifications';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function NotificationPanel({ visible, onClose }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token || !visible) return;

    loadNotifications();
    loadUnreadCount();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [token, visible]);

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
      console.error('❌ Error loading unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadUnreadCount();
    setRefreshing(false);
  };

  const setupSocketListeners = () => {
    const socket = getSocket(token);
    
    // Listen for new notifications
    socket.on('notification:new', ({ notification }) => {
      console.log('🔔 New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Keep existing friend request listeners for compatibility
    socket.on('friend:request:received', ({ request, sender }) => {
      const newNotification = {
        id: `friend_request_${request.id}`,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${sender?.first_name || 'Someone'} wants to be your friend`,
        sender: {
          id: sender?.id,
          name: `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim(),
          avatar: sender?.profile_photo_url
        },
        timestamp: new Date(request.created_at),
        data: request,
        read: false
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('friend:request:accept:confirmed', ({ request, newFriend }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== `friend_request_${request.id}`));
    });

    socket.on('friend:request:decline:confirmed', ({ request }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== `friend_request_${request.id}`));
    });
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notification:new');
    socket.off('friend:request:received');
    socket.off('friend:request:accept:confirmed');
    socket.off('friend:request:decline:confirmed');
  };

  const handleAcceptRequest = (notification) => {
    const socket = getSocket(token);
    socket.emit('friend:request:accept', { requestId: notification.data?.id || notification.id });
  };

  const handleDeclineRequest = (notification) => {
    Alert.alert(
      'Decline Friend Request',
      `Are you sure you want to decline ${notification.sender?.name || 'this person'}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            const socket = getSocket(token);
            socket.emit('friend:request:decline', { requestId: notification.data?.id || notification.id });
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await notificationApi.markAsRead(notification.id, token);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('❌ Error marking notification as read:', error);
      }
    }

    // Handle notification-specific actions
    switch (notification.type) {
      case 'new_match':
      case 'profile_suggestion':
      case 'new_user_suggestion':
        // Navigate to user profile
        onClose();
        // TODO: Navigate to profile
        break;
      case 'friend_request_accepted':
      case 'message_request_accepted':
        // Navigate to chat
        onClose();
        // TODO: Navigate to chat
        break;
      case 'profile_visit':
        // Could show profile visits or navigate to profile
        break;
      default:
        break;
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await notificationApi.deleteNotification(notificationId, token);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Update unread count if notification was unread
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

    const handleSwipe = (event) => {
      const { translationX } = event.nativeEvent;
      
      if (translationX < -100 && !isDeleting) {
        setIsDeleting(true);
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onDelete(item.id);
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    };

    return (
      <PanGestureHandler onGestureEvent={handleSwipe}>
        <Animated.View 
          style={[
            styles.swipeableContainer,
            { transform: [{ translateX }] }
          ]}
        >
          <TouchableOpacity 
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContent}>
              <View style={styles.avatarContainer}>
                {item.sender?.avatar || item.avatar ? (
                  <Image 
                    source={{ uri: item.sender?.avatar || item.avatar }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <View style={[styles.fallbackAvatar, getNotificationIcon(item.type).style]}>
                    <Ionicons 
                      name={getNotificationIcon(item.type).name} 
                      size={20} 
                      color={getNotificationIcon(item.type).color} 
                    />
                  </View>
                )}
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              
              <View style={styles.textContent}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={[styles.notificationMessage, !item.read && styles.unreadMessage]}>
                  {item.message}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(item.timestamp)}
                </Text>
              </View>
            </View>
            
            {item.type === 'friend_request' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAcceptRequest(item);
                  }}
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeclineRequest(item);
                  }}
                >
                  <Ionicons name="close" size={16} color="#666" />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.deleteIndicator}>
            <Ionicons name="trash" size={24} color="white" />
            <Text style={styles.deleteText}>Swipe to delete</Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return { name: 'person-add', color: '#7C2B86', style: { backgroundColor: '#f0e6f6' } };
      case 'friend_request_accepted':
        return { name: 'checkmark-circle', color: '#22C55E', style: { backgroundColor: '#f0fdf4' } };
      case 'new_match':
        return { name: 'heart', color: '#EF4444', style: { backgroundColor: '#fef2f2' } };
      case 'profile_visit':
        return { name: 'eye', color: '#3B82F6', style: { backgroundColor: '#eff6ff' } };
      case 'profile_suggestion':
      case 'new_user_suggestion':
        return { name: 'star', color: '#F59E0B', style: { backgroundColor: '#fffbeb' } };
      case 'message_request_accepted':
        return { name: 'chatbubble', color: '#8B5CF6', style: { backgroundColor: '#f3f4f6' } };
      default:
        return { name: 'notifications', color: '#6B7280', style: { backgroundColor: '#f9fafb' } };
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
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
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C2B86" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={48} color="rgba(124, 43, 134, 0.3)" />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtext}>You're all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
    minHeight: screenHeight * 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  swipeableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    width: '100%',
  },
  unreadCard: {
    borderColor: '#7C2B86',
    borderWidth: 2,
    backgroundColor: '#fefefe',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fallbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#7C2B86',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 12,
  },
  deleteIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
