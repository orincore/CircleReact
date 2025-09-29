import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { friendsApi } from '@/src/api/friends';
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';

export default function FriendRequestCard({ 
  request, 
  onAccept, 
  onReject, 
  onViewProfile 
}) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accept' or 'reject'
  const { token } = useAuth();

  const handleAccept = async () => {
    if (loading) return;
    
    setLoading(true);
    setActionType('accept');
    
    try {
      // Use socket instead of REST API for consistency
      const socket = getSocket(token);
      socket.emit('friend:request:accept', { requestId: request.id });
      
      onAccept(request);
      
      // Show success message
      Alert.alert(
        'Friend Request Accepted!',
        `You and ${request.sender.name} are now friends. You can start messaging each other.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (loading) return;
    
    Alert.alert(
      'Reject Friend Request',
      `Are you sure you want to reject ${request.sender.name}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setActionType('reject');
            
            try {
              // Use socket instead of REST API for consistency
              const socket = getSocket(token);
              socket.emit('friend:request:decline', { requestId: request.id });
              
              onReject(request);
            } catch (error) {
              console.error('Failed to reject friend request:', error);
              Alert.alert('Error', 'Failed to reject friend request. Please try again.');
            } finally {
              setLoading(false);
              setActionType(null);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Profile Section */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => onViewProfile(request.sender)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            {request.sender.avatar ? (
              <Image source={{ uri: request.sender.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {request.sender.name.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{request.sender.name}</Text>
            <Text style={styles.email}>{request.sender.email}</Text>
            <Text style={styles.timeAgo}>{formatDate(request.created_at)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.viewProfileButton}
            onPress={() => onViewProfile(request.sender)}
          >
            <Ionicons name="person-outline" size={20} color="#7C2B86" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Message Section */}
        {request.message && (
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={loading}
          >
            {loading && actionType === 'reject' ? (
              <ActivityIndicator size="small" color="#FF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#FF4444" />
                <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                  Reject
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF6FB5', '#A16AE8']}
              style={styles.acceptButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading && actionType === 'accept' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  profileSection: {
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#7C2B86',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  viewProfileButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  messageSection: {
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#A16AE8',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.8)',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  acceptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FF4444',
  },
  acceptButtonText: {
    color: 'white',
  },
});
