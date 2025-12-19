import { getAdComponents } from "@/components/ads/AdWrapper";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import Toast from "@/components/Toast";
import VerificationBanner from "@/components/VerificationBanner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CirclePointsHelper, circleStatsApi } from "@/src/api/circle-stats";
import { friendsApi } from "@/src/api/friends";
import { nearbyUsersGql, updateLocationGql } from "@/src/api/graphql";
import { matchmakingApi } from "@/src/api/matchmaking";
import { blindDatingApi } from "@/src/api/blindDating";
import { promptMatchingApi } from "@/src/api/promptMatching";
import { getSocket } from "@/src/api/socket";
import NotificationPermissionBanner from "@/src/components/NotificationPermissionBanner";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import PromptMatchingWrapper from "@/components/PromptMatchingWrapper";
import HelpRequestsList from "@/components/HelpRequestsList";
import NotificationPanel from "@/components/NotificationPanel";
import { useLocalNotificationCount } from "@/src/hooks/useLocalNotificationCount";
import useBrowserNotifications from "@/src/hooks/useBrowserNotifications";
import { debugNotificationSystem, forceEnableNotifications, simulateSocketNotification, testBackendProfileVisitNotification, testBrowserNotifications, testProfileVisitNotification, testSocketUserEvents } from "@/src/utils/testBrowserNotifications";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const { useInterstitialAd, AdMobService } = getAdComponents();

