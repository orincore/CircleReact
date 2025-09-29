import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';

const { height: screenHeight } = Dimensions.get('window');

export default function NotificationPanel({ visible, onClose }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !visible) return;

    loadNotifications();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [token, visible]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const socket = getSocket(token);
      socket.emit('notifications:get', {});
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setLoading(false);
    }
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
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notifications:list');
    socket.off('friend:request:received');
    socket.off('friend:request:accept:confirmed');
    socket.off('friend:request:decline:confirmed');
    socket.off('friend:request:error');
  };

  const handleAcceptRequest = (notification) => {
    const socket = getSocket(token);
    socket.emit('friend:request:accept', { requestId: notification.id });
  };

  const handleDeclineRequest = (notification) => {
    Alert.alert(
      'Decline Friend Request',
      `Are you sure you want to decline ${notification.senderName}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            const socket = getSocket(token);
            socket.emit('friend:request:decline', { requestId: notification.id });
          },
        },
      ]
    );
  };

  const renderNotification = ({ item }) => {
    if (item.type === 'friend_request') {
      return (
        <View style={styles.notificationCard}>
          <View style={styles.notificationContent}>
            <View style={styles.avatarContainer}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.fallbackAvatar}>
                  <Ionicons name="person" size={20} color="#7C2B86" />
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
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptRequest(item)}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDeclineRequest(item)}
            >
              <Ionicons name="close" size={16} color="#666" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return null;
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
            <Text style={styles.headerTitle}>Notifications</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
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
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
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
    backgroundColor: '#f0e6f6',
    justifyContent: 'center',
    alignItems: 'center',
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
});
