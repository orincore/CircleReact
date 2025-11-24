/**
 * UnfriendTestComponent - Test component to verify unfriend functionality
 * This component can be used to test unfriend functionality across iOS, Android, and Web
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { friendsApi } from '@/src/api/friends';
import { FriendRequestService } from '@/src/services/FriendRequestService';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function UnfriendTestComponent({ visible, onClose }) {
  const { token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unfriendingUser, setUnfriendingUser] = useState(null);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await friendsApi.getFriendsList(token);
      setFriends(response.friends || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
      Alert.alert('Error', 'Failed to load friends list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testUnfriend = async (friend) => {
    if (!token || unfriendingUser) return;
    
    Alert.alert(
      'Test Unfriend Functionality',
      `Test removing ${friend.name} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnfriendingUser(friend.id);
              
              console.log(`🧪 Testing unfriend for ${friend.name} (${friend.id}) on ${Platform.OS}`);
              
              // Test the unfriend service
              const result = await FriendRequestService.unfriendUser(friend.id, token);
              
              console.log('✅ Unfriend test successful:', result);
              
              // Remove from local state
              setFriends(prevFriends => prevFriends.filter(f => f.id !== friend.id));
              
              Alert.alert(
                'Test Successful!', 
                `Unfriend functionality works correctly on ${Platform.OS}. ${friend.name} has been removed from your friends list.`
              );
              
            } catch (error) {
              console.error('❌ Unfriend test failed:', error);
              
              let errorMessage = `Unfriend test failed on ${Platform.OS}: ${error.message}`;
              
              Alert.alert('Test Failed', errorMessage);
            } finally {
              setUnfriendingUser(null);
            }
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unfriend Functionality Test</Text>
        <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C2B86" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <ScrollView style={styles.friendsList}>
          {friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No friends to test with</Text>
              <Text style={styles.emptySubtext}>Add some friends first to test unfriend functionality</Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendId}>ID: {friend.id}</Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    unfriendingUser === friend.id && styles.testButtonLoading
                  ]}
                  onPress={() => testUnfriend(friend)}
                  disabled={unfriendingUser === friend.id}
                >
                  {unfriendingUser === friend.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="person-remove-outline" size={16} color="#FFF" />
                      <Text style={styles.testButtonText}>Test Unfriend</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This component tests unfriend functionality across all platforms
        </Text>
        <View style={styles.platformInfo}>
          <Text style={styles.platformText}>
            ✅ iOS Support | ✅ Android Support | ✅ Web Support
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#7C2B86',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 55 : 25,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  friendsList: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  friendId: {
    fontSize: 12,
    color: '#999',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  testButtonLoading: {
    backgroundColor: '#FF9999',
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  platformInfo: {
    alignItems: 'center',
  },
  platformText: {
    fontSize: 12,
    color: '#00AA55',
    fontWeight: '500',
  },
});
