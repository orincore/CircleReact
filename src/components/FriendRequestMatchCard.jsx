import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { friendsApi } from '@/src/api/friends';
import { useAuth } from '@/contexts/AuthContext';

export default function FriendRequestMatchCard({ 
  request, 
  onAccept, 
  onReject, 
  onViewProfile 
}) {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const handleAccept = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await friendsApi.acceptFriendRequest(request.id, token);
      onAccept(request);
      Alert.alert('Friend Request Accepted!', `You and ${request.sender.name} are now friends.`);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setLoading(false);
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
            try {
              await friendsApi.rejectFriendRequest(request.id, token);
              onReject(request);
            } catch (error) {
              console.error('Failed to reject friend request:', error);
              Alert.alert('Error', 'Failed to reject friend request. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.matchCard}>
      <TouchableOpacity 
        style={styles.matchAvatar}
        onPress={() => onViewProfile(request.sender)}
      >
        <LinearGradient
          colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
          style={styles.avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarEmoji}>👋</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <Text style={styles.matchName}>{request.sender.name}</Text>
      <Text style={styles.matchLocation}>Friend Request</Text>
      
      <View style={styles.matchFooter}>
        <View style={styles.compatibilityPill}>
          <Ionicons name="people" size={14} color="#7C2B86" />
          <Text style={styles.compatibilityText}>Wants to connect</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectAction}
            onPress={handleReject}
            disabled={loading}
          >
            <Ionicons name="close" size={16} color="#FF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.acceptAction}
            onPress={handleAccept}
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
    </View>
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
