import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '@/src/api/socket';

/**
 * Hook to manage background search functionality
 * Handles notifications and socket events when app is in background
 */
export const useBackgroundSearch = () => {
  const [activeSearches, setActiveSearches] = useState(new Set());

  useEffect(() => {
    // Load active searches from storage
    loadActiveSearches();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up socket listeners for background notifications
    setupBackgroundSocketListeners();

    return () => {
      subscription?.remove();
    };
  }, []);

  const loadActiveSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('@circle:background_searches');
      if (stored) {
        const searches = JSON.parse(stored);
        setActiveSearches(new Set(searches));
      }
    } catch (error) {
      console.error('Error loading background searches:', error);
    }
  };

  const saveActiveSearches = async (searches) => {
    try {
      await AsyncStorage.setItem('@circle:background_searches', JSON.stringify([...searches]));
    } catch (error) {
      console.error('Error saving background searches:', error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'background' && activeSearches.size > 0) {
      // App went to background with active searches
      scheduleBackgroundReminder();
    }
  };

  const setupBackgroundSocketListeners = () => {
    const socket = getSocket();

    const handleMatchFound = (data) => {
      if (activeSearches.has(data.requestId)) {
        // Remove from active searches
        const newSearches = new Set(activeSearches);
        newSearches.delete(data.requestId);
        setActiveSearches(newSearches);
        saveActiveSearches(newSearches);

        // Send notification if app is in background
        if (AppState.currentState !== 'active') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: '🎉 Helper Found!',
              body: 'Someone is ready to help you. Tap to start chatting!',
              data: { 
                chatId: data.chatId, 
                type: 'match_found',
                requestId: data.requestId 
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
          });
        }
      }
    };

    const handleSearchUpdate = (data) => {
      if (activeSearches.has(data.requestId) && AppState.currentState !== 'active') {
        // Send periodic update notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🔍 Still Searching',
            body: 'We\'re actively looking for the perfect helper for you.',
            data: { 
              requestId: data.requestId, 
              type: 'search_update' 
            },
            sound: false,
          },
          trigger: null,
        });
      }
    };

    socket.on('help_request_accepted', handleMatchFound);
    socket.on('help_request_declined', handleSearchUpdate);

    return () => {
      socket.off('help_request_accepted', handleMatchFound);
      socket.off('help_request_declined', handleSearchUpdate);
    };
  };

  const scheduleBackgroundReminder = () => {
    // Schedule reminder notification after 30 minutes
    Notifications.scheduleNotificationAsync({
      content: {
        title: '🔍 Search Update',
        body: 'We\'re still looking for a helper. Your request is active in the background.',
        data: { type: 'background_reminder' },
        sound: false,
      },
      trigger: {
        seconds: 30 * 60, // 30 minutes
      },
    });
  };

  const addBackgroundSearch = async (requestId) => {
    const newSearches = new Set(activeSearches);
    newSearches.add(requestId);
    setActiveSearches(newSearches);
    await saveActiveSearches(newSearches);

    // Schedule initial notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔍 Searching in Background',
        body: 'We\'ll notify you when we find someone to help you!',
        data: { requestId, type: 'background_search_started' },
        sound: false,
      },
      trigger: null,
    });
  };

  const removeBackgroundSearch = async (requestId) => {
    const newSearches = new Set(activeSearches);
    newSearches.delete(requestId);
    setActiveSearches(newSearches);
    await saveActiveSearches(newSearches);
  };

  const clearAllBackgroundSearches = async () => {
    setActiveSearches(new Set());
    await AsyncStorage.removeItem('@circle:background_searches');
  };

  return {
    activeSearches: [...activeSearches],
    addBackgroundSearch,
    removeBackgroundSearch,
    clearAllBackgroundSearches,
    hasActiveSearches: activeSearches.size > 0,
  };
};

export default useBackgroundSearch;
