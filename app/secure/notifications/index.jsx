import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!token) return;

    loadNotifications();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [token]);

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

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

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
      };

      setNotifications(prev => [newNotification, ...prev]);
    });

    // Listen for matchmaking proposals (message requests)
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
      };

      setNotifications(prev => [newNotification, ...prev]);
    });

    // Listen for cancelled friend requests
    socket.on('friend:request:cancelled', ({ request, cancelledBy }) => {
      //console.log('🚫 Friend request cancelled notification:', request);
      // Remove the cancelled request from notifications
      setNotifications(prev => prev.filter(notif => notif.id !== request.id));
    });

    // Listen for cancelled message requests
    socket.on('message:request:cancelled', ({ proposal, cancelledBy }) => {
      //console.log('🚫 Message request cancelled notification:', proposal);
      // Remove the cancelled request from notifications
      setNotifications(prev => prev.filter(notif => notif.id !== proposal.id));
    });

    // Listen for new notifications (unified system)
    socket.on('notification:new', (notification) => {
      //console.log('📱 New notification received:', notification);
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

    // Listen for matchmaking events
    socket.on('matchmaking:matched', ({ chatId, otherName }) => {
      // Remove the proposal notification when matched
      setNotifications(prev => prev.filter(notif => notif.type !== 'message_request'));
      Alert.alert('Success', `You matched with ${otherName}! Start chatting now.`);
    });

    socket.on('matchmaking:cancelled', ({ reason }) => {
      // Remove message request notifications when cancelled
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

  const handleAcceptRequest = (notification) => {
    const socket = getSocket(token);
    
    if (notification.type === 'friend_request') {
      socket.emit('friend:request:accept', { requestId: notification.id });
    } else if (notification.type === 'message_request') {
      // Accept matchmaking proposal
      socket.emit('matchmaking:decide', { decision: 'accept' });
      // Remove the notification immediately
      setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
    }
  };

  const handleDeclineRequest = (notification) => {
    const requestType = notification.type === 'friend_request' ? 'Friend Request' : 'Message Request';
    const actionType = notification.type === 'friend_request' ? 'friend request' : 'message request';
    
    Alert.alert(
      `Decline ${requestType}`,
      `Are you sure you want to decline ${notification.senderName}'s ${actionType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            const socket = getSocket(token);
            
            if (notification.type === 'friend_request') {
              socket.emit('friend:request:decline', { requestId: notification.id });
            } else if (notification.type === 'message_request') {
              // Decline matchmaking proposal
              socket.emit('matchmaking:decide', { decision: 'pass' });
              // Remove the notification immediately
              setNotifications(prev => prev.filter(notif => notif.id !== notification.id));
            }
          },
        },
      ]
    );
  };

  const renderNotification = ({ item }) => {
    if (item.type === 'friend_request' || item.type === 'message_request') {
      const iconName = item.type === 'friend_request' ? 'person-add' : 'chatbubble-ellipses';
      const iconColor = item.type === 'friend_request' ? '#7C2B86' : '#FF6B9D';
      const cardStyle = item.type === 'message_request' ? styles.messageRequestCard : styles.notificationCard;
      
      return (
        <View style={cardStyle}>
          <View style={styles.notificationContent}>
            <View style={styles.avatarContainer}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.fallbackAvatar, item.type === 'message_request' && styles.messageRequestAvatar]}>
                  <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
              )}
            </View>
            
            <View style={styles.textContent}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMessage}>{item.message}</Text>
              <Text style={styles.timestamp}>
                {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, item.type === 'message_request' ? styles.connectButton : styles.acceptButton]}
              onPress={() => handleAcceptRequest(item)}
            >
              <Ionicons name={item.type === 'message_request' ? 'heart' : 'checkmark'} size={18} color="white" />
              <Text style={styles.acceptButtonText}>
                {item.type === 'message_request' ? 'Connect' : 'Accept'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDeclineRequest(item)}
            >
              <Ionicons name="close" size={18} color="#666" />
              <Text style={styles.declineButtonText}>
                {item.type === 'message_request' ? 'Pass' : 'Decline'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1F1147', '#7C2B86']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </LinearGradient>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C2B86" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="rgba(124, 43, 134, 0.3)" />
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageRequestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  fallbackAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0e6f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageRequestAvatar: {
    backgroundColor: '#ffe6f0',
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#7C2B86',
  },
  connectButton: {
    backgroundColor: '#FF6B9D',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
    marginLeft: 4,
  },
});