// Searching Animation Component
const SearchingAnimation = ({ onClose }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const searchingMessages = [
    { title: "Searching for someone special…", subtitle: "Finding you another great match..." },
    { title: "Looking for your perfect match…", subtitle: "Analyzing compatibility scores..." },
    { title: "Discovering amazing people…", subtitle: "Matching interests and vibes..." },
    { title: "Finding your next connection…", subtitle: "Searching nearby and beyond..." },
    { title: "Seeking your ideal match…", subtitle: "Checking compatibility..." },
    { title: "Exploring possibilities…", subtitle: "Finding someone who gets you..." },
    { title: "Connecting hearts…", subtitle: "Matching personalities and interests..." },
    { title: "Searching for magic…", subtitle: "Finding that special someone..." },
  ];

  useEffect(() => {
    // Rotate message every 3 seconds
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % searchingMessages.length);
    }, 3000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -20,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => clearInterval(messageInterval);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentMessage = searchingMessages[currentMessageIndex];

  return (
    <View style={searchingStyles.container}>
      <TouchableOpacity style={searchingStyles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Floating particles */}
      {particleAnims.map((anim, index) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -100],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              searchingStyles.particle,
              {
                left: `${20 + index * 15}%`,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Ionicons name="heart" size={20} color="rgba(255, 255, 255, 0.6)" />
          </Animated.View>
        );
      })}

      {/* Main content */}
      <Animated.View style={[searchingStyles.iconContainer, { transform: [{ translateY: floatAnim }] }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={searchingStyles.iconCircle}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="search" size={48} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[searchingStyles.textContainer, { opacity: 1 }]}>
        <Text style={searchingStyles.title}>{currentMessage.title}</Text>
        <Text style={searchingStyles.subtitle}>{currentMessage.subtitle}</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={searchingStyles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              searchingStyles.dot,
              {
                opacity: particleAnims[index].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const searchingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  particle: {
    position: 'absolute',
    top: '20%',
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});

const mockMatches = [
  { id: 1, name: "Ava", age: 27, location: "2 km away", compatibility: "92%" },
  { id: 2, name: "Noah", age: 29, location: "5 km away", compatibility: "88%" },
  { id: 3, name: "Liam", age: 26, location: "1 km away", compatibility: "85%" },
];

// Helper function to format time ago
const getTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
};

export default function MatchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  
  // Initialize browser notifications
  const { setCurrentChatId } = useBrowserNotifications();
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { shouldShowAds } = useSubscription();
  const { showInterstitial } = useInterstitialAd('after_match'); // Auto-disabled in Expo Go
  const { notificationCount, resetCount: resetNotificationCount } = useLocalNotificationCount();
  
  // Initialize browser notification testing (development only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Add test functions to window for manual testing
      window.testBrowserNotifications = testBrowserNotifications;
      window.testProfileVisitNotification = testProfileVisitNotification;
      window.testBackendProfileVisitNotification = testBackendProfileVisitNotification;
      window.simulateSocketNotification = simulateSocketNotification;
      window.testSocketUserEvents = testSocketUserEvents;
      window.debugNotificationSystem = debugNotificationSystem;
      window.forceEnableNotifications = forceEnableNotifications;
      //console.log('🧪 Browser notification testing available:');
      //console.log('   - window.debugNotificationSystem() - Debug entire notification system');
      //console.log('   - window.forceEnableNotifications() - Force enable notifications');
      //console.log('   - window.testSocketUserEvents() - Test socket user event reception');
      //console.log('   - window.testBackendProfileVisitNotification() - Test exact backend format');
      //console.log('   - window.simulateSocketNotification() - Simulate socket event');
      //console.log('   - window.testBrowserNotifications() - Test all notification types');
      //console.log('   - window.testProfileVisitNotification() - Test profile visit notifications');
    }
  }, []);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConnectionAnimation, setShowConnectionAnimation] = useState(false);
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
  const [passedMatchIds, setPassedMatchIds] = useState(new Set());
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [publicStats, setPublicStats] = useState({ totalUsers: 0, goal: 10000 });
  const [loadingPublicStats, setLoadingPublicStats] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [actualFriendsCount, setActualFriendsCount] = useState(0);
  const [blindDateEnabled, setBlindDateEnabled] = useState(false);
  const [blindDateLoading, setBlindDateLoading] = useState(false);
  const newBadgePulse = useRef(new Animated.Value(1)).current;

  const [activeHelpRequest, setActiveHelpRequest] = useState(null);
  const [loadingActiveHelpRequest, setLoadingActiveHelpRequest] = useState(false);

  const loadActiveHelpRequest = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingActiveHelpRequest(true);
      const data = await promptMatchingApi.getActiveHelpRequest(token);
      setActiveHelpRequest(data?.hasActiveRequest ? data.request : null);
    } catch (e) {
      setActiveHelpRequest(null);
    } finally {
      setLoadingActiveHelpRequest(false);
    }
  }, [token]);

  useEffect(() => {
    loadActiveHelpRequest();
  }, [loadActiveHelpRequest]);
  
  // Create dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: 'transparent',
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
    greetingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    userNameText: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    sectionCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 12,
    },
    matchCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },
    matchName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    matchDetails: {
      fontSize: 14,
      color: theme.textTertiary,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    secondaryButton: {
      backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.surface,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
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
    mobileContainer: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    sidebar: {
      backgroundColor: isDarkMode ? theme.surface : theme.backgroundSecondary,
      borderRightWidth: isDarkMode ? 0 : 1,
      borderRightColor: theme.border,
    },
    quickStatsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },

    // Mobile Circle Score card
    mobileStatsCard: {
      backgroundColor: isDarkMode ? theme.surface : theme.surfaceSecondary,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    mobileStatsTitle: {
      color: theme.textPrimary,
    },
    mobileTierBadgeText: {
      color: '#FFFFFF',
    },
    mobileStatsPoints: {
      color: theme.textPrimary,
    },
    mobileStatNumber: {
      color: theme.textPrimary,
    },
    mobileStatLabel: {
      color: theme.textSecondary,
    },
  };
  
  const showToast = (text, type = "info") => {
    setToast({ visible: true, text, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  };

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

  // Notifications from Match screen header
  const handleNotificationsPress = () => {
    setShowNotifications(true);
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
    if (!token) {
      console.warn('[MatchScreen] No token available for socket connection');
      return;
    }
    
    let s;
    try {
      s = getSocket(token);
      if (!s) {
        console.error('[MatchScreen] Failed to get socket instance');
        return;
      }
    } catch (error) {
      console.error('[MatchScreen] Error getting socket:', error);
      return;
    }
    
    // Clear any stale state when socket connects
    s.on('connect', () => {
      setIsSearching(false);
      setMatchedUser(null);
      setShowModal(false);
      setHasActiveSession(false);
    });
    
    const onProposal = (payload) => {
      try {
        if (!payload || !payload.other) {
          console.error('[MatchScreen] Invalid proposal payload:', payload);
          return;
        }
        
        const o = payload.other;
        if (!o.id) {
          console.error('[MatchScreen] Missing user ID in proposal:', o);
          return;
        }
        
        setMatchedUser({
          id: o.id,
          firstName: o.first_name || 'Unknown',
          lastName: o.last_name || '',
          age: o.age || 0,
          location: "Nearby",
          gender: o.gender || 'other',
          avatar: o.profile_photo_url || "https://i.pravatar.cc/300?img=12",
          description: generateDescription(o.interests, o.needs),
          compatibility: "High match",
          interests: o.interests || [],
          needs: o.needs || [],
        });
      } catch (error) {
        console.error('[MatchScreen] Error handling proposal:', error);
        showToast('Error loading match. Please try again.', 'error');
        return;
      }
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
      try {
        if (!payload || !payload.chatId) {
          console.error('[MatchScreen] Invalid matched payload:', payload);
          showToast('Match created but navigation failed', 'error');
          return;
        }
        
        setIsSearching(false);
        setShowModal(false);
        setHasActiveSession(false); // End the active session - user got matched
        showToast(payload.message || "You got a match!", "success");
        
        setTimeout(() => {
          try {
            router.push({ 
              pathname: "/secure/chat-conversation", 
              params: { 
                id: payload.chatId, 
                name: payload.otherName || 'Match',
                avatar: matchedUser?.avatar || ""
              } 
            });
          } catch (navError) {
            console.error('[MatchScreen] Navigation error:', navError);
            showToast('Please check your chats', 'info');
          }
        }, 700);
      } catch (error) {
        console.error('[MatchScreen] Error handling match:', error);
      }
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
        //console.log('App went to background');
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
      //console.log('Cleanup completed (some errors ignored)');
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
        //console.log('Location permission denied');
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
        //console.log('Reverse geocoding failed:', error);
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
  const loadNearbyUsers = async (lat, lng, radiusKm = 50) => {
    try {
      // If no coordinates provided, try to get user's location
      let latitude = lat;
      let longitude = lng;
      
      if (!latitude || !longitude) {
        // Try to get from userLocation state
        if (userLocation?.latitude && userLocation?.longitude) {
          latitude = userLocation.latitude;
          longitude = userLocation.longitude;
        } else {
          // Request location permission and get current location
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            setUserLocation({ latitude, longitude });
          } else {
            console.warn('Location permission denied, cannot load nearby users');
            return;
          }
        }
      }
      
      //console.log('📍 Loading nearby users at:', latitude, longitude);
      const users = await nearbyUsersGql(latitude, longitude, radiusKm, 50, token);
      
      // Transform to match expected format
      const transformedUsers = users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        age: u.age,
        photoUrl: u.profilePhotoUrl,
        latitude: u.latitude,
        longitude: u.longitude,
        distance: u.distance,
        compatibility: Math.round(Math.random() * 40 + 60), // Mock compatibility for now
        interests: u.interests || [],
      }));
      
      setNearbyUsers(transformedUsers);
    } catch (error) {
      console.error('Failed to load nearby users:', error);
      showToast('Failed to load nearby users', 'error');
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
            //console.log('Matchmaking cancelled due to app backgrounding');
          } catch (error) {
            //console.log('Failed to cancel matchmaking on background:', error);
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

  // Load friend requests via REST API (fallback for page refresh)
  const loadFriendRequests = async () => {
    if (!token) return;
    
    try {
      // Use REST API to ensure requests are loaded even after page refresh
      const response = await friendsApi.getPendingRequests(token);
      
      let requests = response.requests || [];
      
      setFriendRequests(requests);
      
      // Don't request via socket since REST API already has the data
      // Socket will handle real-time updates for new requests
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      setFriendRequests([]);
    }
  };

  // Setup Socket.IO listeners for friend requests
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);

    // Listen for pending requests list
    socket.on('friend:requests:pending_list', ({ requests }) => {
      //console.log('📋 Pending friend requests loaded via socket:', requests);
      
      // Only update if we have requests from socket
      if (requests && requests.length > 0) {
        setFriendRequests(requests);
      }
    });

    // Listen for new friend requests
    socket.on('friend:request:received', ({ request, sender }) => {
      //console.log('📨 New friend request received:', request);
      //console.log('📨 Sender info:', sender);
      
      // Attach sender info to request for display
      const requestWithSender = { ...request, sender };
      setFriendRequests(prev => [requestWithSender, ...prev]);
      
      // Show alert notification
      const senderName = sender?.first_name 
        ? `${sender.first_name} ${sender.last_name || ''}`.trim()
        : 'Someone';
      Alert.alert(
        'Friend Request',
        `${senderName} wants to be your friend`,
        [{ text: 'OK', style: 'default' }]
      );
    });

    // Listen for friend request acceptance
    socket.on('friend:request:accepted', ({ request, acceptedBy, friendship, friend }) => {
      //console.log('✅ Friend request accepted:', { request, acceptedBy, friendship, friend });
      
      // Remove from pending requests - use friendship.id if request is undefined
      const requestId = request?.id || friendship?.id;
      if (requestId) {
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      }
      
      // Show success alert
      const acceptorName = (friend?.first_name || acceptedBy?.first_name) 
        ? `${friend?.first_name || acceptedBy?.first_name} ${friend?.last_name || acceptedBy?.last_name || ''}`.trim()
        : 'Someone';
      Alert.alert(
        'Friend Request Accepted',
        `${acceptorName} accepted your friend request!`,
        [{ text: 'Great!', style: 'default' }]
      );
    });

    // Listen for friend request decline
    socket.on('friend:request:declined', ({ request, declinedBy }) => {
      //console.log('❌ Friend request declined:', request);
      
      // Remove from pending requests
      if (request && request.id) {
        setFriendRequests(prev => prev.filter(req => req.id !== request.id));
      }
    });

    // Listen for friend request cancellation
    socket.on('friend:request:cancelled', ({ request, cancelledBy }) => {
      //console.log('🚫 Friend request cancelled:', request);
      
      // Remove from pending requests
      if (request && request.id) {
        setFriendRequests(prev => prev.filter(req => req.id !== request.id));
      }
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'A friend request was cancelled',
        type: 'info'
      });
    });

    // Listen for message request cancellation
    socket.on('message:request:cancelled', ({ proposal, cancelledBy }) => {
      //console.log('🚫 Message request cancelled:', proposal);
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'A message request was cancelled',
        type: 'info'
      });
    });

    // Listen for unfriend events
    socket.on('friend:unfriended', ({ unfriendedBy, friendship }) => {
      //console.log('💔 Unfriended by user:', unfriendedBy);
      
      // Show toast notification
      setToast({
        visible: true,
        message: 'Someone removed you as a friend',
        type: 'info'
      });
    });

    // Listen for sent confirmation
    socket.on('friend:request:sent', ({ request, success }) => {
      //console.log('✅ Friend request sent:', request);
      
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
      socket.off('friend:requests:pending_list');
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
  
  // Load friend requests on mount
  useEffect(() => {
    if (token) {
      loadFriendRequests();
    }
  }, [token]);

  // Refresh when user interests/needs change (after settings update)
  useEffect(() => {
    if (user) {
      //console.log('Match screen loaded for user:', user.id);
      loadPassedMatches();
      loadNearbyUsers();
      loadFriendRequests();
      loadCircleStats();
      
      // Ensure socket is connected
      const socket = getSocket();
      if (socket) {
        //console.log('✅ Socket connected:', socket.connected);
        if (!socket.connected) {
          //console.log('🔄 Reconnecting socket...');
          socket.connect();
        }
      } else {
        console.warn('⚠️ Socket not available');
      }
    }
  }, [user]);
  
  const loadCircleStats = async () => {
    if (!token) return;
    
    try {
      setLoadingStats(true);
      
      const response = await circleStatsApi.getStats(token);
      
      setCircleStats(response);
      
      // Update user activity
      await circleStatsApi.updateActivity(token);
      
      // Load actual friends list to get correct count
      await loadFriendsList();
    } catch (error) {
      console.error('❌ Error loading Circle stats:', error);
      showToast("Failed to load Circle stats", "error");
    } finally {
      setLoadingStats(false);
    }
  };

  const loadFriendsList = async () => {
    if (!token) return;
    
    try {
      const response = await friendsApi.getFriendsList(token);
      setFriendsList(response.friends || []);
      setActualFriendsCount((response.friends || []).length);
    } catch (error) {
      console.error('❌ Error loading friends list:', error);
      // Fallback to Circle stats count if friends API fails
      setActualFriendsCount(circleStats?.stats?.total_friends || 0);
    }
  };

  // Load Circle stats on component mount and when user changes
  useEffect(() => {
    if (token && user) {
      loadCircleStats();
      loadBlindDateSettings();
    }
  }, [token, user]);

  // Load blind date settings
  const loadBlindDateSettings = async () => {
    if (!token) return;
    try {
      const response = await blindDatingApi.getSettings(token);
      setBlindDateEnabled(response.settings?.is_enabled || false);
    } catch (error) {
      console.error('Error loading blind date settings:', error);
      setBlindDateEnabled(false);
    }
  };

  // Toggle blind date feature
  const handleToggleBlindDate = async () => {
    if (!token || blindDateLoading) return;
    
    try {
      setBlindDateLoading(true);
      
      if (blindDateEnabled) {
        // Disable blind dating
        await blindDatingApi.disable(token);
        setBlindDateEnabled(false);
        showToast('Blind Connect mode disabled', 'info');
      } else {
        // Enable blind dating
        await blindDatingApi.enable(token);
        setBlindDateEnabled(true);
        showToast('Blind Connect mode enabled! 🎭', 'success');
      }
    } catch (error) {
      console.error('Error toggling blind date:', error);
      showToast('Failed to update Blind Date settings', 'error');
    } finally {
      setBlindDateLoading(false);
    }
  };

  const handleLocationSearch = () => {
    // Check if invisible mode is enabled
    if (user?.invisibleMode) {
      Alert.alert(
        'Location Search Disabled',
        'Location search is not available while invisible mode is enabled. Turn off invisible mode in Settings to use this feature.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    router.push('/secure/location');
  };

  // Load passed matches from AsyncStorage
  const loadPassedMatches = async () => {
    try {
      const passedData = await AsyncStorage.getItem('matchPassedUsers');
      if (passedData) {
        const passedUsers = JSON.parse(passedData);
        const now = Date.now();
        
        // Filter out expired passes (older than 15 days)
        const validPasses = {};
        Object.keys(passedUsers).forEach(userId => {
          if (passedUsers[userId] > now) {
            validPasses[userId] = passedUsers[userId];
          }
        });
        
        // Update AsyncStorage with valid passes only
        await AsyncStorage.setItem('matchPassedUsers', JSON.stringify(validPasses));
        setPassedMatchIds(new Set(Object.keys(validPasses)));
      }
    } catch (error) {
      console.error('Error loading passed matches:', error);
    }
  };

  // Handle pass match
  const handlePassMatch = async (userId, userName) => {
    try {
      // Add to passed users with 15-day expiry
      const passedData = await AsyncStorage.getItem('matchPassedUsers');
      const passedUsers = passedData ? JSON.parse(passedData) : {};
      
      const expiryTime = Date.now() + (15 * 24 * 60 * 60 * 1000); // 15 days from now
      passedUsers[userId] = expiryTime;
      
      await AsyncStorage.setItem('matchPassedUsers', JSON.stringify(passedUsers));
      
      // Update state to hide the user immediately
      setPassedMatchIds(prev => new Set([...prev, userId]));
      
      // Show confirmation toast
      showToast(`${userName || 'User'} won't appear for 15 days`, 'info');

      // Increment match count and show interstitial ad if conditions met
      // Auto-disabled in Expo Go, works in development/production builds
      AdMobService.incrementMatchCount();
      if (shouldShowAds() && AdMobService.shouldShowAfterMatch()) {
        showInterstitial(() => {
          //console.log('✅ Interstitial ad completed after pass');
        });
      }
    } catch (error) {
      console.error('Error passing match:', error);
      showToast('Failed to pass user', 'error');
    }
  };


  const handleImproveMatches = () => {
    router.push('/secure/profile/settings');
  };

  const handleInitializeCirclePoints = async () => {
    if (!token) return;
    
    try {
      //console.log('🚀 Initializing Circle points...');
      const response = await circleStatsApi.initialize(token);
      //console.log('✅ Circle points initialized:', response);
      
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
      await loadActiveHelpRequest();
      // Refresh Circle stats
      const statsResponse = await circleStatsApi.getStats(token);
      if (statsResponse?.stats) {
        setCircleStats(statsResponse);
      }
      // Refresh friends list
      await loadFriendsList();
      
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
  }, [token, loadActiveHelpRequest]);


  // Load public stats
  const loadPublicStats = async () => {
    try {
      setLoadingPublicStats(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/public/stats`);
      const data = await response.json();
      
      if (data.success) {
        setPublicStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading public stats:', error);
    } finally {
      setLoadingPublicStats(false);
    }
  };

  // Load public stats on mount
  useEffect(() => {
    loadPublicStats();
  }, []);

  // Handle share app
  const handleShareApp = async () => {
    const shareUrl = 'https://circle.orincore.com';
    // Professional share message without duplicate URL
    const shareMessage = `✨ Join me on Circle!\n\nDiscover meaningful connections on Circle – the dating & friendship app that matches you based on compatibility, not just looks.\n\n🔗 Download Now`;
    
    try {
      if (Platform.OS === 'web') {
        // For web, use Web Share API if available, otherwise copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: 'Join Circle',
            text: shareMessage,
            url: shareUrl,
          });
          showToast('Shared successfully!', 'success');
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareUrl);
          showToast('Link copied to clipboard!', 'success');
        }
      } else {
        // For mobile, use React Native Share
        // Don't include URL in message to avoid duplication
        const result = await Share.share({
          message: shareMessage,
          url: shareUrl,
          title: 'Join Circle',
        });
        
        if (result.action === Share.sharedAction) {
          showToast('Shared successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('Failed to share', 'error');
    }
  };

  const handleStartMatch = async () => {
    // Show coming soon modal instead of starting match
    await loadPublicStats(); // Refresh stats
    setShowComingSoonModal(true);
    return;
    
    // Original code (commented out for now)
    /*
    try {
      setMatchedUser(null);
      setIsSearching(true);
      setHasActiveSession(true); // Mark that user has started an active session
      
      // Get user preferences for matching
      const userPreferences = await getUserPreferences();
      //console.log('📋 User preferences loaded:', userPreferences);
      
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
        //console.log('Location not available, continuing without it');
      }
      
      // Determine if user is looking for friendship based on their needs
      const userNeeds = user?.needs || [];
      const isForFriendship = userNeeds.some(need => need.toLowerCase() === 'friendship');
      
      // Get matching preferences based on user settings and relationship type
      const matchingPrefs = getPreferencesForMatching(userPreferences, user, isForFriendship);
      //console.log('🎯 Matching preferences:', matchingPrefs);
      
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
    */
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
    //console.log('Accepting friend request:', request);
    
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
    //console.log('Rejecting friend request:', request);
    
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
    if (!user) return;

    // Support different shapes for user objects coming from matches, nearby users, or friend requests
    const userId =
      user.id != null
        ? user.id
        : user.userId != null
        ? user.userId
        : user.sender_id != null
        ? user.sender_id
        : null;

    if (!userId) return;

    // Navigate directly to the profile screen
    router.push(`/secure/user-profile/${userId}`);
  };

  const handleSendFriendRequest = async (userOrId) => {
    // Handle both user object and user ID
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    const userName = typeof userOrId === 'string' ? 'this user' : userOrId?.name || 'this user';
    
    if (!userId || !token) return;
    
    try {
      const socket = getSocket(token);
      socket.emit('friend:request:send', { receiverId: userId });
      
      showToast(`Friend request sent to ${userName}!`, 'success');
    } catch (error) {
      console.error('Error sending friend request:', error);
      showToast('Failed to send friend request. Please try again.', 'error');
    }
  };

  const handleSendMessageRequest = async (userId) => {
    if (!userId || !token) return;
    
    try {
      const response = await matchmakingApi.sendMessageRequest(userId, token);
      
      if (response.success) {
        showToast('Message request sent!', 'success');
      } else {
        showToast(response.error || 'Failed to send message request', 'error');
      }
    } catch (error) {
      console.error('Error sending message request:', error);
      showToast('Failed to send message request. Please try again.', 'error');
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Animated Background */}
      <LinearGradient
        colors={[theme.background, theme.backgroundSecondary, theme.surface]}
        style={styles.backgroundGradient}
      >
        {/* Decorative Elements */}
        <View style={[dynamicStyles.decorativeShape1, { backgroundColor: theme.decorative1 }]} />
        <View style={[dynamicStyles.decorativeShape2, { backgroundColor: theme.decorative2 }]} />
        <LinearGradient
          colors={[theme.decorative1, theme.decorative2]}
          style={styles.topAccent}
        />
        {/* Floating orbs */}
        <View style={[styles.floatingOrb, styles.orb1, { backgroundColor: theme.decorative1 }]} />
        <View style={[styles.floatingOrb, styles.orb2, { backgroundColor: theme.decorative2 }]} />
        <View style={[styles.floatingOrb, styles.orb3, { backgroundColor: theme.decorative1 }]} />

      {isLargeScreen ? (
        // DESKTOP/WEB VIEW - Dashboard Style
        <View style={styles.desktopContainer}>
          {/* Left Sidebar */}
          <View style={[styles.sidebar, dynamicStyles.sidebar]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            >
              {/* Header */}
              <View style={styles.sidebarHeader}>
                <Text style={[styles.desktopTitle, dynamicStyles.headerTitle]}>Circle Match</Text>
                <Text style={[styles.desktopSubtitle, dynamicStyles.headerSubtitle]}>Find Your Perfect Connection</Text>
              </View>

              {/* Circle Stats - Enhanced Desktop Design */}
              {circleStats && circleStats.stats && (
                <View style={[styles.quickStatsCard, dynamicStyles.quickStatsCard]}>
                  {/* Header with Tier Badge */}
                  <View style={styles.statsCardHeader}>
                    <Text style={[styles.statsCardTitle, dynamicStyles.sectionTitle]}>Your Stats</Text>
                    <View style={[styles.tierBadgeInline, { backgroundColor: CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).color }]}>
                      <Ionicons name="trophy" size={12} color="#FFFFFF" />
                      <Text style={styles.tierBadgeInlineText}>
                        {CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).tier}
                      </Text>
                    </View>
                  </View>

                  {/* Points Display - Centered */}
                  <View style={styles.pointsCenterSection}>
                    <LinearGradient
                      colors={['#7C2B86', '#FF6FB5']}
                      style={styles.pointsGradientCircle}
                    >
                      <Ionicons name="star" size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.desktopStatsPoints, { color: theme.textPrimary }]}>{circleStats.stats.circle_points || 0}</Text>
                    <Text style={[styles.pointsSubLabel, { color: theme.textSecondary }]}>Circle Points</Text>
                  </View>

                  {/* Divider */}
                  <View style={styles.statsDivider} />

                  {/* Stats Grid - Compact */}
                  <View style={styles.quickStatsGrid}>
                    <View style={styles.statCompactItem}>
                      <Ionicons name="heart" size={20} color="#FF6FB5" />
                      <Text style={[styles.statCompactNumber, { color: theme.textPrimary }]}>{circleStats.stats.total_matches || 0}</Text>
                      <Text style={[styles.statCompactLabel, { color: theme.textSecondary }]}>Matches</Text>
                    </View>
                    <View style={styles.statCompactItem}>
                      <Ionicons name="people" size={20} color="#7C2B86" />
                      <Text style={[styles.statCompactNumber, { color: theme.textPrimary }]}>{actualFriendsCount}</Text>
                      <Text style={[styles.statCompactLabel, { color: theme.textSecondary }]}>Friends</Text>
                    </View>
                    <View style={styles.statCompactItem}>
                      <Ionicons name="chatbubbles" size={20} color="#5D5FEF" />
                      <Text style={[styles.statCompactNumber, { color: theme.textPrimary }]}>
                        {(circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)}
                      </Text>
                      <Text style={[styles.statCompactLabel, { color: theme.textSecondary }]}>Messages</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Live Match Button */}
              <TouchableOpacity 
                style={styles.desktopLiveMatchButton}
                onPress={handleStartMatch}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#7C2B86', '#5D5FEF', '#FF6FB5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.liveMatchGradient}
                >
                  <View style={styles.liveMatchContent}>
                    <Animated.View
                      style={[
                        styles.livePulse,
                        {
                          opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                          transform: [{
                            scale: livePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] })
                          }]
                        },
                      ]}
                    />
                    <Ionicons name="flash" size={24} color="#FFFFFF" />
                    <Text style={styles.liveMatchText}>Start Live Match</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Location Search */}
              <TouchableOpacity 
                style={[styles.sidebarButton, user?.invisibleMode && { opacity: 0.5 }]}
                onPress={handleLocationSearch}
                activeOpacity={user?.invisibleMode ? 1 : 0.8}
                disabled={user?.invisibleMode}
              >
                <View style={styles.sidebarButtonIcon}>
                  <Ionicons name={user?.invisibleMode ? "eye-off" : "location"} size={20} color={user?.invisibleMode ? "#999999" : "#7C2B86"} />
                </View>
                <View style={styles.sidebarButtonContent}>
                  <Text style={[styles.sidebarButtonTitle, user?.invisibleMode && { color: '#999999' }]}>Location Search</Text>
                  <Text style={[styles.sidebarButtonSubtitle, user?.invisibleMode && { color: '#666666' }]}>
                    {user?.invisibleMode ? 'Disabled' : 'Find nearby matches'}
                  </Text>
                </View>
                <Ionicons name={user?.invisibleMode ? "lock-closed" : "chevron-forward"} size={20} color={user?.invisibleMode ? "#666666" : "rgba(255,255,255,0.4)"} />
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity 
                style={styles.sidebarButton}
                onPress={handleImproveMatches}
                activeOpacity={0.8}
              >
                <View style={styles.sidebarButtonIcon}>
                  <Ionicons name="settings" size={20} color="#7C2B86" />
                </View>
                <View style={styles.sidebarButtonContent}>
                  <Text style={styles.sidebarButtonTitle}>Preferences</Text>
                  <Text style={styles.sidebarButtonSubtitle}>Improve matches</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              {/* Blind Date Toggle - Desktop */}
              <TouchableOpacity 
                style={[
                  styles.sidebarButton,
                  blindDateEnabled && styles.sidebarButtonActive
                ]}
                onPress={handleToggleBlindDate}
                activeOpacity={0.8}
                disabled={blindDateLoading}
              >
                <View style={[
                  styles.sidebarButtonIcon,
                  blindDateEnabled && { backgroundColor: 'rgba(0, 212, 170, 0.2)' }
                ]}>
                  <Ionicons 
                    name="eye-off" 
                    size={20} 
                    color={blindDateEnabled ? "#00D4AA" : "#7C2B86"} 
                  />
                </View>
                <View style={styles.sidebarButtonContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.sidebarButtonTitle}>Blind Date</Text>
                    <View style={styles.sidebarNewBadge}>
                      <Text style={styles.sidebarNewBadgeText}>NEW</Text>
                    </View>
                  </View>
                  <Text style={styles.sidebarButtonSubtitle}>
                    {blindDateEnabled ? 'Enabled' : 'Anonymous matching'}
                  </Text>
                </View>
                {blindDateLoading ? (
                  <ActivityIndicator size="small" color="#7C2B86" />
                ) : (
                  <View style={[
                    styles.sidebarToggle,
                    blindDateEnabled && styles.sidebarToggleActive
                  ]}>
                    <View style={[
                      styles.sidebarToggleKnob,
                      blindDateEnabled && styles.sidebarToggleKnobActive
                    ]} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Friend Requests */}
              {friendRequests.length > 0 && (
                <View style={styles.sidebarFriendRequests}>
                  <Text style={styles.sidebarSectionTitle}>Friend Requests</Text>
                  {friendRequests.slice(0, 3).map((request) => {
                    const displayName = request.sender?.first_name 
                      ? `${request.sender.first_name}${request.sender.last_name ? ' ' + request.sender.last_name : ''}`
                      : 'Someone';
                    const timeAgo = request.created_at 
                      ? getTimeAgo(new Date(request.created_at))
                      : '';
                    return (
                      <View key={request.id} style={styles.sidebarRequestCard}>
                        {/* Tappable Avatar */}
                        <TouchableOpacity 
                          onPress={() => handleViewProfile(request.sender)}
                          activeOpacity={0.7}
                        >
                          {request.sender?.profile_photo_url ? (
                            <Image 
                              source={{ uri: request.sender.profile_photo_url }}
                              style={styles.sidebarRequestAvatarImage}
                            />
                          ) : (
                            <LinearGradient
                              colors={['#7C2B86', '#FF6FB5']}
                              style={styles.sidebarRequestAvatarGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.sidebarRequestAvatarText}>
                                {displayName.charAt(0).toUpperCase()}
                              </Text>
                            </LinearGradient>
                          )}
                        </TouchableOpacity>
                        
                        {/* Info */}
                        <View style={styles.sidebarRequestContent}>
                          <Text style={styles.sidebarRequestName} numberOfLines={1}>{displayName}</Text>
                          <Text style={styles.sidebarRequestSubtitle} numberOfLines={1}>
                            Friend request{timeAgo ? ` · ${timeAgo}` : ''}
                          </Text>
                          <View style={styles.sidebarRequestPill}>
                            <Ionicons name="people" size={10} color="#7C2B86" />
                            <Text style={styles.sidebarRequestPillText}>Wants to connect</Text>
                          </View>
                        </View>
                        
                        {/* Actions */}
                        <View style={styles.sidebarRequestActions}>
                          <TouchableOpacity 
                            style={styles.sidebarRequestRejectBtn}
                            onPress={() => handleRejectRequest(request)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="close" size={16} color="#9CA3AF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.sidebarRequestAcceptBtn}
                            onPress={() => handleAcceptRequest(request)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>


          {/* Right Panel - Matches Grid */}
          <View style={styles.mainPanel}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mainPanelContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#7C2B86', '#FF6FB5']}
                  tintColor="#7C2B86"
                />
              }
            >
              {/* Announcements */}
              <AnnouncementBanner placement="match" />

              {/* Browser Notification Banner */}
              <NotificationPermissionBanner />

              {/* Best Match Today - Hero Card */}
              {nearbyUsers.length > 0 && (
                <View style={[styles.heroMatchCard, dynamicStyles.sectionCard]}>
                  <View style={styles.heroMatchBadge}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={[styles.heroMatchBadgeText, { color: '#FFFFFF' }]}>Best Match Today</Text>
                  </View>
                  <View style={styles.heroMatchContent}>
                    <View style={styles.heroAvatarContainer}>
                      <View style={styles.heroAvatarGlow} />
                      <Image
                        source={{ uri: nearbyUsers[0].photoUrl || 'https://i.pravatar.cc/300' }}
                        style={styles.heroAvatar}
                      />
                      <View style={styles.compatibilityRing}>
                        <Text style={styles.compatibilityRingText}>{nearbyUsers[0].compatibility}</Text>
                      </View>
                    </View>
                    <View style={styles.heroMatchInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.heroMatchName, { color: theme.textPrimary }]}>{nearbyUsers[0].name}</Text>
                        {nearbyUsers[0].verification_status === 'verified' && (
                          <VerifiedBadge size={20} />
                        )}
                      </View>
                      <Text style={[styles.heroMatchAge, { color: theme.textSecondary }]}>{nearbyUsers[0].age} years old</Text>
                      <View style={styles.heroMatchTags}>
                        {nearbyUsers[0].interests?.slice(0, 3).map((interest, idx) => (
                          <View key={idx} style={styles.heroTag}>
                            <Text style={[styles.heroTagText, { color: theme.textSecondary }]}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.heroMatchActions}>
                        <TouchableOpacity 
                          style={styles.heroPassButton}
                          onPress={() => handleViewProfile(nearbyUsers[0])}
                        >
                          <Ionicons name="eye" size={22} color="#818CF8" />
                          <Text style={[styles.heroActionText, { color: theme.primary }]}>View Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.heroLikeButton}
                          onPress={() => handleSendFriendRequest(nearbyUsers[0])}
                        >
                          <LinearGradient
                            colors={['#7C2B86', '#FF6FB5']}
                            style={styles.heroLikeGradient}
                          >
                            <Ionicons name="person-add" size={22} color="#FFFFFF" />
                            <Text style={[styles.heroLikeText, { color: '#FFFFFF' }]}>Send Request</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Matches Grid */}
              <View style={styles.matchesSection}>
                <Text style={[styles.matchesSectionTitle, dynamicStyles.sectionTitle]}>Discover Matches</Text>
                <View style={styles.matchesGrid}>
                  {nearbyUsers.slice(1, 7).filter(user => !passedMatchIds.has(user.id)).map((user) => (
                    <View key={user.id} style={styles.matchCardWrapper}>
                      <TouchableOpacity
                        style={[styles.matchCard, dynamicStyles.matchCard]}
                        activeOpacity={0.9}
                        onPress={() => handleViewProfile(user)}
                      >
                        <View style={styles.matchCardGlow} />
                        <View style={styles.matchCardContent}>
                          <View style={styles.matchAvatarContainer}>
                            <Image
                              source={{ uri: user.photoUrl || 'https://i.pravatar.cc/300' }}
                              style={styles.matchAvatar}
                            />
                            <View style={styles.matchCompatibilityBadge}>
                              <Text style={[styles.matchCompatibilityText, { color: '#FFFFFF' }]}>{user.compatibility}</Text>
                            </View>
                          </View>
                          <View style={styles.matchCardInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.matchCardName, { color: theme.textPrimary }]}>{user.name}</Text>
                              {user.verification_status === 'verified' && (
                                <VerifiedBadge size={16} />
                              )}
                            </View>
                            <Text style={[styles.matchCardAge, { color: theme.textSecondary }]}>{user.age}</Text>
                            <View style={styles.matchCardTags}>
                              {user.interests?.slice(0, 2).map((interest, idx) => (
                                <View key={idx} style={styles.matchTag}>
                                  <Text style={[styles.matchTagText, { color: theme.textSecondary }]}>{interest}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                      
                      {/* Pass Button - Outside card */}
                      <TouchableOpacity 
                        style={styles.matchPassButton}
                        onPress={() => handlePassMatch(user.id, user.name)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF6B9D" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Help Requests Section */}
              <View style={[dynamicStyles.sectionCard, { marginBottom: 20 }]}>
                <HelpRequestsList 
                  status="searching"
                  title="People Looking for Help"
                  showHelpButton={true}
                  maxItems={5}
                  externalRefreshing={refreshing}
                />
              </View>

              {/* Live Activity Feed */}
              <LiveActivityFeed isVisible={true} maxItems={50} />
            </ScrollView>
          </View>
        </View>
      ) : (
        // MOBILE VIEW - Modern Theme
        <View style={[styles.mobileContainer, dynamicStyles.mobileContainer]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mobileContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
          >
            {/* Mobile Header - Modern Theme */}
            <View style={styles.mobileHeader}>
              <View style={styles.mobileHeaderLeft}>
                <Text style={[styles.greetingText, dynamicStyles.greetingText]}>{getGreeting()}, {getUserFirstName()}!</Text>
                <Text style={[styles.mobileSubtitle, dynamicStyles.headerSubtitle]}>Find your perfect match</Text>
              </View>
              <TouchableOpacity 
                style={[styles.settingsButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={handleNotificationsPress}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
                {notificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Announcement Banner - Hero Style (edge-to-edge) */}
            <View style={{ marginHorizontal: -16 }}>
              <AnnouncementBanner placement="match" />
            </View>

            {/* Browser Notification Banner */}
            <NotificationPermissionBanner />

            {/* Quick Action Cards - Zepto Style */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity 
                style={[styles.quickActionCard, dynamicStyles.sectionCard]}
                onPress={handleStartMatch}
                activeOpacity={0.9}
              >
                <View style={styles.quickActionContent}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="flash" size={24} color="#FFD6F2" />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={[styles.quickActionTitle, { color: theme.textPrimary }]}>Live Match</Text>
                    <Text style={[styles.quickActionSubtitle, { color: theme.textSecondary }]}>Find instantly</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickActionCard, dynamicStyles.sectionCard, user?.invisibleMode && styles.disabledCard]}
                onPress={handleLocationSearch}
                activeOpacity={user?.invisibleMode ? 1 : 0.9}
                disabled={user?.invisibleMode}
              >
                <View style={styles.quickActionContent}>
                  <View style={styles.quickActionIcon}>
                    <Ionicons name={user?.invisibleMode ? "eye-off" : "location"} size={24} color={user?.invisibleMode ? "rgba(255,255,255,0.5)" : "#FFD6F2"} />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={[styles.quickActionTitle, { color: user?.invisibleMode ? theme.textMuted : theme.textPrimary }]}>Location Search</Text>
                    <Text style={[styles.quickActionSubtitle, { color: user?.invisibleMode ? theme.textMuted : theme.textSecondary }]}>
                      {user?.invisibleMode ? 'Disabled' : 'Explore nearby'}
                    </Text>
                  </View>
                  <Ionicons name={user?.invisibleMode ? "lock-closed" : "chevron-forward"} size={20} color={user?.invisibleMode ? theme.textMuted : theme.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>

            {activeHelpRequest && (
              <View style={[dynamicStyles.sectionCard, { marginBottom: 16 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="pulse" size={18} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginLeft: 8 }]}>
                      Ongoing Help Request
                    </Text>
                  </View>
                  {loadingActiveHelpRequest && (
                    <ActivityIndicator size="small" color={theme.primary} />
                  )}
                </View>

                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 8 }]} numberOfLines={2}>
                  "{activeHelpRequest.prompt}"
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.primary, flex: 1 }]}
                    onPress={() => {
                      router.push({
                        pathname: '/secure/help-searching',
                        params: {
                          requestId: activeHelpRequest.id,
                          prompt: activeHelpRequest.prompt,
                        },
                      });
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Resume Search</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surface, flex: 1 }]}
                    onPress={() => {
                      Alert.alert(
                        'Cancel Help Request',
                        'Are you sure you want to cancel this help request?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Yes',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await promptMatchingApi.cancelHelpRequest(activeHelpRequest.id, token);
                                setActiveHelpRequest(null);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to cancel request');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Prompt Matching Toggle - Help Mode */}
            <PromptMatchingWrapper />

            {/* Blind Date Feature Card - NEW */}
            <TouchableOpacity 
              style={[
                styles.blindDateCard, 
                dynamicStyles.sectionCard,
                blindDateEnabled && styles.blindDateCardActive
              ]}
              onPress={handleToggleBlindDate}
              activeOpacity={0.9}
              disabled={blindDateLoading}
            >
              <LinearGradient
                colors={
                  blindDateEnabled
                    ? ['#7C2B86', '#FF6FB5']
                    : isDarkMode
                      ? [theme.surface, theme.surface]
                      : ['#C4B5FD', '#D8B4FE']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.blindDateGradient}
              >
                {/* NEW Badge */}
                <Animated.View
                  style={[
                    styles.newFeatureBadge,
                    {
                      transform: [{ scale: newBadgePulse }],
                    },
                  ]}
                >
                  <Text style={styles.newFeatureBadgeText}>NEW</Text>
                </Animated.View>
                
                <View style={styles.blindDateContent}>
                  <View style={[styles.blindDateIconContainer, blindDateEnabled && styles.blindDateIconActive]}>
                    <Ionicons 
                      name="eye-off" 
                      size={28} 
                      color={blindDateEnabled ? "#FFFFFF" : "#7C2B86"} 
                    />
                  </View>
                  
                  <View style={styles.blindDateTextContainer}>
                    <View style={styles.blindDateTitleRow}>
                      <Text style={[
                        styles.blindDateTitle, 
                        { color: blindDateEnabled ? '#FFFFFF' : theme.textPrimary }
                      ]}>
                        Blind Date
                      </Text>
                      <View style={[
                        styles.blindDateStatusBadge,
                        blindDateEnabled ? styles.blindDateStatusOn : styles.blindDateStatusOff
                      ]}>
                        <Text style={[
                          styles.blindDateStatusText,
                          { color: blindDateEnabled ? '#00D4AA' : theme.textMuted }
                        ]}>
                          {blindDateEnabled ? 'ON' : 'OFF'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.blindDateSubtitle, 
                      { color: blindDateEnabled ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
                    ]}>
                      {blindDateEnabled 
                        ? 'Chat anonymously until you reveal!' 
                        : 'Match & chat without seeing profiles'}
                    </Text>
                  </View>
                  
                  {blindDateLoading ? (
                    <ActivityIndicator size="small" color={blindDateEnabled ? "#FFFFFF" : theme.primary} />
                  ) : (
                    <View style={[
                      styles.blindDateToggle,
                      blindDateEnabled && styles.blindDateToggleActive
                    ]}>
                      <View style={[
                        styles.blindDateToggleKnob,
                        blindDateEnabled && styles.blindDateToggleKnobActive
                      ]} />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <View style={styles.mobileFriendRequests}>
                <Text style={[styles.mobileFriendRequestsTitle, dynamicStyles.sectionTitle]}>Friend Requests</Text>
                {friendRequests.slice(0, 3).map((request) => {
                  const displayName = request.sender?.first_name 
                    ? `${request.sender.first_name}${request.sender.last_name ? ' ' + request.sender.last_name : ''}`
                    : 'Someone';
                  const timeAgo = request.created_at 
                    ? getTimeAgo(new Date(request.created_at))
                    : '';
                  return (
                    <View key={request.id} style={styles.mobileFriendRequestCard}>
                      {/* Tappable Avatar */}
                      <TouchableOpacity 
                        style={styles.mobileFriendRequestAvatarContainer}
                        onPress={() => handleViewProfile(request.sender)}
                        activeOpacity={0.7}
                      >
                        {request.sender?.profile_photo_url ? (
                          <Image 
                            source={{ uri: request.sender.profile_photo_url }}
                            style={styles.mobileFriendRequestAvatarImage}
                          />
                        ) : (
                          <LinearGradient
                            colors={['#7C2B86', '#FF6FB5']}
                            style={styles.mobileFriendRequestAvatarGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.mobileFriendRequestAvatarText}>
                              {displayName.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                        )}
                      </TouchableOpacity>
                      
                      {/* Info Section */}
                      <View style={styles.mobileFriendRequestContent}>
                        <View style={styles.mobileFriendRequestHeader}>
                          <Text style={[styles.mobileFriendRequestName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Text style={styles.mobileFriendRequestSubtitle} numberOfLines={1}>
                            Friend request{timeAgo ? ` · ${timeAgo}` : ''}
                          </Text>
                        </View>
                        
                        {/* Wants to connect pill */}
                        <View style={styles.mobileFriendRequestPill}>
                          <Ionicons name="people" size={12} color="#7C2B86" />
                          <Text style={styles.mobileFriendRequestPillText}>Wants to connect</Text>
                        </View>
                      </View>
                      
                      {/* Action Buttons */}
                      <View style={styles.mobileFriendRequestActions}>
                        <TouchableOpacity 
                          style={styles.mobileFriendRequestRejectBtn}
                          onPress={() => handleRejectRequest(request)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.mobileFriendRequestAcceptBtn}
                          onPress={() => handleAcceptRequest(request)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Circle Stats */}
            {circleStats && circleStats.stats && (
              <View style={[styles.mobileStatsCard, dynamicStyles.mobileStatsCard]}>
                <View style={styles.mobileStatsHeader}>
                  <Text style={[styles.mobileStatsTitle, dynamicStyles.mobileStatsTitle]}>Your Circle Score</Text>
                  <View
                    style={[
                      styles.mobileTierBadge,
                      { backgroundColor: CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).color },
                    ]}
                  >
                    <Text style={[styles.mobileTierBadgeText, dynamicStyles.mobileTierBadgeText]}>
                      {CirclePointsHelper.getScoreTier(circleStats.stats.circle_points || 0).tier}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.mobileStatsPoints, dynamicStyles.mobileStatsPoints]}>
                  {circleStats.stats.circle_points || 0} points
                </Text>
                <View style={styles.mobileStatsGrid}>
                  <View style={styles.mobileStatItem}>
                    <Text style={[styles.mobileStatNumber, dynamicStyles.mobileStatNumber]}>
                      {circleStats.stats.total_matches || 0}
                    </Text>
                    <Text style={[styles.mobileStatLabel, dynamicStyles.mobileStatLabel]}>Matches</Text>
                  </View>
                  <View style={styles.mobileStatItem}>
                    <Text style={[styles.mobileStatNumber, dynamicStyles.mobileStatNumber]}>
                      {actualFriendsCount}
                    </Text>
                    <Text style={[styles.mobileStatLabel, dynamicStyles.mobileStatLabel]}>Friends</Text>
                  </View>
                  <View style={styles.mobileStatItem}>
                    <Text style={[styles.mobileStatNumber, dynamicStyles.mobileStatNumber]}>
                      {(circleStats.stats.messages_sent || 0) + (circleStats.stats.messages_received || 0)}
                    </Text>
                    <Text style={[styles.mobileStatLabel, dynamicStyles.mobileStatLabel]}>Messages</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Help Requests Section */}
            <View style={[dynamicStyles.sectionCard, { marginBottom: 20 }]}>
              <HelpRequestsList 
                status="searching"
                title="People Looking for Help"
                showHelpButton={true}
                maxItems={8}
                externalRefreshing={refreshing}
              />
            </View>

            {/* Live Activity Feed */}
            <LiveActivityFeed isVisible={true} maxItems={50} />
          </ScrollView>
        </View>
      )}

      <Modal animationType="fade" transparent visible={showModal && (isSearching || matchedUser !== null)}>
        <View style={styles.modalOverlay}>
          {/* Toast inside modal to ensure it appears above modal content */}
          <Toast visible={toast.visible} text={toast.text} type={toast.type} />
          
          <View style={styles.modalContent}>
            <LinearGradient
              colors={matchedUser ? ["#667eea", "#764ba2", "#f093fb"] : ["#7C2B86", "#B24592", "#F15F79"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              {isSearching && !matchedUser && (
                <SearchingAnimation onClose={handleCloseSearching} />
              )}

              {matchedUser && (
                <MatchFoundCard 
                  matchedUser={matchedUser}
                  isConnectPressed={isConnectPressed}
                  onPass={handlePass}
                  onConnect={handleStartChat}
                  onClose={async () => {
                    try {
                      await matchmakingApi.cancel(token);
                      setMatchedUser(null);
                      setShowModal(false);
                      setIsSearching(false);
                      setIsConnectPressed(false);
                      setHasActiveSession(false);
                    } catch (error) {
                      console.error('Error closing match:', error);
                    }
                  }}
                />
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Connection Animation Modal */}
      {showConnectionAnimation && (
        <Modal animationType="fade" transparent visible={showConnectionAnimation}>
          <View style={styles.modalOverlay}>
            <ConnectionAnimation 
              userName={matchedUser?.firstName || 'User'}
              onComplete={() => setShowConnectionAnimation(false)}
            />
          </View>
        </Modal>
      )}

      {/* Coming Soon Modal */}
      <Modal animationType="slide" transparent visible={showComingSoonModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.comingSoonModal}>
            <TouchableOpacity 
              style={styles.comingSoonCloseButton}
              onPress={() => setShowComingSoonModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.comingSoonContent}>
              <View style={styles.comingSoonIcon}>
                <Ionicons name="rocket" size={60} color="#FF6FB5" />
              </View>
              
              <Text style={styles.comingSoonTitle}>Live Match Coming Soon!</Text>
              <Text style={styles.comingSoonSubtitle}>
                This feature will go live once we reach 10,000 users
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Current Users</Text>
                  <Text style={styles.progressGoal}>Goal: {publicStats.goal.toLocaleString()}</Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${Math.min((publicStats.totalUsers / publicStats.goal) * 100, 100)}%` }
                    ]}
                  >
                    <LinearGradient
                      colors={['#7C2B86', '#FF6FB5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressGradient}
                    />
                  </View>
                </View>

                <View style={styles.progressStats}>
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatNumber}>
                      {loadingPublicStats ? '...' : publicStats.totalUsers.toLocaleString()}
                    </Text>
                    <Text style={styles.progressStatLabel}>Users</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatNumber}>
                      {loadingPublicStats ? '...' : (publicStats.goal - publicStats.totalUsers).toLocaleString()}
                    </Text>
                    <Text style={styles.progressStatLabel}>Remaining</Text>
                  </View>
                  <View style={styles.progressStatDivider} />
                  <View style={styles.progressStatItem}>
                    <Text style={styles.progressStatNumber}>
                      {loadingPublicStats ? '...' : `${Math.round((publicStats.totalUsers / publicStats.goal) * 100)}%`}
                    </Text>
                    <Text style={styles.progressStatLabel}>Complete</Text>
                  </View>
                </View>
              </View>

              {/* Call to Action */}
              <View style={styles.comingSoonCTA}>
                <Text style={styles.comingSoonCTATitle}>Help us reach our goal!</Text>
                <Text style={styles.comingSoonCTAText}>
                  Share Circle with your friends and be part of something amazing
                </Text>
              </View>

              {/* Share Button */}
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShareApp}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#7C2B86', '#5D5FEF', '#FF6FB5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.shareButtonGradient}
                >
                  <Ionicons name="share-social" size={24} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share Circle</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Link */}
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open('https://circle.orincore.com', '_blank');
                  } else {
                    Linking.openURL('https://circle.orincore.com');
                  }
                }}
              >
                <Text style={styles.linkButtonText}>circle.orincore.com</Text>
                <Ionicons name="open-outline" size={16} color="#FF6FB5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications panel (same as bottom navbar previously) */}
      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      
      </LinearGradient>
    </View>
  );
}

