import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { notificationApi } from '@/src/api/notifications';
import { feedApi } from '@/src/api/feed';
import { getSocket } from '@/src/api/socket';
import { useLocalNotificationCount } from '@/src/hooks/useLocalNotificationCount';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Loader from '@/components/Loader';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { FriendRequestService } from '@/src/services/FriendRequestService';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isBrowser = Platform.OS === 'web';

// Squircle avatar radius matching the chat list screen's design system.
const AVATAR_RADIUS = 16;

// iOS 26+ Liquid Glass: render the filter chips with the native glass material
// (matching the native tab bar / header bell) when supported.
const LIQUID_GLASS = isLiquidGlassAvailable();

export default function NotificationPanel({ visible, onClose }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { resetCount: resetNotificationCount } = useLocalNotificationCount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState('All');
  const flatListRef = useRef(null);

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

    // Auto-mark all notifications as read when panel is opened
    markAllAsRead();

    return () => {
      cleanupSocketListeners();
    };
  }, [token, visible, resetNotificationCount]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.getNotifications(token);

      if (response.success) {
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
      if (notification && notification.id) {
        setNotifications(prev => {
          if (prev.some(n => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
      } else {
        console.error('❌ Invalid notification data:', notification);
      }
    });

    // Listen for notification removals (when requests are cancelled)
    socket.on('notification:removed', ({ type, sender_id, requestId }) => {
      setNotifications(prev => prev.filter(notification => {
        return !(
          notification.type === type &&
          notification.sender?.id === sender_id &&
          notification.data?.requestId === requestId
        );
      }));
    });

    // Listen for friend request notification removal (accept/decline)
    socket.on('notification:friend_request_removed', ({ otherUserId }) => {
      setNotifications(prev => prev.filter(notification => {
        return !(
          notification.type === 'friend_request' &&
          notification.sender?.id === otherUserId
        );
      }));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Listen for single notification deletion
    socket.on('notification:deleted', ({ notificationId }) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // 'friend:request:received' used to also insert its own notification entry
    // here, but the backend already creates a DB-backed notification row for
    // every friend request (see friendRequestHandler.ts) which arrives via the
    // 'notification:new' handler above -- inserting a second entry for the same
    // request duplicated the row (two different ids: the DB notification id vs.
    // `friend_request_${request.id}`), making the list jump/reshuffle every time
    // a request came in. 'notification:new' alone is now the single source of
    // truth; this listener only needs to clean up once a request is resolved.
    socket.on('friend:request:accept:confirmed', ({ request, newFriend }) => {
      if (request?.id) {
        setNotifications(prev => prev.filter(notif =>
          notif.id !== `friend_request_${request.id}` && notif.data?.requestId !== request.id
        ));
      }
    });

    socket.on('friend:request:decline:confirmed', ({ request }) => {
      if (request?.id) {
        setNotifications(prev => prev.filter(notif =>
          notif.id !== `friend_request_${request.id}` && notif.data?.requestId !== request.id
        ));
      }
    });
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notification:new');
    socket.off('notification:removed');
    socket.off('notification:friend_request_removed');
    socket.off('notification:deleted');
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

  // Squircle avatar/fallback matching the chat list's avatarContainer pattern,
  // used instead of the shared (circular) Avatar component in this panel.
  const NotificationAvatar = ({ item }) => {
    const isMemeNotification = item.type === 'meme_liked_by_friend' || item.type === 'meme_discovery';
    const memeId = item.data?.memeId;
    const [memeThumbUrl, setMemeThumbUrl] = useState(null);
    const [memeThumbLoading, setMemeThumbLoading] = useState(isMemeNotification && !!memeId);

    // weather_checkin carries no sender_id (see notificationService.ts --
    // recipient_id is the person being notified, the friend it's about only
    // ever lives in data.targetUserId), so item.sender is always null here.
    // Fetch that friend's profile photo the same way UserProfileModal.jsx does.
    const isWeatherNotification = item.type === 'weather_checkin';
    const weatherFriendId = item.data?.targetUserId;
    const [weatherFriendAvatar, setWeatherFriendAvatar] = useState(null);

    useEffect(() => {
      if (!isWeatherNotification || !weatherFriendId) return;
      let cancelled = false;
      (async () => {
        try {
          const { API_BASE_URL } = await import('@/src/api/config');
          const response = await fetch(`${API_BASE_URL}/api/friends/user/${weatherFriendId}/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          if (!response.ok) return;
          const data = await response.json();
          if (!cancelled) setWeatherFriendAvatar(data?.profilePhotoUrl || null);
        } catch (e) {
          console.error('Failed to load friend avatar for weather notification:', e);
        }
      })();
      return () => { cancelled = true; };
    }, [isWeatherNotification, weatherFriendId]);

    // Meme notifications show a preview of the actual meme instead of a
    // sender avatar -- the list endpoint only sends memeId, so this fetches
    // the meme (same call MemeSharePreview.jsx uses) purely for its thumbnail.
    useEffect(() => {
      if (!isMemeNotification || !memeId) return;
      let cancelled = false;
      (async () => {
        try {
          const res = await feedApi.getMeme(memeId, token);
          const thumbAsset = res?.meme?.assets?.find(
            (a) => a.asset_type === 'image' || a.asset_type === 'thumbnail'
          );
          if (!cancelled) setMemeThumbUrl(thumbAsset?.s3_url || null);
        } catch (e) {
          console.error('Failed to load meme thumbnail for notification:', e);
        } finally {
          if (!cancelled) setMemeThumbLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [isMemeNotification, memeId]);

    if (isMemeNotification) {
      return (
        <View style={styles.avatarWrap}>
          {memeThumbUrl ? (
            <View style={{ overflow: 'hidden', borderRadius: AVATAR_RADIUS, borderWidth: 1.5, borderColor: theme.primary + '26' }}>
              <Image source={{ uri: memeThumbUrl }} style={[styles.avatarImage, { borderRadius: AVATAR_RADIUS }]} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.fallbackAvatar, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '26' }]}>
              {memeThumbLoading ? (
                <Loader size={14} color={theme.primary} />
              ) : (
                <Ionicons name="image-outline" size={20} color={theme.primary} />
              )}
            </View>
          )}
        </View>
      );
    }

    const avatarUrl = item.sender?.avatar || item.sender?.profile_photo_url || item.avatar || weatherFriendAvatar;
    const name = item.sender?.name || item.sender?.first_name || item.data?.userName || item.data?.targetUserName || '';
    const initial = (name && name.charAt(0).toUpperCase()) || '?';

    return (
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <View style={{ overflow: 'hidden', borderRadius: AVATAR_RADIUS, borderWidth: 1.5, borderColor: theme.primary + '26' }}>
            <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, { borderRadius: AVATAR_RADIUS }]} />
          </View>
        ) : (
          <View style={[styles.fallbackAvatar, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '26' }]}>
            <Text style={[styles.fallbackAvatarText, { color: theme.primary }]}>{initial}</Text>
          </View>
        )}
      </View>
    );
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
      const { translationX, translationY, state } = event.nativeEvent;

      if (state === State.END) {
        const isHorizontalSwipe = Math.abs(translationX) > Math.abs(translationY);

        if (isHorizontalSwipe && translationX < -80) {
          setShowDeleteButton(true);
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
          }).start();
        } else {
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
          activeOffsetX={[-15, 15]}
          failOffsetY={[-10, 10]}
          shouldCancelWhenOutside={false}
        >
          <Animated.View
            style={[
              styles.swipeableContainer,
              { transform: [{ translateX }] }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.notificationItem,
                { backgroundColor: !item.read ? (isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)') : theme.background },
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={1}
            >
              <View style={styles.notificationContent}>
                <NotificationAvatar item={item} />

                <View style={styles.textContent}>
                  <View style={styles.textTopRow}>
                    {(() => {
                      const actionText = getNotificationActionText(item.type, item);
                      if (item.type === 'friend_accepted') {
                        return (
                          <Text style={[styles.successText, styles.notificationText]} numberOfLines={2}>
                            {item.message || `You are now friends with ${item.sender?.name || item.data?.userName}!`}
                          </Text>
                        );
                      }
                      if (actionText) {
                        return (
                          <Text style={[styles.notificationText, { flexShrink: 1 }]} numberOfLines={2}>
                            <Text style={[styles.usernameText, { color: theme.textPrimary }]}>
                              {item.sender?.name || item.data?.userName || 'Someone'}
                            </Text>
                            <Text style={[styles.actionText, { color: theme.textSecondary }]}> {actionText}</Text>
                          </Text>
                        );
                      }
                      // Types with no hardcoded action phrase above -- render
                      // the backend's own message instead of a generic fallback.
                      return (
                        <Text style={[styles.notificationText, { color: theme.textPrimary, flexShrink: 1 }]} numberOfLines={2}>
                          {item.message || item.title || 'You have a new notification'}
                        </Text>
                      );
                    })()}
                    <Text style={[styles.timeText, { color: theme.textMuted }]}>{formatTimeAgo(item.timestamp)}</Text>
                  </View>

                  {item.type === 'message' && item.message && (
                    <Text style={[styles.messageText, { color: theme.textSecondary }]} numberOfLines={2}>{item.message}</Text>
                  )}

                  {(item.type === 'match' || item.type === 'new_match') && (
                    <Text style={[styles.messageText, { color: theme.textSecondary }]}>You both liked each other!</Text>
                  )}
                </View>

                <View style={styles.rightContent}>
                  {!item.read && <View style={[styles.unreadIndicator, { backgroundColor: theme.primary }]} />}
                </View>
              </View>

              {item.type === 'friend_request' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.acceptButton, { backgroundColor: theme.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAcceptRequest(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.declineButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeclineRequest(item);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.declineButtonText, { color: theme.textSecondary }]}>
                      Decline
                    </Text>
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
    // Meme-connect notifications deliberately carry no sender/user id (the
    // whole point is the other party stays anonymous until reveal), so they
    // can't route to a profile like the fallback below -- send the user to
    // the Connect Requests screen instead, where the actual request lives.
    if (item.data?.action === 'meme_connect') {
      onClose();
      router.push('/secure/(tabs)/memes/connect-requests');
      return;
    }

    if ((item.type === 'meme_liked_by_friend' || item.type === 'meme_discovery') && item.data?.memeId) {
      onClose();
      router.push({ pathname: '/secure/meme-view', params: { memeId: String(item.data.memeId) } });
      return;
    }

    if (item.type === 'weather_checkin' && item.data?.chatId) {
      onClose();
      router.push({
        pathname: '/secure/chat-conversation',
        params: {
          id: String(item.data.chatId),
          name: item.data?.targetUserName || 'Chat',
          ...(item.data?.targetUserId ? { otherUserId: String(item.data.targetUserId) } : {}),
        },
      });
      return;
    }

    const userId = item.data?.userId ||
                   item.data?.requestId?.sender_id ||
                   item.sender?.id ||
                   item.data?.sender?.id;

    if (userId) {
      onClose();
      router.push(`/secure/user-profile/${userId}`);
    }
  };

  const handleAcceptRequest = async (item) => {
    try {
      const requestId = item.data?.requestId || item.id?.replace('friend_request_', '');

      if (!requestId) {
        console.error('No request ID found in notification:', item);
        Alert.alert('Error', 'Unable to process friend request');
        return;
      }

      const result = await FriendRequestService.acceptFriendRequest(requestId, token);

      setNotifications(prev => prev.filter(n => n.id !== item.id));

      if (item.id && !item.id.startsWith('friend_request_')) {
        try {
          await notificationApi.deleteNotification(item.id, token);
        } catch (deleteError) {
          console.error('Failed to delete notification from server:', deleteError);
        }
      }

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
        autoRemove: true,
      };

      setNotifications(prev => [successNotification, ...prev]);

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== successNotification.id));
      }, 5000);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      let errorMessage = 'Failed to accept friend request. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh and try again.';
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDeclineRequest = async (item) => {
    try {
      const requestId = item.data?.requestId || item.id?.replace('friend_request_', '');

      if (!requestId) {
        console.error('No request ID found in notification:', item);
        Alert.alert('Error', 'Unable to process friend request');
        return;
      }

      const result = await FriendRequestService.declineFriendRequest(requestId, token);

      setNotifications(prev => prev.filter(n => n.id !== item.id));

      if (item.id && !item.id.startsWith('friend_request_')) {
        try {
          await notificationApi.deleteNotification(item.id, token);
        } catch (deleteError) {
          console.error('Failed to delete notification from server:', deleteError);
        }
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      let errorMessage = 'Failed to decline friend request. Please try again.';
      if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh and try again.';
      }
      Alert.alert('Error', errorMessage);
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
      case 'new_message':
        return 'sent you a message';
      case 'match':
      case 'new_match':
        return 'matched with you';
      case 'like':
        return 'liked your profile';
      case 'profile_visit':
        return 'visited your profile';
      case 'incoming_call':
        return 'is calling you';
      case 'blind_date_match':
        return 'found a Blind Connect match with you';
      case 'blind_date_reveal':
        return 'revealed their identity';
      case 'help_request':
        return 'requested your help';
      default:
        // Every notification type the backend creates already comes with a
        // specific, correct `message` (see NotificationService.createNotification
        // call sites) -- for types not in this switch (referrals, verification,
        // subscriptions, meme engagement, jam sessions, birthdays, weather
        // check-ins, etc.), fall back to rendering that instead of a
        // synthesized "{name} sent you an update" phrase that discards it.
        return null;
    }
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
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        resetNotificationCount();
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
      animationType={isBrowser ? "fade" : "slide"}
      transparent={isBrowser}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      {isBrowser && (
        <TouchableOpacity
          style={styles.browserOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      <View
        style={[
          isBrowser ? styles.browserContainer : styles.fullScreenContainer,
          { backgroundColor: theme.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#DBDBDB',
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Notifications</Text>

          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <>
                <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                  <Ionicons name="checkmark-done" size={20} color={theme.primary} />
                  <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all read</Text>
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

                  const tabInner = (
                    <>
                      <Text
                        style={[
                          styles.filterTabText,
                          { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                        ]}
                      >
                        {tab}
                      </Text>
                      {count > 0 && (
                        <View style={[styles.filterTabBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : theme.surfaceSecondary }]}>
                          <Text style={[styles.filterTabBadgeText, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>
                            {count}
                          </Text>
                        </View>
                      )}
                    </>
                  );

                  if (LIQUID_GLASS) {
                    return (
                      <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)} activeOpacity={0.7}>
                        <GlassView
                          style={styles.filterTabGlass}
                          glassEffectStyle={isSelected ? 'clear' : 'regular'}
                          tintColor={isSelected ? theme.primary : undefined}
                          isInteractive
                        >
                          {tabInner}
                        </GlassView>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.filterTab,
                        { backgroundColor: isSelected ? theme.primary : theme.surfaceSecondary },
                      ]}
                      onPress={() => setSelectedTab(tab)}
                    >
                      {tabInner}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Loader size={36} color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notifications...</Text>
                </View>
              ) : getFilteredNotifications().length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-outline" size={64} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    {selectedTab === 'All' ? 'All caught up!' : `No ${selectedTab}`}
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {selectedTab === 'All'
                      ? "When someone interacts with you, you'll see it here."
                      : `No ${selectedTab.toLowerCase()} notifications to show.`
                    }
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={getFilteredNotifications()}
                  keyExtractor={(item) => item.id}
                  renderItem={renderNotification}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.listContainer}
                  style={styles.flatListStyle}
                  nestedScrollEnabled={true}
                  removeClippedSubviews={false}
                  scrollEnabled={true}
                  bounces={true}
                  ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      colors={[theme.primary]}
                      tintColor={theme.primary}
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
    backgroundColor: 'transparent',
  },
  browserOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  browserContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 420,
    maxHeight: '80%',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: isBrowser ? 12 : 50,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
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
  filterContainer: {
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterTabGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    overflow: 'hidden',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterTabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  flatListStyle: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
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
    backgroundColor: 'transparent',
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  fallbackAvatar: {
    width: 48,
    height: 48,
    borderRadius: AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  fallbackAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  textTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 20,
  },
  usernameText: {
    fontWeight: '700',
  },
  actionText: {
    fontWeight: '400',
  },
  successText: {
    color: '#10B981',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    marginLeft: 8,
    flexShrink: 0,
  },
  messageText: {
    fontSize: 14,
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
    marginTop: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  acceptButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
