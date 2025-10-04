import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, AppState, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from '@/contexts/AuthContext';
import { getSocket } from '@/src/api/socket';
import socketService from '@/src/services/socketService';
import { chatApi } from '@/src/api/chat';
import { useLocalNotificationCount } from '@/src/hooks/useLocalNotificationCount';
import NotificationPanel from './NotificationPanel';

const TAB_COLORS = {
  background: "rgba(22, 9, 45, 0.85)",
  active: "#FF1493",
  inactive: "rgba(255, 255, 255, 0.52)",
};

export default function TabBarWithNotifications({ state, descriptors, navigation }) {
  const { token } = useAuth();
  const { notificationCount, resetCount: resetNotificationCount, incrementCount } = useLocalNotificationCount();
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [chatUnreadCounts, setChatUnreadCounts] = useState({}); // chatId -> unread count
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!token) return;

    loadTotalUnreadMessages();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, [token]);
  
  // Add app state listener to refresh unread count when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && token) {
        console.log('📱 App became active, refreshing unread count');
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
      console.log('🔔 Loading notification count from API...');
      const response = await notificationApi.getUnreadCount(token);
      if (response.success) {
        console.log('✅ Notification count loaded:', response.count);
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
      const totalUnread = response.inbox.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
      setTotalUnreadMessages(totalUnread);
      
      // Also initialize the chat unread counts map
      const unreadMap = {};
      response.inbox.forEach(item => {
        if (item.chatId && item.unreadCount > 0) {
          unreadMap[item.chatId] = item.unreadCount;
        }
      });
      setChatUnreadCounts(unreadMap);
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
      console.log('🔔 New notification received in tab bar:', notification);
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
      console.log('📨 New message received in tab bar, updating unread count');
      // For new messages, increment the unread count for that chat
      if (message && message.chatId) {
        setChatUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            [message.chatId]: (prev[message.chatId] || 0) + 1
          };
          const newTotal = calculateTotalUnread(newCounts);
          console.log(`📊 Updated unread counts after new message: chat ${message.chatId} = ${newCounts[message.chatId]}, total = ${newTotal}`);
          setTotalUnreadMessages(newTotal);
          return newCounts;
        });
      }
    });
    
    // Listen for unread count updates (more reliable than reloading)
    socket.on('chat:unread_count', ({ chatId, unreadCount }) => {
      console.log(`📊 Unread count update received in tab bar: chat ${chatId}, count ${unreadCount}`);
      // Update the specific chat's unread count
      setChatUnreadCounts(prev => {
        const newCounts = {
          ...prev,
          [chatId]: unreadCount
        };
        // Remove chat from map if unread count is 0
        if (unreadCount === 0) {
          delete newCounts[chatId];
        }
        const newTotal = calculateTotalUnread(newCounts);
        console.log(`📊 Updated unread counts after count update: chat ${chatId} = ${unreadCount}, total = ${newTotal}`);
        setTotalUnreadMessages(newTotal);
        return newCounts;
      });
    });
    
    // Also listen for background message events (global handler)
    const handleBackgroundMessage = ({ message }) => {
      console.log('📨 Background message received in tab bar:', message);
      if (message && message.chatId) {
        setChatUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            [message.chatId]: (prev[message.chatId] || 0) + 1
          };
          const newTotal = calculateTotalUnread(newCounts);
          console.log(`📊 Updated unread counts after background message: chat ${message.chatId} = ${newCounts[message.chatId]}, total = ${newTotal}`);
          setTotalUnreadMessages(newTotal);
          return newCounts;
        });
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
    
    // Remove global message handler
    socketService.removeMessageHandler('tab-bar-unread');
  };

  const iconMap = {
    match: "heart",
    explore: "compass",
    chat: "chatbubbles",
    profile: "person",
  };

  return (
    <>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
          const color = isFocused ? TAB_COLORS.active : TAB_COLORS.inactive;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={styles.tabIconContainer}>
                <Ionicons name={iconName} size={adjustedSize} color={color} />
                {route.name === 'chat' && totalUnreadMessages > 0 && (
                  <View style={styles.chatBadge}>
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
          style={styles.notificationButton}
          onPress={() => setShowNotifications(!showNotifications)}
        >
          <View style={styles.notificationIconContainer}>
            <Ionicons 
              name="notifications" 
              size={24} 
              color={showNotifications ? TAB_COLORS.active : TAB_COLORS.inactive} 
            />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: TAB_COLORS.background,
    minHeight: 72,
    paddingTop: 10,
    paddingHorizontal: 8,
    // Remove fixed paddingBottom as it's now handled dynamically with safe area
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  notificationButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
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
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: TAB_COLORS.background,
  },
  chatBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
