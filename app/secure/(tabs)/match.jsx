import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  AppState,
  Platform,
  Alert,
} from "react-native";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import LocationMap from "@/components/LocationMap";
import { matchmakingApi } from "@/src/api/matchmaking";
import { useAuth } from "@/contexts/AuthContext";
import { updateLocationGql, nearbyUsersGql } from "@/src/api/graphql";
import { getSocket, closeSocket } from "@/src/api/socket";
import FriendRequestsSection from "@/src/components/FriendRequestsSection";
import FriendRequestMatchCard from "@/src/components/FriendRequestMatchCard";
import UserProfileModal from "@/src/components/UserProfileModal";
import NotificationPermissionBanner from "@/src/components/NotificationPermissionBanner";
import NotificationDebugPanel from "@/src/components/NotificationDebugPanel";
import { friendsApi } from "@/src/api/friends";
import { getUserPreferences, getPreferencesForMatching } from "@/utils/preferences";
import Toast from "@/components/Toast";
import { circleStatsApi, CirclePointsHelper } from "@/src/api/circle-stats";

const mockMatches = [
  { id: 1, name: "Ava", age: 27, location: "2 km away", compatibility: "92%" },
  { id: 2, name: "Noah", age: 29, location: "5 km away", compatibility: "88%" },
  { id: 3, name: "Liam", age: 26, location: "1 km away", compatibility: "85%" },
];

