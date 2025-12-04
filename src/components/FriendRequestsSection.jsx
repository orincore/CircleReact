import { useAuth } from '@/contexts/AuthContext';
import { friendsApi } from '@/src/api/friends';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import FriendRequestCard from './FriendRequestCard';

export default function FriendRequestsSection() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    loadFriendRequests();
  }, []);

  const loadFriendRequests = async (isRefresh = false) => {
    if (!token) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // First try the debug endpoint to see what's in the database
      try {
        const debugResponse = await friendsApi.debugRequests(token);
        //console.log('Debug friend requests:', debugResponse);
      } catch (debugError) {
        //console.log('Debug endpoint failed:', debugError);
      }

      const response = await friendsApi.getPendingRequests(token);
      //console.log('Pending requests response:', response);
      setRequests(response.requests || []);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      // Don't show error for missing tables during development
      if (error.message.includes('relation') || error.message.includes('table')) {
        //console.log('Friend requests table not yet created');
        setRequests([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptRequest = async (request) => {
    // Remove from local state immediately for better UX
    setRequests(prev => prev.filter(r => r.id !== request.id));
    
    // The request is already accepted by the FriendRequestCard component
    // Here we can add additional logic like navigating to chat
    //console.log('Friend request accepted:', request.sender.name);
  };

  const handleRejectRequest = async (request) => {
    // Remove from local state immediately for better UX
    setRequests(prev => prev.filter(r => r.id !== request.id));
    
    //console.log('Friend request rejected:', request.sender.name);
  };

  const handleViewProfile = (user) => {
    // Navigate to user profile page
    router.push(`/secure/user-profile/${user.id}`);
  };

  const onRefresh = () => {
    loadFriendRequests(true);
  };

  const createTestRequest = async () => {
    if (!token) return;
    
    try {
      await friendsApi.createTestRequest(token);
      Alert.alert('Success', 'Test friend request created!');
      loadFriendRequests(true); // Refresh the list
    } catch (error) {
      console.error('Failed to create test request:', error);
      Alert.alert('Error', 'Failed to create test request');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading friend requests...</Text>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={['rgba(124, 43, 134, 0.1)', 'rgba(161, 106, 232, 0.05)']}
          style={styles.emptyCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="people-outline" size={48} color="rgba(124, 43, 134, 0.5)" />
          <Text style={styles.emptyTitle}>No Friend Requests</Text>
          <Text style={styles.emptyMessage}>
            When someone sends you a friend request, it will appear here.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#FF6FB5', '#A16AE8']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="people" size={24} color="white" />
          <Text style={styles.headerTitle}>Friend Requests</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{requests.length}</Text>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendRequestCard
            request={item}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
            onViewProfile={handleViewProfile}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7C2B86']}
            tintColor="#7C2B86"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7C2B86',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2B86',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: 'rgba(124, 43, 134, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#7C2B86',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
