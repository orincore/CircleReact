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
  View
} from 'react-native';

export default function FriendRequestMatchCard({ 
  request, 
  onAccept, 
  onReject, 
  onViewProfile 
}) {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

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
    <TouchableOpacity 
      style={styles.matchCard}
      onPress={() => onViewProfile(request.sender)}
      activeOpacity={0.8}
    >
      <View style={styles.matchAvatar}>
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
            colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarEmoji}>
              {request.sender?.first_name?.charAt(0)?.toUpperCase() || '👋'}
            </Text>
          </LinearGradient>
        )}
      </View>
      
      <Text style={styles.matchName}>{senderName}</Text>
      <Text style={styles.matchLocation}>Friend Request</Text>
      
      <View style={styles.matchFooter}>
        <View style={styles.compatibilityPill}>
          <Ionicons name="people" size={14} color="#7C2B86" />
          <Text style={styles.compatibilityText}>Wants to connect</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectAction}
            onPress={(e) => {
              e.stopPropagation();
              handleReject();
            }}
            disabled={loading}
          >
            <Ionicons name="close" size={16} color="#FF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.acceptAction}
            onPress={(e) => {
              e.stopPropagation();
              handleAccept();
            }}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00AA55', '#00CC66']}
              style={styles.acceptGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    width: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  matchAvatar: {
    marginBottom: 12,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  matchLocation: {
    fontSize: 12,
    color: 'rgba(255, 232, 255, 0.7)',
    marginBottom: 12,
    textAlign: 'center',
  },
  matchFooter: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  compatibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  compatibilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 232, 255, 0.9)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  rejectAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  acceptAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  acceptGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