export default function MatchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { token, user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [nearbyMatches, setNearbyMatches] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [circleStats, setCircleStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: "", type: "info" });
  const [isConnectPressed, setIsConnectPressed] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false); // Track if user has an active matchmaking session
  const acceptedNotifiedRef = useRef(false);
  const livePulse = useRef(new Animated.Value(0)).current;
  const showToast = (text, type = "info") => {
    setToast({ visible: true, text, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

  // Helper function to generate dynamic description
  const generateDescription = (interests, needs) => {
    const commonInterests = interests?.slice(0, 2) || [];
    const commonNeeds = needs?.slice(0, 1) || [];
    
    if (commonInterests.length > 0 && commonNeeds.length > 0) {
      return `Shares your love for ${commonInterests.join(' and ')} and is also looking for ${commonNeeds[0]}. This could be a great connection!`;
    } else if (commonInterests.length > 0) {
      return `You both enjoy ${commonInterests.join(' and ')}. Based on your interests, this looks promising!`;
    } else if (commonNeeds.length > 0) {
      return `Also looking for ${commonNeeds[0]}. Your goals seem aligned!`;
    } else {
      return "Based on your interests and needs, this looks promising!";
    }
  };


  // Realtime matchmaking via socket.io
  useEffect(() => {
    if (!token) return;
    const s = getSocket(token);
    
    // Clear any stale state when socket connects
    s.on('connect', () => {
      setIsSearching(false);
      setMatchedUser(null);
      setShowModal(false);
      setHasActiveSession(false);
    });
    
    const onProposal = (payload) => {
      const o = payload.other;
      setMatchedUser({
        id: o.id,
        firstName: o.first_name,
        lastName: o.last_name,
        age: o.age,
        location: "Nearby",
        gender: o.gender,
        avatar: o.profile_photo_url || "https://i.pravatar.cc/300?img=12",
        description: generateDescription(o.interests, o.needs),
        compatibility: "High match",
        interests: o.interests || [],
        needs: o.needs || [],
      });
      setIsSearching(false);
      setShowModal(true);
      setHasActiveSession(true); // Set active session since user is now in a proposal
      setIsConnectPressed(false); // Reset connect button state
    };
    const onAcceptedByOther = (payload) => {
      setIsConnectPressed(false); // Reset connect button state
      showToast(`${payload.by} has accepted to chat. Waiting for you…`, "info");
    };
    const onMatched = (payload) => {
      setIsSearching(false);
      setShowModal(false);
      setHasActiveSession(false); // End the active session - user got matched
      showToast(payload.message || "You got a match!", "success");
      setTimeout(() => router.push({ 
        pathname: "/secure/chat-conversation", 
        params: { 
          id: payload.chatId, 
          name: payload.otherName,
          avatar: matchedUser?.avatar || ""
        } 
      }), 700);
    };
    
    const onSearchingStarted = () => {
      setIsSearching(true);
      setMatchedUser(null);
      if (!showModal) setShowModal(true);
    };
    
    const onSearchCancelled = (payload) => {
      setIsSearching(false);
      setMatchedUser(null);
      setShowModal(false);
      setHasActiveSession(false); // End the active session
      acceptedNotifiedRef.current = false;
      if (payload?.message) showToast(payload.message, "info");
    };
    
    const onPassedByOther = (payload) => {
      // Other user passed, show positive message and restart search
      setMatchedUser(null);
      setIsConnectPressed(false); // Reset connect button state
      // Keep modal open to show searching state and maintain active session
      setIsSearching(true);
      // Don't reset hasActiveSession - user still wants to find matches
      acceptedNotifiedRef.current = false;
      showToast(payload.message || "Looking for someone even better for you! 💫", "info");
    };
    
    const onConnectionError = () => {
      if (isSearching) {
        showToast("Connection lost. Reconnecting...", "error");
      }
    };
    
    const onReconnected = () => {
      if (isSearching) {
        showToast("Reconnected!", "success");
        // Clear any stale state and restart search if needed
        setHasActiveSession(false);
        setMatchedUser(null);
        setShowModal(false);
      }
    };
    s.on('matchmaking:proposal', onProposal);
    s.on('matchmaking:accepted_by_other', onAcceptedByOther);
    s.on('matchmaking:matched', onMatched);
    s.on('matchmaking:searching_started', onSearchingStarted);
    s.on('matchmaking:cancelled', onSearchCancelled);
    s.on('matchmaking:passed_by_other', onPassedByOther);
    s.on('disconnect', onConnectionError);
    s.on('reconnect', onReconnected);
    
    // Handle connection errors
    s.on('connect_error', (error) => {
      if (isSearching) {
        showToast("Connection issues. Please check your internet.", "error");
      }
    });
    return () => {
      try {
        s.off('matchmaking:proposal', onProposal);
        s.off('matchmaking:accepted_by_other', onAcceptedByOther);
        s.off('matchmaking:matched', onMatched);
        s.off('matchmaking:searching_started', onSearchingStarted);
        s.off('matchmaking:cancelled', onSearchCancelled);
        s.off('matchmaking:passed_by_other', onPassedByOther);
        s.off('disconnect', onConnectionError);
        s.off('reconnect', onReconnected);
        s.off('connect_error');
      } catch (error) {
        console.error('Error cleaning up socket listeners:', error);
      }
    };
  }, [token]); // Remove hasActiveSession from dependencies since we set it in handlers

  // Rotating searching phrases for background searching state (when modal hidden)
  const SEARCH_PHRASES = [
    "Finding someone who shares your vibe…",
    "Scanning nearby circles…",
    "Checking interests and needs…",
    "Looking for a great match near you…",
    "Lining up your perfect intro…",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (isSearching && !showModal) {
      const id = setInterval(() => setPhraseIdx((p) => (p + 1) % SEARCH_PHRASES.length), 1600);
      return () => clearInterval(id);
    }
  }, [isSearching, showModal]);

  // Handle app state changes for socket connection management
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        // Socket will handle connection management automatically
        console.log('App went to background');
      } else if (state === "active") {
        // Reconnect socket if needed
        if (token && isSearching) {
          const s = getSocket(token);
          if (!s.connected) {
            s.connect();
          }
        }
      }
    });
    return () => {
      sub.remove();
    };
  }, [token, isSearching]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [livePulse]);

  // Clean up any existing matchmaking state on app start
  const cleanupMatchmakingState = async () => {
    try {
      // Cancel any existing matchmaking session
      await matchmakingApi.cancel(token);
      
      // Reset all states
      setIsSearching(false);
      setMatchedUser(null);
      setShowModal(false);
      setIsConnectPressed(false);
      setHasActiveSession(false);
      acceptedNotifiedRef.current = false;
    } catch (e) {
      console.log('Cleanup completed (some errors ignored)');
    }
  };

  // Clean up on app start and record location
  useEffect(() => {
    if (token) {
      cleanupMatchmakingState();
      recordUserLocation();
    }
  }, [token]);

  // Record user location when app opens
  const recordUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      
      // Get address information (optional)
      let address, city, country;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          address = `${location.street || ''} ${location.streetNumber || ''}`.trim();
          city = location.city || location.district || location.subregion;
          country = location.country;
        }
      } catch (error) {
        console.log('Reverse geocoding failed:', error);
      }

      // Update location in database via GraphQL
      await updateLocationGql({
        latitude,
        longitude,
        address,
        city,
        country,
      }, token);

      
      // Store user location for map
      setUserLocation({ latitude, longitude });
      
      // Load nearby users for map
      loadNearbyUsers(latitude, longitude);
    } catch (error) {
      console.error('Failed to record location:', error);
    }
  };

  // Load nearby users for map display
  const loadNearbyUsers = async (latitude, longitude, radiusKm = 50) => {
    try {
      const users = await nearbyUsersGql(latitude, longitude, radiusKm, 50, token);
      
      // Transform users for map display
      const mapUsers = users.map(user => ({
        id: user.id,
        name: user.firstName + (user.lastName ? ` ${user.lastName.charAt(0)}.` : ''),
        age: user.age,
        gender: user.gender,
        latitude: user.location.latitude,
        longitude: user.location.longitude,
        photoUrl: user.profilePhotoUrl,
        distance: user.distance,
        compatibility: `${Math.round(85 + Math.random() * 10)}%`, // Mock compatibility for now
        interests: user.interests,
        needs: user.needs
      }));
      
      setNearbyUsers(mapUsers);
    } catch (error) {
      console.error('Failed to load nearby users:', error);
    }
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background, clean up matchmaking only if user has active session
        if (hasActiveSession) {
          try {
            await matchmakingApi.cancel(token);
            setHasActiveSession(false);
            setIsSearching(false);
            setMatchedUser(null);
            setShowModal(false);
            console.log('Matchmaking cancelled due to app backgrounding');
          } catch (error) {
            console.log('Failed to cancel matchmaking on background:', error);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [hasActiveSession, token]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (token && hasActiveSession) {
        matchmakingApi.cancel(token).catch(() => {});
      }
    };
  }, [token, hasActiveSession]);

  // Load friend requests
  const loadFriendRequests = async () => {
    if (!token) return;
    
    try {
      const response = await friendsApi.getPendingRequests(token);
      
      let requests = response.requests || [];
      
      
      setFriendRequests(requests);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      setFriendRequests([]);
    }
  };

  // Setup Socket.IO listeners for friend requests
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    // Listen for new friend requests
    socket.on('friend:request:received', ({ request }) => {
      console.log('📨 New friend request received:', request);
      console.log('📨 Sender info:', request.sender);
      setFriendRequests(prev => [request, ...prev]);
      
      // Show alert notification
      const senderName = request.sender?.first_name || 'Someone';
      Alert.alert(
        'Friend Request',
        `${senderName} wants to be your friend`,
        [{ text: 'OK', style: 'default' }]
      );
    });

    // Listen for friend request acceptance
    socket.on('friend:request:accepted', ({ request, acceptedBy }) => {
      console.log('✅ Friend request accepted:', request);
      
      // Remove from pending requests
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
      
      // Show success alert
      const acceptorName = acceptedBy?.first_name || 'Someone';
      Alert.alert(
        'Friend Request Accepted',
        `${acceptorName} accepted your friend request!`,
        [{ text: 'Great!', style: 'default' }]
      );
    });

    // Listen for friend request decline
    socket.on('friend:request:declined', ({ request, declinedBy }) => {
      console.log('❌ Friend request declined:', request);
      
      // Remove from pending requests
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
    });

    // Listen for friend request cancellation
    socket.on('friend:request:cancelled', ({ request, cancelledBy }) => {
      console.log('🚫 Friend request cancelled:', request);
      
      // Remove from pending requests
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'A friend request was cancelled',
        type: 'info'
      });
    });

    // Listen for message request cancellation
    socket.on('message:request:cancelled', ({ proposal, cancelledBy }) => {
      console.log('🚫 Message request cancelled:', proposal);
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'A message request was cancelled',
        type: 'info'
      });
    });

    // Listen for unfriend events
    socket.on('friend:unfriended', ({ unfriendedBy, friendship }) => {
      console.log('💔 Unfriended by user:', unfriendedBy);
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'Someone removed you as a friend',
        type: 'info'
      });
    });

    // Listen for sent confirmation
    socket.on('friend:request:sent', ({ request, success }) => {
      console.log('✅ Friend request sent:', request);
      
      if (success) {
        Alert.alert(
          'Friend Request Sent',
          'Your friend request has been sent successfully!',
          [{ text: 'OK', style: 'default' }]
        );
      }
    });

    // Listen for errors
    socket.on('friend:request:error', ({ error }) => {
      console.error('❌ Friend request error:', error);
      
      Alert.alert(
        'Error',
        error || 'Failed to process friend request',
        [{ text: 'OK', style: 'default' }]
      );
    });

    return () => {
      socket.off('friend:request:received');
      socket.off('friend:request:accepted');
      socket.off('friend:request:declined');
      socket.off('friend:request:cancelled');
      socket.off('message:request:cancelled');
      socket.off('friend:unfriended');
      socket.off('friend:request:sent');
      socket.off('friend:request:error');
    };
  }, [token]);

  // Refresh when user interests/needs change (after settings update)
  useEffect(() => {
    if (user?.interests || user?.needs) {
      loadFriendRequests();
    }
  }, [user?.interests, user?.needs]);

  // Load Circle statistics
  const loadCircleStats = async () => {
    if (!token) {
      console.log('❌ No token available for Circle stats');
      return;
    }
    
    try {
      console.log('🔄 Loading Circle stats...');
      setLoadingStats(true);
      
      const response = await circleStatsApi.getStats(token);
      console.log('📊 Circle stats API response:', response);
      
      setCircleStats(response);
      
      // Update user activity
      await circleStatsApi.updateActivity(token);
      console.log('✅ Circle stats loaded successfully');
    } catch (error) {
      console.error('❌ Error loading Circle stats:', error);
      showToast("Failed to load Circle stats", "error");
    } finally {
      setLoadingStats(false);
    }
  };

  // Load Circle stats on component mount and when user changes
  useEffect(() => {
    if (token && user) {
      loadCircleStats();
    }
  }, [token, user]);

  const handleLocationSearch = () => {
    router.push('/secure/location');
  };

  const handleImproveMatches = () => {
    router.push('/secure/profile/settings');
  };

  const handleInitializeCirclePoints = async () => {
    if (!token) return;
    
    try {
      console.log('🚀 Initializing Circle points...');
      const response = await circleStatsApi.initialize(token);
      console.log('✅ Circle points initialized:', response);
      
      // Reload stats to show updated data
      await loadCircleStats();
      
      showToast("Circle score initialized! 🎉", "success");
    } catch (error) {
      console.error('❌ Error initializing Circle points:', error);
      showToast("Failed to initialize Circle score", "error");
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh Circle stats
      await loadCircleStats();
      
      // Refresh friend requests
      await loadFriendRequests();
      
      // Update user activity
      if (token) {
        await circleStatsApi.updateActivity(token);
      }
      
      showToast("Data refreshed!", "success");
    } catch (error) {
      console.error('Error refreshing match data:', error);
      showToast("Failed to refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  }, [token, loadCircleStats, loadFriendRequests]);

  const handleStartMatch = async () => {
    try {
      setMatchedUser(null);
      setIsSearching(true);
      setHasActiveSession(true); // Mark that user has started an active session
      
      // Get user preferences for matching
      const userPreferences = await getUserPreferences();
      console.log('📋 User preferences loaded:', userPreferences);
      
      // Get user location for better matching (optional)
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const position = await Location.getCurrentPositionAsync({});
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        }
      } catch (locationError) {
        console.log('Location not available, continuing without it');
      }
      
      // Determine if user is looking for friendship based on their needs
      const userNeeds = user?.needs || [];
      const isForFriendship = userNeeds.some(need => need.toLowerCase() === 'friendship');
      
      // Get matching preferences based on user settings and relationship type
      const matchingPrefs = getPreferencesForMatching(userPreferences, user, isForFriendship);
      console.log('🎯 Matching preferences:', matchingPrefs);
      
      // Prepare location data with preferences
      const locationData = location ? {
        ...location,
        maxDistance: matchingPrefs.maxDistance,
        ageRange: matchingPrefs.ageRange
      } : null;
      
      // Start matchmaking with location and preferences
      await matchmakingApi.start(token, locationData);
      setShowModal(true);
      acceptedNotifiedRef.current = false;
      
      // Show toast with preference info
      const distanceText = matchingPrefs.maxDistance 
        ? `within ${matchingPrefs.maxDistance}km` 
        : 'anywhere in the world';
      showToast(`Searching for ${isForFriendship ? 'friends' : 'matches'} ${distanceText}`, "info");
      
      // Real-time events will handle state updates, no polling needed
    } catch (e) {
      setIsSearching(false);
      setHasActiveSession(false);
      showToast(e?.message || "Failed to start matchmaking", "error");
    }
  };

  const handlePass = async () => {
    try {
      const res = await matchmakingApi.decide("pass", token);
      
      // Keep modal open but clear current match and show searching state
      setMatchedUser(null);
      setIsSearching(true);
      // Don't close modal - keep it open to show searching state
      showToast(res?.message || "Looking for another match...", "info");
    } catch (error) {
      console.error('Failed to pass:', error);
      showToast("Failed to pass. Please try again.", "error");
    }
  };

  const handleCloseSearching = async () => {
    // Stop matchmaking entirely
    try { 
      await matchmakingApi.cancel(token); 
    } catch (e) {
      console.error('Failed to cancel matchmaking:', e);
    }
    
    setMatchedUser(null);
    setIsSearching(false);
    setShowModal(false);
    showToast("Search stopped", "info");
  };

  const handleStartChat = async () => {
    if (isConnectPressed) return; // Prevent double-tap
    
    try {
      setIsConnectPressed(true);
      showToast("Sending connection request...", "info");
      
      const res = await matchmakingApi.decide("accept", token);
      
      if (res?.state === "matched") {
        setIsSearching(false);
        setShowModal(false);
        setMatchedUser(null);
        setIsConnectPressed(false);
        showToast(res.message || "You got a match!", "success");
        setTimeout(() => router.push({ 
          pathname: "/secure/chat-conversation", 
          params: { 
            id: res.match.chatId, 
            name: res.match.otherName,
            avatar: matchedUser?.avatar || ""
          } 
        }), 700);
        return;
      }
      
      // If not immediately matched, keep the pressed state and show waiting message
      showToast("Connection sent! Waiting for response...", "success");
      
      // Reset pressed state after 2 seconds if still waiting
      setTimeout(() => {
        setIsConnectPressed(false);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to accept match:', error);
      setIsConnectPressed(false);
      showToast("Failed to send connection. Please try again.", "error");
    }
  };

  const handleAcceptRequest = (request) => {
    console.log('Accepting friend request:', request);
    
    // Extract the display name using the correct field names
    const displayName = (() => {
      // Use first_name and last_name from sender
      if (request.sender?.first_name) {
        const fullName = `${request.sender.first_name} ${request.sender.last_name || ''}`.trim();
        return fullName;
      }
      
      // Try to extract name from the message "Hi [Name]! I'd like to connect with you."
      if (request.message) {
        const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
        if (messageMatch && messageMatch[1]) {
          return messageMatch[1].trim();
        }
      }
      
      // If sender has a real name (not generic User ID)
      if (request.sender?.name && !request.sender.name.startsWith('User ')) {
        return request.sender.name;
      }
      
      // Try to get name from email
      if (request.sender?.email) {
        const emailName = request.sender.email.split('@')[0];
        // If it's not just numbers, use it
        if (!/^\d+$/.test(emailName)) {
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      // Fallback to a generic name
      return 'Someone';
    })();
    
    // Actually accept the request via socket
    try {
      const socket = getSocket(token);
      socket.emit('friend:request:accept', { requestId: request.id });
      
      // Optimistically update UI
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
      showToast(`Accepted friend request from ${displayName}`, "success");
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      showToast(`Failed to accept friend request`, "error");
    }
  };

  const handleRejectRequest = (request) => {
    console.log('Rejecting friend request:', request);
    
    // Extract the display name using the correct field names
    const displayName = (() => {
      // Use first_name and last_name from sender
      if (request.sender?.first_name) {
        const fullName = `${request.sender.first_name} ${request.sender.last_name || ''}`.trim();
        return fullName;
      }
      
      // Try to extract name from the message "Hi [Name]! I'd like to connect with you."
      if (request.message) {
        const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
        if (messageMatch && messageMatch[1]) {
          return messageMatch[1].trim();
        }
      }
      
      // If sender has a real name (not generic User ID)
      if (request.sender?.name && !request.sender.name.startsWith('User ')) {
        return request.sender.name;
      }
      
      // Try to get name from email
      if (request.sender?.email) {
        const emailName = request.sender.email.split('@')[0];
        // If it's not just numbers, use it
        if (!/^\d+$/.test(emailName)) {
          return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      // Fallback to a generic name
      return 'Someone';
    })();
    
    // Actually decline the request via socket
    try {
      const socket = getSocket(token);
      socket.emit('friend:request:decline', { requestId: request.id });
      
      // Optimistically update UI
      setFriendRequests(prev => prev.filter(r => r.id !== request.id));
      showToast(`Rejected friend request from ${displayName}`, "info");
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      showToast(`Failed to decline friend request`, "error");
    }
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowUserProfile(true);
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

      <Toast visible={toast.visible} text={toast.text} type={toast.type} />

      <ScrollView
        contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7C2B86', '#FF6FB5']}  // Android
            tintColor="#7C2B86"             // iOS
            title="Pull to refresh"         // iOS
            titleColor="#7C2B86"           // iOS
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Today feels lucky</Text>
            <Text style={styles.subtitle}>Explore new matches curated for you.</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={22} color="#FFE8FF" />
          </TouchableOpacity>
        </View>

        {/* Browser Notification Permission Banner */}
        <NotificationPermissionBanner />

        <View style={[styles.matchCtaCard, isLargeScreen && styles.matchCtaCardLarge]}>
          <View style={styles.matchCtaHeader}>
            <View style={styles.liveIndicator}>
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  },
                ]}
              />
              <Text style={styles.liveText}>Start a live match</Text>
            </View>
            <Ionicons name="flash" size={18} color="#FF4D67" />
          </View>

          <Text style={styles.matchCtaTitle}>Ready when you are</Text>
          <Text style={styles.matchCtaSubtitle}>
            Circle is keeping an eye out for members who share your vibe. Tap the button and we’ll
            begin searching instantly.
          </Text>
          {isSearching && !showModal && (
            <View style={styles.searchingInline}>
              <Ionicons name="sparkles" size={16} color="#7C2B86" />
              <Text style={styles.searchingInlineText}>{SEARCH_PHRASES[phraseIdx]}</Text>
            </View>
          )}

          <TouchableOpacity activeOpacity={0.85} style={styles.liveMatchButton} onPress={handleStartMatch}>
            <Text style={styles.liveMatchButtonText}>Start Match</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Text style={styles.locationTitle}>Search match by location</Text>
            <Ionicons name="location" size={18} color="#7C2B86" />
          </View>
          <Text style={styles.locationDescription}>
            Pinpoint connections in cities you love or places you plan to visit next.
          </Text>
          <TouchableOpacity style={styles.locationButton} activeOpacity={0.85} onPress={handleLocationSearch}>
            <Ionicons name="search" size={18} color="#7C2B86" />
            <Text style={styles.locationButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featureCard}>
          {loadingStats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7C2B86" />
              <Text style={styles.loadingText}>Loading your Circle score...</Text>
            </View>
          ) : circleStats && circleStats.stats ? (
            <>
              <View style={styles.circleScoreHeader}>
                <Text style={styles.featureTitle}>
                  {CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).icon} Circle Score: {circleStats.stats.circle_points || 0}
                </Text>
                <View style={[styles.scoreTierBadge, { backgroundColor: CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).color }]}>
                  <Text style={styles.scoreTierText}>
                    {CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).tier}
                  </Text>
                </View>
              </View>
              <Text style={styles.featureDescription}>
                {circleStats.performanceMessage || "Building your Circle score..."}
              </Text>
              
              {/* Stats Grid with Attention Indicators */}
              <View style={styles.statsGrid}>
                {/* Debug logging for Messages stat */}
                {console.log('📊 Messages stat debug:', {
                  messages_sent: circleStats.stats.messages_sent,
                  messages_received: circleStats.stats.messages_received,
                  total: (circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0),
                  needsAttention: ((circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)) < 5
                })}
                <View style={[styles.statItem, (circleStats.stats.total_matches || 0) < 3 && styles.statItemNeedsAttention]}>
                  <Text style={[styles.statNumber, (circleStats.stats.total_matches || 0) < 3 && styles.statNumberAlert]}>
                    {circleStats.stats.total_matches || 0}
                    {(circleStats.stats.total_matches || 0) < 3 && <Text style={styles.attentionIcon}> ⚠️</Text>}
                  </Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
                <View style={[styles.statItem, (circleStats.stats.total_friends || 0) < 3 && styles.statItemNeedsAttention]}>
                  <Text style={[styles.statNumber, (circleStats.stats.total_friends || 0) < 3 && styles.statNumberAlert]}>
                    {circleStats.stats.total_friends || 0}
                    {(circleStats.stats.total_friends || 0) < 3 && <Text style={styles.attentionIcon}> 📢</Text>}
                  </Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={[styles.statItem, ((circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)) < 5 && styles.statItemNeedsAttention]}>
                  <Text style={[styles.statNumber, ((circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)) < 5 && styles.statNumberAlert]}>
                    {(circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)}
                    {((circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)) < 5 && <Text style={styles.attentionIcon}> 💬</Text>}
                  </Text>
                  <Text style={styles.statLabel}>Messages</Text>
                </View>
                <View style={[styles.statItem, (circleStats.stats.profile_visits_received || 0) < 3 && styles.statItemNeedsAttention]}>
                  <Text style={[styles.statNumber, (circleStats.stats.profile_visits_received || 0) < 3 && styles.statNumberAlert]}>
                    {circleStats.stats.profile_visits_received || 0}
                    {(circleStats.stats.profile_visits_received || 0) < 3 && <Text style={styles.attentionIcon}> 👁️</Text>}
                  </Text>
                  <Text style={styles.statLabel}>Profile Views</Text>
                </View>
              </View>
              
              {/* Smart Suggestions Based on User Data */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>💡 Boost Your Score</Text>
                <View style={styles.suggestionsList}>
                  {(circleStats.stats.total_matches || 0) < 3 && (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionIcon}>🎯</Text>
                      <Text style={styles.suggestionText}>Try matchmaking to find more connections</Text>
                    </View>
                  )}
                  {(circleStats.stats.total_friends || 0) < 3 && (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionIcon}>👥</Text>
                      <Text style={styles.suggestionText}>Send friend requests to grow your network</Text>
                    </View>
                  )}
                  {((circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)) < 5 && (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionIcon}>💌</Text>
                      <Text style={styles.suggestionText}>Start conversations with your connections</Text>
                    </View>
                  )}
                  {(circleStats.stats.profile_visits_received || 0) < 3 && (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionIcon}>✨</Text>
                      <Text style={styles.suggestionText}>Update your profile with photos and bio</Text>
                    </View>
                  )}
                  {/* Show positive reinforcement if user is doing well */}
                  {(circleStats.stats.total_matches || 0) > 0 && (circleStats.stats.total_friends || 0) >= 3 && (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionIcon}>🌟</Text>
                      <Text style={styles.suggestionText}>Great job! Keep engaging to maintain your momentum</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.featureTitle}>Start Your Circle Journey</Text>
              <Text style={styles.featureDescription}>
                Initialize your Circle score to begin tracking your engagement and connections.
              </Text>
              <TouchableOpacity 
                style={[styles.featureButton, { backgroundColor: '#22C55E', marginTop: 12 }]}
                onPress={handleInitializeCirclePoints}
              >
                <Text style={styles.featureButtonText}>Initialize Circle Score</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.featureButton} onPress={handleImproveMatches}>
            <Text style={styles.featureButtonText}>Improve my matches</Text>
          </TouchableOpacity>
        </View>

        {/* Friend Requests Card */}
        <View style={styles.friendRequestsCard}>
          <View style={styles.friendRequestsHeader}>
            <Text style={styles.friendRequestsTitle}>Friend Requests</Text>
            <Ionicons name="people" size={18} color="#7C2B86" />
          </View>
          
          {friendRequests.length > 0 ? (
            <View style={styles.friendRequestsList}>
              {friendRequests.slice(0, 3).map((request) => {
                // Extract display name using the correct field names
                const displayName = (() => {
                  // Use first_name and last_name from sender
                  if (request.sender?.first_name) {
                    const fullName = `${request.sender.first_name} ${request.sender.last_name || ''}`.trim();
                    return fullName;
                  }
                  
                  // Try to extract name from the message "Hi [Name]! I'd like to connect with you."
                  if (request.message) {
                    const messageMatch = request.message.match(/Hi\s+([^!]+)!/);
                    if (messageMatch && messageMatch[1]) {
                      return messageMatch[1].trim();
                    }
                  }
                  
                  // If sender has a real name (not generic User ID)
                  if (request.sender?.name && !request.sender.name.startsWith('User ')) {
                    return request.sender.name;
                  }
                  
                  // Try to get name from email
                  if (request.sender?.email) {
                    const emailName = request.sender.email.split('@')[0];
                    // If it's not just numbers, use it
                    if (!/^\d+$/.test(emailName)) {
                      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                    }
                  }
                  
                  // Fallback to a generic name
                  return 'Someone';
                })();

                return (
                  <View key={request.id} style={styles.friendRequestItem}>
                    <TouchableOpacity 
                      style={styles.friendRequestAvatar}
                      onPress={() => handleViewProfile({
                        id: request.sender.id,
                        name: displayName,
                        email: request.sender.email,
                        avatar: request.sender.avatar
                      })}
                    >
                      <Text style={styles.friendRequestAvatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.friendRequestInfo}>
                      <Text style={styles.friendRequestName}>{displayName}</Text>
                      <Text style={styles.friendRequestMessage} numberOfLines={1}>
                        {request.message || 'Wants to connect'}
                      </Text>
                    </View>
                    <View style={styles.friendRequestActions}>
                      <TouchableOpacity 
                        style={styles.friendRequestReject}
                        onPress={() => handleRejectRequest(request)}
                      >
                        <Ionicons name="close" size={16} color="#FF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.friendRequestAccept}
                        onPress={() => handleAcceptRequest(request)}
                      >
                        <Ionicons name="checkmark" size={16} color="#00AA55" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {friendRequests.length > 3 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View all {friendRequests.length} requests</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noRequestsContainer}>
              <Ionicons name="people-outline" size={32} color="rgba(124, 43, 134, 0.4)" />
              <Text style={styles.noRequestsTitle}>No requests</Text>
              <Text style={styles.noRequestsDescription}>
                Your friend requests will appear here
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      <Modal animationType="fade" transparent visible={showModal && (isSearching || matchedUser !== null)}>
        <View style={styles.modalOverlay}>
          {/* Toast inside modal to ensure it appears above modal content */}
          <Toast visible={toast.visible} text={toast.text} type={toast.type} />
          
          <View style={styles.modalContent}>
            <LinearGradient
              colors={matchedUser ? ["#667eea", "#764ba2", "#f093fb"] : ["#4facfe", "#00f2fe"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              {isSearching && !matchedUser && (
                <>
                  <TouchableOpacity style={styles.modalCloseX} onPress={handleCloseSearching}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.modalTitle}>Searching for someone special…</Text>
                  <Text style={styles.modalSubtitle}>
                    Finding you another great match...
                  </Text>
                </>
              )}

              {matchedUser && (
                <View style={styles.modalMatchContainer}>
                  {/* Floating particles background */}
                  <View style={styles.particlesContainer}>
                    <View style={[styles.particle, styles.particle1]} />
                    <View style={[styles.particle, styles.particle2]} />
                    <View style={[styles.particle, styles.particle3]} />
                    <View style={[styles.particle, styles.particle4]} />
                  </View>
                  
                  {/* Header with sparkles */}
                  <View style={styles.matchHeader}>
                    <View style={styles.sparkleContainer}>
                      <Ionicons name="sparkles" size={24} color="#FFD700" style={styles.sparkle1} />
                      <Ionicons name="heart" size={32} color="#FF69B4" style={styles.heartIcon} />
                      <Ionicons name="sparkles" size={20} color="#FFD700" style={styles.sparkle2} />
                    </View>
                    <Text style={styles.matchFoundTitle}>Perfect Match!</Text>
                    <Text style={styles.matchFoundSubtitle}>✨ {matchedUser.compatibility} ✨</Text>
                  </View>

                  {/* Profile Card */}
                  <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatarGlow}>
                        <Image
                          source={{ uri: matchedUser.avatar }}
                          style={styles.profileAvatar}
                          defaultSource={{ uri: "https://i.pravatar.cc/300?img=12" }}
                          onError={() => {
                            // Fallback to default avatar if image fails to load
                            setMatchedUser(prev => prev ? {
                              ...prev,
                              avatar: "https://i.pravatar.cc/300?img=12"
                            } : null);
                          }}
                        />
                        <View style={styles.onlineIndicator} />
                      </View>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
                      </View>
                    </View>
                    
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>
                        {`${matchedUser.firstName} ${matchedUser.lastName.charAt(0)}.`}
                      </Text>
                      
                      <View style={styles.profileStats}>
                        <View style={styles.statItem}>
                          <View style={styles.statIcon}>
                            <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
                          </View>
                          <Text style={styles.statText}>{matchedUser.age}</Text>
                        </View>
                        
                        <View style={styles.statDivider} />
                        
                        <View style={styles.statItem}>
                          <View style={styles.statIcon}>
                            <Ionicons name="location-outline" size={16} color="#8B5CF6" />
                          </View>
                          <Text style={styles.statText}>{matchedUser.location}</Text>
                        </View>
                        
                        <View style={styles.statDivider} />
                        
                        <View style={styles.statItem}>
                          <View style={styles.statIcon}>
                            <Ionicons
                              name={matchedUser.gender === "female" ? "female" : matchedUser.gender === "male" ? "male" : "transgender"}
                              size={16}
                              color="#8B5CF6"
                            />
                          </View>
                          <Text style={styles.statText}>
                            {matchedUser.gender === "non-binary" ? "NB" : matchedUser.gender.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{matchedUser.description}</Text>
                      </View>
                      
                      {/* Compatibility Score */}
                      <View style={styles.compatibilityContainer}>
                        <Text style={styles.compatibilityLabel}>Compatibility Score</Text>
                        <View style={styles.compatibilityBar}>
                          <View style={styles.compatibilityFill} />
                          <Text style={styles.compatibilityScore}>94%</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.passButtonNew} 
                      onPress={handlePass}
                      activeOpacity={0.8}
                    >
                      <View style={styles.buttonIconContainer}>
                        <Ionicons name="close" size={24} color="#FF6B6B" />
                      </View>
                      <Text style={styles.passButtonText}>Pass</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.chatButtonNew, isConnectPressed && styles.chatButtonPressed]} 
                      onPress={handleStartChat}
                      activeOpacity={0.8}
                      disabled={isConnectPressed}
                    >
                      <LinearGradient
                        colors={isConnectPressed ? ['#4ade80', '#22c55e'] : ['#8b5cf6', '#a855f7', '#ec4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.chatButtonGradient}
                      >
                        <View style={[styles.buttonIconContainer, isConnectPressed && styles.buttonIconPressed]}>
                          {isConnectPressed ? (
                            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                          ) : (
                            <Ionicons name="heart" size={24} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={styles.chatButtonText}>
                          {isConnectPressed ? "Sent!" : "Connect"}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Close Button */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={async () => {
                      try {
                        // Cancel matchmaking on server
                        await matchmakingApi.cancel(token);
                        // Reset all local state
                        setMatchedUser(null);
                        setShowModal(false);
                        setIsSearching(false);
                        setIsConnectPressed(false);
                        setHasActiveSession(false);
                        acceptedNotifiedRef.current = false;
                        showToast("Matchmaking stopped", "info");
                      } catch (error) {
                        console.error('Failed to cancel matchmaking:', error);
                        // Still reset local state even if server call fails
                        setMatchedUser(null);
                        setShowModal(false);
                        setIsSearching(false);
                        setIsConnectPressed(false);
                        setHasActiveSession(false);
                        showToast("Matchmaking stopped", "info");
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
        userAvatar={selectedUser?.photoUrl || selectedUser?.avatar}
      />

      {/* Debug Panel for Browser Notifications */}
      <NotificationDebugPanel />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,
    gap: 28,
  },
  contentLarge: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.78)",
    marginTop: 6,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 22,
    padding: 24,
    gap: 14,
    boxShadow: "0px 10px 24px rgba(18, 8, 43, 0.35)",
    elevation: 18,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  featureDescription: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.65)",
    lineHeight: 20,
  },
  featureButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#FFD6F2",
  },
  featureButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C2B86",
  },
  locationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 22,
    padding: 24,
    gap: 16,
    boxShadow: "0px 10px 22px rgba(18, 8, 43, 0.22)",
    elevation: 14,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  locationDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(31, 17, 71, 0.68)",
  },
  locationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFD6F2",
  },
  locationButtonDisabled: {
    opacity: 0.65,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C2B86",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFE8FF",
  },
  matchList: {
    gap: 18,
  },
  matchCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 214, 242, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  matchName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchLocation: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.55)",
  },
  matchFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compatibilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 214, 242, 0.65)",
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C2B86",
  },
  matchAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#7C2B86",
    alignItems: "center",
    justifyContent: "center",
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
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D67",
  },
  liveDotMatched: {
    backgroundColor: "#FFD6F2",
  },
  liveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF4D67",
    letterSpacing: 0.5,
  },
  liveTextMatched: {
    color: "#FFD6F2",
  },
  matchCtaCard: {
    backgroundColor: "rgba(246, 245, 255, 0.96)",
    borderRadius: 24,
    padding: 24,
    gap: 18,
    boxShadow: "0px 10px 20px rgba(18, 8, 43, 0.28)",
    elevation: 18,
  },
  matchCtaCardLarge: {
    padding: 32,
  },
  matchCtaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchCtaTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchCtaSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(31, 17, 71, 0.68)",
  },
  liveMatchButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: "#FF4D67",
    boxShadow: "0px 10px 18px rgba(255, 77, 103, 0.4)",
    elevation: 14,
  },
  liveMatchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  matchedTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchedSubtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C68E4",
  },
  matchedName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  matchedDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(31, 17, 71, 0.68)",
  },
  matchedActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#7C2B86",
    boxShadow: "0px 8px 16px rgba(124, 43, 134, 0.35)",
    elevation: 12,
  },
  startChatText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  passButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(124, 43, 134, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  passText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C2B86",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 380,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalGradient: {
    padding: 24,
    borderRadius: 32,
    alignItems: "center",
    minHeight: 500,
    position: "relative",
  },
  modalCloseX: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.82)",
    textAlign: "center",
    lineHeight: 20,
  },
  modalMatchContainer: {
    width: "100%",
    alignItems: "center",
    gap: 20,
    position: "relative",
  },
  
  // Floating particles
  particlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  particle1: {
    top: "15%",
    left: "20%",
    animationDelay: "0s",
  },
  particle2: {
    top: "25%",
    right: "15%",
    animationDelay: "1s",
  },
  particle3: {
    bottom: "30%",
    left: "15%",
    animationDelay: "2s",
  },
  particle4: {
    bottom: "20%",
    right: "25%",
    animationDelay: "1.5s",
  },
  
  // Match header
  matchHeader: {
    alignItems: "center",
    gap: 12,
    zIndex: 2,
    marginBottom: 10,
  },
  sparkleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sparkle1: {
    transform: [{ rotate: "15deg" }],
  },
  sparkle2: {
    transform: [{ rotate: "-15deg" }],
  },
  heartIcon: {
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  matchFoundTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  matchFoundSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  
  // Profile card
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 16,
    width: "100%",
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    zIndex: 2,
  },
  avatarContainer: {
    position: "relative",
    alignItems: "center",
  },
  avatarGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    backgroundColor: "#FFFFFF",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    position: "relative",
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#00D4AA",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 2,
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  
  // Profile info
  profileInfo: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
  },
  profileStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    width: "100%",
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // Compatibility score
  compatibilityContainer: {
    width: "100%",
    gap: 8,
  },
  compatibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  compatibilityBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  compatibilityFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "94%",
    backgroundColor: "#8B5CF6",
    borderRadius: 4,
  },
  compatibilityScore: {
    position: "absolute",
    right: 8,
    top: -20,
    fontSize: 12,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  
  // Action buttons
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 2,
  },
  passButtonNew: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  passButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
  },
  chatButtonNew: {
    flex: 1,
    borderRadius: 20,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonPressed: {
    shadowColor: "#22c55e",
    transform: [{ scale: 0.98 }],
  },
  chatButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIconPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 1.1 }],
  },
  
  // Close button
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    zIndex: 2,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  // Legacy styles (keeping for compatibility)
  modalAvatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.65)",
  },
  modalAvatar: {
    width: "100%",
    height: "100%",
  },
  modalAvatarIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  modalMatchName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalMatchDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  modalMatchActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalMetaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  modalMetaText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  modalDismiss: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.65)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  modalDismissText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 8, 43, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mapModalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F1147",
  },
  mapSubtitle: {
    fontSize: 13,
    color: "rgba(31, 17, 71, 0.68)",
    marginTop: 4,
  },
  mapCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 214, 242, 0.45)",
  },
  map: {
    width: "100%",
    height: 340,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  mapFallback: {
    height: 340,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  mapFallbackText: {
    fontSize: 15,
    color: "rgba(31, 17, 71, 0.7)",
  },
  mapContainer: {
    width: "100%",
    height: 320,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  mapBackdrop: {
    width: "100%",
    height: "100%",
  },
  pin: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -23 }, { translateY: -23 }],
    shadowColor: "rgba(18, 8, 43, 0.25)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  pinSelf: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  pinTooltip: {
    position: "absolute",
    top: -58,
    minWidth: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(22, 9, 45, 0.9)",
    alignItems: "center",
    gap: 2,
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pinSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  friendRequestsContainer: {
    marginBottom: 24,
    maxHeight: 400, // Limit height so it doesn't take over the page
  },

  // Friend Requests Card Styles
  friendRequestsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  friendRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  friendRequestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
  },
  friendRequestsList: {
    gap: 12,
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
  },
  friendRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  friendRequestAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendRequestInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendRequestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 2,
  },
  friendRequestMessage: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  friendRequestReject: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  friendRequestAccept: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 170, 85, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 85, 0.3)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C2B86',
  },
  noRequestsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noRequestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(31, 17, 71, 0.8)',
  },
  noRequestsDescription: {
    fontSize: 13,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
  },
  
  // Circle Score Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
  },
  circleScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreTierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 4,
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5B1A65',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 16,
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F1147',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
  },
  
  // Attention and Suggestion Styles
  statItemNeedsAttention: {
    backgroundColor: '#FFF3CD', // Solid light yellow background
    borderWidth: 2,
    borderColor: '#FFD60A', // Bright yellow border
    borderRadius: 12,
    shadowColor: '#FFD60A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.02 }], // Slightly larger to draw attention
  },
  statNumberAlert: {
    color: '#E65100', // Darker orange for better contrast on yellow background
    fontWeight: '800',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  attentionIcon: {
    fontSize: 12,
  },
  suggestionsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2B86',
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionsList: {
    gap: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  suggestionIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  suggestionText: {
    fontSize: 12,
    color: '#1F1147',
    flex: 1,
    fontWeight: '500',
  },
});
