import Avatar from "@/components/Avatar";
import { ProfilePremiumBadge, PremiumIcon } from "@/components/PremiumBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import PhotoPlaceholder from "@/components/PhotoPlaceholder";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { circleStatsApi } from "@/src/api/circle-stats";
import { friendsApi } from "@/src/api/friends";
import PhotoGalleryService, { MAX_PHOTOS } from "@/src/services/photoGalleryService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logOut, token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  // Safe subscription context access
  let subscriptionContext;
  try {
    subscriptionContext = useSubscription();
  } catch (error) {
    console.warn('Subscription context error:', error);
    subscriptionContext = null;
  }
  
  const isPremium = subscriptionContext?.isPremium || false;
  const plan = subscriptionContext?.plan || 'free';
  const features = subscriptionContext?.features || {};

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [verificationStatus, setVerificationStatus] = useState(
    user?.verification_status || user?.verificationStatus || 'unverified'
  );

  // Rainbow theme animation for LGBTQ users
  const rainbowAnim = useRef(new Animated.Value(0)).current;

  // Determine if user should see the LGBTQ rainbow theme
  const lowerGender = user?.gender?.toLowerCase?.() || '';
  const isLgbtqGender = ["non-binary",
  "transgender woman",
  "transgender man",
  "genderqueer",
  "genderfluid",
  "agender",
  // Sexual / romantic orientations
  "gay",
  "lesbian",
  "bisexual",
  "pansexual",
  "queer",
  "asexual",
  "prefer not to say"].includes(lowerGender);

  const userNeeds = Array.isArray(user?.needs) ? user.needs : [];
  const isLgbtqNeeds = userNeeds.some((n) =>
    [
      'Queer Relationship',
      'LGBTQ+ Friends',
      'Same-gender Connection',
    ].includes(n)
  );

  const isLgbtqUser = isLgbtqGender || isLgbtqNeeds;

  // Helper to render gender with rainbow letters + flag for LGBTQ users
  const renderRainbowGender = (label) => {
    const rainbowColors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#8B5CF6'];
    if (!label) return null;

    return (
      <Text style={styles.metaText}>
        {label.split('').map((ch, index) => (
          <Text
            key={`${label}-${index}`}
            style={{
              color: rainbowColors[index % rainbowColors.length],
              fontWeight: '700',
            }}
          >
            {ch}
          </Text>
        ))}
        {' '}
        🏳️‍🌈
      </Text>
    );
  };

  // Start a gentle looping animation for LGBTQ users
  useEffect(() => {
    if (!isLgbtqUser) return;

    const loop = Animated.loop(
      Animated.timing(rainbowAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      })
    );

    rainbowAnim.setValue(0);
    loop.start();

    return () => {
      // Stop animation when component unmounts or user no longer matches
      loop.stop();
    };
  }, [isLgbtqUser, rainbowAnim]);

  // Load full profile (including verification_status) using the same
  // endpoint as [userId].jsx but for the current user
  useEffect(() => {
    const loadOwnProfile = async () => {
      if (!token || !user?.id) return;
      try {
        const { API_BASE_URL } = await import('@/src/api/config');
        const response = await fetch(`${API_BASE_URL}/api/friends/user/${user.id}/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setVerificationStatus(data.verification_status || 'unverified');
        }
      } catch (error) {
        console.warn('[Profile] Failed to load own profile for verification badge:', error);
      }
    };

    loadOwnProfile();
  }, [token, user?.id]);

  // Comprehensive refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const promises = [
        refreshUser().catch(err => console.error('Failed to refresh user:', err)),
        subscriptionContext?.fetchSubscription?.().catch(err => console.error('Failed to refresh subscription:', err)),
        loadStats().catch(err => console.error('Failed to load stats:', err)),
        loadPhotos().catch(err => console.error('Failed to load photos:', err))
      ].filter(Boolean);
      
      await Promise.allSettled(promises);
      
      try {
        await loadFriends();
      } catch (err) {
        console.error('Failed to load friends:', err);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const promises = [
          loadStats().catch(err => console.error('Failed to load stats:', err)),
          loadPhotos().catch(err => console.error('Failed to load photos:', err))
        ];
        
        await Promise.allSettled(promises);
        
        try {
          await loadFriends();
        } catch (err) {
          console.error('Failed to load friends:', err);
        }
      } catch (error) {
        console.error('Failed to load all data:', error);
      }
    };
    
    if (token) {
      loadAllData();
    }
  }, [token]);

  // Load stats
  const loadStats = async () => {
    if (!token) return;
    try {
      setLoadingStats(true);
      const response = await circleStatsApi.getStats(token);
      const statsWithTotal = {
        ...response.stats,
        total_messages: (response.stats.messages_sent || 0) + (response.stats.messages_received || 0),
        total_friends: friends.length || response.stats.total_friends || 0
      };
      setStats(statsWithTotal);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        total_matches: 0,
        total_messages: 0,
        total_friends: friends.length || 0,
        profile_views: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Load photos
  const loadPhotos = async () => {
    if (!token) return;
    
    try {
      setLoadingPhotos(true);
      const userPhotos = await PhotoGalleryService.getPhotos(token);
      
      // Filter out photos without valid URLs
      const validPhotos = (userPhotos || []).filter(photo => {
        const url = photo.photo_url || photo.url || photo.image_url;
        return url && url.trim() !== '';
      });
      
      setPhotos(validPhotos);
      
      // Clear any previous image errors when reloading
      setImageErrors(new Set());
    } catch (error) {
      console.error('Failed to load photos:', error);
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Load friends
  const loadFriends = async () => {
    if (!token) return;
    
    try {
      setLoadingFriends(true);
      const response = await friendsApi.getFriendsList(token);
      setFriends(response.friends || []);
      
      setStats(prev => ({
        ...prev,
        total_friends: response.friends?.length || 0
      }));
    } catch (error) {
      console.error('Failed to load friends:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Handle photo upload with better refresh
  const handleUploadPhoto = async () => {
    if (!PhotoGalleryService.canUploadMore(photos.length)) {
      Alert.alert('Photo Limit Reached', `You can only upload up to ${MAX_PHOTOS} photos`);
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      const result = await PhotoGalleryService.pickImage();
      if (result.cancelled) {
        setUploadingPhoto(false);
        return;
      }
      
      const photoUrl = await PhotoGalleryService.uploadPhoto(result.uri, token);
      
      // Immediately add the photo to local state for instant feedback
      const newPhoto = {
        id: Date.now(), // Temporary ID
        photo_url: photoUrl,
        created_at: new Date().toISOString()
      };
      
      setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
      
      // Also refresh from server to get the actual data structure
      setTimeout(async () => {
        await loadPhotos();
      }, 500);
      
      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async (photoUrl, photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistically remove from local state first
              setPhotos(prevPhotos => 
                prevPhotos.filter(photo => 
                  (photo.photo_url || photo.url || photo.image_url) !== photoUrl
                )
              );
              
              // Try to delete from server
              await PhotoGalleryService.deletePhoto(photoUrl, token);
              
              // Refresh from server to ensure consistency
              await loadPhotos();
              
              Alert.alert('Success', 'Photo deleted successfully');
            } catch (error) {
              console.error('Failed to delete photo:', error);
              
              // Revert optimistic update on error
              await loadPhotos();
              
              // Show specific error message
              let errorMessage = 'Failed to delete photo. Please try again.';
              if (error.message.includes('404')) {
                errorMessage = 'Photo not found. It may have already been deleted.';
              } else if (error.message.includes('403')) {
                errorMessage = 'You do not have permission to delete this photo.';
              } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
              }
              
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  // Display values
  const firstName = user?.first_name || user?.firstName;
  const lastName = user?.last_name || user?.lastName;
  const displayName = (firstName || lastName)
    ? `${firstName || ''} ${lastName || ''}`.trim()
    : user?.username || 'User';
  
  const displayAge = user?.age ? `${user.age}` : null;
  const displayGender = user?.gender || null;
  
  // Get user interests and preferences
  const userInterests = user?.interests || [];
  const relationshipType = user?.looking_for || user?.relationship_type || null;
  const interestedIn = user?.interested_in || user?.gender_preference || null;
  
  // Format relationship preferences
  const getRelationshipText = () => {
    const parts = [];
    if (relationshipType) {
      const typeMap = {
        'friendship': 'Friendship',
        'dating': 'Dating',
        'relationship': 'Relationship',
        'casual': 'Casual',
        'serious': 'Serious Relationship',
        'networking': 'Networking'
      };
      parts.push(typeMap[relationshipType] || relationshipType);
    }
    if (interestedIn) {
      const genderMap = {
        'male': 'Men',
        'female': 'Women',
        'both': 'Everyone',
        'non-binary': 'Non-binary',
        'all': 'Everyone'
      };
      parts.push(`Interested in ${genderMap[interestedIn] || interestedIn}`);
    }
    return parts.join(' • ');
  };

  // Refresh on user/token change
  useEffect(() => {
    if (user && token) {
      handleRefresh();
    }
  }, [user?.id, token]);

  // Create dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
    settingsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
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
    preferencesCard: {
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
    preferencesText: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
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
    editButton: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    decorativeShape1: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: theme.decorative1,
      top: -50,
      right: -50,
    },
    decorativeShape2: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: theme.decorative2,
      bottom: 100,
      left: -30,
    },
    photoSection: {
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
    addPhotoButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.primary,
    },
    emptyPhotoSlot: {
      width: 100,
      height: 100,
      borderRadius: 12,
      backgroundColor: theme.surfaceSecondary,
      borderWidth: 2,
      borderColor: theme.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPhotoText: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: theme.border,
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.border,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.success,
      borderWidth: 3,
      borderColor: theme.surface,
    },
    subscriptionCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: isDarkMode ? 0 : 1,
      borderColor: isDarkMode ? 'transparent' : theme.border,
    },
    subscriptionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    subscriptionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subscriptionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    subscriptionSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
    subscriptionPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isPremium ? theme.primaryLight : theme.surfaceSecondary,
      borderWidth: 1,
      borderColor: isPremium ? theme.primary : theme.border,
    },
    subscriptionPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: isPremium ? theme.primaryDark : theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    subscriptionActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 12,
      gap: 8,
      flexWrap: 'wrap',
    },
    manageButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSecondary,
    },
    manageButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    upgradeButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    upgradeButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  };

  return (
    <View style={dynamicStyles.container}>
      {/* Background */}
      <LinearGradient
        colors={[theme.background, theme.backgroundSecondary]}
        style={styles.background}
      />
      
      {/* Full-screen diagonal rainbow strips for LGBTQ members */}
      {isLgbtqUser && (
        <View pointerEvents="none" style={styles.rainbowStripsContainer}>
          <View style={[styles.rainbowStrip, styles.rainbowStrip1]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip2]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip3]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip4]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip5]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip6]} />
          <View style={[styles.rainbowStrip, styles.rainbowStrip7]} />
        </View>
      )}

      {/* Subtle decorative elements */}
      <View style={dynamicStyles.decorativeShape1} />
      <View style={dynamicStyles.decorativeShape2} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
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
          {/* Modern Header */}
          <View style={styles.header}>
            <View>
              <Text style={dynamicStyles.headerTitle}>Profile</Text>
              <Text style={dynamicStyles.headerSubtitle}>Manage your Circle presence</Text>
            </View>
            <TouchableOpacity 
              style={dynamicStyles.settingsButton}
              onPress={() => router.push("/secure/(tabs)/profile/settings")}
            >
              <Ionicons name="settings-outline" size={24} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Profile Card - Instagram Style */}
          <View style={dynamicStyles.profileCard}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer}>
                {user?.profilePhotoUrl ? (
                  <Image
                    source={{ uri: user.profilePhotoUrl }}
                    style={dynamicStyles.avatarImage}
                  />
                ) : (
                  <View style={dynamicStyles.avatarPlaceholder}>
                    <Text style={dynamicStyles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {/* Online indicator */}
                <View style={dynamicStyles.onlineIndicator} />
              </TouchableOpacity>
              
              {/* Edit Profile Button */}
              <TouchableOpacity 
                style={dynamicStyles.editButton}
                onPress={() => router.push("/secure/(tabs)/profile/edit")}
              >
                <Text style={dynamicStyles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={dynamicStyles.profileName}>{displayName}</Text>
                {verificationStatus === 'verified' && (
                  <VerifiedBadge size={20} />
                )}
                {isPremium && plan !== 'free' && (
                  <PremiumIcon 
                    size={16}
                    color={plan === 'premium_plus' ? '#FFD700' : '#7C2B86'}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
            
              {user?.username && (
                <Text style={dynamicStyles.username}>@{user.username}</Text>
              )}

              {(displayAge || displayGender) && (
                <View style={styles.metaRow}>
                  {displayAge && <Text style={dynamicStyles.metaText}>{displayAge} years old</Text>}
                  {displayAge && displayGender && <Text style={styles.metaDot}>•</Text>}
                  {displayGender && (
                    isLgbtqUser
                      ? renderRainbowGender(displayGender)
                      : <Text style={dynamicStyles.metaText}>{displayGender}</Text>
                  )}
                </View>
              )}

              {user?.about && (
                <Text style={dynamicStyles.bio}>{user.about}</Text>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={dynamicStyles.statsCard}>
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statItem}
                activeOpacity={0.8}
                onPress={() => router.push("/secure/(tabs)/profile/friends")}
              >
                <Text style={dynamicStyles.statNumber}>{stats?.total_friends || friends.length || 0}</Text>
                <Text style={dynamicStyles.statLabel}>Friends</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={dynamicStyles.statNumber}>{stats?.total_matches || 0}</Text>
                <Text style={dynamicStyles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={dynamicStyles.statNumber}>{photos.length}</Text>
                <Text style={dynamicStyles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={dynamicStyles.statNumber}>{stats?.profile_views || 0}</Text>
                <Text style={dynamicStyles.statLabel}>Views</Text>
              </View>
            </View>
          </View>

          {/* Subscription Summary */}
          <View style={dynamicStyles.subscriptionCard}>
            <View style={dynamicStyles.subscriptionHeaderRow}>
              <View style={dynamicStyles.subscriptionTitleRow}>
                <Ionicons name="diamond" size={18} color={theme.primary} />
                <Text style={dynamicStyles.subscriptionTitle}>Subscription</Text>
              </View>
              <View style={dynamicStyles.subscriptionPill}>
                <Text style={dynamicStyles.subscriptionPillText}>
                  {isPremium && plan !== 'free' ? (plan === 'premium_plus' ? 'Premium+' : 'Premium') : 'Free Plan'}
                </Text>
              </View>
            </View>
            <Text style={dynamicStyles.subscriptionSubtitle}>
              {isPremium && plan !== 'free'
                ? 'You have access to premium features like unlimited matches and ad-free experience.'
                : 'Upgrade to unlock unlimited matches, ad-free experience, and premium discovery tools.'}
            </Text>
            <View style={dynamicStyles.subscriptionActionsRow}>
              {subscriptionContext && (
                <TouchableOpacity
                  style={dynamicStyles.manageButton}
                  onPress={() => router.push('/secure/subscription')}
                >
                  <Text style={dynamicStyles.manageButtonText}>
                    {isPremium && plan !== 'free' ? 'Manage subscription' : 'View plans'}
                  </Text>
                </TouchableOpacity>
              )}
              {(!isPremium || plan === 'free') && (
                <TouchableOpacity
                  style={dynamicStyles.upgradeButton}
                  onPress={() => router.push('/secure/subscription')}
                >
                  <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
                  <Text style={dynamicStyles.upgradeButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Interests Section */}
          {userInterests.length > 0 && (
            <View style={dynamicStyles.interestsCard}>
              <Text style={dynamicStyles.sectionTitle}>Interests</Text>
              <View style={styles.interestsGrid}>
                {userInterests.slice(0, 8).map((interest, index) => (
                  <View key={index} style={dynamicStyles.interestChip}>
                    <Text style={dynamicStyles.interestText}>{interest}</Text>
                  </View>
                ))}
                {userInterests.length > 8 && (
                  <View style={styles.moreInterestsChip}>
                    <Text style={styles.moreInterestsText}>+{userInterests.length - 8} more</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Relationship Preferences */}
          {getRelationshipText() && (
            <View style={dynamicStyles.preferencesCard}>
              <View style={styles.preferencesHeader}>
                <Ionicons name="heart-outline" size={20} color={theme.primary} />
                <Text style={dynamicStyles.sectionTitle}>Looking For</Text>
              </View>
              <Text style={dynamicStyles.preferencesText}>{getRelationshipText()}</Text>
            </View>
          )}

          {/* Photo Gallery - Instagram Style */}
          <View style={dynamicStyles.photoSection}>
            <View style={styles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
              <TouchableOpacity 
                style={dynamicStyles.addPhotoButton}
                onPress={handleUploadPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons name="add" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => {
                // Ensure we have a valid photo URL
                const photoUrl = photo.photo_url || photo.url || photo.image_url;
                if (!photoUrl) {
                  console.warn('Photo missing URL:', photo);
                  return null;
                }
                
                const hasError = imageErrors.has(photoUrl);
                
                return (
                  <TouchableOpacity 
                    key={`photo-${index}-${photo.id || photoUrl}`} 
                    style={styles.photoItem}
                    onLongPress={() => handleDeletePhoto(photoUrl, photo.id)}
                  >
                    {hasError ? (
                      <PhotoPlaceholder 
                        style={styles.photoImage}
                        size="medium"
                      />
                    ) : (
                      <Image 
                        source={{ uri: photoUrl }} 
                        style={styles.photoImage}
                        onError={(error) => {
                          console.error('Image load error for URL:', photoUrl, error?.nativeEvent);
                          setImageErrors(prev => new Set([...prev, photoUrl]));
                        }}
                        onLoad={() => {
                          // Remove from error set if it loads successfully
                          setImageErrors(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(photoUrl);
                            return newSet;
                          });
                        }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.photoOverlay}>
                      <TouchableOpacity 
                        style={styles.deletePhotoButton}
                        onPress={() => handleDeletePhoto(photoUrl, photo.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }).filter(Boolean)}
              
              {/* Empty photo slots */}
              {Array(Math.max(0, Math.min(6, MAX_PHOTOS) - photos.length)).fill(null).map((_, index) => (
                <TouchableOpacity 
                  key={`empty-${index}`} 
                  style={dynamicStyles.emptyPhotoSlot}
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto && index === 0 ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <Ionicons name="add" size={24} color={theme.textMuted} />
                      <Text style={dynamicStyles.emptyPhotoText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/secure/(tabs)/profile/edit")}
            >
              <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Navigate to interests/preferences editing
                router.push("/secure/(tabs)/profile/edit?section=interests");
              }}
            >
              <Ionicons name="heart-outline" size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Interests & Preferences</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push("/secure/(tabs)/profile/settings")}
            >
              <Ionicons name="settings-outline" size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Settings</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]}
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  const ok = window.confirm('Are you sure you want to sign out?');
                  if (ok) {
                    logOut();
                  }
                  return;
                }

                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: logOut }
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.logoutText]}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  rainbowStripsContainer: {
    position: 'absolute',
    left: -220,
    right: -220,
    top: -120,
    bottom: -120,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.6,
  },
  rainbowStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
    borderRadius: 999,
  },
  rainbowStrip1: {
    top: -40,
    backgroundColor: '#E11D48',
  },
  rainbowStrip2: {
    top: 40,
    backgroundColor: '#F97316',
  },
  rainbowStrip3: {
    top: 120,
    backgroundColor: '#3B82F6',
  },
  rainbowStrip4: {
    top: 200,
    backgroundColor: '#FACC15',
  },
  rainbowStrip5: {
    top: 280,
    backgroundColor: '#22C55E',
  },
  rainbowStrip6: {
    top: 360,
    backgroundColor: '#22D3EE',
  },
  rainbowStrip7: {
    top: 440,
    backgroundColor: '#8B5CF6',
  },
  decorativeShape1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    top: -50,
    right: -50,
  },
  decorativeShape2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(168, 85, 247, 0.03)',
    bottom: 100,
    left: -30,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F1F5F9',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  
  // Profile Info
  profileInfo: {
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  username: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#64748B',
  },
  metaDot: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  // Rainbow accent for LGBTQ gender text
  metaTextRainbow: {
    fontWeight: '700',
    backgroundImage: undefined, // noop for RN, just keep color
    color: '#EC4899',
  },
  bio: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginTop: 4,
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  
  // Interests Section
  interestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  interestChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interestText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
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
  
  // Preferences Section
  preferencesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  preferencesText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  
  // Photo Section
  photoSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  addPhotoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: (Dimensions.get('window').width - 56) / 3,
    height: (Dimensions.get('window').width - 56) / 3,
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
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 8,
  },
  deletePhotoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPhotoSlot: {
    width: (Dimensions.get('window').width - 56) / 3,
    height: (Dimensions.get('window').width - 56) / 3,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Action Section
  actionSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 12,
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
  },
});
