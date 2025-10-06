import React, { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Image, 
  RefreshControl, 
  Animated, 
  Dimensions, 
  Platform 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { circleStatsApi } from "@/src/api/circle-stats";
import { ProfilePremiumBadge } from "@/components/PremiumBadge";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import SubscriptionModal from "@/components/SubscriptionModal";

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
        loadStats()
      ]);
      
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Check if desktop
  const [isDesktop, setIsDesktop] = useState(Dimensions.get('window').width >= 768);
  
  // Load stats from API
  useEffect(() => {
    loadStats();
  }, [token]);

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
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const displayAge = user?.age ? `${user.age}` : "";
  const displayGender = user?.gender || "";
  
  // Function to mask Instagram username for free users
  const getMaskedInstagram = (username) => {
    if (!username) return null;
    if (features.instagramUsernames) {
      return username;
    }
    // Mask the username: @ig_orincore -> ig*********
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
                  <Text style={styles.infoValue}>{user.phoneNumber}</Text>
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
                <Text style={styles.mobileInfoValue}>{user.phoneNumber}</Text>
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
                onUpgradePress={() => setShowSubscriptionModal(true)}
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
            onUpgradePress={() => setShowSubscriptionModal(true)}
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
    </View>
  );
}

function renderPhotosTab() {
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Photo Gallery</Text>
      <View style={styles.photoGrid}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <TouchableOpacity key={item} style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={32} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.uploadButton}>
        <Ionicons name="add-circle" size={20} color="#7C2B86" />
        <Text style={styles.uploadButtonText}>Upload Photos</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderFriendsTab() {
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
});
