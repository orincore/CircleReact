import { getAdComponents } from "@/components/ads/AdWrapper";
import FriendsListModal from "@/components/FriendsListModal";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { chatApi } from "@/src/api/chat";
import { blindDatingApi } from "@/src/api/blindDating";
import { getSocket, socketService } from "@/src/api/socket";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";
import { unreadCountService } from "@/src/services/unreadCountService";
import { getSearchbarPaddingConfig } from "@/src/utils/searchbarPaddingUtils";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Swipeable } from 'react-native-gesture-handler';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, Modal } from "react-native";
import { BlurView } from 'expo-blur';
import AsyncStorage from "@react-native-async-storage/async-storage";

const { BannerAd } = getAdComponents();

export default function ChatListScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const responsive = useResponsiveDimensions();
  const { shouldShowAds } = useSubscription();
  
  // Create dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 2,
    },
    searchBar: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    searchInput: {
      color: theme.textPrimary,
    },
    chatItem: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginVertical: 4,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },
    chatName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    chatMessage: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    chatTime: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    newMessageButton: {
      backgroundColor: theme.primary,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.4 : 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
      textAlign: 'center',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 16,
    },
    decorativeShape1: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.decorative1,
      top: -50,
      right: -50,
      opacity: isDarkMode ? 1 : 0.3,
    },
    decorativeShape2: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.decorative2,
      bottom: 100,
      left: -30,
      opacity: isDarkMode ? 1 : 0.3,
    },
  };

  const loadBlindDateStatus = async () => {
    if (!token) {
      setBlindDateStatus({ loading: false, enabled: false, foundToday: false });
      return;
    }

    try {
      setBlindDateStatus(prev => ({ ...prev, loading: true }));

      const [settingsRes, matchesRes] = await Promise.all([
        blindDatingApi.getSettings(token),
        blindDatingApi.getMatches(token),
      ]);

      const enabled = !!settingsRes?.settings?.is_enabled;
      let foundToday = false;

      if (enabled && Array.isArray(matchesRes?.matches) && matchesRes.matches.length > 0) {
        const today = new Date();
        const isSameDay = (d) => {
          const dt = new Date(d);
          return (
            dt.getFullYear() === today.getFullYear() &&
            dt.getMonth() === today.getMonth() &&
            dt.getDate() === today.getDate()
          );
        };

        foundToday = matchesRes.matches.some(m => m.matched_at && isSameDay(m.matched_at));
      }

      setBlindDateStatus({ loading: false, enabled, foundToday });
    } catch (error) {
      console.error('[ChatList] Failed to load blind date status:', error);
      setBlindDateStatus({ loading: false, enabled: false, foundToday: false });
    }
  };
  
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
      // Update locally instead of full refresh
      setConversations(prev => prev.map(conv => 
        conv.chat.id === chatId ? { ...conv, archived: false } : conv
      ));
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
      // Update locally instead of full refresh
      setConversations(prev => prev.map(conv => 
        conv.chat.id === chatId ? { ...conv, archived: true } : conv
      ));
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
      // Update locally and re-sort instead of full refresh
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.chat.id === chatId ? { ...conv, pinned: true } : conv
        );
        // Re-sort: pinned first, then by recent
        return [...updated].sort((a, b) => {
          if (a?.pinned !== b?.pinned) return a?.pinned ? -1 : 1;
          const aTime = new Date(a?.chat?.last_message_at || a?.chat?.created_at || 0).getTime();
          const bTime = new Date(b?.chat?.last_message_at || b?.chat?.created_at || 0).getTime();
          return bTime - aTime;
        });
      });
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
      // Update locally and re-sort instead of full refresh
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.chat.id === chatId ? { ...conv, pinned: false } : conv
        );
        // Re-sort: pinned first, then by recent
        return [...updated].sort((a, b) => {
          if (a?.pinned !== b?.pinned) return a?.pinned ? -1 : 1;
          const aTime = new Date(a?.chat?.last_message_at || a?.chat?.created_at || 0).getTime();
          const bTime = new Date(b?.chat?.last_message_at || b?.chat?.created_at || 0).getTime();
          return bTime - aTime;
        });
      });
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
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingIndicators, setTypingIndicators] = useState({}); // chatId -> array of typing users
  const [unreadCounts, setUnreadCounts] = useState({}); // chatId -> unread count
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [archivedChats, setArchivedChats] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [menuCoords, setMenuCoords] = useState(null); // { x, y }
  const [openMenuChatId, setOpenMenuChatId] = useState(null);
  const [blindDateStatus, setBlindDateStatus] = useState({ loading: false, enabled: false, foundToday: false });
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'blind'
  const [otherVerificationCache, setOtherVerificationCache] = useState({}); // otherUserId -> boolean
  const [searchbarPaddingConfig, setSearchbarPaddingConfig] = useState(() => getSearchbarPaddingConfig());
  const buttonRefs = React.useRef({});

  // Cache key for chat list
  const CHAT_LIST_CACHE_KEY = `@circle:chat_list:${user?.id || 'unknown'}`;
  const UNREAD_COUNTS_CACHE_KEY = `@circle:unread_counts:${user?.id || 'unknown'}`;

  const getLastMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'No messages yet';
    const text = (lastMessage.text || '').trim();
    if (text) return text;
    const mediaUrl = lastMessage.mediaUrl || lastMessage.media_url;
    const mediaType = lastMessage.mediaType || lastMessage.media_type;
    if (mediaType) {
      return mediaType === 'video' ? 'Video' : 'Photo';
    }
    if (mediaUrl) {
      return 'Photo';
    }
    // If we have a lastMessage object but no text/media fields (e.g. legacy cache or backend omission),
    // still show a non-empty preview so the user doesn't see "No messages yet".
    if (lastMessage.id) return 'Media';
    return 'No messages yet';
  };

  // Load cached chat list on mount for instant display
  useEffect(() => {
    const loadCachedChatList = async () => {
      if (!user?.id) return;
      try {
        const [cachedConversations, cachedUnreadCounts] = await Promise.all([
          AsyncStorage.getItem(CHAT_LIST_CACHE_KEY),
          AsyncStorage.getItem(UNREAD_COUNTS_CACHE_KEY),
        ]);
        
        if (cachedConversations) {
          const parsed = JSON.parse(cachedConversations);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConversations(parsed);
            // If we have cached data, don't show loading spinner
            setLoading(false);
          }
        }
        
        if (cachedUnreadCounts) {
          const parsedCounts = JSON.parse(cachedUnreadCounts);
          if (parsedCounts && typeof parsedCounts === 'object') {
            setUnreadCounts(parsedCounts);
          }
        }
      } catch (error) {
        console.warn('[ChatList] Failed to load cached chat list:', error);
      } finally {
        setIsCacheLoaded(true);
      }
    };
    loadCachedChatList();
  }, [user?.id]);

  // Save conversations to cache whenever they change
  const cacheTimeoutRef = React.useRef(null);
  useEffect(() => {
    if (!isCacheLoaded || !user?.id || conversations.length === 0) return;
    
    // Debounce cache saves to avoid excessive writes
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    cacheTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(CHAT_LIST_CACHE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.warn('[ChatList] Failed to cache conversations:', error);
      }
    }, 1000);
    
    return () => {
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    };
  }, [conversations, isCacheLoaded, user?.id]);

  // Save unread counts to cache
  useEffect(() => {
    if (!isCacheLoaded || !user?.id) return;
    
    const saveUnreadCounts = async () => {
      try {
        await AsyncStorage.setItem(UNREAD_COUNTS_CACHE_KEY, JSON.stringify(unreadCounts));
      } catch (error) {
        console.warn('[ChatList] Failed to cache unread counts:', error);
      }
    };
    
    // Debounce unread count saves
    const timeout = setTimeout(saveUnreadCounts, 500);
    return () => clearTimeout(timeout);
  }, [unreadCounts, isCacheLoaded, user?.id]);

  const loadInbox = async (isRefresh = false) => {
    if (!token) {
      console.warn('[ChatList] No token available for loading inbox');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      // Only show loading if we don't have cached data
      else if (conversations.length === 0) setLoading(true);
      
      
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
        console.error('[ChatList] Invalid inbox response:', response);
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
          console.error('[ChatList] Error sorting conversations:', err);
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
          console.error('[ChatList] Error processing conversation unread count:', err);
        }
      });
      
      // Initialize the unread count service with the data
      unreadCountService.initializeCounts(sortedConversations);
      
      // Also update local state
      setUnreadCounts(prev => ({ ...prev, ...initialUnreadCounts }));
    } catch (error) {
      console.error('[ChatList] Failed to load inbox:', error);
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

  useEffect(() => {
    loadBlindDateStatus();
  }, [token]);

  // Update searchbar padding when dimensions change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const config = getSearchbarPaddingConfig({
        screenWidth: window.width,
        screenHeight: window.height,
        platform: Platform.OS,
      });
      setSearchbarPaddingConfig(config);
    });

    return () => subscription?.remove();
  }, []);

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
      
      // Monitor connection status
      const handleConnect = () => {
        //console.log('🟢 [ChatList] Socket connected');
      };
      
      const handleDisconnect = (reason) => {
        //console.log('🔴 [ChatList] Socket disconnected:', reason);
      };
      
      const handleConnectError = (error) => {
        //console.error('❌ [ChatList] Socket connection error:', error);
      };
      
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
    } catch (error) {
      console.error('[ChatList] Error getting socket:', error);
      return;
    }

    // Handle new messages in chat list
    const handleNewMessage = ({ message }) => {
      try {
        //console.log('📨 [ChatList] New message received:', message);
        
        if (!message || !message.chatId) {
          //console.error('[ChatList] Invalid message received:', message);
          return;
        }
        
        setConversations(prev => {
          try {
            if (!Array.isArray(prev)) {
              console.error('[ChatList] Conversations state is not an array:', prev);
              return [];
            }
        
            // Create a new array to ensure React detects the change
            const updatedConversations = prev.map(conv => {
              try {
                if (!conv || !conv.chat) {
                  console.warn('[ChatList] Invalid conversation object:', conv);
                  return conv;
                }
                
                if (conv.chat.id === message.chatId) {
                  //console.log('✏️ [ChatList] Updating conversation:', conv.chat.id);
                  // Create completely new object to trigger re-render
                  return {
                    ...conv,
                    lastMessage: {
                      id: message.id || 'unknown',
                      text: message.text || '',
                      mediaUrl: message.mediaUrl || message.media_url,
                      mediaType: message.mediaType || message.media_type,
                      thumbnail: message.thumbnail || message.thumb_url || message.thumbnail_url,
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

            // Sort: pinned first, then by most recent message (descending order)
            // Use slice() to create a new array reference for React to detect change
            const sortedConversations = [...updatedConversations].sort((a, b) => {
              try {
                // Pinned chats always stay at top
                if (a?.pinned !== b?.pinned) return a?.pinned ? -1 : 1;
                
                const aTime = new Date(a?.chat?.last_message_at || a?.chat?.created_at || 0).getTime();
                const bTime = new Date(b?.chat?.last_message_at || b?.chat?.created_at || 0).getTime();
                return bTime - aTime; // Most recent first
              } catch (err) {
                console.error('[ChatList] Sort error:', err);
                return 0;
              }
            });
            
            //console.log('🔄 [ChatList] State updated, new order:', sortedConversations.map(c => c.chat.id));
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
        // Update via service for global consistency
        unreadCountService.incrementChatUnreadCount(message.chatId);
        
        // Also update local state for immediate UI response
        setUnreadCounts(prev => {
          const newCount = (prev[message.chatId] || 0) + 1;
          //console.log(`📊 [ChatList] Updated unread count for chat ${message.chatId}: ${newCount}`);
          return {
            ...prev,
            [message.chatId]: newCount
          };
        });
      }
    };

    // Handle background messages (received when user is not in the specific chat)
    const handleBackgroundMessage = (data) => {
      //console.log('📬 [ChatList] Background message received:', data);
      // Handle both { message: {...} } and direct message object
      const message = data?.message || data;
      if (message) {
        handleNewMessage({ message });
      }
    };

    // Handle typing indicators
    const handleTyping = ({ chatId, users }) => {
      //console.log('⌨️ [ChatList] Typing indicator:', { chatId, users });
      setTypingIndicators(prev => {
        const filtered = users.filter(userId => userId !== user.id);
        // Create new object to ensure React detects change
        return { ...prev, [chatId]: filtered };
      });
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
      if (by === user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [chatId]: 0
        }));
      }
    };
    
    // Handle unread count updates from server
    const handleUnreadCountUpdate = ({ chatId, unreadCount }) => {
      setUnreadCounts(prev => ({
        ...prev,
        [chatId]: unreadCount
      }));
    };

    // Handle local unread clearing for instant updates
    const handleLocalUnreadCleared = ({ chatId, clearedCount }) => {
      // Update via service for consistency
      unreadCountService.reduceChatUnreadCount(chatId, clearedCount);
      
      // Also update local state for immediate UI response
      setUnreadCounts(prev => {
        const currentCount = prev[chatId] || 0;
        const newCount = Math.max(0, currentCount - clearedCount);
        return {
          ...prev,
          [chatId]: newCount
        };
      });
    };

    // Handle message status updates for chat list
    const handleMessageStatusUpdate = ({ messageId, chatId, status }) => {
      setConversations(prev => {
        // Create new array to ensure React detects change
        return prev.map(conv => {
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
        });
      });
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

    // Handle list changes without full refresh - rely on real-time updates
    const handleListChanged = () => {
      console.log('📋 [ChatList] List changed event received (no refresh needed - using real-time updates)');
      // Don't reload inbox - let real-time socket events handle updates
    };

    try {
      // Register global handlers
      if (socketService && typeof socketService.addMessageHandler === 'function') {
        socketService.addMessageHandler('chat-list', handleBackgroundMessage);
      } else {
        console.warn('⚠️ [ChatList] socketService.addMessageHandler not available');
      }
      
      // Listen to socket events
      if (socket && typeof socket.on === 'function') {
        socket.on('chat:message', handleNewMessage);
        socket.on('chat:message:background', handleBackgroundMessage);
        socket.on('chat:typing', handleTyping);
        socket.on('chat:list:typing', handleListTyping);
        socket.on('chat:read', handleRead);
        socket.on('chat:message:delivery_receipt', handleDeliveryReceipt);
        socket.on('chat:message:read_receipt', handleReadReceipt);
        socket.on('chat:unread_count', handleUnreadCountUpdate);
        socket.on('chat:local:unread_cleared', handleLocalUnreadCleared);
        socket.on('friend:unfriended', handleUnfriended);
        socket.on('chat:list:changed', handleListChanged);
        
      
      } else {
        console.error('❌ [ChatList] Socket.on not available');
      }
    } catch (error) {
      console.error('[ChatList] Error registering socket listeners:', error);
    }

    return () => {
      try {
        
        if (socketService && typeof socketService.removeMessageHandler === 'function') {
          socketService.removeMessageHandler('chat-list');
        }
        
        if (socket && typeof socket.off === 'function') {
          // Remove connection monitoring
          socket.off('connect');
          socket.off('disconnect');
          socket.off('connect_error');
          
          // Remove chat event listeners
          socket.off('chat:message', handleNewMessage);
          socket.off('chat:message:background', handleBackgroundMessage);
          socket.off('chat:typing', handleTyping);
          socket.off('chat:list:typing', handleListTyping);
          socket.off('chat:read', handleRead);
          socket.off('chat:message:delivery_receipt', handleDeliveryReceipt);
          socket.off('chat:message:read_receipt', handleReadReceipt);
          socket.off('chat:unread_count', handleUnreadCountUpdate);
          socket.off('chat:local:unread_cleared', handleLocalUnreadCleared);
          socket.off('friend:unfriended', handleUnfriended);
          socket.off('chat:list:changed', handleListChanged);
        }
      } catch (error) {
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

  const tabFilteredConversations = React.useMemo(() => {
    try {
      return filteredConversations.filter(item => {
        if (!item) return false;
        const isBlind = !!item.isBlindDateOngoing;
        if (activeTab === 'blind' && !isBlind) return false;
        if (activeTab === 'chats' && isBlind) return false;
        return true;
      });
    } catch (error) {
      console.error('[ChatList] Error in tabFilteredConversations:', error);
      return filteredConversations;
    }
  }, [filteredConversations, activeTab]);

  const visibleConversations = React.useMemo(() => {
    try {
      return tabFilteredConversations.filter(item => showArchived ? !!item.archived : !item.archived);
    } catch (e) {
      console.error('[ChatList] Error computing visibleConversations:', e);
      return tabFilteredConversations;
    }
  }, [tabFilteredConversations, showArchived]);

  // Ensure we know verification status for users shown in the list.
  // If inbox data doesn't provide a verified flag, fall back to the
  // same profile endpoint used in [userId].jsx and the self profile tab.
  useEffect(() => {
    if (!token || !Array.isArray(visibleConversations)) return;

    const loadMissingVerification = async () => {
      try {
        const idsToFetch = new Set();

        visibleConversations.forEach((item) => {
          if (!item || !item.otherId) return;
          const cacheVal = otherVerificationCache[item.otherId];
          if (cacheVal === true) return;

          const flag = item.otherVerificationStatus ?? item.other_verification_status;
          if (flag === 'verified' || flag === true) return;

          idsToFetch.add(item.otherId);
        });

        if (idsToFetch.size === 0) return;

        const { API_BASE_URL } = await import('@/src/api/config');
        await Promise.all(
          Array.from(idsToFetch).map(async (otherId) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/friends/user/${otherId}/profile`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (!res.ok) return;
              const data = await res.json();
              if (!data) return;
              const isVerified = data.verification_status === 'verified';
              if (isVerified) {
                setOtherVerificationCache((prev) => ({
                  ...prev,
                  [otherId]: true,
                }));
              }
            } catch {
              // ignore per-user errors
            }
          })
        );
      } catch (e) {
        console.warn('[ChatList] Failed to backfill verification status:', e?.message);
      }
    };

    loadMissingVerification();
  }, [token, visibleConversations, otherVerificationCache]);

  const activeTabCount = React.useMemo(() => {
    try {
      if (!Array.isArray(conversations)) return 0;
      return conversations.filter(item => {
        if (!item) return false;
        const isBlind = !!item.isBlindDateOngoing;
        if (activeTab === 'blind' && !isBlind) return false;
        if (activeTab === 'chats' && isBlind) return false;
        return showArchived ? !!item.archived : !item.archived;
      }).length;
    } catch (error) {
      console.error('[ChatList] Error computing activeTabCount:', error);
      return 0;
    }
  }, [conversations, activeTab, showArchived]);


  const handleChatPress = (chatId, name, profilePhoto, otherUserId, blindDateInfo = null, isVerified = false) => {
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
          otherUserId: otherUserId || '',
          isBlindDate: blindDateInfo ? 'true' : 'false',
          blindDateMatchReason: blindDateInfo?.matchReason || '',
          blindDateGender: blindDateInfo?.gender || '',
          blindDateAge: blindDateInfo?.age ? String(blindDateInfo.age) : '',
          isOtherUserVerified: isVerified ? 'true' : 'false',
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
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Animated Background */}
      <LinearGradient
        colors={[theme.background, theme.backgroundSecondary, theme.background]}
        style={styles.backgroundGradient}
      >
        {/* Decorative Elements */}
        <View style={dynamicStyles.decorativeShape1} />
        <View style={dynamicStyles.decorativeShape2} />
        {/* Floating orbs */}
        <View style={[styles.floatingOrb, styles.orb1, { backgroundColor: theme.decorative1 }]} />
        <View style={[styles.floatingOrb, styles.orb2, { backgroundColor: theme.decorative2 }]} />
        <View style={[styles.floatingOrb, styles.orb3, { backgroundColor: theme.decorative1 }]} />
      </LinearGradient>
      {/* Lock messaging for unverified users */}
      <View style={[styles.contentContainer, { paddingHorizontal: Math.max(12, responsive.horizontalPadding / 2) }]}>
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="chatbubbles" size={28} color={theme.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowArchived(prev => !prev)}>
              <Text style={[styles.messagesTitle, dynamicStyles.headerTitle, { fontSize: responsive.isSmallScreen ? 28 : 32 }]}>Messages</Text>
            </TouchableOpacity>
            <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>
              {showArchived
                ? `${activeTabCount} archived`
                : `${activeTabCount} conversation${activeTabCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.newMessageButton, dynamicStyles.newMessageButton, { 
              width: responsive.buttonHeight, 
              height: responsive.buttonHeight,
              borderRadius: responsive.buttonHeight / 2 
            }]}
            onPress={() => setShowFriendsModal(true)}
          >
            <Ionicons name="create-outline" size={responsive.isSmallScreen ? 20 : 22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[
          styles.searchBar, 
          dynamicStyles.searchBar, 
          { 
            paddingHorizontal: responsive.spacing.lg,
            paddingVertical: searchbarPaddingConfig.paddingVertical,
            minHeight: searchbarPaddingConfig.containerMinHeight || searchbarPaddingConfig.minHeight,
          }
        ]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            placeholder="Search conversations"
            placeholderTextColor={theme.textPlaceholder}
            style={[styles.searchInput, dynamicStyles.searchInput]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'chats' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('chats')}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'chats' && styles.tabLabelActive,
              ]}
            >
              Chats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'blind' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('blind')}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'blind' && styles.tabLabelActive,
              ]}
            >
              Blind Connect
            </Text>
          </TouchableOpacity>
        </View>

        {/* Daily Blind Connect status banner */}
        {blindDateStatus.enabled && !blindDateStatus.loading && (
          <View
            style={[
              styles.blindDateDailyBanner,
              blindDateStatus.foundToday
                ? styles.blindDateDailyBannerSuccess
                : styles.blindDateDailyBannerSearching,
            ]}
          >
            <Ionicons
              name={blindDateStatus.foundToday ? 'heart' : 'hourglass'}
              size={16}
              color={blindDateStatus.foundToday ? '#22C55E' : theme.textSecondary}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.blindDateBannerTitle,
                  { color: theme.textPrimary },
                ]}
                numberOfLines={1}
              >
                {blindDateStatus.foundToday
                  ? 'Blind Connect match found today!'
                  : 'No Blind Connect match found today yet'}
              </Text>
              {!blindDateStatus.foundToday && (
                <Text
                  style={[
                    styles.blindDateDailySubtitle,
                    { color: isDarkMode ? 'rgba(226, 232, 240, 0.85)' : theme.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  We are still searching. Come back soon – we will also email you once we find your match.
                </Text>
              )}
              {blindDateStatus.foundToday && (
                <Text
                  style={[
                    styles.blindDateDailySubtitle,
                    { color: isDarkMode ? 'rgba(226, 232, 240, 0.85)' : theme.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  Check your messages to chat with your mystery match.
                </Text>
              )}
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={visibleConversations}
            extraData={[visibleConversations, typingIndicators, unreadCounts, conversations.length]}
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
            style={{ flex: 1 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  await Promise.all([
                    loadInbox(true),
                    loadBlindDateStatus(),
                  ]);
                }}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            // Enable smooth animations for list updates
            windowSize={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={theme.textMuted} />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No conversations yet</Text>
                <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>Start a new conversation to see it here</Text>
              </View>
            }
            renderItem={({ item }) => {
              try {
                if (!item || !item.chat || !item.chat.id) {
                  console.warn('[ChatList] Invalid item in renderItem:', item);
                  return null;
                }
                
                const chatId = item.chat.id;
                const isBlindDateOngoing = !!item.isBlindDateOngoing;
                const blindDateInfo = item.blindDateInfo;
                // Use masked name for blind dates, otherwise use real name
                const displayName = isBlindDateOngoing && blindDateInfo?.maskedName 
                  ? blindDateInfo.maskedName 
                  : (item.otherName || 'Unknown');
                const displayAvatar = item.otherProfilePhoto && item.otherProfilePhoto.trim() ? item.otherProfilePhoto : '';
                const isTyping = typingIndicators[chatId] && Array.isArray(typingIndicators[chatId]) && typingIndicators[chatId].length > 0;
                const currentUnreadCount = unreadCounts[chatId] || item.unreadCount || 0;
                const cachedVerified = item.otherId ? otherVerificationCache[item.otherId] : undefined;
                const isOtherUserVerified =
                  cachedVerified === true ||
                  item.otherVerificationStatus === 'verified' ||
                  item.otherVerificationStatus === true ||
                  item.other_verification_status === 'verified';
                
                // Build blind date subtitle: "Looking for Friendship • Female • 25"
                const blindDateSubtitle = isBlindDateOngoing && blindDateInfo ? [
                  blindDateInfo.matchReason ? `Looking for ${blindDateInfo.matchReason}` : null,
                  blindDateInfo.gender ? blindDateInfo.gender.charAt(0).toUpperCase() + blindDateInfo.gender.slice(1) : null,
                  blindDateInfo.age ? `${blindDateInfo.age} yrs` : null,
                ].filter(Boolean).join(' • ') : null;
              
              const row = (
                <TouchableOpacity
                  style={[
                    styles.chatRow,
                    dynamicStyles.chatItem,
                    { paddingHorizontal: Math.max(10, (responsive.spacing?.md ?? 12)), paddingVertical: 12 },
                    openMenuChatId === chatId && styles.chatRowElevated,
                  ]}
                  onPress={() => handleChatPress(chatId, displayName, displayAvatar, item.otherId, isBlindDateOngoing ? blindDateInfo : null, isOtherUserVerified)}
                  onLongPress={() => {
                    if (Platform.OS !== 'web') {
                      setOpenMenuChatId(chatId);
                    }
                  }}
                  delayLongPress={500}
                >
                  <View style={styles.avatarContainer}>
                    {displayAvatar ? (
                      <View style={{ overflow: 'hidden', borderRadius: responsive.avatarSize / 2 }}>
                        <Image
                          source={{ uri: displayAvatar }}
                          style={[
                            styles.avatarImage,
                            {
                              width: responsive.avatarSize,
                              height: responsive.avatarSize,
                              borderRadius: responsive.avatarSize / 2,
                            },
                          ]}
                          blurRadius={isBlindDateOngoing && Platform.OS === 'android' ? 50 : 0}
                        />
                        {isBlindDateOngoing && (
                          <BlurView
                            intensity={40}
                            tint={isDarkMode ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                          />
                        )}
                      </View>
                    ) : (
                      <View style={[styles.fallbackAvatar, { width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: responsive.avatarSize / 2, backgroundColor: theme.surfaceSecondary }]}> 
                        <Text style={[styles.fallbackAvatarText, { fontSize: responsive.isSmallScreen ? 18 : 20, color: theme.textPrimary }]}> 
                          {(displayName && displayName.charAt(0).toUpperCase()) || '?'}
                        </Text>
                      </View>
                    )}
                    {isTyping && (
                      <View style={styles.typingIndicator}><View style={styles.typingDot} /></View>
                    )}
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      <View style={styles.chatNameRow}>
                        <Text
                          style={[styles.chatName, dynamicStyles.chatName, { fontSize: responsive.fontSize.large }]}
                          numberOfLines={1}
                        >
                          {displayName}
                        </Text>
                        {isOtherUserVerified && !isBlindDateOngoing && (
                          <VerifiedBadge size={16} style={{ marginLeft: 4 }} />
                        )}
                        {item.pinned && <Text style={styles.pinnedIcon}>📌</Text>}
                      </View>
                      <View style={styles.chatMetaColumn}>
                        <Text
                          style={[styles.chatTime, dynamicStyles.chatTime, { fontSize: responsive.fontSize.small }]}
                          numberOfLines={1}
                        >
                          {formatTime((item.lastMessage && item.lastMessage.created_at) || item.chat.last_message_at)}
                        </Text>
                        {currentUnreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{currentUnreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {isBlindDateOngoing && blindDateSubtitle && (
                      <Text style={styles.blindDateTag}>{blindDateSubtitle}</Text>
                    )}
                    <View style={styles.messageRow}>
                      <Text style={[styles.chatMessage, dynamicStyles.chatMessage, { fontSize: responsive.fontSize.medium }, isTyping && styles.typingText]} numberOfLines={1}>
                        {isTyping ? 'typing...' : getLastMessagePreview(item.lastMessage)}
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
                            item.lastMessage.status === 'read' ? theme.primary : 
                            item.lastMessage.status === 'delivered' ? theme.primary + '70' : 
                            item.lastMessage.status === 'sent' ? theme.primary + '50' :
                            item.lastMessage.status === 'sending' ? theme.primary + '40' :
                            item.lastMessage.status === 'failed' ? '#FF4444' :
                            theme.primary + '30'
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
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.textPrimary} />
                      </TouchableOpacity>
                      {openMenuChatId === chatId && Platform.OS !== 'web' && (
                        <View style={styles.rowMenu}>
                          <TouchableOpacity style={styles.rowMenuItem} onPress={() => { setOpenMenuChatId(null); handleDeleteChat(chatId); }}>
                            <Ionicons name="trash" size={14} color="#FF4D4F" />
                            <Text style={[styles.rowMenuItemText, { color: theme.textPrimary }]}>Delete</Text>
                          </TouchableOpacity>
                          {item.archived ? (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleUnarchiveChat(chatId)}>
                              <Ionicons name="archive" size={14} color="#FFFFFF" />
                              <Text style={[styles.rowMenuItemText, { color: theme.textPrimary }]}>Unarchive</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleArchiveChat(chatId)}>
                              <Ionicons name="archive" size={14} color="#FFFFFF" />
                              <Text style={[styles.rowMenuItemText, { color: theme.textPrimary }]}>Archive</Text>
                            </TouchableOpacity>
                          )}
                          {item.pinned ? (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleUnpinChat(chatId)}>
                              <Ionicons name="pin" size={14} color="#FFFFFF" />
                              <Text style={[styles.rowMenuItemText, { color: theme.textPrimary }]}>Unpin</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handlePinChat(chatId)}>
                              <Ionicons name="pin" size={14} color="#FFFFFF" />
                              <Text style={[styles.rowMenuItemText, { color: theme.textPrimary }]}>Pin</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
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

      {/* Mobile long-press menu modal */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={!!openMenuChatId}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenMenuChatId(null)}
        >
          <TouchableOpacity 
            style={styles.mobileMenuOverlay} 
            activeOpacity={1} 
            onPress={() => setOpenMenuChatId(null)}
          >
            <View style={[styles.mobileMenuContainer, { backgroundColor: theme.surface }]}>
              <View style={styles.mobileMenuHandle} />
              <Text style={[styles.mobileMenuTitle, { color: theme.textPrimary }]}>Chat Options</Text>
              
              {/* Pin/Unpin option */}
              {visibleConversations.find(c => c.chat.id === openMenuChatId)?.pinned ? (
                <TouchableOpacity 
                  style={styles.mobileMenuItem} 
                  onPress={() => handleUnpinChat(openMenuChatId)}
                >
                  <View style={[styles.mobileMenuIconContainer, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="pin-outline" size={22} color={theme.primary} />
                  </View>
                  <Text style={[styles.mobileMenuItemText, { color: theme.textPrimary }]}>Unpin Chat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.mobileMenuItem} 
                  onPress={() => handlePinChat(openMenuChatId)}
                >
                  <View style={[styles.mobileMenuIconContainer, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="pin" size={22} color={theme.primary} />
                  </View>
                  <Text style={[styles.mobileMenuItemText, { color: theme.textPrimary }]}>Pin Chat</Text>
                </TouchableOpacity>
              )}

              {/* Archive/Unarchive option */}
              {visibleConversations.find(c => c.chat.id === openMenuChatId)?.archived ? (
                <TouchableOpacity 
                  style={styles.mobileMenuItem} 
                  onPress={() => handleUnarchiveChat(openMenuChatId)}
                >
                  <View style={[styles.mobileMenuIconContainer, { backgroundColor: '#22C55E20' }]}>
                    <Ionicons name="archive-outline" size={22} color="#22C55E" />
                  </View>
                  <Text style={[styles.mobileMenuItemText, { color: theme.textPrimary }]}>Unarchive Chat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.mobileMenuItem} 
                  onPress={() => handleArchiveChat(openMenuChatId)}
                >
                  <View style={[styles.mobileMenuIconContainer, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="archive" size={22} color="#F59E0B" />
                  </View>
                  <Text style={[styles.mobileMenuItemText, { color: theme.textPrimary }]}>Archive Chat</Text>
                </TouchableOpacity>
              )}

              {/* Delete option */}
              <TouchableOpacity 
                style={styles.mobileMenuItem} 
                onPress={() => { setOpenMenuChatId(null); handleDeleteChat(openMenuChatId); }}
              >
                <View style={[styles.mobileMenuIconContainer, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="trash" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.mobileMenuItemText, { color: '#EF4444' }]}>Delete Chat</Text>
              </TouchableOpacity>

              {/* Cancel button */}
              <TouchableOpacity 
                style={[styles.mobileMenuCancelButton, { backgroundColor: theme.surfaceSecondary }]} 
                onPress={() => setOpenMenuChatId(null)}
              >
                <Text style={[styles.mobileMenuCancelText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
    zIndex: 10,
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    padding: 2,
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(124, 43, 134, 0.9)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(248, 250, 252, 0.8)',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 100,
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
  blindDateDailyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 4,
    zIndex: 10,
  },
  blindDateDailyBannerSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  blindDateDailyBannerSearching: {
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  blindDateDailyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  blindDateDailySubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(226, 232, 240, 0.85)',
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
  blindDateTag: {
    fontSize: 11,
    color: 'rgba(124, 43, 134, 0.9)',
    fontWeight: '500',
    marginBottom: 2,
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
  // Chat name row with verified badge
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinnedIcon: {
    marginLeft: 4,
    fontSize: 12,
  },
  // Mobile long-press menu styles
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  mobileMenuHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  mobileMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  mobileMenuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  mobileMenuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mobileMenuCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  mobileMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
