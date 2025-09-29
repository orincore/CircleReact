import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, RefreshControl, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { chatApi } from "@/src/api/chat";
import { useAuth } from "@/contexts/AuthContext";
import { getSocket } from "@/src/api/socket";
import socketService from "@/src/services/socketService";
import FriendsListModal from "@/components/FriendsListModal";

export default function ChatListScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingIndicators, setTypingIndicators] = useState({}); // chatId -> array of typing users
  const [unreadCounts, setUnreadCounts] = useState({}); // chatId -> unread count
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  const loadInbox = async (isRefresh = false) => {
    if (!token) return;
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const response = await Promise.race([
        chatApi.getInbox(token),
        timeoutPromise
      ]);
      
      // Sort conversations by most recent message (descending order)
      const sortedConversations = response.inbox.sort((a, b) => {
        const aTime = new Date(a.chat.last_message_at || a.chat.created_at).getTime();
        const bTime = new Date(b.chat.last_message_at || b.chat.created_at).getTime();
        return bTime - aTime; // Most recent first
      });
      
      setConversations(sortedConversations);
      
      // Initialize unread counts from server data
      const initialUnreadCounts = {};
      sortedConversations.forEach(conv => {
        if (conv.unreadCount > 0) {
          initialUnreadCounts[conv.chat.id] = conv.unreadCount;
        }
      });
      setUnreadCounts(prev => ({ ...prev, ...initialUnreadCounts }));
      console.log('📊 Initialized unread counts:', initialUnreadCounts);
    } catch (error) {
      console.error('Failed to load inbox:', error);
      // Set empty conversations on error to stop loading state
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, [token]);

  // Socket event handlers for real-time updates
  useEffect(() => {
    if (!token || !user?.id) return;

    const socket = getSocket(token);

    // Handle new messages in chat list
    const handleNewMessage = ({ message }) => {
      console.log('📨 New message received in chat list:', message);
      
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.chat.id === message.chatId) {
            return {
              ...conv,
              lastMessage: {
                id: message.id,
                text: message.text,
                created_at: new Date(message.createdAt).toISOString(),
                sender_id: message.senderId,
                status: message.senderId === user.id ? (message.status || 'sent') : undefined,
              },
              chat: {
                ...conv.chat,
                last_message_at: new Date(message.createdAt).toISOString(),
              }
            };
          }
          return conv;
        });

        // Sort conversations by most recent message (descending order)
        return updatedConversations.sort((a, b) => {
          const aTime = new Date(a.chat.last_message_at || a.chat.created_at).getTime();
          const bTime = new Date(b.chat.last_message_at || b.chat.created_at).getTime();
          return bTime - aTime; // Most recent first
        });
      });

      // Update unread count if message is not from current user
      if (message.senderId !== user.id) {
        setUnreadCounts(prev => {
          const newCount = (prev[message.chatId] || 0) + 1;
          console.log(`📊 Updated unread count for chat ${message.chatId}: ${newCount}`);
          return {
            ...prev,
            [message.chatId]: newCount
          };
        });
      }
    };

    // Handle background messages
    const handleBackgroundMessage = ({ message }) => {
      handleNewMessage({ message });
    };

    // Handle typing indicators
    const handleTyping = ({ chatId, users }) => {
      setTypingIndicators(prev => ({
        ...prev,
        [chatId]: users.filter(userId => userId !== user.id)
      }));
    };

    // Handle read receipts to clear unread counts
    const handleRead = ({ chatId, messageId, by }) => {
      console.log('👁️ Read receipt received:', { chatId, messageId, by, currentUserId: user.id });
      if (by === user.id) {
        console.log(`📊 Clearing unread count for chat ${chatId}`);
        setUnreadCounts(prev => ({
          ...prev,
          [chatId]: 0
        }));
      }
    };
    
    // Handle unread count updates from server
    const handleUnreadCountUpdate = ({ chatId, unreadCount }) => {
      console.log(`📊 Unread count update from server for chat ${chatId}: ${unreadCount}`);
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: unreadCount
      }));
    };

    // Handle message status updates for chat list
    const handleMessageStatusUpdate = ({ messageId, chatId, status }) => {
      setConversations(prev => prev.map(conv => {
        if (conv.chat.id === chatId && conv.lastMessage?.id === messageId) {
          return {
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              status: status
            }
          };
        }
        return conv;
      }));
    };

    // Handle delivery receipts
    const handleDeliveryReceipt = ({ messageId, chatId, status }) => {
      handleMessageStatusUpdate({ messageId, chatId, status });
    };

    // Handle read receipts
    const handleReadReceipt = ({ messageId, chatId, status }) => {
      handleMessageStatusUpdate({ messageId, chatId, status: 'read' });
    };

    // Register global handlers
    socketService.addMessageHandler('chat-list', handleBackgroundMessage);
    
    // Listen to socket events
    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:read', handleRead);
    socket.on('chat:message:delivery_receipt', handleDeliveryReceipt);
    socket.on('chat:message:read_receipt', handleReadReceipt);
    socket.on('chat:unread_count', handleUnreadCountUpdate);
    
    console.log('🔌 Socket listeners registered for chat list');

    return () => {
      console.log('🔌 Cleaning up socket listeners for chat list');
      socketService.removeMessageHandler('chat-list');
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:read', handleRead);
      socket.off('chat:message:delivery_receipt', handleDeliveryReceipt);
      socket.off('chat:message:read_receipt', handleReadReceipt);
      socket.off('chat:unread_count', handleUnreadCountUpdate);
    };
  }, [token, user?.id]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(item => 
    (item.otherName && item.otherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.lastMessage && item.lastMessage.text && item.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  const handleChatPress = (chatId, name, profilePhoto) => {
    // Clear unread count when entering chat
    console.log(`📱 Opening chat ${chatId}, clearing unread count`);
    setUnreadCounts(prev => ({
      ...prev,
      [chatId]: 0
    }));
    
    router.push({
      pathname: "/secure/chat-conversation",
      params: { 
        id: chatId, 
        name: name,
        avatar: profilePhoto
      }
    });
  };

  const handleChatCreated = (chatId, name, profilePhoto) => {
    console.log('Chat created, navigating to:', { chatId, name, profilePhoto });
    
    // Refresh inbox to show the new chat
    loadInbox(true);
    
    // Navigate to the new chat
    handleChatPress(chatId, name, profilePhoto);
  };

  return (
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
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity 
            style={styles.newMessageButton}
            onPress={() => setShowFriendsModal(true)}
          >
            <Ionicons name="people" size={22} color="#FFE8FF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(31, 17, 71, 0.45)" />
          <TextInput
            placeholder="Search conversations"
            placeholderTextColor="rgba(31, 17, 71, 0.45)"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFE8FF" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.chat.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadInbox(true)}
                tintColor="#FFE8FF"
                colors={["#FFE8FF"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.emptyText}>No conversations yet</Text>
                <Text style={styles.emptySubtext}>Start a new conversation to see it here</Text>
              </View>
            }
            renderItem={({ item }) => {
              const chatId = item.chat.id;
              const isTyping = typingIndicators[chatId] && typingIndicators[chatId].length > 0;
              const currentUnreadCount = unreadCounts[chatId] || item.unreadCount || 0;
              
              return (
                <TouchableOpacity
                  style={styles.chatCard}
                  onPress={() => handleChatPress(chatId, item.otherName, item.otherProfilePhoto)}
                >
                  <View style={styles.avatar}>
                    {item.otherProfilePhoto && item.otherProfilePhoto.trim() ? (
                      <Image 
                        source={{ uri: item.otherProfilePhoto }} 
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.fallbackAvatar}>
                        <Text style={styles.fallbackAvatarText}>
                          {(item.otherName && item.otherName.charAt(0).toUpperCase()) || '?'}
                        </Text>
                      </View>
                    )}
                    {isTyping && (
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingDot} />
                      </View>
                    )}
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatName}>{item.otherName || 'Unknown'}</Text>
                      <Text style={styles.chatTime}>{formatTime((item.lastMessage && item.lastMessage.created_at) || item.chat.last_message_at)}</Text>
                    </View>
                    <View style={styles.messageRow}>
                      <Text style={[
                        styles.chatMessage,
                        isTyping && styles.typingText
                      ]} numberOfLines={1}>
                        {isTyping 
                          ? 'typing...' 
                          : (item.lastMessage && item.lastMessage.text) || 'No messages yet'
                        }
                      </Text>
                      {item.lastMessage && item.lastMessage.sender_id === user.id && item.lastMessage.status && (
                        <Ionicons
                          name={
                            item.lastMessage.status === 'read' ? 'checkmark-done' : 
                            item.lastMessage.status === 'delivered' ? 'checkmark' : 
                            item.lastMessage.status === 'sent' ? 'checkmark' :
                            item.lastMessage.status === 'sending' ? 'time-outline' :
                            item.lastMessage.status === 'failed' ? 'alert-circle-outline' :
                            'ellipse-outline'
                          }
                          size={12}
                          color={
                            item.lastMessage.status === 'read' ? '#7C2B86' : 
                            item.lastMessage.status === 'delivered' ? 'rgba(124,43,134,0.7)' : 
                            item.lastMessage.status === 'sent' ? 'rgba(124,43,134,0.5)' :
                            item.lastMessage.status === 'sending' ? 'rgba(124,43,134,0.4)' :
                            item.lastMessage.status === 'failed' ? '#FF4444' :
                            'rgba(124,43,134,0.3)'
                          }
                          style={styles.messageStatus}
                        />
                      )}
                    </View>
                  </View>
                  {currentUnreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{currentUnreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
          )}
        </View>

        {/* Friends List Modal */}
        <FriendsListModal
          visible={showFriendsModal}
          onClose={() => setShowFriendsModal(false)}
          onChatCreated={handleChatCreated}
        />
      </LinearGradient>
    );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  newMessageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.5)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F1147",
  },
  listContent: {
    paddingVertical: 24,
  },
  separator: {
    height: 16,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 16,
  },
  avatar: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fallbackAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 214, 242, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2B86',
  },
  typingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1147",
  },
  chatTime: {
    fontSize: 12,
    color: "rgba(31, 17, 71, 0.55)",
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatMessage: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.65)",
    flex: 1,
  },
  messageStatus: {
    marginLeft: 4,
  },
  typingText: {
    fontStyle: 'italic',
    color: '#4CAF50',
    fontWeight: '500',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C2B86",
    paddingHorizontal: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  blurCircleLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 214, 242, 0.24)",
    top: -120,
    right: -60,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    bottom: 20,
    left: -70,
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
});
