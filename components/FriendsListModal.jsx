import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { friendsApi } from '@/src/api/friends';
import { chatApi } from '@/src/api/chat';
import { useAuth } from '@/contexts/AuthContext';

export default function FriendsListModal({ visible, onClose, onChatCreated }) {
  const { token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingChat, setCreatingChat] = useState(null); // Track which friend is being processed

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

  const handleStartChat = async (friend) => {
    if (!token || creatingChat) return;
    
    try {
      setCreatingChat(friend.id);
      console.log('Creating chat with friend:', friend);
      
      const response = await chatApi.createChatWithUser(friend.id, token);
      console.log('Chat created:', response);
      
      // Close modal and navigate to chat
      onClose();
      onChatCreated(response.chat.id, response.otherUser.name, response.otherUser.profilePhoto);
      
    } catch (error) {
      console.error('Failed to create chat:', error);
      let errorMessage = 'Failed to start chat. Please try again.';
      
      if (error.message?.includes('not_friends')) {
        errorMessage = 'You can only chat with friends. Please send a friend request first.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setCreatingChat(null);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriend = ({ item }) => {
    const isCreating = creatingChat === item.id;
    
    return (
      <TouchableOpacity
        style={styles.friendCard}
        onPress={() => handleStartChat(item)}
        disabled={isCreating}
      >
        <View style={styles.avatar}>
          {item.profile_photo_url && item.profile_photo_url.trim() ? (
            <Image 
              source={{ uri: item.profile_photo_url }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.fallbackAvatar}>
              <Text style={styles.fallbackAvatarText}>
                {(item.name && item.name.charAt(0).toUpperCase()) || '?'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.name || 'Unknown'}</Text>
          <Text style={styles.friendStatus}>
            {isCreating ? 'Starting chat...' : 'Tap to start chat'}
          </Text>
        </View>
        
        <View style={styles.chatIcon}>
          {isCreating ? (
            <ActivityIndicator size="small" color="#7C2B86" />
          ) : (
            <Ionicons name="chatbubble" size={20} color="#7C2B86" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.blurCircleLarge} />
        <View style={styles.blurCircleSmall} />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Start New Chat</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(31, 17, 71, 0.45)" />
            <TextInput
              placeholder="Search friends"
              placeholderTextColor="rgba(31, 17, 71, 0.45)"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFE8FF" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="rgba(255, 255, 255, 0.5)" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No friends found' : 'No friends yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery 
                      ? 'Try a different search term' 
                      : 'Add friends to start chatting'
                    }
                  </Text>
                </View>
              }
              renderItem={renderFriend}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
  },
  listContent: {
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 16,
  },
  avatar: {
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  fallbackAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 214, 242, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 2,
  },
  friendStatus: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.65)',
  },
  chatIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#FFE8FF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#FFE8FF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255, 232, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  blurCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 214, 242, 0.24)',
    top: -120,
    right: -60,
  },
  blurCircleSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    bottom: 20,
    left: -70,
  },
});
