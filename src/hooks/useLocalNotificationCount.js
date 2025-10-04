import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '../api/socket';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'local_notification_count';

export const useLocalNotificationCount = () => {
  const { token, user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load count from local storage on app start
  useEffect(() => {
    loadLocalCount();
  }, [user?.id]);

  // Set up socket listeners for new notifications
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    
    const handleNewNotification = (data) => {
      console.log('🔔 New notification received, incrementing local count');
      incrementCount();
    };

    // Listen to various notification events
    socket.on('notification:new', handleNewNotification);
    socket.on('friend:request:received', handleNewNotification);
    socket.on('friend:request:accepted', handleNewNotification);
    socket.on('matchmaking:matched', handleNewNotification);
    socket.on('profile:visit', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('friend:request:received', handleNewNotification);
      socket.off('friend:request:accepted', handleNewNotification);
      socket.off('matchmaking:matched', handleNewNotification);
      socket.off('profile:visit', handleNewNotification);
    };
  }, [token]);

  const getStorageKey = () => {
    return `${STORAGE_KEY}_${user?.id || 'unknown'}`;
  };

  const loadLocalCount = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(getStorageKey());
      const count = stored ? parseInt(stored, 10) : 0;
      setNotificationCount(count);
    } catch (error) {
      console.error('❌ Failed to load local notification count:', error);
      setNotificationCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const saveLocalCount = async (count) => {
    try {
      await AsyncStorage.setItem(getStorageKey(), count.toString());
      console.log('💾 Saved local notification count:', count);
    } catch (error) {
      console.error('❌ Failed to save local notification count:', error);
    }
  };

  const incrementCount = useCallback(() => {
    setNotificationCount(prev => {
      const newCount = prev + 1;
      saveLocalCount(newCount);
      return newCount;
    });
  }, []);

  const resetCount = useCallback(() => {
    console.log('🔄 Resetting local notification count to 0');
    setNotificationCount(0);
    saveLocalCount(0);
  }, []);

  const setCount = useCallback((count) => {
    console.log('📝 Setting local notification count to:', count);
    setNotificationCount(count);
    saveLocalCount(count);
  }, []);

  // Sync with server count (optional, for initial load)
  const syncWithServer = useCallback(async () => {
    try {
      const socket = getSocket(token);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏰ Server sync timeout, keeping local count');
          resolve(notificationCount);
        }, 5000);

        socket.once('notifications:count', (data) => {
          clearTimeout(timeout);
          const serverCount = data.count || 0;
          console.log('🔄 Server notification count:', serverCount);
          
          // Only update if server count is higher (in case we missed some notifications)
          if (serverCount > notificationCount) {
            console.log('📈 Server count higher, updating local count');
            setCount(serverCount);
            resolve(serverCount);
          } else {
            console.log('📊 Keeping local count:', notificationCount);
            resolve(notificationCount);
          }
        });

        socket.emit('notifications:get_count');
      });
    } catch (error) {
      console.error('❌ Failed to sync with server:', error);
      return notificationCount;
    }
  }, [token, notificationCount, setCount]);

  return {
    notificationCount,
    isLoading,
    incrementCount,
    resetCount,
    setCount,
    syncWithServer,
    loadLocalCount
  };
};
