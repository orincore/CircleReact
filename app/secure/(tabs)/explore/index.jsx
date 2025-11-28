import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { exploreApi } from '@/src/api/explore';
import UserProfileModal from '@/src/components/UserProfileModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const isBrowser = Platform.OS === 'web';

export default function ExploreScreen() {
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  
  // Create dynamic styles based on theme
  const dynamicStyles = {
    searchContainerPro: {
      backgroundColor: theme.surface,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    searchDropdown: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOpacity: isDarkMode ? 0.3 : 0.15,
    },
    searchResultName: {
      color: theme.textPrimary,
    },
    searchResultUsername: {
      color: theme.textTertiary,
    },
    professionalSection: {
      backgroundColor: 'transparent',
      shadowColor: 'transparent',
      shadowOpacity: 0,
      borderWidth: 0,
      marginBottom: 24,
    },
    sectionTitlePro: {
      color: theme.textPrimary,
    },
    countLabel: {
      color: theme.textSecondary,
    },
    emptyTitlePro: {
      color: theme.textPrimary,
    },
    emptyDescriptionPro: {
      color: theme.textSecondary,
    },
    userCard: {
      backgroundColor: theme.surface,
      shadowColor: theme.shadowColor,
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      borderRadius: 16,
      borderWidth: 0,
      marginHorizontal: 0,
      marginVertical: 8,
      overflow: 'hidden',
    },
    cardContainer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 0,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.4 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    userName: {
      color: theme.textPrimary,
    },
    userMeta: {
      color: theme.textTertiary,
    },
    interestLabel: {
      color: theme.textSecondary,
    },
    interestChip: {
      backgroundColor: theme.surfaceSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    professionalName: {
      color: theme.textPrimary,
    },
    genderText: {
      color: theme.textTertiary,
    },
    ageChip: {
      backgroundColor: theme.surfaceSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    compatibilityLabel: {
      color: theme.textSecondary,
    },
    verifiedLabel: {
      color: '#10B981',
    },
    friendLabel: {
      color: '#3B82F6',
    },
    matchedLabel: {
      color: '#10B981',
    },
    pendingLabel: {
      color: '#F59E0B',
    },
    moreLabel: {
      color: theme.textMuted,
    },
    searchSectionPro: {
      backgroundColor: 'transparent',
    },
    searchFilterButton: {
      backgroundColor: theme.surfaceSecondary,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 12,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authPromptContainer: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    authPromptText: {
      color: theme.textSecondary,
    },
    authPromptButton: {
      backgroundColor: theme.primary,
    },
    moreChip: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 0,
    },
    compatibilityChip: {
      backgroundColor: theme.primaryLight,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 0,
    },
    verifiedChip: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 0,
    },
    friendChip: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 0,
    },
  };
  
  const [topUsers, setTopUsers] = useState([]);
  const [newUsers, setNewUsers] = useState([]);
  const [compatibleUsers, setCompatibleUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [passedUserIds, setPassedUserIds] = useState(new Set());
  const [matchStatuses, setMatchStatuses] = useState({}); // userId -> status
  const [processingMatch, setProcessingMatch] = useState(null); // userId being processed

  // Debug authentication state
  useEffect(() => {
    console.log('[ExploreScreen] Auth state:', { 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      hasUser: !!user,
      userId: user?.id 
    });
  }, [token, user]);

  useEffect(() => {
    loadPassedUsers();
    loadExploreData();
  }, []);

  // Load passed users from AsyncStorage
  const loadPassedUsers = async () => {
    try {
      const passedData = await AsyncStorage.getItem('explorePassedUsers');
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
        await AsyncStorage.setItem('explorePassedUsers', JSON.stringify(validPasses));
        setPassedUserIds(new Set(Object.keys(validPasses)));
      }
    } catch (error) {
      console.error('Error loading passed users:', error);
    }
  };

  const loadExploreData = async (isRefresh = false) => {
    if (!token) {
      console.warn('[ExploreScreen] No token available');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Use the new all-sections endpoint for smart user distribution
      const response = await Promise.race([
        exploreApi.getAllSections(token),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]);

      // Validate response
      if (!response || typeof response !== 'object') {
        console.error('[ExploreScreen] Invalid response:', response);
        setTopUsers([]);
        setNewUsers([]);
        setCompatibleUsers([]);
        return;
      }

      setTopUsers(Array.isArray(response.topUsers) ? response.topUsers : []);
      setNewUsers(Array.isArray(response.newUsers) ? response.newUsers : []);
      setCompatibleUsers(Array.isArray(response.compatibleUsers) ? response.compatibleUsers : []);

     
    } catch (error) {
      console.error('[ExploreScreen] Failed to load explore data:', error);
      // Set empty arrays to prevent crashes
      setTopUsers([]);
      setNewUsers([]);
      setCompatibleUsers([]);
      
      // Only show alert if not a timeout
      if (!error.message?.includes('timeout')) {
        Alert.alert('Error', 'Failed to load explore data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = useCallback(async (query) => {
    console.log('[ExploreScreen] Search initiated:', { query, hasToken: !!token, tokenLength: token?.length });
    
    if (!token) {
      console.warn('[ExploreScreen] No token for search - user may not be authenticated');
      setSearchResults([]);
      return;
    }
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      console.log('[ExploreScreen] Query too short or invalid:', query);
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      console.log('[ExploreScreen] Making search API call:', query.trim());
      const response = await exploreApi.searchUsers(query.trim(), 20, token);
      console.log('[ExploreScreen] Search response:', { 
        users: response?.users?.length || 0, 
        query: response?.query 
      });
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('[ExploreScreen] Search failed:', error);
      console.error('[ExploreScreen] Error details:', {
        message: error.message,
        status: error.status,
        details: error.details
      });
      
      // More specific error messages
      if (error.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again to search users.');
      } else if (error.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to search users.');
      } else if (error.status >= 500) {
        Alert.alert('Server Error', 'Search service is temporarily unavailable. Please try again later.');
      } else {
        Alert.alert('Search Error', 'Search failed. Please check your connection and try again.');
      }
      
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [token]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handlePassUser = async (userId, userName) => {
    try {
      setProcessingMatch(userId);
      
      // Send pass action to backend
      const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      console.log('🔍 Pass User - API URL:', API_URL);
      const response = await fetch(`${API_URL}/api/explore/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          actionType: 'pass'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Add to passed users with 15-day expiry
        const passedData = await AsyncStorage.getItem('explorePassedUsers');
        const passedUsers = passedData ? JSON.parse(passedData) : {};
        
        const expiryTime = Date.now() + (15 * 24 * 60 * 60 * 1000);
        passedUsers[userId] = expiryTime;
        
        await AsyncStorage.setItem('explorePassedUsers', JSON.stringify(passedUsers));
        
        // Update state
        setPassedUserIds(prev => new Set([...prev, userId]));
        setMatchStatuses(prev => ({ ...prev, [userId]: 'passed' }));
        
        Alert.alert('User Passed', `${userName || 'User'} won't appear in your discover section for 15 days.`);
      } else {
        Alert.alert('Error', result.error || 'Failed to pass user');
      }
    } catch (error) {
      console.error('Error passing user:', error);
      Alert.alert('Error', 'Failed to pass user. Please try again.');
    } finally {
      setProcessingMatch(null);
    }
  };

  const handleMatchUser = async (userId, userName, actionType = 'like') => {
    try {
      setProcessingMatch(userId);
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      console.log('🔍 Match User - API URL:', API_URL);
      console.log('🔍 Match User - Full URL:', `${API_URL}/api/explore/match`);
      const response = await fetch(`${API_URL}/api/explore/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          actionType: actionType // 'like' or 'super_like'
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setMatchStatuses(prev => ({ ...prev, [userId]: result.matchStatus }));
        
        if (result.matchStatus === 'matched') {
          Alert.alert(
            "It's a Match! 🎉",
            `You and ${userName || 'this user'} have matched! Start chatting now.`,
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Chat Now', onPress: () => {/* Navigate to chat */} }
            ]
          );
        } else if (result.matchStatus === 'pending') {
          Alert.alert(
            actionType === 'super_like' ? 'Super Like Sent! ⭐' : 'Match Request Sent ✓',
            `${userName || 'User'} will be notified of your interest.`
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to send match request');
      }
    } catch (error) {
      console.error('Error matching user:', error);
      Alert.alert('Error', 'Failed to send match request. Please try again.');
    } finally {
      setProcessingMatch(null);
    }
  };

  const renderUserCard = ({ item: user, showCompatibility = false }) => {
    const matchStatus = matchStatuses[user.id];
    const gender = user.gender || user.genderIdentity || user.sex || null;
    const normalizedGender = typeof gender === 'string' ? gender.toLowerCase() : null;
    const genderLabel = normalizedGender
      ? normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1)
      : null;
    const genderIcon = normalizedGender === 'male'
      ? 'male'
      : normalizedGender === 'female'
      ? 'female'
      : normalizedGender
      ? 'male-female'
      : null;

    return (
      <TouchableOpacity
        style={[styles.professionalCard, dynamicStyles.userCard]}
        onPress={() => handleUserPress(user)}
        activeOpacity={0.9}
      >
        <View style={[styles.cardContainer, dynamicStyles.cardContainer]}>
          <View style={styles.cardContentRow}>
            {/* Main content (avatar, text, badges, interests, status) */}
            <View style={styles.cardMainContent}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarSection}>
                  {user.profilePhoto ? (
                    <View style={styles.avatarWrapper}>
                      <Image
                        source={{ uri: user.profilePhoto }}
                        style={styles.professionalAvatar}
                      />
                      <LinearGradient
                        colors={[theme.primary, theme.primary]}
                        style={styles.avatarBorder}
                      />
                    </View>
                  ) : (
                    <View style={styles.avatarWrapper}>
                      <LinearGradient
                        colors={[theme.primary, theme.primary]}
                        style={styles.fallbackAvatarPro}
                      >
                        <Text style={[styles.fallbackTextPro, { color: '#FFFFFF' }]}>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </LinearGradient>
                    </View>
                  )}

                  {user.isOnline && (
                    <View style={styles.onlineStatusPro}>
                      <View style={styles.onlineDot} />
                    </View>
                  )}
                </View>

                <View style={styles.userBasicInfo}>
                  {/* Name and age */}
                  <View style={styles.nameRow}>
                    <Text style={[styles.professionalName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {user.name || 'Unknown User'}
                    </Text>
                    {user.age && (
                      <View style={[styles.ageChip, dynamicStyles.ageChip]}>
                        <Text style={[styles.ageText, { color: theme.textSecondary }]}>{user.age}</Text>
                      </View>
                    )}
                  </View>

                  {/* Gender row */}
                  {genderIcon && genderLabel && (
                    <View style={styles.genderRow}>
                      <Ionicons
                        name={genderIcon}
                        size={12}
                        color={theme.primary}
                      />
                      <Text style={[styles.genderText, { color: theme.textTertiary }]}>{genderLabel}</Text>
                    </View>
                  )}

                  {/* Username */}
                  {user.username && (
                    <Text style={[styles.usernameText, { color: theme.textTertiary }]} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  )}

                  {/* Status Badges */}
                  <View style={styles.statusRow}>
                    {showCompatibility && user.compatibilityScore && (
                      <View style={[styles.compatibilityChip, dynamicStyles.compatibilityChip]}>
                      {genderIcon && <Ionicons name={genderIcon} size={12} color={theme.textTertiary} />}
                        <Text style={[styles.compatibilityLabel, { color: theme.textSecondary }]}>
                          {user.compatibilityScore}% match
                        </Text>
                      </View>
                    )}

                    {user.verificationStatus === 'verified' && (
                      <View style={[styles.verifiedChip, dynamicStyles.verifiedChip]}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.verifiedLabel}>Verified</Text>
                      </View>
                    )}

                    {user.isFriend && (
                      <View style={[styles.friendChip, dynamicStyles.friendChip]}>
                        <Ionicons name="people" size={12} color="#3B82F6" />
                        <Text style={styles.friendLabel}>Friend</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Interests Section */}
              {user.interests && user.interests.length > 0 && (
                <View style={styles.interestsSection}>
                  <View style={styles.interestsList}>
                    {user.interests.slice(0, 3).map((interest, index) => (
                      <View key={index} style={[styles.interestChip, dynamicStyles.interestChip]}>
                        <Text style={[styles.interestLabel, dynamicStyles.interestLabel]}>{interest}</Text>
                      </View>
                    ))}
                    {user.interests.length > 3 && (
                      <View style={[styles.moreChip, dynamicStyles.moreChip]}>
                        <Text style={[styles.moreLabel, { color: theme.textMuted }]}>+{user.interests.length - 3}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Match Status */}
              {(matchStatus === 'matched' || matchStatus === 'pending') && (
                <View style={styles.matchStatusSection}>
                  {matchStatus === 'matched' && (
                    <View style={styles.matchedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.matchedLabel}>Matched</Text>
                    </View>
                  )}
                  {matchStatus === 'pending' && (
                    <View style={styles.pendingIndicator}>
                      <Ionicons name="clock-outline" size={16} color="#F59E0B" />
                      <Text style={styles.pendingLabel}>Request Sent</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Arrow indicator - vertically centered relative to card */}
            <View style={styles.actionIndicator}>
              <Ionicons name="chevron-forward" size={18} color={theme.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title, users, icon, showCompatibility = false) => {
    // Filter out passed users
    const filteredUsers = users?.filter(user => !passedUserIds.has(user.id)) || [];
    
    return (
      <View style={[styles.professionalSection, dynamicStyles.professionalSection]}>
        <View style={styles.sectionHeaderPro}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainerPro}>
              <LinearGradient
                colors={[theme.primary, theme.primary]}
                style={styles.iconGradient}
              >
                <Ionicons name={icon} size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.sectionTitlePro, dynamicStyles.sectionTitlePro]}>{title}</Text>
          </View>
          <View style={styles.countChip}>
            <Text style={[styles.countLabel, dynamicStyles.countLabel]}>{filteredUsers?.length || 0}</Text>
          </View>
        </View>
        
        {filteredUsers && filteredUsers.length > 0 ? (
          <View style={styles.cardsGrid}>
            {filteredUsers.map((user, index) => (
              <View key={user.id} style={styles.cardItem}>
                {renderUserCard({ item: user, showCompatibility })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStatePro}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={[theme.primary, theme.primary]}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="people-outline" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.emptyTitlePro, dynamicStyles.emptyTitlePro]}>
              Discovering Amazing People
            </Text>
            <Text style={[styles.emptyDescriptionPro, dynamicStyles.emptyDescriptionPro]}>
              New members join Circle every day. Check back soon for fresh connections!
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={[theme.background, theme.backgroundSecondary, theme.background]}
          style={styles.backgroundGradient}
        >
          <View style={[styles.floatingOrb, styles.orb1, { backgroundColor: theme.decorative1 }]} />
          <View style={[styles.floatingOrb, styles.orb2, { backgroundColor: theme.decorative2 }]} />
          <View style={[styles.floatingOrb, styles.orb3, { backgroundColor: theme.decorative1 }]} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textPrimary }]}>Loading explore...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.containerPro, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.background, theme.backgroundSecondary, theme.surface]}
        style={styles.backgroundPro}
      >
        {/* Decorative Elements */}
        <View style={[styles.decorativeShape1, { backgroundColor: theme.decorative1 }]} />
        <View style={[styles.decorativeShape2, { backgroundColor: theme.decorative2 }]} />
        <LinearGradient
          colors={[theme.decorative1, theme.decorative2]}
          style={styles.topAccent}
        />
      </LinearGradient>

      <ScrollView
        style={styles.scrollViewPro}
        contentContainerStyle={styles.contentPro}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadExploreData(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Professional Header */}
        <View style={styles.headerPro}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>Explore</Text>
              <LinearGradient
                colors={[theme.primary, theme.primary]}
                style={styles.titleUnderline}
              />
            </View>
            <Text style={[styles.subtitlePro, { color: theme.textSecondary }]}>Discover meaningful connections</Text>
          </View>
        </View>


        {/* Enhanced Search Bar */}
        <View style={styles.searchSectionPro}>
          <View style={[styles.searchContainerPro, dynamicStyles.searchContainerPro, !token && styles.searchDisabled]}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={18} color={token ? theme.primary : theme.textMuted} />
            </View>
            <TextInput
              placeholder={!token ? "Please log in to search users" : "Search by name, username, or interests..."}
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInputPro, { color: theme.textPrimary }, !token && styles.searchInputDisabled]}
              value={searchQuery}
              onChangeText={token ? setSearchQuery : undefined}
              editable={!!token}
            />
            {searching && (
              <ActivityIndicator size="small" color={theme.primary} style={styles.searchLoader} />
            )}
            {!token && (
              <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
            )}
          </View>

          {/* Search Results Dropdown */}
          {searchQuery.length >= 2 && searchResults.length > 0 && (
            <View style={[styles.searchDropdown, dynamicStyles.searchDropdown]}>
              {searchResults.slice(0, 5).map((user, index) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSearchQuery('');
                    handleUserPress(user);
                  }}
                >
                  <View style={styles.searchResultAvatar}>
                    {user.profilePhoto ? (
                      <Image source={{ uri: user.profilePhoto }} style={styles.searchAvatarImage} />
                    ) : (
                      <View style={styles.searchFallbackAvatar}>
                        <Text style={styles.searchFallbackText}>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, dynamicStyles.searchResultName]}>{user.name}</Text>
                    {user.username && (
                      <Text style={[styles.searchResultUsername, dynamicStyles.searchResultUsername]}>@{user.username}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Authentication prompt */}
        {!token && (
          <View style={styles.authPromptContainer}>
            <Ionicons name="person-outline" size={24} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.authPromptText}>
              Please log in to search and connect with users
            </Text>
          </View>
        )}

        {/* Search Results */}
        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <View style={styles.noResultsContainer}>
            <View style={styles.noResultsIcon}>
              <Ionicons name="search-outline" size={32} color="#8B5CF6" />
            </View>
            <Text style={styles.noResultsText}>No users found</Text>
            <Text style={styles.noResultsSubtext}>
              Try a different search term or check spelling
            </Text>
          </View>
        )}

        {/* Explore Sections - always show all sections when not searching */}
        {searchQuery.length < 2 && (
          <>
            {renderSection('Top Users', topUsers, 'star')}
            {renderSection('New Members', newUsers, 'person-add')}
            {renderSection('High Compatibility', compatibleUsers, 'heart', true)}
          </>
        )}
      </ScrollView>

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        userId={selectedUser?.id}
        userName={selectedUser?.name}
        userAvatar={selectedUser?.profilePhoto}
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  filterPanel: {
    marginTop: 8,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPanelTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterPanelSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 181, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 181, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  exploreTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchResultsContainer: {
    marginBottom: 24,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  searchLoadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noResultsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#7C2B86',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  separator: {
    height: 12,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 16,
  },
  userAvatar: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fallbackAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 214, 242, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C2B86',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  userAge: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  compatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  friendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  interestsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(255, 107, 181, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 181, 0.3)',
  },
  interestText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  moreInterests: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFE8FF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#FFE8FF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255, 232, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginTop: 8,
  },
  emptySectionTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySectionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  blurCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 214, 242, 0.24)',
    top: -120,
    right: -60,
  },
  blurCircleSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    bottom: 20,
    left: -70,
  },
  passButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  passButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B9D',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  passActionButton: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  likeActionButton: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  superLikeActionButton: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  matchedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // New Modern Styles
  scrollViewNew: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  contentContainerNew: {
    paddingBottom: 100,
  },
  headerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 0,
    marginTop: 8,
  },
  searchContainerNew: {
    marginBottom: 20,
    marginTop: 16,
  },
  searchBarNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInputNew: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchBarDisabled: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInputDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  authPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 107, 181, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 181, 0.2)',
  },
  authPromptText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  sectionNew: {
    marginBottom: 24,
  },
  sectionHeaderNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 214, 242, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  countBadgeNew: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userCardNew: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  // New improved user card styles
  userInfoSectionNew: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  userAvatarNew: {
    position: 'relative',
  },
  avatarImageNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fallbackAvatarNew: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 214, 242, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 242, 0.4)',
  },
  fallbackAvatarTextNew: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFD6F2',
  },
  onlineIndicatorNew: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  userInfoNew: {
    flex: 1,
    gap: 4,
  },
  userNameNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userUsernameNew: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  userAgeNew: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  compatibilityBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  compatibilityTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B9D',
  },
  friendBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  friendTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  verifiedBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  verifiedTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  interestsContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  interestTagNew: {
    backgroundColor: 'rgba(255, 107, 181, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 181, 0.25)',
  },
  interestTextNew: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD6F2',
  },
  moreInterestsNew: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  matchedBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  matchedTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  pendingBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pendingTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  
  // Modern UI Styles
  modernHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modernHeaderContent: {
    alignItems: 'flex-start',
  },
  titleGradient: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  modernTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  modernSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginLeft: 4,
  },
  
  modernSection: {
    marginBottom: 28,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modernSectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  modernCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  cardsContainer: {
    gap: 12,
  },
  cardWrapper: {
    marginHorizontal: 2,
  },
  
  modernUserCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  modernAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernFallbackAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernFallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modernOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlinePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  
  modernUserInfo: {
    flex: 1,
    gap: 6,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernUserName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  modernUserAge: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modernUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modernCompatibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 157, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.4)',
  },
  modernCompatibilityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B9D',
  },
  modernVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  modernVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  modernFriendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  modernFriendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  
  modernInterestsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modernInterestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  modernInterestText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modernMoreInterests: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  
  modernMatchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginTop: 4,
  },
  modernMatchedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  modernPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginTop: 4,
  },
  modernPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  
  arrowContainer: {
    marginLeft: 12,
    padding: 4,
  },
  
  modernEmptySection: {
    marginTop: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernEmptySectionTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  modernEmptySectionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Professional Purple Theme Styles
  containerPro: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundPro: {
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
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    top: -50,
    right: -50,
  },
  decorativeShape2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
    bottom: 100,
    left: -30,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  
  scrollViewPro: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  contentPro: {
    paddingBottom: 120,
  },
  
  headerPro: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  titleSection: {
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  titleUnderline: {
    height: 4,
    width: 60,
    borderRadius: 2,
  },
  subtitlePro: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 2,
  },
  
  searchSectionPro: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  searchContainerPro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInputPro: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  searchInputDisabled: {
    color: '#94A3B8',
  },
  searchLoader: {
    marginLeft: 8,
  },
  
  professionalSection: {
    marginBottom: 32,
  },
  sectionHeaderPro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainerPro: {
    marginRight: 12,
  },
  iconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitlePro: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  countChip: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  cardsGrid: {
    gap: 16,
  },
  cardItem: {
    marginHorizontal: 2,
  },
  
  professionalCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMainContent: {
    flex: 1,
    paddingRight: 8,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  professionalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 2,
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 32,
    zIndex: 1,
  },
  fallbackAvatarPro: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTextPro: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineStatusPro: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  
  userBasicInfo: {
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  ageChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  usernameText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  compatibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF2F8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  compatibilityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EC4899',
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  friendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  
  interestsSection: {
    marginBottom: 16,
  },
  interestsList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  interestChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interestLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  moreChip: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  moreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  genderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  
  matchStatusSection: {
    marginBottom: 8,
  },
  matchedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  matchedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  pendingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  
  actionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  
  emptyStatePro: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Enhanced Search Styles
  searchFilterButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    marginTop: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultAvatar: {
    marginRight: 12,
  },
  searchAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchFallbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  searchResultUsername: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  emptyTitlePro: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescriptionPro: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
