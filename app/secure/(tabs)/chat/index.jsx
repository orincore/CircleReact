import { getAdComponents } from "@/components/ads/AdWrapper";
import FriendsListModal from "@/components/FriendsListModal";
import VerificationBanner from "@/components/VerificationBanner";
import VerificationGuard from "@/components/VerificationGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { chatApi } from "@/src/api/chat";
import { getSocket } from "@/src/api/socket";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";
import socketService from "@/src/services/socketService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Swipeable } from 'react-native-gesture-handler';
import { ActivityIndicator, Alert, FlatList, Image, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { BannerAd } = getAdComponents();

export default function ChatListScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const responsive = useResponsiveDimensions();
  const { shouldShowAds } = useSubscription();
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const openWebMenu = (chatId) => {
    try {
      const ref = buttonRefs.current[chatId];
      if (ref && ref.measureInWindow) {
        ref.measureInWindow((x, y, width, height) => {
          // Desired menu size approximation
          const menuWidth = 180; // matches min width + padding
          const menuHeight = 180; // enough for 3-4 items
          const margin = 12; // gap from screen edges
          const { width: sw, height: sh } = Dimensions.get('window');
          // initial desired pos (aligned to right of button, below with 8px space)
          let nx = x - menuWidth + width;
          let ny = y + height + 8;
          // clamp within viewport with gap
          nx = Math.max(margin, Math.min(nx, sw - menuWidth - margin));
          ny = Math.max(margin, Math.min(ny, sh - menuHeight - margin));
          setMenuCoords({ x: nx, y: ny });
          setOpenMenuChatId(chatId);
        });
      } else {
        setMenuCoords(null);
        setOpenMenuChatId(chatId);
      }
    } catch (e) {
      setMenuCoords(null);
      setOpenMenuChatId(chatId);
    }
  };

  const handleUnarchiveChat = async (chatId) => {
    try {
      if (!token) return;
      await chatApi.setArchived(chatId, false, token);
      setOpenMenuChatId(null);
      await loadInbox(true);
    } catch (e) {
      console.error('[ChatList] Failed to unarchive chat:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to unarchive chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to unarchive chat.');
      }
    }
  };

  const handleArchiveChat = async (chatId) => {
    try {
      if (!token) return;
      await chatApi.setArchived(chatId, true, token);
      setOpenMenuChatId(null);
      await loadInbox(true);
    } catch (e) {
      console.error('[ChatList] Failed to archive chat:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to archive chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to archive chat.');
      }
    }
  };

  const handlePinChat = async (chatId) => {
    try {
      if (!token) return;
      await chatApi.setPinned(chatId, true, token);
      setOpenMenuChatId(null);
      await loadInbox(true);
    } catch (e) {
      console.error('[ChatList] Failed to pin chat:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to pin chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to pin chat.');
      }
    }
  };

  const handleUnpinChat = async (chatId) => {
    try {
      if (!token) return;
      await chatApi.setPinned(chatId, false, token);
      setOpenMenuChatId(null);
      await loadInbox(true);
    } catch (e) {
      console.error('[ChatList] Failed to unpin chat:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to unpin chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to unpin chat.');
      }
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const confirmed = Platform.OS === 'web' ? window.confirm('Delete this chat?') : true;
      if (!confirmed) return;
      setOpenMenuChatId(null);
      // Ensure we have a token; fall back to AsyncStorage if context hasn't populated yet
      let effectiveToken = token;
      if (!effectiveToken) {
        try {
          effectiveToken = await AsyncStorage.getItem("@circle:access_token");
        } catch {}
      }
      if (!effectiveToken) {
        if (Platform.OS === 'web') {
          window.alert('Not authenticated. Please log in again.');
        } else {
          Alert.alert('Error', 'Not authenticated. Please log in again.');
        }
        return;
      }
      try {
        await chatApi.deleteChat(chatId, effectiveToken);
        setConversations(prev => Array.isArray(prev) ? prev.filter(c => c?.chat?.id !== chatId) : prev);
      } catch (err) {
        const msg = String(err?.message || err);
        // Fallback: if DELETE not available on backend (404) or not authorized (403), archive instead
        const status = err?.status;
        if (msg.includes('Not Found') || msg.includes('404') || msg.includes('Not authorized') || msg.includes('403') || status === 403 || status === 404) {
          try {
            await chatApi.setArchived(chatId, true, effectiveToken);
            setConversations(prev => Array.isArray(prev) ? prev.filter(c => c?.chat?.id !== chatId) : prev);
            if (Platform.OS === 'web') {
              // Silent on success for web
            } else {
              Alert.alert('Archived', 'Chat archived. You can unarchive from Messages.');
            }
          } catch (archiveErr) {
            console.error('[ChatList] Delete fallback archive failed:', archiveErr);
            if (Platform.OS === 'web') {
              window.alert('Failed to delete or archive chat. Please try again.');
            } else {
              Alert.alert('Error', 'Failed to delete or archive chat.');
            }
          }
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error('[ChatList] Failed to delete chat:', e);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete chat. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete chat.');
      }
    }
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
  const [openMenuChatId, setOpenMenuChatId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [menuCoords, setMenuCoords] = useState(null); // { x, y }
  const buttonRefs = React.useRef({});

  const loadInbox = async (isRefresh = false) => {
    if (!token) {
      console.warn('No token available for loading inbox');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
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
      
      // Validate response
      if (!response || !Array.isArray(response.inbox)) {
        console.error('Invalid inbox response:', response);
        setConversations([]);
        return;
      }
      
      // Sort pinned first, then by most recent message (descending)
      const sortedConversations = response.inbox.sort((a, b) => {
        try {
          if (a?.pinned !== b?.pinned) return a?.pinned ? -1 : 1;
          const aTime = new Date(a?.chat?.last_message_at || a?.chat?.created_at || 0).getTime();
          const bTime = new Date(b?.chat?.last_message_at || b?.chat?.created_at || 0).getTime();
          return bTime - aTime;
        } catch (err) {
          console.error('Error sorting conversations:', err);
          return 0;
        }
      });
      
      setConversations(sortedConversations);
      
      // Initialize unread counts from server data
      const initialUnreadCounts = {};
      sortedConversations.forEach(conv => {
        try {
          if (conv?.unreadCount > 0 && conv?.chat?.id) {
            initialUnreadCounts[conv.chat.id] = conv.unreadCount;
          }
        } catch (err) {
          console.error('Error processing conversation unread count:', err);
        }
      });
      setUnreadCounts(prev => ({ ...prev, ...initialUnreadCounts }));
      //console.log('📊 Initialized unread counts:', initialUnreadCounts);
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
    if (!token || !user?.id) {
      console.warn('[ChatList] Missing token or user ID for socket connection');
      return;
    }

    let socket;
    try {
      socket = getSocket(token);
      if (!socket) {
        console.error('[ChatList] Failed to get socket instance');
        return;
      }
    } catch (error) {
      console.error('[ChatList] Error getting socket:', error);
      return;
    }

    // Handle new messages in chat list
    const handleNewMessage = ({ message }) => {
      try {
        //console.log('📨 New message received in chat list:', message);
        
        if (!message || !message.chatId) {
          console.error('[ChatList] Invalid message received:', message);
          return;
        }
        
        setConversations(prev => {
          try {
            if (!Array.isArray(prev)) {
              console.error('[ChatList] Conversations state is not an array:', prev);
              return [];
            }
        
            const updatedConversations = prev.map(conv => {
              try {
                if (!conv || !conv.chat) {
                  console.warn('[ChatList] Invalid conversation object:', conv);
                  return conv;
                }
                
                if (conv.chat.id === message.chatId) {
                  return {
                    ...conv,
                    lastMessage: {
                      id: message.id || 'unknown',
                      text: message.text || '',
                      created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
                      sender_id: message.senderId,
                      status: message.senderId === user.id ? (message.status || 'sent') : undefined,
                    },
                    chat: {
                      ...conv.chat,
                      last_message_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString()
                    }
                  };
                }
                return conv;
              } catch (convError) {
                console.error('[ChatList] Error processing conversation:', convError, conv);
                return conv;
              }
            });

            // Sort conversations by most recent message (descending order)
            const sortedConversations = updatedConversations.sort((a, b) => {
              try {
                const aTime = new Date(a?.chat?.last_message_at || a?.chat?.created_at || 0).getTime();
                const bTime = new Date(b?.chat?.last_message_at || b?.chat?.created_at || 0).getTime();
                return bTime - aTime; // Most recent first
              } catch (err) {
                console.error('[ChatList] Sort error:', err);
                return 0;
              }
            });
            
            return sortedConversations;
          } catch (stateError) {
            console.error('[ChatList] Error updating conversations state:', stateError);
            return prev;
          }
        });
      } catch (error) {
        console.error('[ChatList] Error in handleNewMessage:', error);
      }

      // Update unread count if message is not from current user
      if (message.senderId !== user.id) {
        setUnreadCounts(prev => {
          const newCount = (prev[message.chatId] || 0) + 1;
          //console.log(`📊 Updated unread count for chat ${message.chatId}: ${newCount}`);
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

    const handleListTyping = ({ chatId, by, isTyping }) => {
      setTypingIndicators(prev => {
        const existing = prev[chatId] || [];
        const others = existing.filter(u => u !== by);
        const next = isTyping ? [...others, by] : others;
        return { ...prev, [chatId]: next.filter(u => u !== user.id) };
      });
    };

    // Handle read receipts to clear unread counts
    const handleRead = ({ chatId, messageId, by }) => {
      //console.log('👁️ Read receipt received:', { chatId, messageId, by, currentUserId: user.id });
      if (by === user.id) {
        //console.log(`📊 Clearing unread count for chat ${chatId}`);
        setUnreadCounts(prev => ({
          ...prev,
          [chatId]: 0
        }));
      }
    };
    
    // Handle unread count updates from server
    const handleUnreadCountUpdate = ({ chatId, unreadCount }) => {
      //console.log(`📊 Unread count update from server for chat ${chatId}: ${unreadCount}`);
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

    // Remove conversation when unfriended
    const handleUnfriended = (data) => {
      try {
        if (!data || !data.unfriendedBy) return;
        setConversations(prev => {
          if (!Array.isArray(prev)) return prev;
          const filtered = prev.filter(conv => conv?.otherId !== data.unfriendedBy);
          return filtered;
        });
      } catch (e) {
        console.error('[ChatList] Error handling unfriended event:', e);
      }
    };

    // Stable list change refresher for on/off
    const handleListChanged = () => loadInbox(true);

    try {
      // Register global handlers
      if (socketService && typeof socketService.addMessageHandler === 'function') {
        socketService.addMessageHandler('chat-list', handleBackgroundMessage);
      }
      
      // Listen to socket events
      if (socket && typeof socket.on === 'function') {
        socket.on('chat:message', handleNewMessage);
        socket.on('chat:typing', handleTyping);
        socket.on('chat:list:typing', handleListTyping);
        socket.on('chat:read', handleRead);
        socket.on('chat:message:delivery_receipt', handleDeliveryReceipt);
        socket.on('chat:message:read_receipt', handleReadReceipt);
        socket.on('chat:unread_count', handleUnreadCountUpdate);
        socket.on('friend:unfriended', handleUnfriended);
        socket.on('chat:list:changed', handleListChanged);
      }

      //console.log('🔌 Socket listeners registered for chat list');
    } catch (error) {
      console.error('[ChatList] Error registering socket listeners:', error);
    }

    return () => {
      try {
        //console.log('🔌 Cleaning up socket listeners for chat list');
        
        if (socketService && typeof socketService.removeMessageHandler === 'function') {
          socketService.removeMessageHandler('chat-list');
        }
        
        if (socket && typeof socket.off === 'function') {
          socket.off('chat:message', handleNewMessage);
          socket.off('chat:typing', handleTyping);
          socket.off('chat:list:typing', handleListTyping);
          socket.off('chat:read', handleRead);
          socket.off('chat:message:delivery_receipt', handleDeliveryReceipt);
          socket.off('chat:message:read_receipt', handleReadReceipt);
          socket.off('chat:unread_count', handleUnreadCountUpdate);
          socket.off('friend:unfriended', handleUnfriended);
          socket.off('chat:list:changed', handleListChanged);
        }
      } catch (error) {
        console.error('[ChatList] Error cleaning up socket listeners:', error);
      }
    };
  }, [token, user?.id]);

  const formatTime = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      
      // Check for invalid date
      if (isNaN(date.getTime())) {
        console.warn('[ChatList] Invalid date:', dateString);
        return '';
      }
      
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
    } catch (error) {
      console.error('[ChatList] Error formatting time:', error);
      return '';
    }
  };

  const filteredConversations = React.useMemo(() => {
    try {
      if (!Array.isArray(conversations)) {
        console.error('[ChatList] Conversations is not an array:', conversations);
        return [];
      }
      
      return conversations.filter(item => {
        try {
          if (!item) return false;
          if (!item.otherId || !(item.otherName || '').trim()) return false;
          
          const query = (searchQuery || '').toLowerCase();
          const otherName = (item.otherName || '').toLowerCase();
          const messageText = (item.lastMessage?.text || '').toLowerCase();
          
          return otherName.includes(query) || messageText.includes(query);
        } catch (err) {
          console.error('[ChatList] Error filtering conversation:', err, item);
          return false;
        }
      });
    } catch (error) {
      console.error('[ChatList] Error in filteredConversations:', error);
      return [];
    }
  }, [conversations, searchQuery]);

  // Apply archived toggle filter on top of text filtering
  const visibleConversations = React.useMemo(() => {
    try {
      return filteredConversations.filter(item => showArchived ? !!item.archived : !item.archived);
    } catch (e) {
      console.error('[ChatList] Error computing visibleConversations:', e);
      return filteredConversations;
    }
  }, [filteredConversations, showArchived]);


  const handleChatPress = (chatId, name, profilePhoto, otherUserId) => {
    try {
      if (!chatId) {
        console.error('[ChatList] Invalid chatId:', chatId);
        return;
      }
      
      // Clear unread count when entering chat
      //console.log(`📱 Opening chat ${chatId}, clearing unread count`);
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: 0
      }));
      
      router.push({
        pathname: "/secure/chat-conversation",
        params: { 
          id: chatId, 
          name: name || 'Chat',
          avatar: profilePhoto || '',
          otherUserId: otherUserId || ''
        }
      });
    } catch (error) {
      console.error('[ChatList] Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const handleChatCreated = (chatId, name, profilePhoto, otherUserId) => {
    //console.log('Chat created, navigating to:', { chatId, name, profilePhoto });
    
    // Refresh inbox to show the new chat
    loadInbox(true);
    
    // Navigate to the new chat
    handleChatPress(chatId, name, profilePhoto, otherUserId);
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

      {/* Verification Banner */}
      <VerificationBanner />

      {/* Lock messaging for unverified users */}
      <VerificationGuard feature="messaging">
      <View style={[styles.contentContainer, { paddingHorizontal: Math.max(12, responsive.horizontalPadding / 2) }]}>
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="chatbubbles" size={28} color="#7C2B86" />
          </View>
          <View style={styles.headerTextContainer}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowArchived(prev => !prev)}>
              <Text style={[styles.messagesTitle, { fontSize: responsive.isSmallScreen ? 28 : 32 }]}>Messages</Text>
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>
              {showArchived
                ? `${conversations.filter(c => c.archived).length} archived`
                : `${conversations.filter(c => !c.archived).length} conversation${conversations.filter(c => !c.archived).length !== 1 ? 's' : ''}`}
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
            data={visibleConversations}
            keyExtractor={(item) => {
              try {
                return item?.chat?.id || `fallback-${Math.random()}`;
              } catch (error) {
                console.error('[ChatList] Error in keyExtractor:', error);
                return `error-${Math.random()}`;
              }
            }}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={false}
            style={{ overflow: 'visible' }}
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
              try {
                if (!item || !item.chat || !item.chat.id) {
                  console.warn('[ChatList] Invalid item in renderItem:', item);
                  return null;
                }
                
                const chatId = item.chat.id;
                const isTyping = typingIndicators[chatId] && Array.isArray(typingIndicators[chatId]) && typingIndicators[chatId].length > 0;
                const currentUnreadCount = unreadCounts[chatId] || item.unreadCount || 0;
              
              const row = (
                <TouchableOpacity
                  style={[
                    styles.chatRow,
                    { paddingHorizontal: Math.max(10, (responsive.spacing?.md ?? 12)), paddingVertical: 12 },
                    openMenuChatId === chatId && styles.chatRowElevated,
                  ]}
                  onPress={() => handleChatPress(chatId, item.otherName, item.otherProfilePhoto, item.otherId)}
                >
                  <View style={styles.avatarContainer}>
                    {item.otherProfilePhoto && item.otherProfilePhoto.trim() ? (
                      <Image 
                        source={{ uri: item.otherProfilePhoto }} 
                        style={[styles.avatarImage, { width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: responsive.avatarSize / 2 }]}
                      />
                    ) : (
                      <View style={[styles.fallbackAvatar, { width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: responsive.avatarSize / 2 }]}> 
                        <Text style={[styles.fallbackAvatarText, { fontSize: responsive.isSmallScreen ? 18 : 20 }]}> 
                          {(item.otherName && item.otherName.charAt(0).toUpperCase()) || '?'}
                        </Text>
                      </View>
                    )}
                    {isTyping && (
                      <View style={styles.typingIndicator}><View style={styles.typingDot} /></View>
                    )}
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      <Text style={[styles.chatName, { fontSize: responsive.fontSize.large }]}>{item.otherName || 'Unknown'} {item.pinned ? '📌' : ''}</Text>
                      <Text style={[styles.chatTime, { fontSize: responsive.fontSize.small }]}>{formatTime((item.lastMessage && item.lastMessage.created_at) || item.chat.last_message_at)}</Text>
                    </View>
                    <View style={styles.messageRow}>
                      <Text style={[styles.chatMessage, { fontSize: responsive.fontSize.medium }, isTyping && styles.typingText]} numberOfLines={1}>
                        {isTyping ? 'typing...' : (item.lastMessage && item.lastMessage.text) || 'No messages yet'}
                      </Text>
                      {item.lastMessage && user && item.lastMessage.sender_id === user.id && item.lastMessage.status && (
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
                  {Platform.OS === 'web' && (
                    <View style={styles.rowMenuContainer}>
                      <TouchableOpacity
                        ref={(r) => { buttonRefs.current[chatId] = r; }}
                        style={styles.rowMenuButton}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            if (openMenuChatId === chatId) {
                              setOpenMenuChatId(null);
                              setMenuCoords(null);
                            } else {
                              openWebMenu(chatId);
                            }
                          } else {
                            setOpenMenuChatId(prev => prev === chatId ? null : chatId)
                          }
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      {openMenuChatId === chatId && Platform.OS !== 'web' && (
                        <View style={styles.rowMenu}>
                          <TouchableOpacity style={styles.rowMenuItem} onPress={() => { setOpenMenuChatId(null); handleDeleteChat(chatId); }}>
                            <Ionicons name="trash" size={14} color="#FF4D4F" />
                            <Text style={styles.rowMenuItemText}>Delete</Text>
                          </TouchableOpacity>
                          {item.archived ? (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleUnarchiveChat(chatId)}>
                              <Ionicons name="archive" size={14} color="#FFFFFF" />
                              <Text style={styles.rowMenuItemText}>Unarchive</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleArchiveChat(chatId)}>
                              <Ionicons name="archive" size={14} color="#FFFFFF" />
                              <Text style={styles.rowMenuItemText}>Archive</Text>
                            </TouchableOpacity>
                          )}
                          {item.pinned ? (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleUnpinChat(chatId)}>
                              <Ionicons name="pin" size={14} color="#FFFFFF" />
                              <Text style={styles.rowMenuItemText}>Unpin</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handlePinChat(chatId)}>
                              <Ionicons name="pin" size={14} color="#FFFFFF" />
                              <Text style={styles.rowMenuItemText}>Pin</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  {currentUnreadCount > 0 && (
                    <View style={styles.unreadBadge}><Text style={styles.unreadText}>{currentUnreadCount}</Text></View>
                  )}
                </TouchableOpacity>
              );
              if (Platform.OS === 'web') return row;
              return (
                <Swipeable renderRightActions={() => (
                  <TouchableOpacity style={styles.rightAction} onPress={() => handleDeleteChat(chatId)}>
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                )}>
                  {row}
                </Swipeable>
              );
              } catch (error) {
                console.error('[ChatList] Error rendering chat item:', error, item);
                return null;
              }
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

      {/* Banner Ad for Free Users - Auto-disabled in Expo Go */}
      {BannerAd && shouldShowAds() && (
        <BannerAd placement="chat_list_bottom" />
      )}
      {/* Web-only menu portal to avoid underlapping */}
      {Platform.OS === 'web' && openMenuChatId && (
        <View style={styles.menuPortal} pointerEvents="auto">
          {/* Click-away overlay */}
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setOpenMenuChatId(null); setMenuCoords(null); }} />
          <View style={[styles.rowMenu, { position: 'absolute', left: (menuCoords?.x ?? 0), top: (menuCoords?.y ?? 0) }]}>
            <TouchableOpacity style={styles.rowMenuItem} onPress={() => { setOpenMenuChatId(null); setMenuCoords(null); handleDeleteChat(openMenuChatId); }}>
              <Ionicons name="trash" size={14} color="#FF4D4F" />
              <Text style={styles.rowMenuItemText}>Delete</Text>
            </TouchableOpacity>
            {visibleConversations.find(c => c.chat.id === openMenuChatId)?.archived ? (
              <TouchableOpacity style={styles.rowMenuItem} onPress={() => { handleUnarchiveChat(openMenuChatId); }}>
                <Ionicons name="archive" size={14} color="#FFFFFF" />
                <Text style={styles.rowMenuItemText}>Unarchive</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.rowMenuItem} onPress={() => { handleArchiveChat(openMenuChatId); }}>
                <Ionicons name="archive" size={14} color="#FFFFFF" />
                <Text style={styles.rowMenuItemText}>Archive</Text>
              </TouchableOpacity>
            )}
            {visibleConversations.find(c => c.chat.id === openMenuChatId)?.pinned ? (
              <TouchableOpacity style={styles.rowMenuItem} onPress={() => { handleUnpinChat(openMenuChatId); }}>
                <Ionicons name="pin" size={14} color="#FFFFFF" />
                <Text style={styles.rowMenuItemText}>Unpin</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.rowMenuItem} onPress={() => { handlePinChat(openMenuChatId); }}>
                <Ionicons name="pin" size={14} color="#FFFFFF" />
                <Text style={styles.rowMenuItemText}>Pin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      </VerificationGuard>
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
    overflow: 'visible',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 72,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'relative',
  },
  chatRowElevated: {
    zIndex: 10000,
    elevation: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  fallbackAvatar: {
    backgroundColor: "rgba(255, 214, 242, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  fallbackAvatarText: {
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginBottom: 2,
  },
  chatName: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  chatTime: {
    color: "rgba(255, 255, 255, 0.45)",
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatMessage: {
    color: "rgba(255, 255, 255, 0.65)",
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
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C2B86",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rowMenuContainer: {
    marginLeft: 8,
    position: 'relative',
    overflow: 'visible',
    zIndex: 2,
  },
  rowMenuButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  rowMenu: {
    position: 'absolute',
    top: 32,
    right: 8, // add tiny gap from screen edge on native
    backgroundColor: '#1F1147',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 140,
    zIndex: 9999,
    elevation: 8,
    boxShadow: Platform.OS === 'web' ? '0 8px 24px rgba(0,0,0,0.35)' : undefined,
  },
  menuPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100000,
    elevation: 20,
    pointerEvents: 'box-none',
  },
  rowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowMenuItemText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rightAction: {
    backgroundColor: '#FF4D4F',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    marginVertical: 6,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
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
