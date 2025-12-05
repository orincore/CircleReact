import { useAuth } from '@/contexts/AuthContext';
import { friendsApi } from '@/src/api/friends';
import { FriendRequestService } from '@/src/services/FriendRequestService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';

// Helper function to format time ago
const getTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
};

export default function FriendRequestMatchCard({ 
  request, 
  onAccept, 
  onReject, 
  onViewProfile 
}) {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { width } = useWindowDimensions();

  // Get sender name from different possible formats
  const getSenderName = () => {
    if (!request.sender) return 'Someone';
    if (request.sender.name) return request.sender.name;
    if (request.sender.first_name) {
      return `${request.sender.first_name} ${request.sender.last_name || ''}`.trim();
    }
    return 'Someone';
  };

  const senderName = getSenderName();
  const timeAgo = request.created_at ? getTimeAgo(new Date(request.created_at)) : '';
  


  const handleAccept = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Use the improved FriendRequestService
      const result = await FriendRequestService.acceptFriendRequest(request.id, token);
      onAccept(request);
      Alert.alert('Friend Request Accepted!', `You and ${senderName} are now friends.`);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      
      // Show specific error message
      let errorMessage = 'Failed to accept friend request. Please try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Friend request no longer exists. It may have been cancelled.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (loading) return;
    
    Alert.alert(
      'Reject Friend Request',
      `Are you sure you want to reject ${senderName}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Use the improved FriendRequestService
              const result = await FriendRequestService.declineFriendRequest(request.id, token);
              onReject(request);
            } catch (error) {
              console.error('Failed to reject friend request:', error);
              
              // Show specific error message
              let errorMessage = 'Failed to reject friend request. Please try again.';
              if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your connection and try again.';
              } else if (error.message.includes('Socket connection not available')) {
                errorMessage = 'Connection issue. Please refresh the page and try again.';
              } else if (error.message.includes('not found')) {
                errorMessage = 'Friend request no longer exists. It may have been cancelled.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.requestCard}>
      {/* Tappable Avatar */}
      <TouchableOpacity 
        style={styles.avatarContainer}
        onPress={() => onViewProfile(request.sender)}
        activeOpacity={0.7}
      >
        {request.sender?.profile_photo_url ? (
          <Image 
            source={{ uri: request.sender.profile_photo_url }}
            style={styles.avatarImage}
            onError={(error) => {
              console.error('Failed to load profile image:', error);
            }}
            defaultSource={require('@/assets/images/default-avatar.png')}
          />
        ) : (
          <LinearGradient
            colors={['#7C2B86', '#FF6FB5']}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {request.sender?.first_name?.charAt(0)?.toUpperCase() || '👋'}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
      
      {/* Content Section */}
      <View style={styles.contentSection}>
        <View style={styles.headerSection}>
          <Text style={styles.nameText} numberOfLines={1}>{senderName}</Text>
          <Text style={styles.subtitleText} numberOfLines={1}>
            Friend request{timeAgo ? ` · ${timeAgo}` : ''}
          </Text>
        </View>
        
        {/* Wants to connect pill */}
        <View style={styles.connectPill}>
          <Ionicons name="people" size={12} color="#7C2B86" />
          <Text style={styles.connectPillText}>Wants to connect</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={(e) => {
            e.stopPropagation();
            handleReject();
          }}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={(e) => {
            e.stopPropagation();
            handleAccept();
          }}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // New card design matching WhatsApp/Instagram style
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentSection: {
    flex: 1,
    gap: 6,
  },
  headerSection: {
    gap: 2,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  connectPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E8B4D8',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
});
