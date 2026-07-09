import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSocket, socketService } from "@/src/api/socket";
import { chatApi } from "@/src/api/chat";
import { unreadCountService } from "@/src/services/unreadCountService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from 'react';
import { AppState, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Web-specific bottom padding to account for mobile browser chrome
const WEB_BOTTOM_PADDING = 20;


export default function TabBarWithNotifications({ state, descriptors, navigation }) {
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
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
    
    // Listen for new notifications (count is now handled elsewhere)
    socket.on('notification:new', ({ notification }) => {
      // Notification badges are handled outside the tab bar
    });
    
    // Keep existing friend request listeners for compatibility
    socket.on('friend:request:received', () => {
      // Notification badges are handled outside the tab bar
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
    match:   { active: "flash",                 inactive: "flash-outline" },
    explore: { active: "planet",                inactive: "planet-outline" },
    memes:   { active: "happy",                  inactive: "happy-outline" },
    chat:    { active: "chatbubble-ellipses",   inactive: "chatbubble-ellipses-outline" },
    profile: { active: "person",                inactive: "person-outline" },
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

  const activeColor = '#8B5CF6';

  return (
    <>
      <View
        style={[
          styles.tabBarContainer,
          {
            paddingBottom: getBottomPadding(),
            backgroundColor: isDarkMode ? '#0E0E16' : '#FFFFFF',
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          },
        ]}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;
            const isFocused = state.index === index;

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

            const icons = iconMap[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
            const iconName = isFocused ? icons.active : icons.inactive;
            const color = isFocused ? activeColor : theme.textMuted;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                activeOpacity={0.7}
                style={styles.tabItem}
              >
                <View style={styles.tabIconWrap}>
                  {isFocused && (
                    <View style={[
                      styles.tabActivePill,
                      { backgroundColor: isDarkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.1)' },
                    ]} />
                  )}
                  {route.name === 'profile' && user?.profilePhotoUrl ? (
                    // Matches the iOS native tab bar's circular profile photo
                    // (app/secure/(tabs)/_layout.ios.jsx) -- that one has to
                    // rasterize the avatar into a PNG for UITabBar, but here
                    // it's plain RN so a clipping wrapper + matching
                    // borderRadius on the Image (both exactly half of the
                    // avatar's own size) is all that's needed.
                    <View
                      style={[
                        styles.tabAvatarRing,
                        { borderColor: isFocused ? activeColor : 'transparent' },
                      ]}
                    >
                      <Image source={{ uri: user.profilePhotoUrl }} style={styles.tabAvatarImage} />
                    </View>
                  ) : (
                    <Ionicons name={iconName} size={23} color={color} />
                  )}
                  {route.name === 'chat' && totalUnreadMessages > 0 && (
                    <View style={[styles.chatBadge, { backgroundColor: theme.error, borderColor: isDarkMode ? '#0E0E16' : '#FFFFFF' }]}>
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
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    borderTopWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    minHeight: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 34,
  },
  tabActivePill: {
    position: 'absolute',
    width: 52,
    height: 34,
    borderRadius: 17,
  },
  // borderRadius on both the wrapping ring and the image itself is exactly
  // half of their own width/height -- that's what actually makes this a
  // circle instead of a square photo; overflow:'hidden' on the ring is what
  // clips it there.
  tabAvatarRing: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12.5,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
