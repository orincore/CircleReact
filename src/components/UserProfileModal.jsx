import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { friendsApi } from '@/src/api/friends';
import { FriendRequestService } from '@/src/services/FriendRequestService';
import { getSocket } from '@/src/api/socket';
import { router } from 'expo-router';
import LinkedSocialAccounts from './LinkedSocialAccounts';
import SpotifyProfile from './SpotifyProfile';

export default function UserProfileModal({ 
  visible, 
  onClose, 
  userId,
  userName,
  userAvatar
}) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState('none');
  const [canMessage, setCanMessage] = useState(false);
  const [messagePermission, setMessagePermission] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [spotifyData, setSpotifyData] = useState(null);
  const [spotifyExpanded, setSpotifyExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  useEffect(() => {
    if (visible && userId) {
      console.log('UserProfileModal opened for user:', userId);
      console.log('User name:', userName);
      console.log('User avatar:', userAvatar);
      console.log('Modal visible:', visible);
      console.log('Current logged-in user:', user?.id);
      loadUserProfile();
      
      // Set up socket listeners for cancelled requests
      if (token) {
        const socket = getSocket(token);
        
        // Listen for friend request cancellations
        const handleFriendRequestCancelled = (data) => {
          console.log('Friend request cancelled:', data);
          if (data.cancelledBy === userId) {
            // The user we're viewing cancelled their request to us
            setFriendStatus('none');
            Alert.alert('Request Cancelled', `${userName} cancelled their friend request.`);
          }
        };
        
        // Listen for message request cancellations
        const handleMessageRequestCancelled = (data) => {
          console.log('Message request cancelled:', data);
          if (data.cancelledBy === userId) {
            // The user we're viewing cancelled their message request to us
            setCanMessage(false);
            setMessagePermission(null);
            Alert.alert('Request Cancelled', `${userName} cancelled their message request.`);
          }
        };

        // Listen for friend request acceptance (when the user we're viewing accepts our request)
        const handleFriendRequestAccepted = (data) => {
          console.log('Friend request accepted (they accepted our request):', data);
          if (data.request && data.request.sender_id === user?.id && data.request.receiver_id === userId) {
            // The user we're viewing accepted our request to them
            setCanMessage(true);
            Alert.alert('Friend Request Accepted', `You are now friends with ${userName}!`);
          }
        };

        // Listen for friend request accept confirmation (when we accept someone's request)
        const handleFriendRequestAcceptConfirmed = (data) => {
          console.log('Friend request accept confirmed (we accepted their request):', data);
          if (data.request && data.request.sender_id === userId && data.request.receiver_id === user?.id) {
            // We accepted the request from the user we're viewing
            setFriendStatus('friends');
            setCanMessage(true);
            Alert.alert('Friend Request Accepted', `You are now friends with ${userName}!`);
          }
        };

        // Listen for when we get unfriended by someone
        const handleUnfriended = (data) => {
          console.log('Unfriended by user:', data);
          if (data.unfriendedBy === userId) {
            // The user we're viewing unfriended us
            setFriendStatus('none');
            setCanMessage(false);
            setMessagePermission(null);
            Alert.alert('Unfriended', `${userName} removed you as a friend. You can no longer message each other.`);
          }
        };
        
        socket.on('friend:request:cancelled', handleFriendRequestCancelled);
        socket.on('message:request:cancelled', handleMessageRequestCancelled);
        socket.on('friend:request:accepted', handleFriendRequestAccepted);
        socket.on('friend:request:accept:confirmed', handleFriendRequestAcceptConfirmed);
        socket.on('friend:unfriended', handleUnfriended);
        
        // Cleanup listeners when modal closes
        return () => {
          socket.off('friend:request:cancelled', handleFriendRequestCancelled);
          socket.off('message:request:cancelled', handleMessageRequestCancelled);
          socket.off('friend:request:accepted', handleFriendRequestAccepted);
          socket.off('friend:request:accept:confirmed', handleFriendRequestAcceptConfirmed);
          socket.off('friend:unfriended', handleUnfriended);
        };
      }
    } else {
      console.log('UserProfileModal not opening - visible:', visible, 'userId:', userId);
    }
  }, [visible, userId, token, userName, user?.id]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      // Record profile visit for Circle stats (only if viewing someone else's profile)
      if (userId && user?.id && userId !== user.id) {
        try {
          const { circleStatsApi } = await import('@/src/api/circle-stats');
          await circleStatsApi.recordProfileVisit(userId, token);
          console.log('✅ Profile visit recorded for user:', userId);
          
          // Send profile visit notification to the profile owner
          try {
            const socket = getSocket(token);
            socket.emit('profile:visit', {
              profileOwnerId: userId,
              visitorId: user.id,
              visitorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Someone'
            });
            console.log('✅ Profile visit notification sent');
          } catch (notificationError) {
            console.log('❌ Failed to send profile visit notification:', notificationError);
          }
        } catch (visitError) {
          console.log('❌ Failed to record profile visit:', visitError);
        }
      }
      
      // Fetch actual user profile data from the backend
      let actualUserData = null;
      try {
        const { exploreApi } = await import('@/src/api/explore');
        
        // Try the direct user profile endpoint first
        try {
          const result = await exploreApi.getUserProfile(userId, token);
          if (result.user) {
            actualUserData = result.user;
            console.log('Fetched actual user data via profile endpoint:', actualUserData);
          }
        } catch (profileError) {
          console.log('Profile endpoint failed, trying search fallback:', profileError);
          
          // Fallback: try to find user via search by ID
          try {
            const searchResult = await exploreApi.searchUsers(userId, 1, token);
            if (searchResult.users && searchResult.users.length > 0) {
              const foundUser = searchResult.users.find(u => u.id === userId);
              if (foundUser) {
                actualUserData = foundUser;
                console.log('Fetched actual user data via search fallback:', actualUserData);
              }
            }
          } catch (searchError) {
            console.log('Search fallback also failed:', searchError);
            
            // Final fallback: try to find user in explore sections
            try {
              const sectionsResult = await exploreApi.getAllSections(token);
              const allUsers = [
                ...(sectionsResult.topUsers || []),
                ...(sectionsResult.newUsers || []),
                ...(sectionsResult.compatibleUsers || [])
              ];
              const foundUser = allUsers.find(u => u.id === userId);
              if (foundUser) {
                actualUserData = foundUser;
                console.log('Fetched actual user data via sections fallback:', actualUserData);
              }
            } catch (sectionsError) {
              console.log('Sections fallback also failed:', sectionsError);
              
              // Last resort: try to get user from friends list
              try {
                const { friendsApi } = await import('@/src/api/friends');
                const friendsResult = await friendsApi.getFriendsList(token);
                if (friendsResult.friends && friendsResult.friends.length > 0) {
                  const foundFriend = friendsResult.friends.find(f => f.id === userId);
                  if (foundFriend) {
                    // Convert friend data to user data format
                    actualUserData = {
                      id: foundFriend.id,
                      name: foundFriend.name,
                      username: foundFriend.username || foundFriend.name, // Use name as fallback
                      profilePhoto: foundFriend.profile_photo_url,
                      email: foundFriend.email,
                      interests: [],
                      needs: [],
                      isOnline: false,
                      joinedDate: foundFriend.created_at
                    };
                    console.log('Fetched actual user data via friends fallback:', actualUserData);
                  }
                }
              } catch (friendsError) {
                console.log('Friends fallback also failed:', friendsError);
              }
            }
          }
        }
      } catch (error) {
        console.log('Failed to fetch user profile:', error);
      }

      // Create profile data using actual data if available, otherwise use provided props
      const profileData = {
        id: userId,
        name: actualUserData?.name || userName || 'User',
        username: actualUserData?.username ? `@${actualUserData.username}` : (userName ? `@${userName}` : '@user'),
        avatar: actualUserData?.profilePhoto || userAvatar,
        bio: actualUserData?.about || 'No bio available',
        location: 'Location not specified',
        joinedDate: actualUserData?.joinedDate ? `Joined ${new Date(actualUserData.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Recently joined',
        stats: {
          chats: Math.floor(Math.random() * 50) + 10,
          friends: Math.floor(Math.random() * 200) + 50,
          photos: Math.floor(Math.random() * 100) + 20
        },
        interests: actualUserData?.interests || ['Photography', 'Travel', 'Coffee', 'Art', 'Music'],
        isOnline: actualUserData?.isOnline || Math.random() > 0.5,
        lastSeen: actualUserData?.isOnline ? 'Active now' : 'Last seen recently'
      };
      
      console.log('Profile data created:', profileData);
      console.log('Actual user data from API:', actualUserData);
      setProfileData(profileData);
      
      // Load Spotify data
      await loadSpotifyData();
      
      // Load friend status and message permissions
      await loadFriendStatus();
      await loadBlockStatus();
      
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setLoading(false);
      // Set fallback data even on error
      setProfileData({
        id: userId,
        name: userName || 'User',
        username: userName ? `@${userName}` : '@user',
        avatar: userAvatar,
        bio: 'No bio available',
        location: 'Location not specified',
        joinedDate: 'Recently joined',
        stats: {
          chats: 0,
          friends: 0,
          photos: 0
        },
        interests: [],
        isOnline: false,
        lastSeen: 'Last seen recently'
      });
    }
  };

  const loadFriendStatus = async () => {
    if (!token || !userId || userId === user?.id) return;
    
    try {
      console.log('Loading friend status for user:', userId);
      console.log('Current user:', user?.id);
      
      // Use socket-based approach for consistency
      const socket = getSocket(token);
      
      // Set up listeners for friend status response
      const handleStatusResponse = (data) => {
        console.log('Friend status response:', data);
        socket.off('friend:status:response', handleStatusResponse);
        
        if (data.error) {
          console.error('Friend status error:', data.error);
          setFriendStatus('none');
          setCanMessage(false);
        } else {
          console.log('Setting friendStatus to:', data.status);
          setFriendStatus(data.status);
          
          // Set message permissions based on friend status
          if (data.status === 'friends') {
            setCanMessage(true);
          } else {
            setCanMessage(false);
          }
        }
      };
      
      socket.on('friend:status:response', handleStatusResponse);
      
      // Request friend status
      socket.emit('friend:status:get', { userId });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        socket.off('friend:status:response', handleStatusResponse);
      }, 5000);
      
    } catch (error) {
      console.error('Failed to load friend status:', error);
      // Set default status on error
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
      console.log('Loading Spotify data for user:', userId);
      const { socialAccountsApi } = await import('@/src/api/social-accounts');
      const response = await socialAccountsApi.getUserLinkedAccounts(userId, token);
      
      if (response.accounts) {
        const spotifyAccount = response.accounts.find(account => account.platform === 'spotify');
        if (spotifyAccount) {
          console.log('Found Spotify account:', spotifyAccount);
          setSpotifyData(spotifyAccount);
        } else {
          console.log('No Spotify account found for user');
          setSpotifyData(null);
        }
      }
    } catch (error) {
      console.error('Failed to load Spotify data:', error);
      setSpotifyData(null);
    }
  };

  const handleMessagePress = async () => {
    if (!token || !userId) return;
    
    try {
      if (canMessage) {
        // If they can message, navigate to chat
        if (messagePermission?.chatId) {
          // Existing chat
          router.push(`/secure/chat/${messagePermission.chatId}?name=${encodeURIComponent(userName)}&avatar=${encodeURIComponent(userAvatar || '')}`);
        } else {
          // Create new chat
          router.push(`/secure/chat/${userId}?name=${encodeURIComponent(userName)}&avatar=${encodeURIComponent(userAvatar || '')}`);
        }
        onClose();
      } else {
        // Send friend request first
        await handleSendFriendRequest();
      }
    } catch (error) {
      console.error('Failed to handle message press:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!token || !userId) return;
    
    console.log('Sending friend request to userId:', userId);
    console.log('Current user:', user?.id);
    
    try {
      // Use Socket.IO instead of API
      const socket = getSocket(token);
      socket.emit('friend:request:send', { receiverId: userId });
      
      // Optimistically update UI
      setFriendStatus('pending');
      
      // Set up listeners for response
      const handleSent = (data) => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        if (data.success) {
          Alert.alert('Friend Request Sent', `Friend request sent to ${userName}!`);
        }
      };
      
      const handleError = (error) => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        setFriendStatus('none'); // Revert optimistic update
        Alert.alert('Error', error.error || 'Failed to send friend request. Please try again.');
      };
      
      // Listen for responses
      socket.on('friend:request:sent', handleSent);
      socket.on('friend:request:error', handleError);
      
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setFriendStatus('none'); // Revert optimistic update
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!token || !userId) return;
    
    console.log('Cancelling friend request to userId:', userId);
    
    try {
      const result = await FriendRequestService.cancelFriendRequest(userId, token);
      if (result.success) {
        setFriendStatus('none');
        Alert.alert('Request Cancelled', `Friend request to ${userName} has been cancelled.`);
      }
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    }
  };

  const handleCancelMessageRequest = async () => {
    if (!token || !userId) return;
    
    console.log('Cancelling message request to userId:', userId);
    
    try {
      const result = await FriendRequestService.cancelMessageRequest(userId, token);
      if (result.success) {
        setCanMessage(false);
        setMessagePermission(null);
        Alert.alert('Request Cancelled', `Message request to ${userName} has been cancelled.`);
      }
    } catch (error) {
      console.error('Failed to cancel message request:', error);
      Alert.alert('Error', 'Failed to cancel message request. Please try again.');
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
      Alert.alert('User Blocked', `${userName} has been blocked. They will no longer be able to contact you.`);
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
      Alert.alert('User Unblocked', `${userName} has been unblocked.`);
      // Reload statuses
      await loadFriendStatus();
    } catch (error) {
      console.error('Failed to unblock user:', error);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    }
  };

  const handleUnfriend = async () => {
    if (!token || !userId) return;
    
    try {
      const socket = getSocket(token);
      
      // Set up listeners for unfriend response
      const handleUnfriendConfirmed = (data) => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleUnfriendError);
        
        if (data.success) {
          setFriendStatus('none');
          setCanMessage(false);
          setMessagePermission(null);
          setShowUnfriendConfirm(false);
          Alert.alert('Friend Removed', `You are no longer friends with ${userName}. You can no longer message each other.`);
        }
      };
      
      const handleUnfriendError = (error) => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleUnfriendError);
        Alert.alert('Error', error.error || 'Failed to remove friend. Please try again.');
      };
      
      socket.on('friend:unfriend:confirmed', handleUnfriendConfirmed);
      socket.on('friend:unfriend:error', handleUnfriendError);
      
      // Send unfriend request
      socket.emit('friend:unfriend', { userId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:unfriend:confirmed', handleUnfriendConfirmed);
        socket.off('friend:unfriend:error', handleUnfriendError);
      }, 10000);
      
    } catch (error) {
      console.error('Failed to remove friend:', error);
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    }
  };

  const getAddFriendButtonText = () => {
    if (userId === user?.id) return 'Settings';
    if (blockStatus.isBlocked) return 'Blocked';
    if (blockStatus.isBlockedBy) return 'Blocked You';
    if (friendStatus === 'friends') return 'Friends ✓';
    if (friendStatus === 'pending') return 'Cancel Request';
    return 'Add Friend';
  };

  // Get message button text based on current status
  const getMessageButtonText = () => {
    if (userId === user?.id) return 'Edit Profile';
    if (blockStatus.isBlocked) return 'Blocked';
    if (blockStatus.isBlockedBy) return 'Blocked';
    if (canMessage) return 'Message';
    if (friendStatus === 'pending') return 'Request Sent';
    if (friendStatus === 'friends') return 'Message';
    if (messagePermission?.hasPendingRequest) return 'Cancel Request';
    return 'Send Request';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.modal}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {Platform.OS !== 'web' && (
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFillObject} />
            )}
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#7C2B86" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C2B86" />
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : profileData ? (
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Test element to ensure rendering */}
                <Text style={{ color: '#FF0000', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
                </Text>
                
                {/* Avatar and Basic Info */}
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    {profileData.avatar ? (
                      <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
                    ) : (
                      <LinearGradient
                        colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
                        style={styles.avatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.avatarText}>
                          {profileData.name.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                    )}
                    
                    {/* Online Status */}
                    <View style={[
                      styles.onlineIndicator, 
                      { backgroundColor: profileData.isOnline ? '#00FF94' : '#999' }
                    ]} />
                  </View>
                  
                  <Text style={styles.name}>{profileData.name}</Text>
                  <Text style={styles.username}>{profileData.username}</Text>
                  <Text style={styles.lastSeen}>{profileData.lastSeen}</Text>
                </View>

                {/* Bio */}
                {profileData.bio && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bio}>{profileData.bio}</Text>
                  </View>
                )}

                {/* Stats */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Stats</Text>
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{profileData.stats.chats}</Text>
                      <Text style={styles.statLabel}>Chats</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{profileData.stats.friends}</Text>
                      <Text style={styles.statLabel}>Friends</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{profileData.stats.photos}</Text>
                      <Text style={styles.statLabel}>Photos</Text>
                    </View>
                  </View>
                </View>

                {/* Interests */}
                {profileData.interests && profileData.interests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Interests</Text>
                    <View style={styles.interestsContainer}>
                      {profileData.interests.map((interest, index) => (
                        <View key={index} style={styles.interestTag}>
                          <Text style={styles.interestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Spotify Profile */}
                {spotifyData && (
                  <SpotifyProfile
                    spotifyData={spotifyData}
                    isExpanded={spotifyExpanded}
                    onToggle={() => setSpotifyExpanded(!spotifyExpanded)}
                  />
                )}

                {/* Social Accounts */}
                <View style={styles.section}>
                  <LinkedSocialAccounts 
                    userId={userId} 
                    isOwnProfile={userId === user?.id} 
                  />
                </View>

                {/* Additional Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Info</Text>
                  {profileData.location && (
                    <View style={styles.infoItem}>
                      <Ionicons name="location-outline" size={16} color="#7C2B86" />
                      <Text style={styles.infoText}>{profileData.location}</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={16} color="#7C2B86" />
                    <Text style={styles.infoText}>{profileData.joinedDate}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {/* Only show message button for own profile (Edit Profile) */}
                  {userId === user?.id && (
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleMessagePress}
                    >
                      <LinearGradient
                        colors={['#FF6FB5', '#A16AE8']}
                        style={styles.actionButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons 
                          name="create-outline" 
                          size={20} 
                          color="white" 
                        />
                        <Text style={styles.actionButtonText}>Edit Profile</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  {userId !== user?.id && !blockStatus.isBlockedBy && (
                    <>
                      {/* Friend/Add Friend Button */}
                      {!blockStatus.isBlocked && (
                        <TouchableOpacity 
                          style={[
                            styles.actionButtonSecondary,
                            friendStatus === 'friends' && styles.actionButtonFriends,
                            friendStatus === 'pending' && styles.actionButtonCancel
                          ]} 
                          onPress={
                            friendStatus === 'friends' 
                              ? () => setShowUnfriendConfirm(true)
                              : friendStatus === 'pending'
                                ? handleCancelFriendRequest
                                : handleSendFriendRequest
                          }
                        >
                          <Ionicons 
                            name={
                              friendStatus === 'friends' ? "checkmark-circle" : 
                              friendStatus === 'pending' ? "close-outline" : 
                              "person-add-outline"
                            } 
                            size={20} 
                            color={
                              friendStatus === 'friends' ? "#00AA55" : 
                              friendStatus === 'pending' ? "#FF4444" : 
                              "#7C2B86"
                            } 
                          />
                          <Text style={[
                            styles.actionButtonSecondaryText,
                            friendStatus === 'friends' && styles.actionButtonFriendsText,
                            friendStatus === 'pending' && styles.actionButtonCancelText
                          ]}>
                            {getAddFriendButtonText()}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>

                {/* Block/Unblock Section */}
                {userId !== user?.id && !blockStatus.isBlockedBy && (
                  <View style={styles.blockSection}>
                    {blockStatus.isBlocked ? (
                      <TouchableOpacity 
                        style={styles.unblockButton}
                        onPress={handleUnblockUser}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#00AA55" />
                        <Text style={styles.unblockButtonText}>Unblock {userName}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={styles.blockButton}
                        onPress={() => setShowBlockConfirm(true)}
                      >
                        <Ionicons name="ban-outline" size={18} color="#FF4444" />
                        <Text style={styles.blockButtonText}>Block User</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Block Confirmation Dialog */}
                {showBlockConfirm && (
                  <View style={styles.confirmDialog}>
                    <Text style={styles.confirmTitle}>Block {userName}?</Text>
                    <Text style={styles.confirmMessage}>
                      They won't be able to message you or see your activity. You'll be removed from each other's friends list.
                    </Text>
                    <View style={styles.confirmButtons}>
                      <TouchableOpacity 
                        style={styles.confirmCancelButton}
                        onPress={() => setShowBlockConfirm(false)}
                      >
                        <Text style={styles.confirmCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmBlockButton}
                        onPress={handleBlockUser}
                      >
                        <Text style={styles.confirmBlockText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Unfriend Confirmation Dialog */}
                {showUnfriendConfirm && (
                  <View style={styles.confirmDialog}>
                    <Text style={styles.confirmTitle}>Remove {userName} as friend?</Text>
                    <Text style={styles.confirmMessage}>
                      You'll be removed from each other's friends list and will no longer be able to message each other.
                    </Text>
                    <View style={styles.confirmButtons}>
                      <TouchableOpacity 
                        style={styles.confirmCancelButton}
                        onPress={() => setShowUnfriendConfirm(false)}
                      >
                        <Text style={styles.confirmCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmUnfriendButton}
                        onPress={handleUnfriend}
                      >
                        <Text style={styles.confirmUnfriendText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF4444" />
                <Text style={styles.errorText}>Failed to load profile</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    zIndex: 10000,
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    height: '90%',
    width: '100%',
    ...(Platform.OS === 'web' && {
      width: 400,
      height: 600,
      marginHorizontal: 'auto',
    }),
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    height: '100%',
    width: '100%',
    ...(Platform.OS === 'web' && {
      borderRadius: 24,
      boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.3)',
      height: '100%',
      width: '100%',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2B86',
  },
  closeButton: {
    padding: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7C2B86',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#7C2B86',
    marginBottom: 8,
  },
  lastSeen: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7C2B86',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.8)',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
    borderRadius: 16,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7C2B86',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
  },
  interestText: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.8)',
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  actionButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
  },
  actionButtonFriends: {
    backgroundColor: 'rgba(0, 170, 85, 0.1)',
    borderColor: 'rgba(0, 170, 85, 0.3)',
  },
  actionButtonFriendsText: {
    color: '#00AA55',
  },
  actionButtonCancel: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  actionButtonCancelText: {
    color: '#FF4444',
  },
  blockSection: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  blockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 170, 85, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 85, 0.3)',
    gap: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00AA55',
  },
  confirmDialog: {
    marginTop: 20,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
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
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
  },
  confirmBlockButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  confirmBlockText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  confirmUnfriendButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FF8C00',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  confirmUnfriendText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 18,
    color: '#FF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C2B86',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
