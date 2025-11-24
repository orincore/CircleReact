import Avatar from "@/components/Avatar";
import { ProfilePremiumBadge, PremiumIcon } from "@/components/PremiumBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { circleStatsApi } from "@/src/api/circle-stats";
import { friendsApi } from "@/src/api/friends";
import PhotoGalleryService, { MAX_PHOTOS } from "@/src/services/photoGalleryService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logOut, token } = useAuth();
  
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
      setPhotos(userPhotos || []);
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

  // Handle photo upload
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
      
      await PhotoGalleryService.uploadPhoto(result.uri, token);
      await loadPhotos();
      
      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Display values
  const firstName = user?.first_name || user?.firstName;
  const lastName = user?.last_name || user?.lastName;
  const displayName = (firstName || lastName)
    ? `${firstName || ''} ${lastName || ''}`.trim()
    : user?.username || 'User';
  
  const displayAge = user?.age ? `${user.age}` : null;
  const displayGender = user?.gender || null;

  // Refresh on user/token change
  useEffect(() => {
    if (user && token) {
      handleRefresh();
    }
  }, [user?.id, token]);

  return (
    <View style={styles.container}>
      {/* Clean Modern Background */}
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9']}
        style={styles.background}
      />
      
      {/* Subtle decorative elements */}
      <View style={styles.decorativeShape1} />
      <View style={styles.decorativeShape2} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        >
          {/* Modern Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your Circle presence</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push("/secure/(tabs)/profile/settings")}
            >
              <Ionicons name="settings-outline" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Profile Card - Instagram Style */}
          <View style={styles.profileCard}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer}>
                {user?.profilePhotoUrl ? (
                  <Image
                    source={{ uri: user.profilePhotoUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {/* Online indicator */}
                <View style={styles.onlineIndicator} />
              </TouchableOpacity>
              
              {/* Edit Profile Button */}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => router.push("/secure/(tabs)/profile/edit")}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                {user?.verification_status === 'verified' && (
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
                <Text style={styles.username}>@{user.username}</Text>
              )}
              
              {(displayAge || displayGender) && (
                <View style={styles.metaRow}>
                  {displayAge && <Text style={styles.metaText}>{displayAge} years old</Text>}
                  {displayAge && displayGender && <Text style={styles.metaDot}>•</Text>}
                  {displayGender && <Text style={styles.metaText}>{displayGender}</Text>}
                </View>
              )}
              
              {user?.about && (
                <Text style={styles.bio}>{user.about}</Text>
              )}
            </View>
          </View>

          {/* Stats Row - Instagram Style */}
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats?.total_friends || 0}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats?.total_matches || 0}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{photos.length}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats?.profile_views || 0}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
            </View>
          </View>

          {/* Photo Gallery - Instagram Style */}
          <View style={styles.photoSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <TouchableOpacity 
                style={styles.addPhotoButton}
                onPress={handleUploadPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Ionicons name="add" size={20} color="#8B5CF6" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <TouchableOpacity key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo.photo_url }} style={styles.photoImage} />
                </TouchableOpacity>
              ))}
              
              {/* Empty photo slots */}
              {Array(Math.max(0, 6 - photos.length)).fill(null).map((_, index) => (
                <TouchableOpacity 
                  key={`empty-${index}`} 
                  style={styles.emptyPhotoSlot}
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="add" size={24} color="#CBD5E1" />
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
              onPress={() => router.push("/secure/(tabs)/profile/settings")}
            >
              <Ionicons name="settings-outline" size={20} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Settings</Text>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]}
              onPress={() => {
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
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
