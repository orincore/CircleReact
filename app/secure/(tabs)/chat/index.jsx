import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, RefreshControl, Image, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { chatApi } from "@/src/api/chat";
import { useAuth } from "@/contexts/AuthContext";
import { getSocket } from "@/src/api/socket";
import socketService from "@/src/services/socketService";
import FriendsListModal from "@/components/FriendsListModal";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";

export default function ChatListScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const responsive = useResponsiveDimensions();
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  // Get user's first name
  const getUserFirstName = () => {
    return user?.firstName || user?.first_name || 'there';
  };
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
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={["#1a0b2e", "#2d1b4e", "#1a0b2e"]}
        style={styles.backgroundGradient}
      >
        {/* Floating orbs */}
        <View style={[styles.floatingOrb, styles.orb1]} />
        <View style={[styles.floatingOrb, styles.orb2]} />
        <View style={[styles.floatingOrb, styles.orb3]} />
      </LinearGradient>

      <View style={[styles.contentContainer, { paddingHorizontal: responsive.horizontalPadding }]}>
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="chatbubbles" size={28} color="#7C2B86" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.messagesTitle, { fontSize: responsive.isSmallScreen ? 28 : 32 }]}>
              Messages
            </Text>
            <Text style={styles.headerSubtitle}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.newMessageButton, { 
              width: responsive.buttonHeight, 
              height: responsive.buttonHeight,
              borderRadius: responsive.buttonHeight / 2 
            }]}
            onPress={() => setShowFriendsModal(true)}
          >
            <Ionicons name="create-outline" size={responsive.isSmallScreen ? 20 : 22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { paddingHorizontal: responsive.spacing.lg }]}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput
            placeholder="Search conversations"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
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
                  style={[styles.chatCard, { 
                    paddingHorizontal: responsive.spacing.lg,
                    paddingVertical: responsive.spacing.md,
                    gap: responsive.spacing.md 
                  }]}
                  onPress={() => handleChatPress(chatId, item.otherName, item.otherProfilePhoto)}
                >
                  <View style={styles.avatar}>
                    {item.otherProfilePhoto && item.otherProfilePhoto.trim() ? (
                      <Image 
                        source={{ uri: item.otherProfilePhoto }} 
                        style={[styles.avatarImage, { 
                          width: responsive.avatarSize, 
                          height: responsive.avatarSize,
                          borderRadius: responsive.avatarSize / 2 
                        }]}
                      />
                    ) : (
                      <View style={[styles.fallbackAvatar, { 
                        width: responsive.avatarSize, 
                        height: responsive.avatarSize,
                        borderRadius: responsive.avatarSize / 2 
                      }]}>
                        <Text style={[styles.fallbackAvatarText, { 
                          fontSize: responsive.isSmallScreen ? 18 : 20 
                        }]}>
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
                      <Text style={[styles.chatName, { fontSize: responsive.fontSize.large }]}>
                        {item.otherName || 'Unknown'}
                      </Text>
                      <Text style={[styles.chatTime, { fontSize: responsive.fontSize.small }]}>
                        {formatTime((item.lastMessage && item.lastMessage.created_at) || item.chat.last_message_at)}
                      </Text>
                    </View>
                    <View style={styles.messageRow}>
                      <Text style={[
                        styles.chatMessage,
                        { fontSize: responsive.fontSize.medium },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingOrb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    backgroundColor: '#7C2B86',
    top: -100,
    right: -50,
  },
  orb2: {
    width: 250,
    height: 250,
    backgroundColor: '#5D5FEF',
    bottom: 100,
    left: -80,
  },
  orb3: {
    width: 200,
    height: 200,
    backgroundColor: '#FF6FB5',
    top: '40%',
    right: '10%',
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 32 : 42,
    paddingBottom: 24,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 214, 242, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  messagesTitle: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  title: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  newMessageButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124, 43, 134, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.4)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  avatar: {
    position: 'relative',
  },
  avatarImage: {
    // Responsive sizes applied inline
  },
  fallbackAvatar: {
    backgroundColor: "rgba(255, 214, 242, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatarText: {
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
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatTime: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatMessage: {
    color: "rgba(255, 255, 255, 0.7)",
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