// Connection Animation Component
const ConnectionAnimation = ({ userName, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Scale and fade in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Particle burst animation
    particleAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 50),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Auto close after 3 seconds
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onComplete());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        connectionStyles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Particle burst */}
      {particleAnims.map((anim, index) => {
        const angle = (index / particleAnims.length) * 2 * Math.PI;
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * 150],
        });
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(angle) * 150],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              connectionStyles.particle,
              {
                opacity,
                transform: [{ translateX }, { translateY }],
              },
            ]}
          >
            <Ionicons name="heart" size={20} color="#FF69B4" />
          </Animated.View>
        );
      })}

      {/* Main content */}
      <View style={connectionStyles.content}>
        <Ionicons name="link" size={64} color="#FFFFFF" />
        <Text style={connectionStyles.title}>Creating Connection</Text>
        <Text style={connectionStyles.subtitle}>with {userName}</Text>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
      </View>
    </Animated.View>
  );
};

const connectionStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.95)',
  },
  particle: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
});

// Enhanced Match Found Card Component
const MatchFoundCard = ({ matchedUser, isConnectPressed, onPass, onConnect, onClose }) => {
  const { theme, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const heartBeatAnim = useRef(new Animated.Value(1)).current;
  const compatibilityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Heart beat animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Compatibility bar animation
    Animated.timing(compatibilityAnim, {
      toValue: 1,
      duration: 1500,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const compatibilityWidth = compatibilityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${matchedUser.compatibilityScore || 94}%`],
  });

  // Get real about text or generate from interests/needs
  const getAboutText = () => {
    if (matchedUser.about) {
      return matchedUser.about;
    }
    
    const interests = matchedUser.interests?.slice(0, 2).join(' and ') || 'various interests';
    const needs = matchedUser.needs?.[0] || 'connection';
    return `Shares your love for ${interests} and is also looking for ${needs}. This could be a great connection!`;
  };

  return (
    <Animated.View
      style={[
        matchCardStyles.container,
        {
          backgroundColor: theme.surface,
          shadowColor: theme.shadowColor,
          shadowOpacity: isDarkMode ? 0.4 : 0.12,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 16,
        },
        {
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        },
      ]}
    >
      {/* Close button */}
      <TouchableOpacity
        style={[matchCardStyles.closeButton, { backgroundColor: theme.surfaceSecondary }]}
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color={theme.textPrimary} />
      </TouchableOpacity>

      {/* Header with animated heart */}
      <View style={matchCardStyles.header}>
        <Animated.View style={{ transform: [{ scale: heartBeatAnim }] }}>
          <Ionicons name="heart" size={48} color="#FF69B4" />
        </Animated.View>
        <Text style={matchCardStyles.title}>Perfect Match!</Text>
        <Text style={matchCardStyles.subtitle}>
          ✨ {matchedUser.compatibility || 'High match'} ✨
        </Text>
      </View>

      {/* Profile section */}
      <View style={matchCardStyles.profileSection}>
        <View style={matchCardStyles.avatarContainer}>
          <View style={matchCardStyles.avatarGlow}>
            <Image
              source={{ uri: matchedUser.avatar || matchedUser.profile_photo_url }}
              style={matchCardStyles.avatar}
            />
          </View>
          <View style={matchCardStyles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#00D4AA" />
          </View>
        </View>

        <Text style={[matchCardStyles.name, { color: theme.textPrimary }]}>
          {`${matchedUser.firstName || matchedUser.first_name} ${(matchedUser.lastName || matchedUser.last_name)?.charAt(0)}.`}
        </Text>

        {/* Stats row */}
        <View style={matchCardStyles.statsRow}>
          <View style={[matchCardStyles.statChip, { backgroundColor: theme.surfaceSecondary }] }>
            <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
            <Text style={[matchCardStyles.statText, { color: theme.textSecondary }]}>{matchedUser.age}</Text>
          </View>
          <View style={[matchCardStyles.statChip, { backgroundColor: theme.surfaceSecondary }] }>
            <Ionicons name="location-outline" size={16} color="#8B5CF6" />
            <Text style={[matchCardStyles.statText, { color: theme.textSecondary }]}>{matchedUser.location || 'Nearby'}</Text>
          </View>
          <View style={[matchCardStyles.statChip, { backgroundColor: theme.surfaceSecondary }] }>
            <Ionicons
              name={matchedUser.gender === 'female' ? 'female' : matchedUser.gender === 'male' ? 'male' : 'transgender'}
              size={16}
              color="#8B5CF6"
            />
            <Text style={[matchCardStyles.statText, { color: theme.textSecondary }]}>
              {matchedUser.gender === 'non-binary' ? 'NB' : matchedUser.gender?.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* About section */}
        <View
          style={[
            matchCardStyles.aboutSection,
            { backgroundColor: theme.surfaceSecondary },
          ]}
        >
          <Text style={[matchCardStyles.aboutText, { color: theme.textSecondary }]}>
            {getAboutText()}
          </Text>
        </View>

        {/* Compatibility score */}
        <View style={matchCardStyles.compatibilitySection}>
          <Text style={[matchCardStyles.compatibilityLabel, { color: theme.textSecondary }]}>Compatibility Score</Text>
          <View
            style={[
              matchCardStyles.compatibilityBarContainer,
              { backgroundColor: isDarkMode ? '#1F2933' : theme.surfaceSecondary },
            ]}
          >
            <Animated.View
              style={[
                matchCardStyles.compatibilityBar,
                { width: compatibilityWidth },
              ]}
            />
            <Text style={[matchCardStyles.compatibilityScore, { color: theme.textPrimary }]}>
              {matchedUser.compatibilityScore || 94}%
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={matchCardStyles.actionsContainer}>
        <TouchableOpacity
          style={matchCardStyles.passButton}
          onPress={onPass}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={32} color="#FF6B6B" />
          <Text style={matchCardStyles.passText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[matchCardStyles.connectButton, isConnectPressed && matchCardStyles.connectButtonPressed]}
          onPress={onConnect}
          activeOpacity={0.8}
          disabled={isConnectPressed}
        >
          <LinearGradient
            colors={isConnectPressed ? ['#4ade80', '#22c55e'] : ['#7C2B86', '#B24592', '#F15F79']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={matchCardStyles.connectGradient}
          >
            <Ionicons
              name={isConnectPressed ? 'checkmark-circle' : 'heart-circle'}
              size={32}
              color="#FFFFFF"
            />
            <Text style={matchCardStyles.connectText}>
              {isConnectPressed ? 'Sent!' : 'Connect'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const matchCardStyles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7C2B86',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#B24592',
    marginTop: 4,
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 4,
    backgroundColor: 'linear-gradient(135deg, #7C2B86, #B24592)',
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#F5F5F5',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  aboutSection: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
  },
  compatibilitySection: {
    width: '100%',
    marginBottom: 24,
  },
  compatibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  compatibilityBarContainer: {
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  compatibilityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#7C2B86',
    borderRadius: 16,
  },
  compatibilityScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  passButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
  },
  passText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  connectButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectButtonPressed: {
    opacity: 0.9,
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  connectText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

// Note: The new MatchFoundCard and ConnectionAnimation components are defined above.
// To use them, add this state to the main MatchScreen component (around line 296):
// const [showConnectionAnimation, setShowConnectionAnimation] = useState(false);

const styles = StyleSheet.create({
  // Main Container
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
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
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

  // DESKTOP/WEB STYLES
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  sidebarContent: {
    padding: 24,
    gap: 20,
  },
  sidebarHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  desktopSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    marginBottom: 8,
  },
  quickStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tierBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pointsCenterSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsGradientCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  desktopStatsPoints: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  pointsSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCompactItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statCompactNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 2,
  },
  statCompactLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  liveMatchGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
  },
  liveMatchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    left: -20,
  },
  liveMatchText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  sidebarButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarButtonContent: {
    flex: 1,
  },
  sidebarButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebarButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  sidebarFriendRequests: {
    marginTop: 8,
  },
  sidebarSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Sidebar Friend Request Card - Desktop version
  sidebarRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  sidebarRequestAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sidebarRequestAvatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sidebarRequestAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sidebarRequestContent: {
    flex: 1,
    gap: 3,
  },
  sidebarRequestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebarRequestSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  sidebarRequestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    marginTop: 2,
  },
  sidebarRequestPillText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#E8B4D8',
  },
  sidebarRequestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  sidebarRequestRejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  sidebarRequestAcceptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Panel (Desktop)
  mainPanel: {
    flex: 1,
  },
  mainPanelContent: {
    padding: 32,
    gap: 32,
  },
  heroMatchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  heroMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroMatchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
  },
  heroMatchContent: {
    flexDirection: 'row',
    gap: 24,
  },
  heroAvatarContainer: {
    position: 'relative',
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#7C2B86',
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  heroAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  compatibilityRing: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5D5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1a0b2e',
  },
  compatibilityRingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMatchInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  heroMatchName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMatchAge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroMatchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  heroTag: {
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.5)',
  },
  heroTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  heroMatchActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  heroPassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(129, 140, 248, 0.4)',
  },
  heroActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#818CF8',
  },
  heroLikeButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  heroLikeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  heroLikeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMessageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(93, 95, 239, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(93, 95, 239, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Matches Grid
  matchesSection: {
    gap: 20,
  },
  matchesSectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  matchesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  matchCardWrapper: {
    width: '31%',
    minWidth: 200,
    aspectRatio: 1,
    position: 'relative',
  },
  matchCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  matchCardGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#7C2B86',
    opacity: 0.05,
  },
  matchCardContent: {
    padding: 18,
    gap: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  matchAvatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  matchAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#7C2B86',
  },
  matchCompatibilityBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#5D5FEF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  matchCompatibilityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  matchCardInfo: {
    alignItems: 'center',
    gap: 4,
  },
  matchCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
  },
  matchCardAge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  matchCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
  },
  matchTag: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C2B86',
  },
  matchPassButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  matchCardPassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCardLikeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCardMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(93, 95, 239, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // MOBILE STYLES
  mobileContainer: {
    flex: 1,
  },
  mobileContent: {
    padding: 20,
    gap: 24,
    paddingTop: 60,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mobileHeaderLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  mobileTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  mobileSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.4)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mobileFilterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Swipeable Card
  swipeCardContainer: {
    gap: 20,
  },
  swipeCard: {
    height: 500,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  swipeCardGlow: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#7C2B86',
    opacity: 0.2,
  },
  swipeImageContainer: {
    height: '65%',
    position: 'relative',
  },
  swipeImage: {
    width: '100%',
    height: '100%',
  },
  swipeImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  swipeCardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    gap: 16,
  },
  swipeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  swipeCardName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  swipeCardAge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  swipeCompatibilityCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5D5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  swipeCompatibilityText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  swipeInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swipeInterestPill: {
    backgroundColor: 'rgba(124, 43, 134, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  swipeInterestText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Special Features Container
  specialFeaturesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  specialFeatureCard: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  specialFeatureGradient: {
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  specialFeatureGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  specialFeatureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  specialFeatureIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  specialFeatureTextContainer: {
    flex: 1,
  },
  specialFeatureTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  specialFeatureSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },

  // Swipe Actions
  swipeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  swipePassButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swipeFriendRequestButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeFriendRequestGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeButtonGlow: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.5,
  },

  // No Users State
  noUsersContainer: {
    height: 500,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noUsersContent: {
    alignItems: 'center',
    gap: 16,
  },
  noUsersIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noUsersTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noUsersSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  noUsersHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Mini Queue
  miniQueue: {
    gap: 12,
  },
  miniQueueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  miniQueueScroll: {
    gap: 12,
  },
  miniQueueCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  miniQueueImage: {
    width: '100%',
    height: '100%',
  },
  miniQueueBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#5D5FEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1a0b2e',
  },
  miniQueueBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  quickActionContent: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Mobile Friend Requests - WhatsApp/Instagram style
  mobileFriendRequests: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileFriendRequestsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mobileFriendRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  mobileFriendRequestAvatarContainer: {
    position: 'relative',
  },
  mobileFriendRequestAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mobileFriendRequestAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mobileFriendRequestAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileFriendRequestContent: {
    flex: 1,
    gap: 6,
  },
  mobileFriendRequestHeader: {
    gap: 2,
  },
  mobileFriendRequestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileFriendRequestSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  mobileFriendRequestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  mobileFriendRequestPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E8B4D8',
  },
  mobileFriendRequestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileFriendRequestRejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  mobileFriendRequestAcceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile Stats Card
  mobileStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileTierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  mobileTierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileStatsPoints: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileStatsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  mobileStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
  },
  mobileStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },

  // Keep old styles for compatibility
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
  
  // Disabled state styles
  disabledCard: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999999',
  },
  
  // Swipe indicator styles
  swipeIndicator: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 3,
  },
  swipeIndicatorLeft: {
    left: 20,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    transform: [{ rotate: '-20deg' }],
  },
  swipeIndicatorRight: {
    right: 20,
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    transform: [{ rotate: '20deg' }],
  },
  swipeIndicatorText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  // Coming Soon Modal Styles
  comingSoonModal: {
    backgroundColor: 'rgba(31, 17, 71, 0.98)',
    borderRadius: 24,
    padding: 32,
    maxWidth: 500,
    width: '90%',
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 181, 0.3)',
  },
  comingSoonCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonContent: {
    alignItems: 'center',
  },
  comingSoonIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 111, 181, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  progressGoal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6FB5',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressGradient: {
    flex: 1,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  progressStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
  },
  progressStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  comingSoonCTA: {
    marginBottom: 24,
    alignItems: 'center',
  },
  comingSoonCTATitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD6F2',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonCTAText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6FB5',
  },
  // New Zepto-style mobile header
  mobileHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 4,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  // Quick Action Cards - Zepto Style
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  disabledCard: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#999',
  },
  
  // Blind Date Feature Card Styles
  blindDateCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
  },
  blindDateCardActive: {
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  blindDateGradient: {
    padding: 20,
    borderRadius: 20,
    position: 'relative',
  },
  newFeatureBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6FB5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#FF6FB5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  newFeatureBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  blindDateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  blindDateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  blindDateIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  blindDateTextContainer: {
    flex: 1,
  },
  blindDateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  blindDateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  blindDateStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  blindDateStatusOn: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
  },
  blindDateStatusOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blindDateStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  blindDateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  blindDateToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    justifyContent: 'center',
  },
  blindDateToggleActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.3)',
  },
  blindDateToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  blindDateToggleKnobActive: {
    backgroundColor: '#00D4AA',
    alignSelf: 'flex-end',
  },
  
  // Desktop Sidebar Blind Date Styles
  sidebarButtonActive: {
    borderColor: 'rgba(0, 212, 170, 0.4)',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  sidebarNewBadge: {
    backgroundColor: '#FF6FB5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sidebarNewBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sidebarToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 2,
    justifyContent: 'center',
  },
  sidebarToggleActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.3)',
  },
  sidebarToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sidebarToggleKnobActive: {
    backgroundColor: '#00D4AA',
    alignSelf: 'flex-end',
  },
});
