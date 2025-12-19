import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSocket } from '@/src/api/socket';
import { notificationApi } from '@/src/api/notifications';
import { useLocalNotificationCount } from '@/src/hooks/useLocalNotificationCount';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FriendRequestService } from '@/src/services/FriendRequestService';

const formatTimeAgo = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { resetCount: resetNotificationCount } = useLocalNotificationCount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token) return;

    loadNotifications();
    setupSocketListeners();
    
    // Reset local notification count and mark all as read when page is opened
    resetNotificationCount();
    markAllAsRead();

    return () => {
      cleanupSocketListeners();
    };
  }, [token]);

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const loadNotifications = async () => {
    if (refreshing) return;
    
    setLoading(true);
    try {
      const socket = getSocket(token);
      socket.emit('notifications:get', {});
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, []);

  const setupSocketListeners = () => {
    const socket = getSocket(token);
    
    socket.on('notifications:list', ({ notifications: serverNotifications }) => {
      const notificationData = (serverNotifications || []).map(request => ({
        id: request.id,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${request.sender?.first_name || 'Someone'} wants to be your friend`,
        avatar: request.sender?.profile_photo_url,
        senderName: `${request.sender?.first_name || ''} ${request.sender?.last_name || ''}`.trim(),
        timestamp: new Date(request.created_at),
        data: request,
        read: false,
      }));

      setNotifications(notificationData);
      setLoading(false);
      setRefreshing(false);
    });
    
    socket.on('friend:request:received', ({ request, sender }) => {
      const newNotification = {
        id: request.id,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${sender?.first_name || 'Someone'} wants to be your friend`,
        avatar: sender?.profile_photo_url,
        senderName: `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim(),
        timestamp: new Date(request.created_at),
        data: request,
        read: false,
      };

      setNotifications(prev => [newNotification, ...prev]);
    });

    socket.on('matchmaking:proposal', ({ id, other }) => {
      const newNotification = {
        id: id,
        type: 'message_request',
        title: 'Message Request',
        message: `${other?.first_name || 'Someone'} wants to connect with you`,
        avatar: other?.profile_photo_url,
        senderName: `${other?.first_name || ''} ${other?.last_name || ''}`.trim(),
        timestamp: new Date(),
        data: { id, other },
        read: false,
      };

      setNotifications(prev => [newNotification, ...prev]);
    });

    socket.on('friend:request:cancelled', ({ request }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== request.id));
    });

    socket.on('message:request:cancelled', ({ proposal }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== proposal.id));
    });

    socket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('friend:request:accept:confirmed', ({ request, newFriend }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== request.id));
      Alert.alert('Success', `You are now friends with ${newFriend?.first_name || 'this person'}!`);
    });

    socket.on('friend:request:decline:confirmed', ({ request }) => {
      setNotifications(prev => prev.filter(notif => notif.id !== request.id));
    });

    socket.on('friend:request:error', ({ error }) => {
      console.error('Friend request error:', error);
      Alert.alert('Error', error);
    });

    socket.on('matchmaking:matched', ({ otherName }) => {
      setNotifications(prev => prev.filter(notif => notif.type !== 'message_request'));
      Alert.alert('Success', `You matched with ${otherName}! Start chatting now.`);
    });

    socket.on('matchmaking:cancelled', () => {
      setNotifications(prev => prev.filter(notif => notif.type !== 'message_request'));
    });
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notifications:list');
    socket.off('friend:request:received');
    socket.off('friend:request:cancelled');
    socket.off('message:request:cancelled');
    socket.off('friend:request:accept:confirmed');
    socket.off('friend:request:decline:confirmed');
    socket.off('friend:request:error');
    socket.off('matchmaking:proposal');
    socket.off('matchmaking:matched');
    socket.off('matchmaking:cancelled');
    socket.off('notification:new');
  };

  const handleAcceptRequest = async (notification) => {
    if (notification.type === 'friend_request') {
      try {
        await FriendRequestService.acceptFriendRequest(notification.id, token);
        setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
      } catch (error) {
        console.error('Failed to accept friend request:', error);
        Alert.alert('Error', error.message || 'Failed to accept friend request.');
      }
    } else if (notification.type === 'message_request') {
      const socket = getSocket(token);
      socket.emit('matchmaking:decide', { decision: 'accept' });
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
    }
  };

  const handleDeclineRequest = (notification) => {
    const requestType = notification.type === 'friend_request' ? 'Friend Request' : 'Message Request';
    
    Alert.alert(
      `Decline ${requestType}`,
      `Are you sure you want to decline ${notification.senderName}'s request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (notification.type === 'friend_request') {
              try {
                await FriendRequestService.declineFriendRequest(notification.id, token);
                setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
              } catch (error) {
                console.error('Failed to decline friend request:', error);
                Alert.alert('Error', error.message || 'Failed to decline friend request.');
              }
            } else if (notification.type === 'message_request') {
              const socket = getSocket(token);
              socket.emit('matchmaking:decide', { decision: 'pass' });
              setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return { name: 'person-add', color: '#7C2B86', bg: 'rgba(124, 43, 134, 0.1)' };
      case 'message_request':
        return { name: 'chatbubble-ellipses', color: '#FF6B9D', bg: 'rgba(255, 107, 157, 0.1)' };
      case 'match':
        return { name: 'heart', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default:
        return { name: 'notifications', color: '#7C2B86', bg: 'rgba(124, 43, 134, 0.1)' };
    }
  };

  const handleNotificationPress = (notification) => {
    // Get the user ID from the notification
    const userId = notification.data?.sender?.id || 
                   notification.data?.sender_id || 
                   notification.data?.userId ||
                   notification.data?.other?.id ||
                   notification.sender?.id;
    
    if (userId) {
      router.push(`/secure/user-profile/${userId}`);
    }
  };

  const renderNotification = ({ item, index }) => {
    const iconConfig = getNotificationIcon(item.type);
    const isActionable = item.type === 'friend_request' || item.type === 'message_request';
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { 
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            borderLeftColor: iconConfig.color,
          },
          !item.read && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationRow}>
          {/* Avatar or Icon */}
          <View style={styles.avatarSection}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
              </View>
            )}
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          {/* Content */}
          <View style={styles.contentSection}>
            <View style={styles.headerRow}>
              <Text style={[styles.senderName, { color: theme.textPrimary }]} numberOfLines={1}>
                {item.senderName || 'Circle'}
              </Text>
              <Text style={[styles.timestamp, { color: theme.textTertiary }]}>
                {formatTimeAgo(item.timestamp)}
              </Text>
            </View>
            
            <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
            
            {/* Action Buttons */}
            {isActionable && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleAcceptRequest(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={item.type === 'message_request' ? 'heart' : 'checkmark'} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.acceptButtonText}>
                    {item.type === 'message_request' ? 'Connect' : 'Accept'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.declineButton,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6' },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeclineRequest(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color={theme.textSecondary} />
                  <Text style={[styles.declineButtonText, { color: theme.textSecondary }]}>
                    {item.type === 'message_request' ? 'Pass' : 'Decline'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(124, 43, 134, 0.15)' : 'rgba(124, 43, 134, 0.08)' }]}>
        <Ionicons name="notifications-outline" size={48} color="#7C2B86" />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>All Caught Up!</Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        You don't have any notifications right now.{'\n'}We'll let you know when something happens.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Notifications</Text>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markReadButton} activeOpacity={0.7}>
              <Ionicons name="checkmark-done" size={20} color="#7C2B86" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Content */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C2B86" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderNotification}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#7C2B86']}
                tintColor="#7C2B86"
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  markReadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: 76,
  },
  notificationCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: 'rgba(124, 43, 134, 0.03)',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C2B86',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '400',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#7C2B86',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
