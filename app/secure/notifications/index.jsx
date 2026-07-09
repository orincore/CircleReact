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
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FriendRequestService } from '@/src/services/FriendRequestService';

// Same brand gradient + squircle avatar radius as the chat list screen, so
// this reads as part of the same design system.
const BRAND_GRADIENT = ['#7C2B86', '#5D5FEF'];
const AVATAR_RADIUS = 16;

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
  const insets = useSafeAreaInsets();
  const { resetCount: resetNotificationCount } = useLocalNotificationCount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token) return;

    loadNotifications();
    setupSocketListeners();

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
        return { name: 'person-add', color: theme.primary, bg: theme.primaryLight };
      case 'message_request':
        return { name: 'chatbubble-ellipses', color: '#FF6B9D', bg: 'rgba(255, 107, 157, 0.12)' };
      case 'match':
        return { name: 'heart', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
      default:
        return { name: 'notifications', color: theme.primary, bg: theme.primaryLight };
    }
  };

  const handleNotificationPress = (notification) => {
    const userId = notification.data?.sender?.id ||
                   notification.data?.sender_id ||
                   notification.data?.userId ||
                   notification.data?.other?.id ||
                   notification.sender?.id;

    if (userId) {
      router.push(`/secure/user-profile/${userId}`);
    }
  };

  const renderNotification = ({ item }) => {
    const iconConfig = getNotificationIcon(item.type);
    const isActionable = item.type === 'friend_request' || item.type === 'message_request';

    return (
      <TouchableOpacity
        style={styles.notificationRow}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.6}
      >
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <View style={{ overflow: 'hidden', borderRadius: AVATAR_RADIUS, borderWidth: 1.5, borderColor: theme.primary + '26' }}>
              <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
            </View>
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg, borderColor: theme.primary + '26' }]}>
              <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
            </View>
          )}
          {!item.read && <View style={[styles.unreadDot, { borderColor: theme.background }]} />}
        </View>

        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <Text style={[styles.senderName, { color: theme.textPrimary }]} numberOfLines={1}>
              {item.senderName || 'Circle'}
            </Text>
            <Text style={[styles.timestamp, { color: theme.textMuted }]}>
              {formatTimeAgo(item.timestamp)}
            </Text>
          </View>

          <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>

          {isActionable && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAcceptRequest(item);
                }}
                activeOpacity={0.85}
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
                style={[styles.actionButton, styles.declineButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeclineRequest(item);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color={theme.textSecondary} />
                <Text style={[styles.declineButtonText, { color: theme.textSecondary }]}>
                  {item.type === 'message_request' ? 'Pass' : 'Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>All caught up!</Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        You don't have any notifications right now.{'\n'}We'll let you know when something happens.
      </Text>
    </View>
  );

  const headerTopPadding = (insets.top || (Platform.OS === 'android' ? 24 : 0)) + (Platform.OS === 'web' ? 20 : 12);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header: same brand gradient chrome as the chat list screen. */}
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerTopPadding }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleTap}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {notifications.length > 0 ? (
            <TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton} onPress={markAllAsRead}>
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButton} />
          )}
        </View>
      </LinearGradient>

      {/* Content sheet: rounded top corners overlap the header, matching
          the chat list's "card peeking out" transition. */}
      <View style={styles.sheetShadowWrap}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Loader size={36} color={theme.primary} />
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
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.primary]}
                  tintColor={theme.primary}
                />
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#3D1240',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleTap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  sheetShadowWrap: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  listContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#5D5FEF',
    borderWidth: 2,
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    letterSpacing: 0.1,
  },
  timestamp: {
    fontSize: 12,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
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
  declineButton: {
    borderWidth: 1,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
