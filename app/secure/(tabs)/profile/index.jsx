import Avatar from "@/components/Avatar";
import { ProfilePremiumBadge } from "@/components/PremiumBadge";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import SubscriptionModal from "@/components/SubscriptionModal";
import { getAdComponents } from "@/components/ads/AdWrapper";
import { formatPhoneNumber } from "@/constants/countries";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { circleStatsApi } from "@/src/api/circle-stats";
import { friendsApi } from "@/src/api/friends";
import UserProfileModal from "@/src/components/UserProfileModal";
import PhotoGalleryService, { MAX_PHOTOS } from "@/src/services/photoGalleryService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { BannerAd } = getAdComponents();

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logOut, token } = useAuth();
  
  // Safe subscription context access with try-catch
  let subscriptionContext;
  try {
    subscriptionContext = useSubscription();
  } catch (error) {
    console.warn('Subscription context error:', error);
    subscriptionContext = null;
  }
  
  // Safely extract values with defaults
  const isPremium = subscriptionContext?.isPremium || false;
  const plan = subscriptionContext?.plan || 'free';
  const shouldShowAds = subscriptionContext?.shouldShowAds || (() => !isPremium);
  
  const features = subscriptionContext?.features || {
    unlimitedMatches: false,
    instagramUsernames: false,
    adFree: false,
    premiumBadge: false,
    prioritySupport: false,
    advancedFilters: false,
    seeWhoLiked: false,
    profileBoost: false,
    superLikes: false,
    readReceipts: false,
    incognitoMode: false
  };

  // Comprehensive refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all data in parallel
      await Promise.all([
        refreshUser(),
        subscriptionContext?.fetchSubscription?.(),
        loadStats(),
        loadPhotos()
      ]);
      
      // Load friends last to ensure correct count
      await loadFriends();
      
      // Small delay to allow context updates to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Photo gallery state
  const [photos, setPhotos] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Friends pagination and search state
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [friendsCurrentPage, setFriendsCurrentPage] = useState(1);
  const FRIENDS_PER_PAGE = 10;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Check if desktop
  const [isDesktop, setIsDesktop] = useState(Dimensions.get('window').width >= 768);
  
  // Load stats from API
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadStats(),
        loadPhotos()
      ]);
      // Load friends last to ensure it updates stats correctly
      await loadFriends();
    };
    
    if (token) {
      loadAllData();
    }
  }, [token]);
  
  // Load user photos
  const loadPhotos = async () => {
    if (!token) return;
    
    try {
      setLoadingPhotos(true);
      const userPhotos = await PhotoGalleryService.getPhotos(token);
      setPhotos(userPhotos || []);
      //console.log('📸 Loaded photos:', userPhotos?.length || 0);
    } catch (error) {
      console.error('❌ Failed to load photos:', error);
      // Set empty array on error to prevent crashes
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Load friends list
  const loadFriends = async () => {
    if (!token) return;
    
    try {
      setLoadingFriends(true);
      //console.log('👥 Loading friends list...');
      const response = await friendsApi.getFriendsList(token);
      setFriends(response.friends || []);
      //console.log('✅ Loaded friends:', response.friends?.length || 0);
      
      // Update stats with actual friends count
      setStats(prev => ({
        ...prev,
        total_friends: response.friends?.length || 0
      }));
    } catch (error) {
      console.error('❌ Failed to load friends:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };
  
  // Handle photo upload
  const handleUploadPhoto = async () => {
    if (!PhotoGalleryService.canUploadMore(photos.length)) {
      const alertMsg = `You can only upload up to ${MAX_PHOTOS} photos`;
      if (Platform.OS === 'web') {
        window.alert(alertMsg);
      } else {
        Alert.alert('Photo Limit Reached', alertMsg);
      }
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      // Pick image
      const result = await PhotoGalleryService.pickImage();
      if (result.cancelled) {
        setUploadingPhoto(false);
        return;
      }
      
      // Upload image
      const photoUrl = await PhotoGalleryService.uploadPhoto(result.uri, token);
      
      // Refresh photos
      await loadPhotos();
      
      const successMsg = 'Photo uploaded successfully!';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      let errorMsg = error.message || 'Failed to upload photo';
      
      // Add helpful context for common errors
      if (errorMsg.includes('endpoint not found') || errorMsg.includes('404')) {
        errorMsg = 'Photo upload is not set up yet.\n\nPlease run the backend migration:\nBackend/migrations/create_user_photos_table.sql';
      } else if (errorMsg.includes('500') || errorMsg.includes('Server error')) {
        errorMsg = 'Server error. The database table may not exist.\n\nPlease run the SQL migration.';
      }
      
      if (Platform.OS === 'web') {
        window.alert('Upload Failed\n\n' + errorMsg);
      } else {
        Alert.alert('Upload Failed', errorMsg, [
          { text: 'OK', style: 'default' }
        ]);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  // Handle photo delete
  const handleDeletePhoto = async (photoUrl) => {
    const confirmDelete = () => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm('Are you sure you want to delete this photo?'));
        } else {
          Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });
    };
    
    const confirmed = await confirmDelete();
    if (!confirmed) return;
    
    try {
      await PhotoGalleryService.deletePhoto(photoUrl, token);
      await loadPhotos();
      setShowPhotoModal(false);
      
      const successMsg = 'Photo deleted successfully';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      const errorMsg = error.message || 'Failed to delete photo';
      if (Platform.OS === 'web') {
        window.alert('Delete Failed\\n\\n' + errorMsg);
      } else {
        Alert.alert('Delete Failed', errorMsg);
      }
    }
  };

  // State for profile modal
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showFriendProfile, setShowFriendProfile] = useState(false);

  // Filter and paginate friends
  const getFilteredAndPaginatedFriends = () => {
    // Filter friends based on search query
    const filteredFriends = friends.filter(friend => {
      if (!friendsSearchQuery) return true;
      const query = friendsSearchQuery.toLowerCase();
      return (
        friend.name?.toLowerCase().includes(query) ||
        friend.username?.toLowerCase().includes(query)
      );
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredFriends.length / FRIENDS_PER_PAGE);
    const startIndex = (friendsCurrentPage - 1) * FRIENDS_PER_PAGE;
    const endIndex = startIndex + FRIENDS_PER_PAGE;
    const paginatedFriends = filteredFriends.slice(startIndex, endIndex);

    return {
      friends: paginatedFriends,
      totalFriends: filteredFriends.length,
      totalPages,
      hasMore: friendsCurrentPage < totalPages
    };
  };

  // Reset to page 1 when search query changes
  useEffect(() => {
    setFriendsCurrentPage(1);
  }, [friendsSearchQuery]);

  // Render Friends Tab
  const renderFriendsTab = () => {
    if (loadingFriends) {
      return (
        <View style={styles.contentCard}>
          <Text style={styles.contentTitle}>Friends</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C2B86" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        </View>
      );
    }

    if (friends.length === 0) {
      return (
        <View style={styles.contentCard}>
          <Text style={styles.contentTitle}>Friends</Text>
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyStateText}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>Start connecting with people!</Text>
          </View>
        </View>
      );
    }

    const { friends: displayedFriends, totalFriends, totalPages, hasMore } = getFilteredAndPaginatedFriends();

    return (
      <View style={styles.contentCard}>
        <View style={styles.friendsHeader}>
          <Text style={styles.contentTitle}>Friends</Text>
          <View style={styles.friendsCountBadge}>
            <Text style={styles.friendsCountText}>{friends.length}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={friendsSearchQuery}
            onChangeText={setFriendsSearchQuery}
          />
          {friendsSearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setFriendsSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results info */}
        {friendsSearchQuery && (
          <Text style={styles.searchResultsText}>
            {totalFriends} {totalFriends === 1 ? 'friend' : 'friends'} found
          </Text>
        )}

        {/* Friends List */}
        {displayedFriends.length === 0 ? (
          <View style={styles.emptySearchState}>
            <Ionicons name="search-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptySearchText}>No friends found</Text>
            <Text style={styles.emptySearchSubtext}>Try a different search term</Text>
          </View>
        ) : (
          <>
            <View style={styles.friendsList}>
              {displayedFriends.map((friend) => {
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendItem}
                    onPress={() => {
                      //console.log('👤 Opening profile for:', friend.name);
                      setSelectedFriend(friend);
                      setShowFriendProfile(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Avatar
                      user={{
                        id: friend.id,
                        first_name: friend.name?.split(' ')[0] || friend.name,
                        last_name: friend.name?.split(' ')[1] || '',
                        profile_photo_url: friend.profile_photo_url,
                        name: friend.name
                      }}
                      size={50}
                    />
                    
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      {friend.username && (
                        <Text style={styles.friendUsername}>@{friend.username}</Text>
                      )}
                      {friend.created_at && (
                        <Text style={styles.friendSince}>
                          Friends since {new Date(friend.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    friendsCurrentPage === 1 && styles.paginationButtonDisabled
                  ]}
                  onPress={() => setFriendsCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={friendsCurrentPage === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={friendsCurrentPage === 1 ? 'rgba(255, 255, 255, 0.3)' : '#FFD6F2'}
                  />
                  <Text style={[
                    styles.paginationButtonText,
                    friendsCurrentPage === 1 && styles.paginationButtonTextDisabled
                  ]}>Previous</Text>
                </TouchableOpacity>

                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    Page {friendsCurrentPage} of {totalPages}
                  </Text>
                  <Text style={styles.paginationSubtext}>
                    Showing {displayedFriends.length} of {totalFriends}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    !hasMore && styles.paginationButtonDisabled
                  ]}
                  onPress={() => setFriendsCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={!hasMore}
                >
                  <Text style={[
                    styles.paginationButtonText,
                    !hasMore && styles.paginationButtonTextDisabled
                  ]}>Next</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={!hasMore ? 'rgba(255, 255, 255, 0.3)' : '#FFD6F2'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // Render Photos Tab
  const renderPhotosTab = () => {
    const remainingSlots = PhotoGalleryService.getRemainingSlots(photos.length);
    const emptySlots = Array(remainingSlots).fill(null);
    
    return (
      <View style={styles.photoGalleryContainer}>
        {/* Header with gradient */}
        <LinearGradient
          colors={['rgba(124, 43, 134, 0.15)', 'transparent']}
          style={styles.photoHeaderGradient}
        >
          <View style={styles.photoHeader}>
            <View style={styles.photoHeaderLeft}>
              <Ionicons name="images" size={24} color="#FFD6F2" />
              <Text style={styles.photoHeaderTitle}>Photo Gallery</Text>
            </View>
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{photos.length}</Text>
              <Text style={styles.photoCountSeparator}>/</Text>
              <Text style={styles.photoCountTotal}>{MAX_PHOTOS}</Text>
            </View>
          </View>
        </LinearGradient>
        
        {loadingPhotos ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C2B86" />
            <Text style={styles.loadingText}>Loading your gallery...</Text>
          </View>
        ) : (
          <>
            {/* Photo Grid */}
            <View style={styles.photoGridContainer}>
              <View style={styles.photoGrid}>
                {/* Existing Photos */}
                {photos.map((photo, index) => (
                  <TouchableOpacity 
                    key={photo.url || index} 
                    style={styles.photoItemWrapper}
                    onPress={() => {
                      setSelectedPhoto(photo.url);
                      setShowPhotoModal(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <View style={styles.photoItem}>
                      <Image 
                        source={{ uri: photo.url }} 
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.photoOverlay}
                      >
                        <View style={styles.photoActions}>
                          <View style={styles.photoActionButton}>
                            <Ionicons name="expand" size={18} color="#FFFFFF" />
                          </View>
                        </View>
                      </LinearGradient>
                      {/* Photo number badge */}
                      <View style={styles.photoNumberBadge}>
                        <Text style={styles.photoNumberText}>{index + 1}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {/* Empty Slots */}
                {emptySlots.map((_, index) => (
                  <TouchableOpacity 
                    key={`empty-${index}`} 
                    style={styles.photoItemWrapper}
                    onPress={handleUploadPhoto}
                    disabled={uploadingPhoto}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.photoPlaceholder, uploadingPhoto && index === 0 && styles.photoPlaceholderUploading]}>
                      {uploadingPhoto && index === 0 ? (
                        <>
                          <ActivityIndicator size="small" color="#7C2B86" />
                          <Text style={styles.uploadingText}>Uploading...</Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.placeholderIconContainer}>
                            <Ionicons name="add-circle" size={36} color="rgba(255, 214, 242, 0.6)" />
                          </View>
                          <Text style={styles.placeholderText}>Add Photo</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Upload Button */}
            {remainingSlots > 0 && (
              <View style={styles.uploadButtonContainer}>
                <TouchableOpacity 
                  style={[styles.uploadButton, uploadingPhoto && styles.uploadButtonDisabled]}
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={uploadingPhoto ? ['#E0E0E0', '#BDBDBD'] : ['#FFD6F2', '#FFC1E8']}
                    style={styles.uploadButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {uploadingPhoto ? (
                      <>
                        <ActivityIndicator size="small" color="#7C2B86" />
                        <Text style={styles.uploadButtonText}>Uploading Photo...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={22} color="#7C2B86" />
                        <Text style={styles.uploadButtonText}>
                          Upload New Photo
                        </Text>
                        <View style={styles.uploadBadge}>
                          <Text style={styles.uploadBadgeText}>{remainingSlots} left</Text>
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                {/* Info text */}
                <Text style={styles.uploadInfoText}>
                  <Ionicons name="information-circle" size={14} color="rgba(255, 255, 255, 0.6)" />
                  {' '}Photos are compressed automatically for faster loading
                </Text>
              </View>
            )}
            
            {/* Empty State */}
            {photos.length === 0 && !uploadingPhoto && (
              <View style={styles.emptyPhotosState}>
                <LinearGradient
                  colors={['rgba(124, 43, 134, 0.1)', 'rgba(93, 95, 239, 0.1)']}
                  style={styles.emptyStateGradient}
                >
                  <View style={styles.emptyStateIconContainer}>
                    <Ionicons name="images-outline" size={72} color="rgba(255, 214, 242, 0.4)" />
                  </View>
                  <Text style={styles.emptyStateTitle}>Your Gallery is Empty</Text>
                  <Text style={styles.emptyStateDescription}>
                    Share your moments! Add up to {MAX_PHOTOS} photos to showcase your personality
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyStateButton}
                    onPress={handleUploadPhoto}
                    disabled={uploadingPhoto}
                  >
                    <LinearGradient
                      colors={['#7C2B86', '#5D5FEF']}
                      style={styles.emptyStateButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.emptyStateButtonText}>Add Your First Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
            
            {/* Photos filled state */}
            {photos.length === MAX_PHOTOS && (
              <View style={styles.galleryFullBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.galleryFullText}>Gallery Complete! All {MAX_PHOTOS} slots filled</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // Refresh all data when component mounts or user/token changes
  useEffect(() => {
    if (user && token) {
      handleRefresh();
    }
  }, [user?.id, token]); // Only trigger when user ID or token actually changes

  const loadStats = async () => {
    if (!token) return;
    try {
      setLoadingStats(true);
      const response = await circleStatsApi.getStats(token);
      // Calculate total messages from sent + received
      const statsWithTotal = {
        ...response.stats,
        total_messages: (response.stats.messages_sent || 0) + (response.stats.messages_received || 0),
        // Don't set total_friends here - let loadFriends() handle it
        // total_friends will be updated by loadFriends() with the actual count
      };
      setStats(statsWithTotal);
      //console.log('📊 Loaded stats:', statsWithTotal);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats on error
      setStats({
        total_friends: 0,
        total_matches: 0,
        total_messages: 0,
        messages_sent: 0,
        messages_received: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };
  
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const displayAge = user?.age ? `${user.age}` : "";
  const displayGender = user?.gender || "";
  
  // Function to mask Instagram username for free users
  const getMaskedInstagram = (username, isOwnProfile = true) => {
    if (!username) return null;
    // Always show full username for own profile
    if (isOwnProfile) {
      return username;
    }
    // Show full username if user has premium
    if (features.instagramUsernames) {
      return username;
    }
    // Mask the username for free users viewing others: @ig_orincore -> ig*********
    const prefix = username.substring(0, 2);
    const suffix = '*'.repeat(Math.max(1, username.length - 2));
    return prefix + suffix;
  };
  
  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Tab Render Functions
  const renderAboutTab = (user) => {
    const isDesktop = Dimensions.get('window').width >= 768 && Platform.OS === 'web';
    
    if (isDesktop) {
      // Desktop Layout - moved from external function
      return (
        <View style={styles.desktopAboutContent}>
          {/* Contact Info Card */}
          <View style={styles.desktopCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <LinearGradient
                  colors={['#7C2B86', '#9333EA']}
                  style={styles.cardHeaderIcon}
                >
                  <Ionicons name="person-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.desktopCardTitle}>Contact Information</Text>
              </View>
            </View>
            
            <View style={styles.infoGrid}>
              {user?.email && (
                <View style={styles.infoItem}>
                  <LinearGradient
                    colors={['#EC4899', '#F472B6']}
                    style={styles.infoIconLarge}
                  >
                    <Ionicons name="mail" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              )}
              
              {user?.username && (
                <View style={styles.infoItem}>
                  <LinearGradient
                    colors={['#7C2B86', '#9333EA']}
                    style={styles.infoIconLarge}
                  >
                    <Ionicons name="at" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>@{user.username}</Text>
                </View>
              )}
              
              {user?.phoneNumber && (
                <View style={styles.infoItem}>
                  <LinearGradient
                    colors={['#5D5FEF', '#818CF8']}
                    style={styles.infoIconLarge}
                  >
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{formatPhoneNumber(user.phoneNumber)}</Text>
                </View>
              )}
              
              {user?.instagramUsername && (
                <TouchableOpacity 
                  style={[styles.infoItem, !features.instagramUsernames && styles.lockedInfoItem]}
                  onPress={() => !features.instagramUsernames && setShowSubscriptionModal(true)}
                  disabled={features.instagramUsernames}
                >
                  <LinearGradient
                    colors={['#E4405F', '#F77737']}
                    style={styles.infoIconLarge}
                  >
                    <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.infoLabel}>Instagram</Text>
                  <View style={styles.instagramValueContainer}>
                    <Text style={[styles.infoValue, !features.instagramUsernames && styles.maskedValue]}>@{getMaskedInstagram(user.instagramUsername)}</Text>
                    {!features.instagramUsernames && (
                      <View style={styles.premiumLock}>
                        <Ionicons name="diamond" size={12} color="#FFD700" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Interests Card */}
          {user?.interests?.length > 0 && (
            <View style={styles.desktopCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <LinearGradient
                    colors={['#EC4899', '#F472B6']}
                    style={styles.cardHeaderIcon}
                  >
                    <Ionicons name="heart" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.desktopCardTitle}>Interests & Hobbies</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{user.interests.length}</Text>
                </View>
              </View>
              <View style={styles.desktopTagsContainer}>
                {user.interests.map((interest, idx) => (
                  <View
                    key={idx}
                    style={styles.desktopTagGradient}
                  >
                    <Ionicons name="heart" size={14} color="#FF6FB5" />
                    <Text style={styles.desktopTagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Looking For Card */}
          {user?.needs?.length > 0 && (
            <View style={styles.desktopCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <LinearGradient
                    colors={['#5D5FEF', '#818CF8']}
                    style={styles.cardHeaderIcon}
                  >
                    <Ionicons name="star" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.desktopCardTitle}>Looking For</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: 'rgba(93, 95, 239, 0.2)' }]}>
                  <Text style={[styles.countBadgeText, { color: '#818CF8' }]}>{user.needs.length}</Text>
                </View>
              </View>
              <View style={styles.desktopTagsContainer}>
                {user.needs.map((need, idx) => (
                  <View
                    key={idx}
                    style={[styles.desktopTagGradient, { backgroundColor: 'rgba(93, 95, 239, 0.2)', borderColor: 'rgba(93, 95, 239, 0.3)' }]}
                  >
                    <Ionicons name="star" size={14} color="#818CF8" />
                    <Text style={[styles.desktopTagText, { color: '#C7D2FE' }]}>{need}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      );
    }
    
    // Mobile Layout - moved from external function
    return (
      <View style={styles.mobileAboutContent}>
        {/* Contact Cards */}
        {user?.email && (
          <View style={styles.mobileInfoCard}>
            <LinearGradient
              colors={['#EC4899', '#F472B6']}
              style={styles.mobileInfoGradient}
            >
              <View style={styles.mobileInfoIcon}>
                <Ionicons name="mail" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.mobileInfoText}>
                <Text style={styles.mobileInfoLabel}>Email Address</Text>
                <Text style={styles.mobileInfoValue}>{user.email}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {user?.username && (
          <View style={styles.mobileInfoCard}>
            <LinearGradient
              colors={['#7C2B86', '#9333EA']}
              style={styles.mobileInfoGradient}
            >
              <View style={styles.mobileInfoIcon}>
                <Ionicons name="at" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.mobileInfoText}>
                <Text style={styles.mobileInfoLabel}>Username</Text>
                <Text style={styles.mobileInfoValue}>@{user.username}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {user?.phoneNumber && (
          <View style={styles.mobileInfoCard}>
            <LinearGradient
              colors={['#5D5FEF', '#818CF8']}
              style={styles.mobileInfoGradient}
            >
              <View style={styles.mobileInfoIcon}>
                <Ionicons name="call" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.mobileInfoText}>
                <Text style={styles.mobileInfoLabel}>Phone Number</Text>
                <Text style={styles.mobileInfoValue}>{formatPhoneNumber(user.phoneNumber)}</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        
        {user?.instagramUsername && (
          <TouchableOpacity 
            style={[styles.mobileInfoCard, !features.instagramUsernames && styles.lockedMobileCard]}
            onPress={() => !features.instagramUsernames && setShowSubscriptionModal(true)}
            disabled={features.instagramUsernames}
          >
            <LinearGradient
              colors={['#E4405F', '#F77737']}
              style={styles.mobileInfoGradient}
            >
              <View style={styles.mobileInfoIcon}>
                <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.mobileInfoText}>
                <Text style={styles.mobileInfoLabel}>Instagram</Text>
                <View style={styles.mobileInstagramContainer}>
                  <Text style={[styles.mobileInfoValue, !features.instagramUsernames && styles.maskedValue]}>@{getMaskedInstagram(user.instagramUsername)}</Text>
                  {!features.instagramUsernames && (
                    <View style={styles.mobilePremiumLock}>
                      <Ionicons name="diamond" size={14} color="#FFD700" />
                      <Text style={styles.lockText}>Premium</Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        {/* Interests Section */}
        {user?.interests?.length > 0 && (
          <View style={styles.mobileSectionCard}>
            <View style={styles.mobileSectionHeader}>
              <LinearGradient
                colors={['#EC4899', '#F472B6']}
                style={styles.mobileSectionIcon}
              >
                <Ionicons name="heart" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.mobileSectionTitle}>Interests & Hobbies</Text>
              <View style={styles.mobileCountBadge}>
                <Text style={styles.mobileCountText}>{user.interests.length}</Text>
              </View>
            </View>
            <View style={styles.mobileTagsContainer}>
              {user.interests.map((interest, idx) => (
                <View key={idx} style={styles.mobileTag}>
                  <Ionicons name="heart" size={12} color="#EC4899" />
                  <Text style={styles.mobileTagText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Looking For Section */}
        {user?.needs?.length > 0 && (
          <View style={styles.mobileSectionCard}>
            <View style={styles.mobileSectionHeader}>
              <LinearGradient
                colors={['#5D5FEF', '#818CF8']}
                style={styles.mobileSectionIcon}
              >
                <Ionicons name="star" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.mobileSectionTitle}>Looking For</Text>
              <View style={[styles.mobileCountBadge, { backgroundColor: '#5D5FEF' }]}>
                <Text style={styles.mobileCountText}>{user.needs.length}</Text>
              </View>
            </View>
            <View style={styles.mobileTagsContainer}>
              {user.needs.map((need, idx) => (
                <View key={idx} style={[styles.mobileTag, styles.mobileTagBlue]}>
                  <Ionicons name="star" size={12} color="#5D5FEF" />
                  <Text style={styles.mobileTagText}>{need}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };
  
  // Desktop View - Keep existing desktop code
  if (isDesktop && Platform.OS === 'web') {
    return (
      <View style={styles.desktopContainer}>
        {/* Animated Background */}
        <LinearGradient
          colors={["#1a0b2e", "#2d1b4e", "#1a0b2e"]}
          style={styles.desktopBackgroundGradient}
        >
          {/* Floating orbs */}
          <View style={[styles.floatingOrb, styles.orb1]} />
          <View style={[styles.floatingOrb, styles.orb2]} />
          <View style={[styles.floatingOrb, styles.orb3]} />
        </LinearGradient>

        {/* Top Navbar */}
        <View style={styles.desktopNavbar}>
          <View style={styles.navbarContent}>
            <View style={styles.navbarLeft}>
              <TouchableOpacity 
                onPress={() => router.push('/secure/match')}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.navbarProfile}>
                <Image
                  source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/40' }}
                  style={styles.navbarAvatar}
                />
                <Text style={styles.navbarName}>{displayName}</Text>
              </View>
            </View>
            <View style={styles.navbarRight}>
              <TouchableOpacity 
                style={styles.navbarButton}
                onPress={() => router.push("/secure/profile/settings")}
              >
                <Ionicons name="settings" size={20} color="#FFFFFF" />
                <Text style={styles.navbarButtonText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Two Column Layout */}
        <ScrollView 
          style={styles.desktopScrollView}
          contentContainerStyle={styles.desktopContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7C2B86"
              colors={["#7C2B86"]}
            />
          }
        >
          {/* Left Sidebar */}
          <Animated.View 
            style={[
              styles.desktopSidebar,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sidebarCard}>
              {/* Avatar */}
              <TouchableOpacity activeOpacity={0.8}>
                <Animated.View>
                  <LinearGradient
                    colors={["#7C2B86", "#5D5FEF", "#FFD6F2"]}
                    style={styles.desktopAvatarRing}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.desktopAvatarInner}>
                      {user?.profilePhotoUrl ? (
                        <Image
                          source={{ uri: user.profilePhotoUrl }}
                          style={styles.desktopAvatarImg}
                        />
                      ) : (
                        <View style={styles.desktopAvatarPlaceholder}>
                          <Text style={styles.desktopAvatarText}>
                            {displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                  <View style={styles.desktopVerifiedBadge}>
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                </Animated.View>
              </TouchableOpacity>
              
              {/* Name & Details */}
              <View style={styles.sidebarInfo}>
                <View style={styles.desktopNameRow}>
                  <Text style={styles.desktopName}>{displayName}</Text>
                  {isPremium && plan !== 'free' && (
                    <ProfilePremiumBadge 
                      plan={plan} 
                      size="small"
                      style={styles.desktopBadgeStyle}
                    />
                  )}
                  {user?.gender && (
                    <Ionicons
                      name={user.gender?.toLowerCase() === "female" ? "female" : user.gender?.toLowerCase() === "male" ? "male" : "male-female"}
                      size={18}
                      color="#7C2B86"
                    />
                  )}
                </View>
                
                
                <Text style={styles.desktopDetails}>{displayAge} {displayAge && displayGender && '•'} {displayGender}</Text>
                {user?.about && (
                  <Text style={styles.desktopBio} numberOfLines={3}>{user.about}</Text>
                )}
              </View>
              
              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <TouchableOpacity style={styles.quickStatItem} activeOpacity={0.7}>
                  <View style={[styles.desktopStatIconContainer, { backgroundColor: '#7C2B8615' }]}>
                    <Ionicons name="people" size={20} color="#7C2B86" />
                  </View>
                  <Text style={styles.quickStatValue}>{stats?.total_friends || 0}</Text>
                  <Text style={styles.quickStatLabel}>Friends</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.quickStatItem} activeOpacity={0.7}>
                  <View style={[styles.desktopStatIconContainer, { backgroundColor: '#EC489915' }]}>
                    <Ionicons name="heart" size={20} color="#EC4899" />
                  </View>
                  <Text style={styles.quickStatValue}>{stats?.total_matches || 0}</Text>
                  <Text style={styles.quickStatLabel}>Matches</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.quickStatItem} activeOpacity={0.7}>
                  <View style={[styles.desktopStatIconContainer, { backgroundColor: '#5D5FEF15' }]}>
                    <Ionicons name="chatbubbles" size={20} color="#5D5FEF" />
                  </View>
                  <Text style={styles.quickStatValue}>{stats?.total_messages || 0}</Text>
                  <Text style={styles.quickStatLabel}>Messages</Text>
                </TouchableOpacity>
              </View>
              
              {/* Edit Button */}
              <TouchableOpacity 
                style={styles.desktopEditButton}
                onPress={() => router.push("/secure/profile/edit")}
              >
                <LinearGradient
                  colors={["#7C2B86", "#5D5FEF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.desktopEditButtonGradient}
                >
                  <Ionicons name="create" size={18} color="#FFFFFF" />
                  <Text style={styles.desktopEditButtonText}>Edit Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Subscription Banner - Desktop */}
              <SubscriptionBanner
                isPremium={isPremium}
                plan={plan}
                onUpgradePress={() => router.push('/secure/profile/subscription')}
                style={styles.desktopBanner}
                compact={true}
              />
            </View>
          </Animated.View>

          {/* Right Main Content */}
          <Animated.View 
            style={[
              styles.desktopMainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Tabs */}
            <View style={styles.desktopTabs}>
              {['about', 'photos', 'friends'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.desktopTab,
                    activeTab === tab && styles.desktopTabActive
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Ionicons
                    name={
                      tab === 'about' ? 'information-circle' :
                      tab === 'photos' ? 'images' : 'people'
                    }
                    size={20}
                    color={activeTab === tab ? '#7C2B86' : '#9CA3AF'}
                  />
                  <Text style={[
                    styles.desktopTabText,
                    activeTab === tab && styles.desktopTabTextActive
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'about' && renderAboutTab(user)}
              {activeTab === 'photos' && renderPhotosTab()}
              {activeTab === 'friends' && renderFriendsTab()}
            </View>
            
            {/* Desktop Logout Button */}
            <View style={styles.desktopLogoutContainer}>
              <TouchableOpacity 
                style={styles.desktopLogoutButton}
                onPress={() => logOut()}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.desktopLogoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
        
        {/* Subscription Modal */}
        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          initialPlan="premium"
        />
      </View>
    );
  }
  
  // Mobile View - Built from Scratch
  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={["#1a0b2e", "#2d1b4e", "#1a0b2e"]}
        style={styles.backgroundGradient}
      >
        {/* Floating orbs */}
        <View style={[styles.floatingOrb, styles.orb1]} />
        <View style={[styles.floatingOrb, styles.orb2]} />
        <View style={[styles.floatingOrb, styles.orb3]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.headerSubtitle}>Your Circle identity</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push("/secure/profile/settings")}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Profile Card */}
          <Animated.View 
            style={[
              styles.profileCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Avatar */}
            <TouchableOpacity activeOpacity={0.9}>
              <LinearGradient
                colors={["#7C2B86", "#5D5FEF", "#FFD6F2"]}
                style={styles.avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarContainer}>
                  {user?.profilePhotoUrl ? (
                    <Image
                      source={{ uri: user.profilePhotoUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={50} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </LinearGradient>
              {/* Verified Badge */}
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              </View>
            </TouchableOpacity>
            {/* Name & Info */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                {isPremium && plan !== 'free' && (
                  <ProfilePremiumBadge 
                    plan={plan} 
                    size="medium"
                    style={styles.profileBadgeStyle}
                  />
                )}
              </View>
              
              
              {(displayAge || displayGender) && (
                <View style={styles.profileMeta}>
                  {displayAge && <Text style={styles.metaText}>{displayAge}</Text>}
                  {displayAge && displayGender && <Text style={styles.metaDot}>•</Text>}
                  {displayGender && <Text style={styles.metaText}>{displayGender}</Text>}
                </View>
              )}
              {user?.about && (
                <Text style={styles.profileBio} numberOfLines={2}>{user.about}</Text>
              )}
            </View>
            
            {/* Edit Button */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push("/secure/profile/edit")}
            >
              <LinearGradient
                colors={["#7C2B86", "#9333EA"]}
                style={styles.editButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Subscription Banner */}
          <SubscriptionBanner
            isPremium={isPremium}
            plan={plan}
            onUpgradePress={() => router.push('/secure/profile/subscription')}
          />
          
          {/* Stats Cards */}
          <Animated.View 
            style={[
              styles.statsContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
              <LinearGradient
                colors={['#7C2B86', '#9333EA']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIcon}>
                  <Ionicons name="people" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats?.total_friends || 0}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
              <LinearGradient
                colors={['#EC4899', '#F472B6']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIcon}>
                  <Ionicons name="heart" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats?.total_matches || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
              <LinearGradient
                colors={['#5D5FEF', '#818CF8']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIcon}>
                  <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats?.total_messages || 0}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Tabs */}
          <Animated.View 
            style={[
              styles.tabsContainer,
              { opacity: fadeAnim }
            ]}
          >
            {[
              { id: 'about', label: 'About', icon: 'information-circle' },
              { id: 'photos', label: 'Photos', icon: 'images' },
              { id: 'friends', label: 'Friends', icon: 'people' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.tabActive
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.id ? '#7C2B86' : 'rgba(255, 255, 255, 0.6)'}
                />
                <Text style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
          
          {/* Tab Content */}
          <Animated.View 
            style={[
              styles.tabContent,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {activeTab === 'about' && renderAboutTab(user)}
            {activeTab === 'photos' && renderPhotosTab()}
            {activeTab === 'friends' && renderFriendsTab()}
          </Animated.View>
          
          {/* Logout Button */}
          <Animated.View 
            style={[
              styles.logoutContainer,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => logOut()}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        initialPlan="premium"
      />

      {/* Banner Ad for Free Users - Auto-disabled in Expo Go */}
      {BannerAd && shouldShowAds() && (
        <BannerAd placement="profile_bottom" />
      )}
      
      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          {/* Close button at top */}
          <TouchableOpacity 
            style={styles.photoModalCloseButton}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.photoModalCloseIcon}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.photoModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.photoModalContent}>
              {/* Photo with border */}
              <View style={styles.photoModalImageContainer}>
                <Image 
                  source={{ uri: selectedPhoto }} 
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              </View>
              
              {/* Action buttons */}
              <View style={styles.photoModalActions}>
                <TouchableOpacity 
                  style={styles.photoModalDeleteButton}
                  onPress={() => handleDeletePhoto(selectedPhoto)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.photoModalDeleteGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.photoModalDeleteText}>Delete Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Friend Profile Modal */}
      <UserProfileModal
        visible={showFriendProfile}
        onClose={() => {
          setShowFriendProfile(false);
          setSelectedFriend(null);
        }}
        userId={selectedFriend?.id}
        userName={selectedFriend?.name}
        userAvatar={selectedFriend?.profile_photo_url}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarGradient: {
    padding: 4,
    borderRadius: 60,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1147',
    marginBottom: 4,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 15,
    color: '#6B7280',
  },
  profileBio: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  editButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: '#7C2B86',
    fontWeight: '700',
  },
  
  // Tab Content
  tabContent: {
    marginBottom: 20,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  
  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  
  // Sections
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(236, 72, 153, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagBlue: {
    backgroundColor: 'rgba(93, 95, 239, 0.3)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2B86',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  
  // Logout Button (Mobile)
  logoutContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  
  // Subscription Status Styles
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  premiumStatus: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  freeStatus: {
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  premiumText: {
    color: '#FFD700',
  },
  freeText: {
    color: '#7C2B86',
  },
  upgradeText: {
    fontSize: 10,
    color: 'rgba(124, 43, 134, 0.8)',
    fontStyle: 'italic',
  },
  
  // Instagram Masking Styles
  lockedInfoItem: {
    opacity: 0.8,
  },
  lockedMobileCard: {
    opacity: 0.9,
  },
  instagramValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mobileInstagramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maskedValue: {
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  premiumLock: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  mobilePremiumLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
  },
  
  // Desktop Subscription Status Styles
  desktopSubscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  desktopPremiumStatus: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  desktopFreeStatus: {
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  desktopSubscriptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  desktopPremiumText: {
    color: '#FFD700',
  },
  desktopFreeText: {
    color: '#7C2B86',
  },
  desktopUpgradeText: {
    fontSize: 9,
    color: 'rgba(124, 43, 134, 0.8)',
    fontStyle: 'italic',
  },
  
  // Desktop Styles
  desktopContainer: {
    flex: 1,
    backgroundColor: '#1a0b2e',
    position: 'relative',
  },
  desktopBackgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
  desktopNavbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backdropFilter: 'blur(10px)',
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navbarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navbarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#7C2B86',
  },
  navbarName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navbarRight: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.4)',
  },
  navbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopContent: {
    flexDirection: 'row',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    padding: 24,
    gap: 24,
  },
  desktopSidebar: {
    width: 320,
  },
  sidebarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  desktopAvatarRing: {
    padding: 4,
    borderRadius: 70,
  },
  desktopAvatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  desktopAvatarImg: {
    width: '100%',
    height: '100%',
  },
  desktopAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 214, 242, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopAvatarText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#7C2B86',
  },
  desktopVerifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  sidebarInfo: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  desktopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  profileBadgeStyle: {
    marginTop: -2,
    alignSelf: 'flex-start',
  },
  desktopName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  desktopBadgeStyle: {
    marginTop: -2,
    alignSelf: 'flex-start',
  },
  desktopBanner: {
    marginHorizontal: 0,
    marginVertical: 16,
    marginTop: 20,
  },
  desktopDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  desktopBio: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  quickStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  desktopStatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  desktopEditButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  desktopEditButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  desktopEditButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  desktopMainContent: {
    flex: 1,
  },
  desktopTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  desktopTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  desktopTabActive: {
    backgroundColor: 'rgba(124, 43, 134, 0.3)',
  },
  desktopTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  desktopTabTextActive: {
    color: '#FFFFFF',
  },
  
  // Desktop About Tab Styles - Improved
  desktopAboutContent: {
    gap: 16,
  },
  desktopCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EC4899',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    minWidth: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  desktopTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  desktopTagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 181, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 181, 0.3)',
  },
  desktopTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  
  // Mobile About Tab Styles - Improved
  mobileAboutContent: {
    gap: 16,
  },
  mobileInfoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mobileInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  mobileInfoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileInfoText: {
    flex: 1,
    gap: 4,
  },
  mobileInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mobileInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileSectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mobileSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  mobileSectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileCountBadge: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mobileCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mobileTagBlue: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  mobileTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Desktop Logout Button
  desktopLogoutContainer: {
    marginTop: 24,
  },
  desktopLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  desktopLogoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  
  // Photo Gallery Styles
  photoGalleryContainer: {
    flex: 1,
  },
  photoHeaderGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 242, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  photoCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD6F2',
  },
  photoCountSeparator: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 214, 242, 0.5)',
    marginHorizontal: 4,
  },
  photoCountTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  photoGridContainer: {
    paddingHorizontal: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItemWrapper: {
    width: '31%',
  },
  photoItem: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    height: '50%',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  photoActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  photoNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  photoNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoPlaceholder: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderUploading: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderColor: 'rgba(124, 43, 134, 0.3)',
    borderStyle: 'solid',
  },
  placeholderIconContainer: {
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 214, 242, 0.7)',
    textAlign: 'center',
  },
  uploadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C2B86',
    marginTop: 8,
  },
  uploadButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C2B86',
  },
  uploadBadge: {
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  uploadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C2B86',
  },
  uploadInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyPhotosState: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  emptyStateGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
  },
  emptyStateIconContainer: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyStateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryFullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  galleryFullText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    flex: 1,
  },
  
  // Photo Modal Styles
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  photoModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoModalCloseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    gap: 24,
  },
  photoModalImageContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  photoModalImage: {
    width: '100%',
    height: 450,
  },
  photoModalActions: {
    width: '100%',
    paddingHorizontal: 20,
  },
  photoModalDeleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  photoModalDeleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  photoModalDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Friends List Styles
  friendsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  friendsCountBadge: {
    backgroundColor: 'rgba(124, 43, 134, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  friendsCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2B86',
  },
  friendsList: {
    gap: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  friendSince: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  friendMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResultsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  emptySearchState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  // Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
    gap: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  paginationButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  paginationSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
