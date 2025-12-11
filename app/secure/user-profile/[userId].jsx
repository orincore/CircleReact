import Avatar from "@/components/Avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { friendsApi } from "@/src/api/friends";
import { getSocket } from "@/src/api/socket";
import { FriendRequestService } from "@/src/services/FriendRequestService";
import LinkedSocialAccounts from "@/src/components/LinkedSocialAccounts";
import SpotifyProfile from "@/src/components/SpotifyProfile";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const { user, token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  // Safe subscription context access
  let subscriptionContext;
  try {
    subscriptionContext = useSubscription();
  } catch (error) {
    console.warn('Subscription context error:', error);
    subscriptionContext = null;
  }
  
  const features = subscriptionContext?.features || {};

  // State
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none');
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [canMessage, setCanMessage] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [spotifyData, setSpotifyData] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());
  const screenWidth = Dimensions.get('window').width;
  
  // Scroll to selected photo when viewer opens
  useEffect(() => {
    if (showPhotoViewer && photoScrollViewRef.current && selectedPhotoIndex > 0) {
      setTimeout(() => {
        photoScrollViewRef.current?.scrollTo({
          x: selectedPhotoIndex * screenWidth,
          y: 0,
          animated: false,
        });
      }, 100);
    }
  }, [showPhotoViewer, selectedPhotoIndex, screenWidth]);
  
  // Confirmation modals
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [showAllInterests, setShowAllInterests] = useState(false);
  
  const photoScrollViewRef = useRef(null);

  // Function to mask Instagram username for other users
  const getMaskedInstagram = (username) => {
    if (!username) return null;
    if (userId === user?.id) {
      return username;
    }
    const prefix = username.substring(0, 2);
    const suffix = '*'.repeat(Math.max(1, username.length - 2));
    return prefix + suffix;
  };

  // Load profile data
  const loadUserProfile = async () => {
    if (!userId || !token) return;
    
    setLoading(true);
    
    try {
      // Record profile visit
      if (userId !== user?.id) {
        try {
          const { circleStatsApi } = await import('@/src/api/circle-stats');
          await circleStatsApi.recordProfileVisit(userId, token);
          
          const socket = getSocket(token);
          socket.emit('profile:visit', {
            profileOwnerId: userId,
            visitorId: user.id,
            visitorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Someone'
          });
        } catch (visitError) {
          console.log('Failed to record profile visit:', visitError);
        }
      }
      
      // Fetch user profile
      const { API_BASE_URL } = await import('@/src/api/config');
      const response = await fetch(`${API_BASE_URL}/api/friends/user/${userId}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          id: data.id,
          name: data.name || 'Unknown User',
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          avatar: data.profilePhotoUrl,
          bio: data.about || 'No bio available',
          instagramUsername: data.instagramUsername,
          verification_status: data.verification_status || 'unverified',
          email_verified: data.email_verified === true,
          age: data.age,
          gender: data.gender,
          location: data.location || 'Location not specified',
          joinedDate: data.joinedDate 
            ? `Joined ${new Date(data.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` 
            : 'Recently joined',
          stats: {
            chats: data.stats?.chats || 0,
            friends: data.stats?.friends || 0,
            messages: data.stats?.messages || 0
          },
          interests: Array.isArray(data.interests) ? data.interests : [],
          needs: Array.isArray(data.needs) ? data.needs : [],
          isOnline: data.isOnline || false,
          lastSeen: data.isOnline ? 'Active now' : 'Last seen recently'
        });
      } else if (response.status === 404) {
        setProfileData({
          id: userId,
          name: 'Deleted User',
          username: 'deleted',
          avatar: null,
          bio: 'This user is no longer available',
          stats: { chats: 0, friends: 0, messages: 0 },
          interests: [],
          isOnline: false,
          lastSeen: 'Unavailable'
        });
      }
      
      // Load additional data
      await Promise.all([
        loadSpotifyData(),
        loadUserPhotos(),
        loadFriendStatus(),
        loadBlockStatus()
      ]);
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setProfileData({
        id: userId,
        name: 'User',
        username: 'user',
        avatar: null,
        bio: 'No bio available',
        stats: { chats: 0, friends: 0, messages: 0 },
        interests: [],
        isOnline: false,
        lastSeen: 'Last seen recently'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFriendStatus = async () => {
    if (!token || !userId || userId === user?.id) return;
    
    try {
      const socket = getSocket(token);
      
      const handleStatusResponse = (data) => {
        socket.off('friend:status:response', handleStatusResponse);
        
        if (data.error) {
          setFriendStatus('none');
          setFriendRequestId(null);
          setCanMessage(false);
        } else {
          setFriendStatus(data.status);
          setFriendRequestId(data.requestId || null);
          setCanMessage(data.status === 'friends');
        }
      };
      
      socket.on('friend:status:response', handleStatusResponse);
      socket.emit('friend:status:get', { userId });
      
      setTimeout(() => {
        socket.off('friend:status:response', handleStatusResponse);
      }, 5000);
      
    } catch (error) {
      console.error('Failed to load friend status:', error);
      setFriendStatus('none');
      setCanMessage(false);
    }
  };

  const loadBlockStatus = async () => {
    if (!token || !userId || userId === user?.id) return;
    
    try {
      const blockResponse = await friendsApi.getBlockStatus(userId, token);
      setBlockStatus(blockResponse);
    } catch (error) {
      console.error('Failed to load block status:', error);
    }
  };

  const loadSpotifyData = async () => {
    if (!token || !userId) return;
    
    try {
      const { socialAccountsApi } = await import('@/src/api/social-accounts');
      const response = await socialAccountsApi.getUserLinkedAccounts(userId, token);
      
      if (response.accounts) {
        const spotifyAccount = response.accounts.find(account => account.platform === 'spotify');
        setSpotifyData(spotifyAccount || null);
      }
    } catch (error) {
      console.error('Failed to load Spotify data:', error);
      setSpotifyData(null);
    }
  };

  const loadUserPhotos = async () => {
    if (!token || !userId) return;
    
    try {
      setLoadingPhotos(true);
      const { API_BASE_URL } = await import('@/src/api/config');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/photos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPhotos(data.photos || []);
      } else {
        setUserPhotos([]);
      }
    } catch (error) {
      console.error('Error loading user photos:', error);
      setUserPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!userId || !token) return;
    
    loadUserProfile();
    
    const socket = getSocket(token);
    
    const handleFriendRequestCancelled = (data) => {
      if (data.cancelledBy === userId) {
        setFriendStatus('none');
        Alert.alert('Request Cancelled', `${profileData?.name} cancelled their friend request.`);
      }
    };
    
    const handleFriendRequestAccepted = (data) => {
      if (data.request?.sender_id === user?.id && data.request?.receiver_id === userId) {
        setFriendStatus('friends');
        setCanMessage(true);
        Alert.alert('Friend Request Accepted', `You are now friends with ${profileData?.name}!`);
      }
    };
    
    const handleUnfriended = (data) => {
      if (data.unfriendedBy === userId) {
        setFriendStatus('none');
        setCanMessage(false);
        Alert.alert('Unfriended', `${profileData?.name} removed you as a friend.`);
      }
    };
    
    socket.on('friend:request:cancelled', handleFriendRequestCancelled);
    socket.on('friend:request:accepted', handleFriendRequestAccepted);
    socket.on('friend:unfriended', handleUnfriended);
    
    return () => {
      socket.off('friend:request:cancelled', handleFriendRequestCancelled);
      socket.off('friend:request:accepted', handleFriendRequestAccepted);
      socket.off('friend:unfriended', handleUnfriended);
    };
  }, [userId, token]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  // Action handlers
  const handleMessagePress = async () => {
    if (!token || !userId) return;
    
    if (canMessage || friendStatus === 'friends') {
      router.push(`/secure/chat-conversation?recipientId=${userId}&name=${encodeURIComponent(profileData?.name || '')}&avatar=${encodeURIComponent(profileData?.avatar || '')}`);
    } else {
      await handleSendFriendRequest();
    }
  };

  const handleSendFriendRequest = async () => {
    if (!token || !userId || friendStatus === 'sending') return;
    
    try {
      setFriendStatus('sending');
      await FriendRequestService.sendFriendRequest(userId, token);
      setFriendStatus('pending_sent');
      Alert.alert('Friend Request Sent', `Friend request sent to ${profileData?.name}!`);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setFriendStatus('none');
      
      let errorMessage = 'Failed to send friend request. Please try again.';
      if (error.message.includes('already sent')) {
        errorMessage = 'Friend request already sent to this user.';
        setFriendStatus('pending_sent');
      } else if (error.message.includes('already friends')) {
        errorMessage = 'You are already friends with this user.';
        setFriendStatus('friends');
        setCanMessage(true);
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!token || !userId || friendStatus === 'cancelling') return;
    
    try {
      setFriendStatus('cancelling');
      await FriendRequestService.cancelFriendRequest(userId, token);
      setFriendStatus('none');
      Alert.alert('Request Cancelled', `Friend request to ${profileData?.name} has been cancelled.`);
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      setFriendStatus('pending_sent');
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!token || !friendRequestId || friendStatus === 'accepting') return;
    
    try {
      setFriendStatus('accepting');
      await FriendRequestService.acceptFriendRequest(friendRequestId, token);
      setFriendStatus('friends');
      setCanMessage(true);
      setFriendRequestId(null);
      Alert.alert('Success', `You are now friends with ${profileData?.name}!`);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      setFriendStatus('pending_received');
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!token || !friendRequestId || friendStatus === 'declining') return;
    
    try {
      setFriendStatus('declining');
      await FriendRequestService.declineFriendRequest(friendRequestId, token);
      setFriendStatus('none');
      setFriendRequestId(null);
      Alert.alert('Request Declined', `You declined the friend request from ${profileData?.name}.`);
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      setFriendStatus('pending_received');
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  const handleUnfriend = async () => {
    if (!token || !userId || friendStatus === 'unfriending') return;
    
    try {
      setFriendStatus('unfriending');
      await FriendRequestService.unfriendUser(userId, token);
      setFriendStatus('none');
      setCanMessage(false);
      setShowUnfriendConfirm(false);
      Alert.alert('Friend Removed', `You are no longer friends with ${profileData?.name}.`);
    } catch (error) {
      console.error('Failed to unfriend:', error);
      setFriendStatus('friends');
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    if (!token || !userId) return;
    
    try {
      await friendsApi.blockUser(userId, 'Blocked by user', token);
      setBlockStatus({ isBlocked: true, isBlockedBy: false });
      setFriendStatus('none');
      setCanMessage(false);
      setShowBlockConfirm(false);
      Alert.alert('User Blocked', `${profileData?.name} has been blocked.`);
    } catch (error) {
      console.error('Failed to block user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const handleUnblockUser = async () => {
    if (!token || !userId) return;
    
    try {
      await friendsApi.unblockUser(userId, token);
      setBlockStatus({ isBlocked: false, isBlockedBy: false });
      Alert.alert('User Unblocked', `${profileData?.name} has been unblocked.`);
      await loadFriendStatus();
    } catch (error) {
      console.error('Failed to unblock user:', error);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    }
  };

  const handleReportUser = async () => {
    if (!reportType || !reportReason.trim()) {
      Alert.alert('Error', 'Please select a report type and provide a reason');
      return;
    }

    try {
      const { API_BASE_URL } = await import('@/src/api/config');
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportedUserId: userId,
          reportType,
          reason: reportReason,
        }),
      });

      if (response.ok) {
        setShowReportModal(false);
        setReportType('');
        setReportReason('');
        Alert.alert('Report Submitted', 'Thank you for your report. Our team will review it shortly.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.message || 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('Failed to report user:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
    
    setShowReportModal(false);
    setReportType('');
    setReportReason('');
  };

  const getAddFriendButtonText = () => {
    if (blockStatus.isBlocked) return 'Blocked';
    if (blockStatus.isBlockedBy) return 'Blocked You';
    if (friendStatus === 'friends') return 'Unfriend';
    if (friendStatus === 'pending_sent') return 'Cancel Request';
    if (friendStatus === 'pending_received') return 'Accept Request';
    if (friendStatus === 'cancelling') return 'Cancelling...';
    if (friendStatus === 'accepting') return 'Accepting...';
    if (friendStatus === 'declining') return 'Declining...';
    if (friendStatus === 'sending') return 'Sending...';
    return 'Add Friend';
  };

  // Display values
  const displayName = profileData?.name || 'User';
  const displayAge = profileData?.age ? `${profileData.age}` : null;
  const displayGender = profileData?.gender || null;
  const userInterests = profileData?.interests || [];
  const userNeeds = Array.isArray(profileData?.needs) ? profileData.needs : [];

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textPrimary,
    },
    profileCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    username: {
      fontSize: 16,
      color: theme.textTertiary,
      marginTop: 4,
    },
    metaText: {
      fontSize: 14,
      color: theme.textTertiary,
    },
    bio: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
      marginTop: 4,
    },
    statsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 12,
    },
    interestsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    interestChip: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    interestText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    photosCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: theme.border,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.border,
    },
    avatarText: {
      fontSize: 40,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: profileData?.isOnline ? theme.success : '#999',
      borderWidth: 3,
      borderColor: theme.surface,
    },
  };

  // Loading state
  if (loading) {
    return (
      <View style={[dynamicStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Background */}
      <LinearGradient
        colors={[theme.background, theme.backgroundSecondary]}
        style={styles.background}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Profile Card */}
          <View style={dynamicStyles.profileCard}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {profileData?.avatar ? (
                  <Image
                    source={{ uri: profileData.avatar }}
                    style={dynamicStyles.avatarImage}
                  />
                ) : (
                  <View style={dynamicStyles.avatarPlaceholder}>
                    <Text style={dynamicStyles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={dynamicStyles.onlineIndicator} />
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={dynamicStyles.profileName}>{displayName}</Text>
                {profileData?.verification_status === 'verified' && (
                  <VerifiedBadge size={20} />
                )}
              </View>
            
              {profileData?.username && (
                <Text style={dynamicStyles.username}>@{profileData.username}</Text>
              )}

              {(displayAge || displayGender) && (
                <View style={styles.metaRow}>
                  {displayAge && <Text style={dynamicStyles.metaText}>{displayAge} years old</Text>}
                  {displayAge && displayGender && <Text style={styles.metaDot}>•</Text>}
                  {displayGender && <Text style={dynamicStyles.metaText}>{displayGender}</Text>}
                </View>
              )}

              <Text style={[dynamicStyles.metaText, { marginTop: 4 }]}>
                {profileData?.isOnline ? 'Active now' : profileData?.lastSeen}
              </Text>

              {profileData?.bio && (
                <Text style={dynamicStyles.bio}>{profileData.bio}</Text>
              )}
            </View>

            {/* Action Buttons */}
            {userId !== user?.id && !blockStatus.isBlockedBy && (
              <View style={styles.actionButtonsRow}>
                {/* Message Button - Only show if friends */}
                {friendStatus === 'friends' && (
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={handleMessagePress}
                  >
                    <LinearGradient
                      colors={['#FF6FB5', '#A16AE8']}
                      style={styles.messageButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="chatbubble" size={18} color="white" />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Friend Action Button */}
                {!blockStatus.isBlocked && (
                  <>
                    {friendStatus === 'pending_received' ? (
                      <View style={styles.requestButtonsContainer}>
                        <TouchableOpacity 
                          style={styles.acceptButton}
                          onPress={handleAcceptFriendRequest}
                        >
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={styles.declineButton}
                          onPress={handleDeclineFriendRequest}
                        >
                          <Ionicons name="close" size={18} color="#FF4444" />
                          <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[
                          styles.friendButton,
                          friendStatus === 'friends' && styles.friendButtonActive,
                          friendStatus === 'pending_sent' && styles.friendButtonPending
                        ]}
                        onPress={
                          friendStatus === 'friends' 
                            ? () => setShowUnfriendConfirm(true)
                            : friendStatus === 'pending_sent'
                              ? handleCancelFriendRequest
                              : handleSendFriendRequest
                        }
                      >
                        <Ionicons 
                          name={
                            friendStatus === 'friends' ? "person-remove-outline" : 
                            friendStatus === 'pending_sent' ? "close-outline" : 
                            "person-add-outline"
                          } 
                          size={18} 
                          color={
                            friendStatus === 'friends' ? "#FF6B6B" : 
                            friendStatus === 'pending_sent' ? "#FF4444" : 
                            "#7C2B86"
                          } 
                        />
                        <Text style={[
                          styles.friendButtonText,
                          friendStatus === 'friends' && styles.friendButtonTextActive,
                          friendStatus === 'pending_sent' && styles.friendButtonTextPending
                        ]}>
                          {getAddFriendButtonText()}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Photo Gallery */}
          {userPhotos.length > 0 && (
            <View style={dynamicStyles.photosCard}>
              <View style={styles.photoSectionHeader}>
                <View style={styles.photoTitleRow}>
                  <Ionicons name="images" size={20} color={theme.primary} />
                  <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>Photos</Text>
                </View>
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>{userPhotos.length}</Text>
                </View>
              </View>
              <View style={styles.photoGrid}>
                {userPhotos.map((photo, index) => {
                  const photoUrl = photo.photo_url || photo.url || photo.image_url;
                  if (!photoUrl) return null;
                  
                  return (
                    <TouchableOpacity
                      key={photo.id || index}
                      style={styles.photoItem}
                      onPress={() => {
                        setSelectedPhotoIndex(index);
                        setShowPhotoViewer(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: photoUrl }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={styles.photoOverlay}
                      >
                        <View style={styles.photoNumberBadge}>
                          <Text style={styles.photoNumberText}>{index + 1}</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Interests Section */}
          {userInterests.length > 0 && (
            <View style={dynamicStyles.interestsCard}>
              <Text style={dynamicStyles.sectionTitle}>Interests</Text>
              <View style={styles.interestsGrid}>
                {(showAllInterests ? userInterests : userInterests.slice(0, 8)).map((interest, index) => (
                  <View key={index} style={dynamicStyles.interestChip}>
                    <Text style={dynamicStyles.interestText}>{interest}</Text>
                  </View>
                ))}
                {!showAllInterests && userInterests.length > 8 && (
                  <TouchableOpacity
                    style={styles.moreInterestsChip}
                    onPress={() => setShowAllInterests(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.moreInterestsText}>+{userInterests.length - 8} more</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Needs Section */}
          {userNeeds.length > 0 && (
            <View style={dynamicStyles.interestsCard}>
              <Text style={dynamicStyles.sectionTitle}>Needs</Text>
              <View style={styles.interestsGrid}>
                {userNeeds.slice(0, 8).map((need, index) => (
                  <View key={index} style={dynamicStyles.interestChip}>
                    <Text style={dynamicStyles.interestText}>{need}</Text>
                  </View>
                ))}
                {userNeeds.length > 8 && (
                  <View style={styles.moreInterestsChip}>
                    <Text style={styles.moreInterestsText}>+{userNeeds.length - 8} more</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Spotify Profile */}
          {spotifyData && (
            <SpotifyProfile
              spotifyData={spotifyData}
              isExpanded={false}
              onToggle={() => {}}
            />
          )}

          {/* Social Accounts */}
          <View style={dynamicStyles.interestsCard}>
            <LinkedSocialAccounts 
              userId={userId} 
              isOwnProfile={false}
              onUpgradeRequest={() => {
                router.push('/secure/subscription');
              }}
            />
          </View>

          {/* Info Section */}
          <View style={dynamicStyles.interestsCard}>
            <Text style={dynamicStyles.sectionTitle}>Info</Text>
            {profileData?.location && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={16} color={theme.primary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>{profileData.location}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>{profileData?.joinedDate}</Text>
            </View>
          </View>

          {/* Block/Report Section */}
          {userId !== user?.id && !blockStatus.isBlockedBy && (
            <View style={styles.blockSection}>
              {blockStatus.isBlocked ? (
                <TouchableOpacity 
                  style={styles.unblockButton}
                  onPress={handleUnblockUser}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#00AA55" />
                  <Text style={styles.unblockButtonText}>Unblock {displayName}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.blockButton}
                    onPress={() => setShowBlockConfirm(true)}
                  >
                    <Ionicons name="ban-outline" size={18} color="#FF4444" />
                    <Text style={styles.blockButtonText}>Block User</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.reportButton}
                    onPress={() => setShowReportModal(true)}
                  >
                    <Ionicons name="flag-outline" size={18} color="#FF9800" />
                    <Text style={styles.reportButtonText}>Report User</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Block Confirmation Modal */}
      <Modal
        visible={showBlockConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockConfirm(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text style={styles.popupTitle}>Block {displayName}?</Text>
            <Text style={styles.popupMessage}>
              They won't be able to message you or see your activity.
            </Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity 
                style={styles.popupCancelButton}
                onPress={() => setShowBlockConfirm(false)}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.popupActionButton, styles.popupBlockButton]}
                onPress={handleBlockUser}
              >
                <Text style={styles.popupActionText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unfriend Confirmation Modal */}
      <Modal
        visible={showUnfriendConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnfriendConfirm(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <Text style={styles.popupTitle}>Remove {displayName} as friend?</Text>
            <Text style={styles.popupMessage}>
              You'll no longer be able to message each other.
            </Text>
            <View style={styles.popupButtons}>
              <TouchableOpacity 
                style={styles.popupCancelButton}
                onPress={() => setShowUnfriendConfirm(false)}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.popupActionButton, styles.popupUnfriendButton]}
                onPress={handleUnfriend}
              >
                <Text style={styles.popupActionText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report User Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={[styles.popupContainer, styles.reportPopupContainer]}>
            <Text style={styles.popupTitle}>Report {displayName}</Text>
            <Text style={styles.popupSubtitle}>Please select a reason:</Text>
            
            <ScrollView style={styles.reportScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.reportTypes}>
                {['harassment', 'spam', 'inappropriate_content', 'fake_profile', 'underage', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.reportTypeButton, reportType === type && styles.reportTypeButtonActive]}
                    onPress={() => setReportType(type)}
                  >
                    <Text style={[styles.reportTypeText, reportType === type && styles.reportTypeTextActive]}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reportReasonInput}
                placeholder="Please provide additional details..."
                placeholderTextColor="#999"
                value={reportReason}
                onChangeText={setReportReason}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <View style={styles.popupButtons}>
              <TouchableOpacity 
                style={styles.popupCancelButton}
                onPress={() => {
                  setShowReportModal(false);
                  setReportType('');
                  setReportReason('');
                }}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.popupActionButton, styles.popupReportButton]}
                onPress={handleReportUser}
              >
                <Text style={styles.popupActionText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={showPhotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
        statusBarTranslucent
      >
        <View style={styles.photoViewerContainer}>
          {/* Header with close button and counter */}
          <View style={styles.photoViewerHeader}>
            <TouchableOpacity 
              style={styles.photoViewerCloseButton}
              onPress={() => setShowPhotoViewer(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.photoViewerCounter}>
              <Text style={styles.photoViewerCounterText}>
                {selectedPhotoIndex + 1} / {userPhotos.length}
              </Text>
            </View>
            
            <View style={{ width: 44 }} />
          </View>
          
          {/* Photo Slider */}
          <ScrollView
            ref={photoScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            decelerationRate="fast"
            contentOffset={{ x: selectedPhotoIndex * screenWidth, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              if (index >= 0 && index < userPhotos.length) {
                setSelectedPhotoIndex(index);
              }
            }}
            style={styles.photoViewerScrollView}
          >
            {userPhotos.map((photo, index) => {
              const photoUrl = photo.photo_url || photo.url || photo.image_url;
              return (
                <Pressable 
                  key={index} 
                  style={[styles.photoViewerImageContainer, { width: screenWidth }]}
                  onPress={() => setShowPhotoViewer(false)}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photoViewerImage}
                    resizeMode="contain"
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          
          {/* Navigation arrows for web/larger screens */}
          {userPhotos.length > 1 && (
            <>
              {selectedPhotoIndex > 0 && (
                <TouchableOpacity 
                  style={[styles.photoNavButton, styles.photoNavButtonLeft]}
                  onPress={() => {
                    const newIndex = selectedPhotoIndex - 1;
                    setSelectedPhotoIndex(newIndex);
                    photoScrollViewRef.current?.scrollTo({
                      x: newIndex * screenWidth,
                      y: 0,
                      animated: true,
                    });
                  }}
                >
                  <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              {selectedPhotoIndex < userPhotos.length - 1 && (
                <TouchableOpacity 
                  style={[styles.photoNavButton, styles.photoNavButtonRight]}
                  onPress={() => {
                    const newIndex = selectedPhotoIndex + 1;
                    setSelectedPhotoIndex(newIndex);
                    photoScrollViewRef.current?.scrollTo({
                      x: newIndex * screenWidth,
                      y: 0,
                      animated: true,
                    });
                  }}
                >
                  <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </>
          )}
          
          {/* Dot indicators */}
          {userPhotos.length > 1 && (
            <View style={styles.photoDotsContainer}>
              {userPhotos.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.photoDot,
                    index === selectedPhotoIndex && styles.photoDotActive
                  ]}
                  onPress={() => {
                    setSelectedPhotoIndex(index);
                    photoScrollViewRef.current?.scrollTo({
                      x: index * screenWidth,
                      y: 0,
                      animated: true,
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaDot: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  messageButton: {
    flex: 1,
    maxWidth: 170,
    borderRadius: 999,
    overflow: 'hidden',
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    gap: 8,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  friendButton: {
    flex: 1,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.55)',
    gap: 8,
  },
  friendButtonActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderColor: 'rgba(248, 113, 113, 0.65)',
  },
  friendButtonPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.65)',
  },
  friendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  friendButtonTextActive: {
    color: '#F97373',
  },
  friendButtonTextPending: {
    color: '#FBBF24',
  },
  requestButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#16A34A',
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.6)',
    gap: 6,
  },
  declineButtonText: {
    color: '#F97373',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  photoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountBadge: {
    backgroundColor: '#7C2B86',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: (Dimensions.get('window').width - 72) / 3,
    height: (Dimensions.get('window').width - 72) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 6,
  },
  photoNumberBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moreInterestsChip: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  moreInterestsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
  },
  blockSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    paddingVertical: 16,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  blockButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
  },
  unblockButtonText: {
    color: '#00AA55',
    fontSize: 14,
    fontWeight: '500',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
  },
  reportButtonText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '500',
  },
  // Popup styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    width: '100%',
    maxWidth: 340,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  popupMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  popupCancelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  popupCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  popupActionButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    alignItems: 'center',
  },
  popupBlockButton: {
    backgroundColor: '#FF4444',
  },
  popupUnfriendButton: {
    backgroundColor: '#FF6B6B',
  },
  popupReportButton: {
    backgroundColor: '#FF9800',
  },
  popupActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportPopupContainer: {
    maxHeight: '80%',
  },
  reportScrollView: {
    maxHeight: 260,
    marginTop: 8,
  },
  reportTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  reportTypeButton: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportTypeButtonActive: {
    backgroundColor: '#7C2B86',
    borderColor: '#7C2B86',
  },
  reportTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  reportTypeTextActive: {
    color: '#FFFFFF',
  },
  reportReasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Photo viewer styles
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
  },
  photoViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  photoViewerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoViewerCounterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  photoViewerScrollView: {
    flex: 1,
  },
  photoViewerImageContainer: {
    height: Dimensions.get('window').height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: '100%',
    height: '100%',
  },
  photoNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoNavButtonLeft: {
    left: 16,
  },
  photoNavButtonRight: {
    right: 16,
  },
  photoDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  photoDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
