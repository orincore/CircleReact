import React, { useState, useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, RefreshControl, Linking, Animated, Dimensions, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { socialAccountsApi } from "@/src/api/social-accounts";
import ProfilePhotoManager from "@/components/ProfilePhotoManager";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, refreshUser, logOut, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('about');
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const responsive = useResponsiveDimensions();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  
  // Screen dimensions
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isDesktop: width >= 768,
      isBrowser: Platform.OS === 'web'
    };
  });
  
  // Stats data with colors
  const stats = [
    { label: 'Friends', value: '127', icon: 'people', color: '#7C2B86', gradient: ['#7C2B86', '#9333EA'] },
    { label: 'Matches', value: '43', icon: 'heart', color: '#EC4899', gradient: ['#EC4899', '#F472B6'] },
    { label: 'Messages', value: '892', icon: 'chatbubbles', color: '#5D5FEF', gradient: ['#5D5FEF', '#818CF8'] }
  ];
  
  // Profile completion percentage
  const profileCompletion = () => {
    let score = 0;
    if (user?.profilePhotoUrl) score += 20;
    if (user?.about) score += 20;
    if (user?.interests?.length > 0) score += 20;
    if (user?.needs?.length > 0) score += 20;
    if (linkedAccounts.length > 0) score += 20;
    return score;
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const detailsParts = [];
  if (typeof user?.age === "number") detailsParts.push(String(user.age));
  if (user?.gender) detailsParts.push(user.gender);
  const displayDetails = detailsParts.join(" · ") || "";

  const loadLinkedAccounts = async () => {
    try {
      if (token) {
        const response = await socialAccountsApi.getLinkedAccounts(token);
        setLinkedAccounts(response.accounts || []);
      }
    } catch (error) {
      console.error('Failed to load linked accounts:', error);
    }
  };

  useEffect(() => {
    loadLinkedAccounts();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, [token]);
  
  // Listen for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData({
        width: window.width,
        height: window.height,
        isDesktop: window.width >= 768,
        isBrowser: Platform.OS === 'web'
      });
    });

    return () => subscription?.remove();
  }, []);

  const handleEdit = async () => {
    try {
      // No UI changes: send a no-op update to confirm wiring. Extend later to real edits.
      await updateProfile({
        firstName: user?.firstName ?? undefined,
        lastName: user?.lastName ?? undefined,
        age: typeof user?.age === "number" ? user.age : undefined,
        gender: user?.gender ?? undefined,
        phoneNumber: user?.phoneNumber ?? undefined,
        interests: Array.isArray(user?.interests) ? user.interests : undefined,
        needs: Array.isArray(user?.needs) ? user.needs : undefined,
        profilePhotoUrl: user?.profilePhotoUrl ?? undefined,
      });
      Alert.alert("Profile", "Your profile is up to date.");
    } catch (e) {
      Alert.alert("Profile", e?.message || "Failed to update profile");
    }
  };

  // Render desktop layout
  if (screenData.isDesktop && screenData.isBrowser) {
    return (
      <View style={styles.desktopContainer}>
        {/* Top Navbar */}
        <View style={styles.desktopNavbar}>
          <View style={styles.navbarContent}>
            <View style={styles.navbarLeft}>
              <TouchableOpacity onPress={() => router.push('/secure/match')}>
                <Ionicons name="arrow-back" size={24} color="#1F1147" />
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
              <TouchableOpacity style={styles.navbarButton}>
                <Ionicons name="chatbubbles" size={20} color="#7C2B86" />
                <Text style={styles.navbarButtonText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navbarButton}
                onPress={() => router.push("/secure/profile/settings")}
              >
                <Ionicons name="settings" size={20} color="#7C2B86" />
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
              onRefresh={async () => {
                try {
                  setRefreshing(true);
                  await refreshUser();
                  await loadLinkedAccounts();
                } finally {
                  setRefreshing(false);
                }
              }}
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
              {/* Avatar with badge */}
              <TouchableOpacity onPress={() => setShowFullAvatar(true)} activeOpacity={0.8}>
                <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                  <LinearGradient
                    colors={["#7C2B86", "#5D5FEF", "#FFD6F2"]}
                    style={styles.desktopAvatarRing}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.desktopAvatarInner}>
                      <Image
                        source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/120' }}
                        style={styles.desktopAvatarImg}
                      />
                    </View>
                  </LinearGradient>
                  {/* Verified badge */}
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                </Animated.View>
              </TouchableOpacity>
              
              {/* Profile completion indicator */}
              {profileCompletion() < 100 && (
                <View style={styles.completionIndicator}>
                  <View style={styles.completionBar}>
                    <View style={[styles.completionFill, { width: `${profileCompletion()}%` }]} />
                  </View>
                  <Text style={styles.completionText}>{profileCompletion()}% Complete</Text>
                </View>
              )}
              
              {/* Name & Details */}
              <View style={styles.sidebarInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.desktopName}>{displayName}</Text>
                  {user?.gender && (
                    <Ionicons
                      name={user.gender?.toLowerCase() === "female" ? "female" : user.gender?.toLowerCase() === "male" ? "male" : "male-female"}
                      size={18}
                      color="#7C2B86"
                    />
                  )}
                </View>
                <Text style={styles.desktopDetails}>{displayDetails}</Text>
                {user?.about && (
                  <Text style={styles.desktopBio} numberOfLines={3}>{user.about}</Text>
                )}
              </View>
              
              {/* Quick Stats with icons */}
              <View style={styles.quickStats}>
                {stats.map((stat, index) => (
                  <TouchableOpacity key={index} style={styles.quickStatItem} activeOpacity={0.7}>
                    <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                      <Ionicons name={stat.icon} size={20} color={stat.color} />
                    </View>
                    <Text style={styles.quickStatValue}>{stat.value}</Text>
                    <Text style={styles.quickStatLabel}>{stat.label}</Text>
                  </TouchableOpacity>
                ))}
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
                  style={styles.editButtonGradient}
                >
                  <Ionicons name="create" size={18} color="#FFFFFF" />
                  <Text style={styles.desktopEditButtonText}>Edit Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
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
              {['about', 'photos', 'connections', 'settings'].map((tab) => (
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
                      tab === 'photos' ? 'images' :
                      tab === 'connections' ? 'people' : 'settings'
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
              {activeTab === 'about' && renderAboutTab()}
              {activeTab === 'photos' && renderPhotosTab()}
              {activeTab === 'connections' && renderConnectionsTab()}
              {activeTab === 'settings' && renderSettingsTab()}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Mobile Layout
  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                try {
                  setRefreshing(true);
                  await refreshUser();
                  await loadLinkedAccounts();
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor="#FFE8FF"
              colors={["#FFE8FF"]}
            />
          }
        >
          <View style={styles.blurCircleLarge} />
          <View style={styles.blurCircleSmall} />

          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>My Circle</Text>
              <Text style={styles.subtitle}>Curate how the world sees you.</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push("/secure/profile/settings")}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.settingsButtonGradient}
              >
                <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Enhanced Profile Card */}
          <Animated.View 
            style={[
              styles.profileCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Profile Photo with Animation and Badge */}
            <TouchableOpacity onPress={() => setShowFullAvatar(true)} activeOpacity={0.8}>
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                <LinearGradient
                  colors={["#7C2B86", "#5D5FEF", "#FFD6F2"]}
                  style={styles.avatarRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.mobileAvatarInner}>
                    {user?.profilePhotoUrl ? (
                      <Image
                        source={{ uri: user.profilePhotoUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={60} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
                {/* Verified badge */}
                <View style={styles.mobileVerifiedBadge}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                </View>
              </Animated.View>
            </TouchableOpacity>
            
            {/* Profile completion for mobile */}
            {profileCompletion() < 100 && (
              <View style={styles.mobileCompletionIndicator}>
                <View style={styles.completionBar}>
                  <LinearGradient
                    colors={['#7C2B86', '#5D5FEF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.completionFill, { width: `${profileCompletion()}%` }]}
                  />
                </View>
                <Text style={styles.mobileCompletionText}>{profileCompletion()}% Profile Complete</Text>
              </View>
            )}
            
            {/* Name with better styling */}
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              {user?.gender && (
                <View style={styles.genderBadge}>
                  <Ionicons
                    name={user.gender?.toLowerCase() === "female" ? "female" : user.gender?.toLowerCase() === "male" ? "male" : "male-female"}
                    size={16}
                    color="#7C2B86"
                  />
                </View>
              )}
            </View>
            
            {/* Details with better formatting */}
            {displayDetails && (
              <View style={styles.detailsRow}>
                <View style={styles.detailBadge}>
                  <Ionicons name="calendar-outline" size={14} color="#7C2B86" />
                  <Text style={styles.profileDetail}>{displayDetails}</Text>
                </View>
              </View>
            )}

            {/* Enhanced Bio Section */}
            {user?.about && (
              <View style={styles.bioSection}>
                <Text style={styles.bioText}>{user.about}</Text>
              </View>
            )}

            {/* Enhanced Edit Button */}
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => router.push("/secure/profile/edit")}
              activeOpacity={0.8}
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
          
          {/* Enhanced Stats Row */}
          <Animated.View 
            style={[
              styles.statsRow,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {stats.map((stat, index) => (
              <TouchableOpacity key={index} style={styles.statCard} activeOpacity={0.8}>
                <LinearGradient
                  colors={stat.gradient}
                  style={styles.statGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statIconCircle}>
                    <Ionicons name={stat.icon} size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={styles.statArrow}>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.7)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </Animated.View>
          
          {/* Enhanced Mobile Tabs */}
          <Animated.View 
            style={[
              styles.mobileTabs,
              {
                opacity: fadeAnim,
              }
            ]}
          >
            <View style={styles.tabsContainer}>
              {['about', 'photos', 'connections', 'settings'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.mobileTab,
                    activeTab === tab && styles.mobileTabActive
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.tabIconContainer,
                    activeTab === tab && styles.tabIconContainerActive
                  ]}>
                    <Ionicons
                      name={
                        tab === 'about' ? 'information-circle' :
                        tab === 'photos' ? 'images' :
                        tab === 'connections' ? 'people' : 'settings'
                      }
                      size={18}
                      color={activeTab === tab ? '#7C2B86' : 'rgba(255, 255, 255, 0.6)'}
                    />
                  </View>
                  <Text style={[
                    styles.mobileTabText,
                    activeTab === tab && styles.mobileTabTextActive
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
          
          {/* Mobile Tab Content */}
          <Animated.View 
            style={[
              styles.mobileTabContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {activeTab === 'about' && renderAboutTab()}
            {activeTab === 'photos' && renderPhotosTab()}
            {activeTab === 'connections' && renderConnectionsTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </Animated.View>

          {/* Old content removed - now in tabs */}
          {false && <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="mail" size={16} color="#FFD6F2" />
                <Text style={styles.detailLabel}>Email</Text>
              </View>
              <Text style={styles.detailValue}>{user?.email || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="person" size={16} color="#FFD6F2" />
                <Text style={styles.detailLabel}>Username</Text>
              </View>
              <Text style={styles.detailValue}>{user?.username || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="call" size={16} color="#FFD6F2" />
                <Text style={styles.detailLabel}>Phone</Text>
              </View>
              <Text style={styles.detailValue}>{user?.phoneNumber || "—"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="image" size={16} color="#FFD6F2" />
                <Text style={styles.detailLabel}>Photo</Text>
              </View>
              <Text style={styles.detailValue} numberOfLines={1}>{user?.profilePhotoUrl || "—"}</Text>
            </View>
            {user?.about && (
              <View style={styles.detailBlock}>
                <View style={styles.detailLeft}>
                  <Ionicons name="document-text" size={16} color="#FFD6F2" />
                  <Text style={styles.detailLabel}>About</Text>
                </View>
                <Text style={styles.aboutText}>{user.about}</Text>
              </View>
            )}
            {!!(user?.interests?.length) && (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Interests</Text>
                <View style={styles.chipsRow}>
                  {user.interests.map((it, idx) => (
                    <View key={`${it}-${idx}`} style={styles.chip}><Text style={styles.chipText}>{it}</Text></View>
                  ))}
                </View>
              </View>
            )}
            {!!(user?.needs?.length) && (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Needs</Text>
                <View style={styles.chipsRow}>
                  {user.needs.map((it, idx) => (
                    <View key={`${it}-${idx}`} style={[styles.chip, styles.needChip]}><Text style={styles.chipText}>{it}</Text></View>
                  ))}
                </View>
              </View>
            )}
          </View>}

          {false && linkedAccounts.length > 0 && (
            <View style={styles.detailsCard}>
              <Text style={styles.sectionTitle}>Linked Accounts</Text>
              {linkedAccounts.map((account, index) => (
                <View key={account.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <TouchableOpacity 
                    style={styles.linkedAccountRow}
                    onPress={() => {
                      if (account.platform_profile_url) {
                        Linking.openURL(account.platform_profile_url);
                      }
                    }}
                  >
                    <View style={styles.detailLeft}>
                      <View style={[styles.socialIcon, { backgroundColor: '#E4405F' }]}>
                        <Ionicons name="logo-instagram" size={16} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.detailLabel}>Instagram</Text>
                        <Text style={styles.socialUsername}>@{account.platform_username}</Text>
                      </View>
                    </View>
                    <View style={styles.socialActions}>
                      {account.is_public && (
                        <View style={styles.publicBadge}>
                          <Text style={styles.publicBadgeText}>Public</Text>
                        </View>
                      )}
                      <Ionicons name="open-outline" size={16} color="#FFD6F2" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {false && <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <Ionicons name="images" size={18} color="#7C2B86" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Update story highlights</Text>
                <Text style={styles.actionSubtitle}>Keep your Circle curious and inspired.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFE8FF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <Ionicons name="heart" size={18} color="#7C2B86" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>View your admirers</Text>
                <Text style={styles.actionSubtitle}>See who's been loving your profile.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFE8FF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={() => void logOut()}>
              <Ionicons name="log-out" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>}
        </ScrollView>
      </SafeAreaView>
      
      {/* Full Avatar Modal */}
      <Modal
        visible={showFullAvatar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullAvatar(false)}
      >
        <TouchableOpacity 
          style={styles.fullAvatarModal}
          activeOpacity={1}
          onPress={() => setShowFullAvatar(false)}
        >
          <View style={styles.fullAvatarContainer}>
            <Image
              source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/400' }}
              style={styles.fullAvatarImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.closeAvatarButton}
              onPress={() => setShowFullAvatar(false)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
  
  // Tab render functions
  function renderAboutTab() {
    return (
      <View style={styles.aboutTabContent}>
        <View style={screenData.isDesktop ? styles.desktopCard : styles.detailsCard}>
          <Text style={screenData.isDesktop ? styles.desktopCardTitle : styles.sectionTitle}>Details</Text>
          
          {/* Email Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <LinearGradient
                colors={['#EC4899', '#F472B6']}
                style={styles.detailIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="mail" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabelSmall}>Email</Text>
                <Text style={styles.detailValueLarge} numberOfLines={1}>{user?.email || "—"}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          
          {/* Username Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <LinearGradient
                colors={['#7C2B86', '#9333EA']}
                style={styles.detailIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabelSmall}>Username</Text>
                <Text style={styles.detailValueLarge}>{user?.username || "—"}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          
          {/* Phone Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <LinearGradient
                colors={['#5D5FEF', '#818CF8']}
                style={styles.detailIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabelSmall}>Phone</Text>
                <Text style={styles.detailValueLarge}>{user?.phoneNumber || "—"}</Text>
              </View>
            </View>
          </View>
          
          {/* Interests Section */}
          {!!(user?.interests?.length) && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailBlock}>
                <View style={styles.detailBlockHeader}>
                  <LinearGradient
                    colors={['#EC4899', '#F472B6']}
                    style={styles.sectionIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="heart" size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.detailBlockTitle}>Interests</Text>
                </View>
                <View style={styles.chipsRow}>
                  {user.interests.map((it, idx) => (
                    <LinearGradient
                      key={`${it}-${idx}`}
                      colors={['rgba(236, 72, 153, 0.3)', 'rgba(244, 114, 182, 0.3)']}
                      style={styles.chip}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="heart-outline" size={14} color="#FFD6F2" />
                      <Text style={styles.chipText}>{it}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            </>
          )}
          
          {/* Needs Section */}
          {!!(user?.needs?.length) && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailBlock}>
                <View style={styles.detailBlockHeader}>
                  <LinearGradient
                    colors={['#5D5FEF', '#818CF8']}
                    style={styles.sectionIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="star" size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.detailBlockTitle}>Looking For</Text>
                </View>
                <View style={styles.chipsRow}>
                  {user.needs.map((it, idx) => (
                    <LinearGradient
                      key={`${it}-${idx}`}
                      colors={['rgba(93, 95, 239, 0.3)', 'rgba(129, 140, 248, 0.3)']}
                      style={[styles.chip, styles.needChip]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="star-outline" size={14} color="#C4B5FD" />
                      <Text style={styles.chipText}>{it}</Text>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
        
        {linkedAccounts.length > 0 && (
          <View style={screenData.isDesktop ? styles.desktopCard : styles.detailsCard}>
            <Text style={screenData.isDesktop ? styles.desktopCardTitle : styles.sectionTitle}>Linked Accounts</Text>
            {linkedAccounts.map((account, index) => (
              <View key={account.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity 
                  style={styles.linkedAccountRow}
                  onPress={() => {
                    if (account.platform_profile_url) {
                      Linking.openURL(account.platform_profile_url);
                    }
                  }}
                >
                  <View style={styles.detailLeft}>
                    <View style={[styles.socialIcon, { backgroundColor: '#E4405F' }]}>
                      <Ionicons name="logo-instagram" size={16} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={screenData.isDesktop ? styles.desktopDetailLabel : styles.detailLabel}>Instagram</Text>
                      <Text style={styles.socialUsername}>@{account.platform_username}</Text>
                    </View>
                  </View>
                  <View style={styles.socialActions}>
                    {account.is_public && (
                      <View style={styles.publicBadge}>
                        <Text style={styles.publicBadgeText}>Public</Text>
                      </View>
                    )}
                    <Ionicons name="open-outline" size={16} color={screenData.isDesktop ? "#7C2B86" : "#FFD6F2"} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }
  
  function renderPhotosTab() {
    return (
      <View style={styles.photosTabContent}>
        <View style={screenData.isDesktop ? styles.desktopCard : styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={screenData.isDesktop ? styles.desktopCardTitle : styles.sectionTitle}>Photo Gallery</Text>
              <Text style={styles.sectionSubtitle}>Share your best moments</Text>
            </View>
            <View style={styles.photoBadge}>
              <Ionicons name="images" size={16} color="#7C2B86" />
              <Text style={styles.photoBadgeText}>0/9</Text>
            </View>
          </View>
          <View style={styles.photoGrid}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <TouchableOpacity key={item} style={styles.photoPlaceholder} activeOpacity={0.7}>
                <Ionicons name="camera" size={28} color={screenData.isDesktop ? "#9CA3AF" : "rgba(255, 255, 255, 0.4)"} />
                <Text style={styles.photoPlaceholderText}>Add</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={screenData.isDesktop ? styles.desktopAddButton : styles.addPhotoButton} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={20} color={screenData.isDesktop ? "#7C2B86" : "#FFD6F2"} />
            <Text style={screenData.isDesktop ? styles.desktopAddButtonText : styles.addPhotoText}>Upload Photos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  function renderConnectionsTab() {
    return (
      <View style={styles.connectionsTabContent}>
        <View style={screenData.isDesktop ? styles.desktopCard : styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <Text style={screenData.isDesktop ? styles.desktopCardTitle : styles.sectionTitle}>Friends</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>127</Text>
            </View>
          </View>
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="people" size={48} color={screenData.isDesktop ? "#D1D5DB" : "rgba(255, 255, 255, 0.3)"} />
            </View>
            <Text style={screenData.isDesktop ? styles.desktopEmptyTitle : styles.emptyStateTitle}>No Friends Yet</Text>
            <Text style={screenData.isDesktop ? styles.desktopEmptyText : styles.emptyText}>Start connecting with people to build your circle</Text>
            <TouchableOpacity style={styles.emptyStateButton} activeOpacity={0.7}>
              <Ionicons name="person-add" size={18} color="#7C2B86" />
              <Text style={styles.emptyStateButtonText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={screenData.isDesktop ? styles.desktopCard : styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <Text style={screenData.isDesktop ? styles.desktopCardTitle : styles.sectionTitle}>Recent Matches</Text>
            <View style={[styles.countBadge, { backgroundColor: '#EC489915' }]}>
              <Text style={[styles.countBadgeText, { color: '#EC4899' }]}>43</Text>
            </View>
          </View>
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="heart" size={48} color={screenData.isDesktop ? "#D1D5DB" : "rgba(255, 255, 255, 0.3)"} />
            </View>
            <Text style={screenData.isDesktop ? styles.desktopEmptyTitle : styles.emptyStateTitle}>No Matches Yet</Text>
            <Text style={screenData.isDesktop ? styles.desktopEmptyText : styles.emptyText}>Keep swiping to find your perfect match</Text>
            <TouchableOpacity style={styles.emptyStateButton} activeOpacity={0.7}>
              <Ionicons name="heart" size={18} color="#EC4899" />
              <Text style={[styles.emptyStateButtonText, { color: '#EC4899' }]}>Start Matching</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  
  function renderSettingsTab() {
    return (
      <View style={styles.settingsTabContent}>
        <View style={screenData.isDesktop ? styles.desktopCard : styles.actionsSection}>
          <TouchableOpacity style={screenData.isDesktop ? styles.desktopActionRow : styles.actionRow}>
            <View style={styles.actionIcon}>
              <Ionicons name="images" size={18} color="#7C2B86" />
            </View>
            <View style={styles.actionContent}>
              <Text style={screenData.isDesktop ? styles.desktopActionTitle : styles.actionTitle}>Update story highlights</Text>
              <Text style={screenData.isDesktop ? styles.desktopActionSubtitle : styles.actionSubtitle}>Keep your Circle curious and inspired.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={screenData.isDesktop ? "#9CA3AF" : "#FFE8FF"} />
          </TouchableOpacity>

          <TouchableOpacity style={screenData.isDesktop ? styles.desktopActionRow : styles.actionRow}>
            <View style={styles.actionIcon}>
              <Ionicons name="heart" size={18} color="#7C2B86" />
            </View>
            <View style={styles.actionContent}>
              <Text style={screenData.isDesktop ? styles.desktopActionTitle : styles.actionTitle}>View your admirers</Text>
              <Text style={screenData.isDesktop ? styles.desktopActionSubtitle : styles.actionSubtitle}>See who's been loving your profile.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={screenData.isDesktop ? "#9CA3AF" : "#FFE8FF"} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={() => void logOut()}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  // Mobile Styles
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 120,
    gap: 24,
    position: "relative",
  },
  
  // Desktop Container
  desktopContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Desktop Navbar
  desktopNavbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
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
    color: '#1F1147',
  },
  navbarRight: {
    flexDirection: 'row',
    gap: 12,
  },
  navbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  
  // Desktop Layout
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
  
  // Desktop Sidebar
  desktopSidebar: {
    width: 320,
  },
  sidebarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  sidebarInfo: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  desktopName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1147',
  },
  desktopDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  desktopBio: {
    fontSize: 14,
    color: '#4B5563',
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
    borderColor: '#F3F4F6',
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconContainer: {
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
    color: '#1F1147',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  // Verified Badge (Desktop)
  verifiedBadge: {
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
  
  // Profile Completion Indicator (Desktop)
  completionIndicator: {
    width: '100%',
    gap: 6,
    marginTop: 8,
  },
  completionBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#7C2B86',
    borderRadius: 3,
  },
  completionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  desktopEditButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  desktopEditButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Desktop Main Content
  desktopMainContent: {
    flex: 1,
  },
  
  // Desktop Tabs
  desktopTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    transition: 'all 0.3s ease',
  },
  desktopTabActive: {
    backgroundColor: '#F3F4F6',
  },
  desktopTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  desktopTabTextActive: {
    color: '#7C2B86',
  },
  
  // Desktop Cards
  desktopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  desktopCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  desktopDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  desktopDetailValue: {
    fontSize: 14,
    color: '#1F1147',
    fontWeight: '500',
  },
  desktopEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  desktopActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  desktopActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1147',
  },
  desktopActionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  desktopAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  desktopAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  
  // Mobile Stats Row - Enhanced
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  statGradient: {
    padding: 18,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  
  // Mobile Verified Badge
  mobileVerifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  
  // Mobile Profile Completion
  mobileCompletionIndicator: {
    width: '100%',
    gap: 8,
    marginTop: 12,
  },
  mobileCompletionText: {
    fontSize: 13,
    color: '#7C2B86',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Enhanced Mobile Tabs
  mobileTabs: {
    marginHorizontal: -24,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 6,
    gap: 6,
  },
  mobileTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  mobileTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: '#7C2B8615',
  },
  mobileTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  mobileTabTextActive: {
    color: '#7C2B86',
    fontWeight: '700',
  },
  
  // Tab Content
  tabContent: {
    flex: 1,
  },
  mobileTabContent: {
    gap: 16,
  },
  aboutTabContent: {
    gap: 16,
  },
  photosTabContent: {
    gap: 16,
  },
  connectionsTabContent: {
    gap: 16,
  },
  settingsTabContent: {
    gap: 16,
  },
  
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7C2B8615',
    borderRadius: 12,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7C2B8615',
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C2B86',
  },
  
  // Photo Grid - Enhanced
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Enhanced Empty States
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  desktopEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.2)',
    marginTop: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C2B86',
  },
  
  // Full Avatar Modal
  fullAvatarModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullAvatarContainer: {
    width: '90%',
    maxWidth: 500,
    aspectRatio: 1,
    position: 'relative',
  },
  fullAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  closeAvatarButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Avatar Ring (Mobile)
  avatarRing: {
    padding: 4,
    borderRadius: 70,
  },
  avatarInner: {
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  settingsButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  settingsButtonGradient: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  avatarRing: {
    padding: 4,
    borderRadius: 70,
  },
  mobileAvatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarEmoji: {
    fontSize: 36,
  },
  profileName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F1147",
    letterSpacing: -0.5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  genderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(124, 43, 134, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(124, 43, 134, 0.1)",
    borderRadius: 16,
  },
  profileDetail: {
    fontSize: 14,
    color: "#7C2B86",
    fontWeight: "600",
  },
  editButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  actionsSection: {
    gap: 16,
  },
  detailsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  detailTextContainer: {
    flex: 1,
    gap: 2,
  },
  detailLabelSmall: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValueLarge: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  detailLabel: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    maxWidth: "50%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginVertical: 8,
  },
  detailBlock: {
    gap: 12,
    marginTop: 8,
  },
  detailBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  detailBlockTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#EC4899",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  needChip: {
    shadowColor: "#5D5FEF",
  },
  chipText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 18,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 214, 242, 0.4)",
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFE8FF",
  },
  actionSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.72)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#FF4D67",
    boxShadow: "0px 8px 14px rgba(255, 77, 103, 0.45)",
    elevation: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  aboutText: {
    fontSize: 14,
    color: "#1F1147",
    lineHeight: 20,
    marginTop: 8,
    fontWeight: "400",
  },
  bioSection: {
    backgroundColor: "rgba(124, 43, 134, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: "rgba(124, 43, 134, 0.15)",
  },
  bioText: {
    fontSize: 14,
    color: "#1F1147",
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  blurCircleLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 214, 242, 0.24)",
    top: -110,
    right: -70,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    bottom: 10,
    left: -80,
  },
  // Linked accounts styles
  linkedAccountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  socialUsername: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  socialActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  publicBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  publicBadgeText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
  },
});
