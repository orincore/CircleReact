import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { friendsApi } from '@/src/api/friends';
import { getSocket } from '@/src/api/socket';
import { FriendRequestService } from '@/src/services/FriendRequestService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import VerifiedBadge from '../../components/VerifiedBadge';
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
  const [friendRequestId, setFriendRequestId] = useState(null); // Store request ID
  const [canMessage, setCanMessage] = useState(false);
  const [messagePermission, setMessagePermission] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, isBlockedBy: false });
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [spotifyData, setSpotifyData] = useState(null);
  const [spotifyExpanded, setSpotifyExpanded] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const photoScrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const subscriptionData = useSubscription();
  const { features = {} } = subscriptionData || {};
  

  // Function to mask Instagram username for other users
  const getMaskedInstagram = (username) => {
    if (!username) return null;
    if (userId === user?.id) {
      // Show full username for own profile
      return username;
    }
    // Mask the username for other users: @ig_orincore -> ig**********
    const prefix = username.substring(0, 2);
    const suffix = '*'.repeat(Math.max(1, username.length - 2));
    return prefix + suffix;
  };

  // Scroll to selected photo when viewer opens or index changes
  useEffect(() => {
    if (showPhotoViewer && photoScrollViewRef.current) {
      const width = Platform.OS === 'web' ? 400 : Dimensions.get('window').width;
      setTimeout(() => {
        photoScrollViewRef.current?.scrollTo({
          x: selectedPhotoIndex * width,
          y: 0,
          animated: false,
        });
      }, 100);
    }
  }, [showPhotoViewer, selectedPhotoIndex]);

  useEffect(() => {
    if (visible && userId) {
      //console.log('🔍 UserProfileModal opened for user:', userId);
      //console.log('🔍 User name:', userName);
      //console.log('🔍 User avatar:', userAvatar);
      //console.log('🔍 Modal visible:', visible);
      //console.log('🔍 Current logged-in user:', user?.id);
      //console.log('🔍 userId type:', typeof userId, 'value:', userId);
      loadUserProfile();
      
      // Set up socket listeners for cancelled requests
      if (token) {
        const socket = getSocket(token);
        
        // Listen for friend request cancellations
        const handleFriendRequestCancelled = (data) => {
          //console.log('Friend request cancelled:', data);
          if (data.cancelledBy === userId) {
            // The user we're viewing cancelled their request to us
            setFriendStatus('none');
            Alert.alert('Request Cancelled', `${userName} cancelled their friend request.`);
          }
        };
        
        // Listen for message request cancellations
        const handleMessageRequestCancelled = (data) => {
          //console.log('Message request cancelled:', data);
          if (data.cancelledBy === userId) {
            // The user we're viewing cancelled their message request to us
            setCanMessage(false);
            setMessagePermission(null);
            Alert.alert('Request Cancelled', `${userName} cancelled their message request.`);
          }
        };

        // Listen for friend request acceptance (when the user we're viewing accepts our request)
        const handleFriendRequestAccepted = (data) => {
          //console.log('Friend request accepted (they accepted our request):', data);
          if (data.request && data.request.sender_id === user?.id && data.request.receiver_id === userId) {
            // The user we're viewing accepted our request to them
            setCanMessage(true);
            Alert.alert('Friend Request Accepted', `You are now friends with ${userName}!`);
          }
        };

        // Listen for friend request accept confirmation (when we accept someone's request)
        const handleFriendRequestAcceptConfirmed = (data) => {
          //console.log('Friend request accept confirmed (we accepted their request):', data);
          if (data.request && data.request.sender_id === userId && data.request.receiver_id === user?.id) {
            // We accepted the request from the user we're viewing
            setFriendStatus('friends');
            setCanMessage(true);
            Alert.alert('Friend Request Accepted', `You are now friends with ${userName}!`);
          }
        };

        // Listen for when we get unfriended by someone
        const handleUnfriended = (data) => {
          //console.log('Unfriended by user:', data);
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
      //;
    }
  }, [visible, userId, token, userName, user?.id]);

  const loadUserProfile = async () => {
    setLoading(true);
    
    // Validate userId before proceeding
    if (!userId) {
      console.error('❌ UserProfileModal: No userId provided');
      setLoading(false);
      return;
    }
    
    console.log('👤 UserProfileModal loading profile for userId:', userId);
    console.log('👤 Current user ID:', user?.id);
    
    // If this is the problematic user ID, log a warning
    if (userId === '90e13323-9404-4b92-999d-b609320b6e1a') {
      console.error('🚨 STALE USER ID DETECTED!');
      console.error('This user ID is cached on this device but the user no longer exists.');
      console.error('Recommendation: Clear app data or AsyncStorage on this device.');
    }
    
    try {
      // Record profile visit for Circle stats (only if viewing someone else's profile)
      if (userId && user?.id && userId !== user.id) {
        try {
          const { circleStatsApi } = await import('@/src/api/circle-stats');
          await circleStatsApi.recordProfileVisit(userId, token);
          //console.log('✅ Profile visit recorded for user:', userId);
          
          // Send profile visit notification to the profile owner
          try {
            const socket = getSocket(token);
            socket.emit('profile:visit', {
              profileOwnerId: userId,
              visitorId: user.id,
              visitorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Someone'
            });
            //console.log('✅ Profile visit notification sent');
          } catch (notificationError) {
            //console.log('❌ Failed to send profile visit notification:', notificationError);
          }
        } catch (visitError) {
          //console.log('❌ Failed to record profile visit:', visitError);
        }
      }
      
      // Fetch actual user profile data from the backend
      let actualUserData = null;
      try {
        const { exploreApi } = await import('@/src/api/explore');
        
        // Try the direct user profile endpoint first
        try {
          const result = await exploreApi.getUserProfile(userId, token);
          if (result && result.user) {
            actualUserData = result.user;
            console.log('✅ Fetched user profile successfully');
          } else if (result === null) {
            // User not found (404) - handle gracefully
            console.warn('⚠️ User profile not found - user may have been deleted');
            setLoading(false);
            setProfileData({
              id: userId,
              name: userName || 'Deleted User',
              username: userName ? `@${userName}` : '@deleted',
              avatar: userAvatar,
              bio: 'This user is no longer available',
              location: 'N/A',
              joinedDate: 'N/A',
              stats: { chats: 0, friends: 0, messages: 0 },
              interests: [],
              isOnline: false,
              lastSeen: 'Unavailable'
            });
            return;
          }
        } catch (profileError) {
          //console.log('Profile endpoint failed, trying search fallback:', profileError);
          
          // Fallback: try to find user via search by ID
          try {
            const searchResult = await exploreApi.searchUsers(userId, 1, token);
            if (searchResult.users && searchResult.users.length > 0) {
              const foundUser = searchResult.users.find(u => u.id === userId);
              if (foundUser) {
                actualUserData = foundUser;
                //console.log('Fetched actual user data via search fallback:', actualUserData);
              }
            }
          } catch (searchError) {
            //console.log('Search fallback also failed:', searchError);
            
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
                //console.log('Fetched actual user data via sections fallback:', actualUserData);
              }
            } catch (sectionsError) {
              //console.log('Sections fallback also failed:', sectionsError);
              
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
                    //console.log('Fetched actual user data via friends fallback:', actualUserData);
                  }
                }
              } catch (friendsError) {
                //console.log('Friends fallback also failed:', friendsError);
              }
            }
          }
        }
      } catch (error) {
        //console.log('Failed to fetch user profile:', error);
      }

      // Create profile data using actual data if available, otherwise use provided props
      const profileData = {
        id: userId,
        name: actualUserData?.name || userName || 'User',
        username: actualUserData?.username ? `@${actualUserData.username}` : (userName ? `@${userName}` : '@user'),
        avatar: actualUserData?.profilePhoto || userAvatar,
        bio: actualUserData?.about || 'No bio available',
        instagramUsername: actualUserData?.instagramUsername || null,
        verification_status: actualUserData?.verification_status || 'unverified',
        location: 'Location not specified',
        joinedDate: actualUserData?.joinedDate ? `Joined ${new Date(actualUserData.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'Recently joined',
        stats: {
          chats: actualUserData?.stats?.chats || 0,
          friends: actualUserData?.stats?.friends || 0,
          messages: (actualUserData?.stats?.messagesSent || 0) + (actualUserData?.stats?.messagesReceived || 0)
        },
        interests: actualUserData?.interests || ['Photography', 'Travel', 'Coffee', 'Art', 'Music'],
        isOnline: actualUserData?.isOnline || Math.random() > 0.5,
        lastSeen: actualUserData?.isOnline ? 'Active now' : 'Last seen recently'
      };
      
      //console.log('Profile data created:', profileData);
      //console.log('Actual user data from API:', actualUserData);
      setProfileData(profileData);
      
      // Load Spotify data
      await loadSpotifyData();
      
      // Load user photos
      await loadUserPhotos();
      
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
      //console.log('Loading friend status for user:', userId);
      //console.log('Current user:', user?.id);
      
      // Use socket-based approach for consistency
      const socket = getSocket(token);
      
      // Set up listeners for friend status response
      const handleStatusResponse = (data) => {
        //console.log('Friend status response:', data);
        socket.off('friend:status:response', handleStatusResponse);
        
        if (data.error) {
          console.error('Friend status error:', data.error);
          setFriendStatus('none');
          setFriendRequestId(null);
          setCanMessage(false);
        } else {
          //console.log('Setting friendStatus to:', data.status);
          setFriendStatus(data.status);
          setFriendRequestId(data.requestId || null); // Store request ID
          
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
      //console.log('Loading Spotify data for user:', userId);
      const { socialAccountsApi } = await import('@/src/api/social-accounts');
      const response = await socialAccountsApi.getUserLinkedAccounts(userId, token);
      
      if (response.accounts) {
        const spotifyAccount = response.accounts.find(account => account.platform === 'spotify');
        if (spotifyAccount) {
          //console.log('Found Spotify account:', spotifyAccount);
          setSpotifyData(spotifyAccount);
        } else {
          //console.log('No Spotify account found for user');
          setSpotifyData(null);
        }
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
      //console.log('📸 Loading photos for user:', userId);
      
      // Fetch photos from API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com'}/api/users/${userId}/photos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPhotos(data.photos || []);
        //console.log('✅ Loaded', data.photos?.length || 0, 'photos for user');
      } else {
        //console.log('⚠️ Failed to load photos:', response.status);
        setUserPhotos([]);
      }
    } catch (error) {
      console.error('❌ Error loading user photos:', error);
      setUserPhotos([]);
    } finally {
      setLoadingPhotos(false);
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
    
    //console.log('Sending friend request to userId:', userId);
    //console.log('Current user:', user?.id);
    
    try {
      // Instantly update UI to show "Request Sent"
      setFriendStatus('pending_sent');
      
      // Use Socket.IO instead of API
      const socket = getSocket(token);
      socket.emit('friend:request:send', { receiverId: userId });
      
      // Set up listeners for response
      const handleSent = (data) => {
        socket.off('friend:request:sent', handleSent);
        socket.off('friend:request:error', handleError);
        if (data.success) {
          //console.log('✅ Friend request sent successfully');
          // Keep the pending_sent status
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
    if (!token || !userId) {
      console.error('Missing token or userId for cancel request');
      return;
    }
  
    //console.log('Cancelling friend request to userId:', userId);
    //console.log('Token available:', !!token);
    //console.log('Browser environment:', Platform.OS === 'web');
  
    try {
      // Add loading state
      setFriendStatus('cancelling');
      
      const result = await FriendRequestService.cancelFriendRequest(userId, token);
      //console.log('Cancel friend request result:', result);
      
      if (result && result.success) {
        setFriendStatus('none');
        Alert.alert('Request Cancelled', `Friend request to ${userName} has been cancelled.`);
      } else {
        console.error('Cancel request failed - no success flag:', result);
        setFriendStatus('pending'); // Revert to pending
        Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
      }
    } catch (error) {
      console.error('Failed to cancel friend request:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      setFriendStatus('pending'); // Revert to pending
      
      // More specific error messages
      let errorMessage = 'Failed to cancel friend request. Please try again.';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('Socket connection not available')) {
        errorMessage = 'Connection issue. Please refresh the page and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!token || !friendRequestId) {
      console.error('Missing token or friendRequestId for accept request');
      return;
    }

    //console.log('Accepting friend request:', friendRequestId);

    try {
      const socket = getSocket(token);
      
      // Emit accept event
      socket.emit('friend:request:accept', { requestId: friendRequestId });
      
      // Set up listeners for response
      const handleAccepted = (data) => {
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
        //console.log('Friend request accepted:', data);
        setFriendStatus('friends');
        setCanMessage(true);
        setFriendRequestId(null);
        Alert.alert('Success', `You are now friends with ${userName}!`);
      };

      const handleError = (error) => {
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
        console.error('Failed to accept friend request:', error);
        Alert.alert('Error', error.error || 'Failed to accept friend request. Please try again.');
      };

      socket.on('friend:request:accepted', handleAccepted);
      socket.on('friend:request:error', handleError);

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:accepted', handleAccepted);
        socket.off('friend:request:error', handleError);
      }, 10000);

    } catch (error) {
      console.error('Failed to accept friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!token || !friendRequestId) {
      console.error('Missing token or friendRequestId for decline request');
      return;
    }

    //console.log('Declining friend request:', friendRequestId);

    try {
      const socket = getSocket(token);
      
      // Emit decline event
      socket.emit('friend:request:decline', { requestId: friendRequestId });
      
      // Set up listeners for response
      const handleDeclined = (data) => {
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
        //console.log('Friend request declined:', data);
        setFriendStatus('none');
        setFriendRequestId(null);
        Alert.alert('Request Declined', `You declined the friend request from ${userName}.`);
      };

      const handleError = (error) => {
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
        console.error('Failed to decline friend request:', error);
        Alert.alert('Error', error.error || 'Failed to decline friend request. Please try again.');
      };

      socket.on('friend:request:declined', handleDeclined);
      socket.on('friend:request:error', handleError);

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('friend:request:declined', handleDeclined);
        socket.off('friend:request:error', handleError);
      }, 10000);

    } catch (error) {
      console.error('Failed to decline friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  const handleCancelMessageRequest = async () => {
    if (!token || !userId) return;
    
    //console.log('Cancelling message request to userId:', userId);
    
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

  const handleReportUser = async () => {
    if (!reportType || !reportReason.trim()) {
      Alert.alert('Error', 'Please select a report type and provide a reason');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/reports`, {
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
        
        // Show success message
        Alert.alert(
          '✅ Report Submitted',
          'Thank you for your report. Our moderation team will review it shortly and take appropriate action.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error codes
        if (response.status === 429) {
          Alert.alert(
            'Report Already Submitted',
            errorData.message || 'You have already reported this user recently. Please wait 24 hours before submitting another report.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert(
            'Error',
            errorData.message || 'Failed to submit report. Please try again.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        
        // Close modal on error too
        setShowReportModal(false);
        setReportType('');
        setReportReason('');
      }
    } catch (error) {
      console.error('Failed to report user:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
      setShowReportModal(false);
      setReportType('');
      setReportReason('');
    }
  };

  const handleUnfriend = async () => {
    if (!token || !userId) {
      console.error('❌ Cannot unfriend: missing token or userId');
      return;
    }
    
    console.log('🔄 Attempting to unfriend user:', userId);
    
    try {
      // Use API call instead of socket for more reliability
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/friends/unfriend/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Successfully unfriended user');
        setFriendStatus('none');
        setCanMessage(false);
        setMessagePermission(null);
        setShowUnfriendConfirm(false);
        Alert.alert('Friend Removed', `You are no longer friends with ${userName}. You can no longer message each other.`);
        
        // Also emit socket event for real-time updates
        try {
          const socket = getSocket(token);
          socket.emit('friend:unfriend', { friendId: userId });
        } catch (socketError) {
          console.warn('Socket emit failed, but API call succeeded:', socketError);
        }
      } else {
        console.error('❌ Unfriend failed:', result);
        Alert.alert('Error', result.error || 'Failed to remove friend. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Failed to remove friend:', error);
      Alert.alert('Error', 'Failed to remove friend. Please check your connection and try again.');
    }
  };

  const getAddFriendButtonText = () => {
    if (blockStatus.isBlocked) return 'Blocked';
    if (blockStatus.isBlockedBy) return 'Blocked You';
    if (friendStatus === 'friends') return 'Friends ✓';
    if (friendStatus === 'pending_sent') return 'Cancel Request';
    if (friendStatus === 'pending_received') return 'Accept Request';
    if (friendStatus === 'cancelling') return 'Cancelling...';
    if (userId === user?.id) return 'Settings';
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
    <>
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      transparent={true}
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
                {/* Avatar and Basic Info */}
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    <Avatar 
                      user={{
                        id: userId,
                        first_name: profileData.name.split(' ')[0],
                        last_name: profileData.name.split(' ')[1],
                        profile_photo_url: profileData.avatar,
                        name: profileData.name
                      }}
                      size={100}
                      disabled={true}
                    />
                    <View style={[
                      styles.onlineIndicator, 
                      { backgroundColor: profileData.isOnline ? '#00FF94' : '#999' }
                    ]} />
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.name}>{profileData.name}</Text>
                    {profileData.verification_status === 'verified' && (
                      <VerifiedBadge size={22} />
                    )}
                  </View>
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

                {/* Photo Gallery */}
                {userPhotos.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.photoGalleryHeader}>
                      <Ionicons name="images" size={20} color="#7C2B86" />
                      <Text style={styles.sectionTitle}>Photos</Text>
                      <View style={styles.photoCountBadge}>
                        <Text style={styles.photoCountText}>{userPhotos.length}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.photoGalleryGrid}>
                      {userPhotos.slice(0, 6).map((photo, index) => (
                        <TouchableOpacity
                          key={photo.id || index}
                          style={styles.photoGalleryItem}
                          onPress={() => {
                            setSelectedPhotoIndex(index);
                            setShowPhotoViewer(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: photo.url }}
                            style={styles.photoGalleryImage}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.photoGalleryOverlay}
                          >
                            <Ionicons name="expand" size={18} color="#FFFFFF" />
                          </LinearGradient>
                          {/* Photo number badge */}
                          <View style={styles.photoNumberBadge}>
                            <Text style={styles.photoNumberText}>{index + 1}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      
                      {/* Show more indicator if more than 6 photos */}
                      {userPhotos.length > 6 && (
                        <TouchableOpacity
                          style={[styles.photoGalleryItem, styles.photoGalleryMore]}
                          onPress={() => {
                            setSelectedPhotoIndex(6);
                            setShowPhotoViewer(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Image
                            source={{ uri: userPhotos[6].url }}
                            style={styles.photoGalleryImage}
                            resizeMode="cover"
                          />
                          <View style={styles.photoGalleryMoreOverlay}>
                            <Text style={styles.photoGalleryMoreText}>+{userPhotos.length - 6}</Text>
                            <Text style={styles.photoGalleryMoreSubtext}>more</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
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
                      <Text style={styles.statNumber}>{profileData.stats.messages}</Text>
                      <Text style={styles.statLabel}>Messages</Text>
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

                {/* Instagram Card - Show masked for other users */}
                {profileData.instagramUsername && (
                  <View style={styles.section}>
                    <TouchableOpacity 
                      style={styles.instagramCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (userId === user?.id) {
                          // Own profile - open Instagram normally
                          const instagramUrl = `https://instagram.com/${profileData.instagramUsername}`;
                          if (Platform.OS === 'web') {
                            window.open(instagramUrl, '_blank');
                          } else {
                            const { Linking } = require('react-native');
                            Linking.openURL(instagramUrl).catch(err => {
                              console.error('Failed to open Instagram:', err);
                              Alert.alert('Error', 'Could not open Instagram profile');
                            });
                          }
                        } else {
                          // Other user's profile - check premium subscription
                          if (features.instagramUsernames) {
                            // Premium user - open Instagram
                            const instagramUrl = `https://instagram.com/${profileData.instagramUsername}`;
                            if (Platform.OS === 'web') {
                              window.open(instagramUrl, '_blank');
                            } else {
                              const { Linking } = require('react-native');
                              Linking.openURL(instagramUrl).catch(err => {
                                console.error('Failed to open Instagram:', err);
                                Alert.alert('Error', 'Could not open Instagram profile');
                              });
                            }
                          } else {
                            // Free user - redirect to subscription page
                            router.push('/secure/profile/subscription');
                          }
                        }
                      }}
                    >
                      <LinearGradient
                        colors={['#833AB4', '#C13584', '#E1306C', '#FD1D1D', '#F77737']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.instagramGradient}
                      >
                        <View style={styles.instagramContent}>
                          <View style={styles.instagramIconContainer}>
                            <Ionicons name="logo-instagram" size={36} color="#FFFFFF" />
                          </View>
                          <View style={styles.instagramTextContainer}>
                            <Text style={styles.instagramLabel}>Follow on Instagram</Text>
                            <Text style={styles.instagramUsername}>
                              @{userId === user?.id || features.instagramUsernames ? profileData.instagramUsername : getMaskedInstagram(profileData.instagramUsername)}
                            </Text>
                            <Text style={styles.instagramSubtext}>
                              {userId === user?.id 
                                ? 'Tap to view profile' 
                                : features.instagramUsernames 
                                  ? 'Tap to view profile'
                                  : 'Tap to upgrade and see username'
                              }
                            </Text>
                          </View>
                          <View style={styles.instagramArrowContainer}>
                            {userId === user?.id || features.instagramUsernames ? (
                              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                            ) : (
                              <Ionicons name="diamond" size={24} color="#FFD700" />
                            )}
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Social Accounts */}
                <View style={styles.section}>
                  <LinkedSocialAccounts 
                    userId={userId} 
                    isOwnProfile={userId === user?.id}
                    onUpgradeRequest={() => {
                      router.push('/secure/profile/subscription');
                    }}
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
                      {/* Friend/Add Friend Button or Accept/Decline Buttons */}
                      {!blockStatus.isBlocked && (
                        <>
                          {friendStatus === 'pending_received' ? (
                            // Show Accept and Decline buttons for received requests
                            <View style={styles.requestButtonsContainer}>
                              <TouchableOpacity 
                                style={[styles.actionButtonSecondary, styles.acceptButton]} 
                                onPress={handleAcceptFriendRequest}
                              >
                                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                                <Text style={[styles.actionButtonSecondaryText, { color: '#FFFFFF' }]}>
                                  Accept Request
                                </Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={[styles.actionButtonSecondary, styles.declineButton]} 
                                onPress={handleDeclineFriendRequest}
                              >
                                <Ionicons name="close" size={20} color="#FF4444" />
                                <Text style={[styles.actionButtonSecondaryText, { color: '#FF4444' }]}>
                                  Decline
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            // Show single button for other statuses
                            <TouchableOpacity 
                              style={[
                                styles.actionButtonSecondary,
                                friendStatus === 'friends' && styles.actionButtonFriends,
                                friendStatus === 'pending_sent' && styles.actionButtonCancel
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
                                  friendStatus === 'friends' ? "checkmark-circle" : 
                                  friendStatus === 'pending_sent' ? "close-outline" : 
                                  "person-add-outline"
                                } 
                                size={20} 
                                color={
                                  friendStatus === 'friends' ? "#00AA55" : 
                                  friendStatus === 'pending_sent' ? "#FF4444" : 
                                  "#7C2B86"
                                } 
                              />
                              <Text style={[
                                styles.actionButtonSecondaryText,
                                friendStatus === 'friends' && styles.actionButtonFriendsText,
                                friendStatus === 'pending_sent' && styles.actionButtonCancelText
                              ]}>
                                {getAddFriendButtonText()}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </>
                  )}
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
                        <Text style={styles.unblockButtonText}>Unblock {userName}</Text>
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

    {/* Block Confirmation Modal */}
    <Modal
      visible={showBlockConfirm}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBlockConfirm(false)}
    >
      <View style={styles.popupOverlay}>
        <View style={styles.popupContainer}>
          <Text style={styles.popupTitle}>Block {userName}?</Text>
          <Text style={styles.popupMessage}>
            They won't be able to message you or see your activity. You'll be removed from each other's friends list.
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
          <Text style={styles.popupTitle}>Remove {userName} as friend?</Text>
          <Text style={styles.popupMessage}>
            You'll be removed from each other's friends list and will no longer be able to message each other.
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
          <Text style={styles.popupTitle}>Report {userName}</Text>
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
    >
      <Pressable 
        style={styles.photoViewerContainer}
        onPress={() => setShowPhotoViewer(false)}
      >
        <Pressable 
          style={styles.photoViewerContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <TouchableOpacity 
            style={styles.photoViewerCloseButton}
            onPress={() => setShowPhotoViewer(false)}
          >
            <View style={styles.photoViewerCloseIcon}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Photo counter */}
          <View style={styles.photoViewerCounter}>
            <Text style={styles.photoViewerCounterText}>
              {selectedPhotoIndex + 1} / {userPhotos.length}
            </Text>
          </View>

          {/* Photo Display */}
          <View style={styles.photoViewerImageContainer}>
            <ScrollView
              ref={photoScrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
                setSelectedPhotoIndex(newIndex);
              }}
              style={styles.photoViewerScrollView}
            >
              {userPhotos.map((photo, index) => (
                <View 
                  key={photo.id || index} 
                  style={[
                    styles.photoViewerSlide,
                    { width: Platform.OS === 'web' ? 400 : Dimensions.get('window').width }
                  ]}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.photoViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Navigation dots */}
          {userPhotos.length > 1 && (
            <View style={styles.photoViewerDots}>
              {userPhotos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.photoViewerDot,
                    index === selectedPhotoIndex && styles.photoViewerDotActive
                  ]}
                />
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>

  </>
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
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
  requestButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  declineButton: {
    flex: 1,
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
  },
  // Instagram Card Styles
  instagramCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#C13584',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    }),
  },
  instagramGradient: {
    padding: 24,
    borderRadius: 20,
  },
  instagramContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instagramIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  instagramTextContainer: {
    flex: 1,
  },
  instagramLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  instagramUsername: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instagramSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  instagramArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    gap: 8,
    marginTop: 8,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  reportModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reportTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reportTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reportTypeButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  reportTypeText: {
    fontSize: 13,
    color: '#666',
  },
  reportTypeTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  reportReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  reportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reportCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  reportSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    alignItems: 'center',
  },
  reportSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Popup Modal Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reportPopupContainer: {
    maxHeight: '80%',
  },
  reportScrollView: {
    maxHeight: 400,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
    textAlign: 'center',
  },
  popupSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  popupMessage: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  popupCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  popupCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  popupActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupBlockButton: {
    backgroundColor: '#FF4444',
  },
  popupUnfriendButton: {
    backgroundColor: '#FF8C00',
  },
  popupReportButton: {
    backgroundColor: '#FF9800',
  },
  popupActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Photo Gallery Styles
  photoGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photoCountBadge: {
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C2B86',
  },
  photoGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoGalleryItem: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  photoGalleryImage: {
    width: '100%',
    height: '100%',
  },
  photoGalleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  photoNumberBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 43, 134, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoGalleryMore: {
    position: 'relative',
  },
  photoGalleryMoreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGalleryMoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoGalleryMoreSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  
  // Photo Viewer Styles
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerContent: {
    width: Platform.OS === 'web' ? 500 : '100%',
    height: Platform.OS === 'web' ? 600 : '100%',
    position: 'relative',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  photoViewerCloseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerCounter: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoViewerCounterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoViewerImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerScrollView: {
    flex: 1,
  },
  photoViewerSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  photoViewerImage: {
    width: '90%',
    height: '90%',
  },
  photoViewerDots: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  photoViewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  photoViewerDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
});
