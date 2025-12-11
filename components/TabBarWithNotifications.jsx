import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { useLocalNotificationCount } from "@/src/hooks/useLocalNotificationCount";
import { unreadCountService } from "@/src/services/unreadCountService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NotificationPanel from './NotificationPanel';

// Web-specific bottom padding to account for mobile browser chrome
const WEB_BOTTOM_PADDING = 20;


export default function TabBarWithNotifications({ state, descriptors, navigation }) {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { notificationCount, resetCount: resetNotificationCount, incrementCount } = useLocalNotificationCount();
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [chatUnreadCounts, setChatUnreadCounts] = useState({}); // chatId -> unread count
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!token) return;

    // Subscribe to the unread count service for instant updates
    const unsubscribe = unreadCountService.subscribe(({ chatUnreadCounts, totalUnreadCount }) => {
      setChatUnreadCounts(chatUnreadCounts);
      setTotalUnreadMessages(totalUnreadCount);
    });

    // Load initial data and initialize the service
    loadTotalUnreadMessages();
    setupSocketListeners();

    return () => {
      unsubscribe();
      cleanupSocketListeners();
    };
  }, [token]);
  
  // Add app state listener to refresh unread count when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && token) {
        //console.log('📱 App became active, refreshing unread count');
        loadTotalUnreadMessages();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [token]);
  
  // Add periodic refresh to ensure accuracy (every 30 seconds when app is active)
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadTotalUnreadMessages();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  const loadNotificationCount = async () => {
    try {
      //console.log('🔔 Loading notification count from API...');
      const response = await notificationApi.getUnreadCount(token);
      if (response.success) {
        //console.log('✅ Notification count loaded:', response.count);
        setNotificationCount(response.count);
      } else {
        console.error('❌ Failed to load notification count:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading notification count:', error);
    }
  };
  
  const loadTotalUnreadMessages = async () => {
    try {
      const response = await chatApi.getInbox(token);
      // Initialize the unread count service with the data
      unreadCountService.initializeCounts(response.inbox);
    } catch (error) {
      console.error('Failed to load total unread messages:', error);
    }
  };
  
  // Helper function to calculate total from the local state
  const calculateTotalUnread = (unreadCounts) => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  const setupSocketListeners = () => {
    const socket = getSocket(token);
    
    // Listen for new notifications
    socket.on('notification:new', ({ notification }) => {
      //console.log('🔔 New notification received in tab bar:', notification);
      incrementCount();
    });
    
    // Keep existing friend request listeners for compatibility
    socket.on('friend:request:received', () => {
      incrementCount();
    });

    socket.on('friend:request:accept:confirmed', () => {
      // Note: The hook already handles decrementing, so we don't need to do anything here
      // The notification panel will reset the count when opened
    });

    socket.on('friend:request:decline:confirmed', () => {
      // Note: The hook already handles decrementing, so we don't need to do anything here
      // The notification panel will reset the count when opened
    });
    
    // Listen for chat message events to update total unread count
    socket.on('chat:message', ({ message }) => {
      //console.log('📨 New message received in tab bar, updating unread count');
      // For new messages, increment the unread count for that chat via service
      if (message && message.chatId) {
        unreadCountService.incrementChatUnreadCount(message.chatId);
      }
    });
    
    // Listen for unread count updates (more reliable than reloading)
    socket.on('chat:unread_count', ({ chatId, unreadCount }) => {
      //console.log(`📊 Unread count update received in tab bar: chat ${chatId}, count ${unreadCount}`);
      // Update via the service for instant propagation
      unreadCountService.setChatUnreadCount(chatId, unreadCount);
    });
    
    // Listen for local unread clearing for instant updates
    socket.on('chat:local:unread_cleared', ({ chatId, clearedCount }) => {
      //console.log(`📊 Local unread cleared in tab bar: chat ${chatId}, cleared ${clearedCount}`);
      // Update via the service for instant propagation
      unreadCountService.reduceChatUnreadCount(chatId, clearedCount);
    });
    
    // Also listen for background message events (global handler)
    const handleBackgroundMessage = ({ message }) => {
      //console.log('📨 Background message received in tab bar:', message);
      if (message && message.chatId) {
        // Update via the service for instant propagation
        unreadCountService.incrementChatUnreadCount(message.chatId);
      }
    };
    
    // Register global message handler for when user is on other tabs
    socketService.addMessageHandler('tab-bar-unread', handleBackgroundMessage);
  };

  const cleanupSocketListeners = () => {
    const socket = getSocket(token);
    socket.off('notification:new');
    socket.off('friend:request:received');
    socket.off('friend:request:accept:confirmed');
    socket.off('friend:request:decline:confirmed');
    socket.off('chat:message');
    socket.off('chat:unread_count');
    socket.off('chat:local:unread_cleared');
    
    // Remove global message handler
    socketService.removeMessageHandler('tab-bar-unread');
  };

  const iconMap = {
    match: "heart",
    explore: "compass",
    chat: "chatbubbles",
    profile: "person",
  };

  // Calculate bottom padding - add extra for web mobile browsers
  const getBottomPadding = () => {
    const basePadding = Math.max(insets.bottom, 12);
    if (Platform.OS === 'web') {
      // Add extra padding for mobile browser chrome (address bar, navigation)
      return basePadding + WEB_BOTTOM_PADDING;
    }
    return basePadding;
  };

  return (
    <>
      <View style={[styles.tabBarContainer, { paddingBottom: getBottomPadding() }]}>
        <LinearGradient
          colors={isDarkMode ? [theme.surface, theme.backgroundSecondary] : [theme.surface, theme.backgroundSecondary]}
          style={styles.tabBarGradient}
        />
        <View style={[styles.tabBar, { backgroundColor: 'transparent' }]}>
        {/* Regular tabs */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          // Skip hidden routes
          if (options.href === null) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = iconMap[route.name] ?? "ellipse";
          const adjustedSize = isFocused ? 26 : 24;
          const color = isFocused ? theme.primary : theme.textMuted;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.tabItem, isFocused && { backgroundColor: theme.primaryLight, borderRadius: 16 }]}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons name={iconName} size={adjustedSize} color={color} />
                {route.name === 'chat' && totalUnreadMessages > 0 && (
                  <View style={[styles.chatBadge, { backgroundColor: theme.error, borderColor: theme.surface }]}>
                    <Text style={styles.chatBadgeText}>
                      {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Notification button */}
        <TouchableOpacity
          style={[styles.notificationButton, showNotifications && { backgroundColor: theme.primaryLight, borderRadius: 16 }]}
          onPress={() => setShowNotifications(!showNotifications)}
        >
          <View style={styles.notificationIconContainer}>
            <Ionicons 
              name="notifications" 
              size={24} 
              color={showNotifications ? theme.primary : theme.textMuted} 
            />
            {notificationCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: theme.error }]}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        </View>
      </View>

      {/* Notification Panel */}
      <NotificationPanel 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    minHeight: 72,
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    minHeight: 52,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  notificationButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    minHeight: 52,
  },
  notificationIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
