import { useAuth } from '@/contexts/AuthContext';
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
    if (!token) {
      console.warn('[ExploreScreen] No token for search');
      setSearchResults([]);
      return;
    }
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await exploreApi.searchUsers(query.trim(), 20, token);
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed. Please try again.');
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
    const isProcessing = processingMatch === user.id;
    
    return (
      <View style={styles.userCardNew}>
        {/* User Info Section */}
        <TouchableOpacity
          style={styles.userInfoSectionNew}
          onPress={() => handleUserPress(user)}
        >
          <View style={styles.userAvatarNew}>
            {user.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatarImageNew} />
            ) : (
              <View style={styles.fallbackAvatarNew}>
                <Text style={styles.fallbackAvatarTextNew}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {user.isOnline && <View style={styles.onlineIndicatorNew} />}
          </View>

          <View style={styles.userInfoNew}>
            <Text style={styles.userNameNew} numberOfLines={1}>
              {user.name || 'Unknown User'}
            </Text>
            {user.username && (
              <Text style={styles.userUsernameNew} numberOfLines={1}>
                @{user.username}
              </Text>
            )}
            {user.age && (
              <Text style={styles.userAgeNew}>
                {user.age} years old
              </Text>
            )}
            
            {showCompatibility && user.compatibilityScore && (
              <View style={styles.compatibilityBadgeNew}>
                <Ionicons name="heart" size={12} color="#FF6B9D" />
                <Text style={styles.compatibilityTextNew}>
                  {user.compatibilityScore}% match
                </Text>
              </View>
            )}

            {user.interests && user.interests.length > 0 && (
              <View style={styles.interestsContainerNew}>
                {user.interests.slice(0, 3).map((interest, index) => (
                  <View key={index} style={styles.interestTagNew}>
                    <Text style={styles.interestTextNew}>{interest}</Text>
                  </View>
                ))}
                {user.interests.length > 3 && (
                  <Text style={styles.moreInterestsNew}>+{user.interests.length - 3}</Text>
                )}
              </View>
            )}

            {user.isFriend && (
              <View style={styles.friendBadgeNew}>
                <Ionicons name="people" size={12} color="#22C55E" />
                <Text style={styles.friendTextNew}>Friend</Text>
              </View>
            )}
            
            {/* Match Status Badge */}
            {matchStatus === 'matched' && (
              <View style={styles.matchedBadgeNew}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.matchedTextNew}>Matched ✓</Text>
              </View>
            )}
            {matchStatus === 'pending' && (
              <View style={styles.pendingBadgeNew}>
                <Ionicons name="time-outline" size={14} color="#F59E0B" />
                <Text style={styles.pendingTextNew}>Pending ⏳</Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
        </TouchableOpacity>
        
        {/* Quick Action Buttons - Inside Same Card */}
        {!matchStatus && (
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.passActionButton]}
              onPress={() => handlePassUser(user.id, user.name)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.likeActionButton]}
              onPress={() => handleMatchUser(user.id, user.name, 'like')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Ionicons name="heart-circle" size={40} color="#10B981" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.superLikeActionButton]}
              onPress={() => handleMatchUser(user.id, user.name, 'super_like')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Ionicons name="star" size={32} color="#FFD700" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title, users, icon, showCompatibility = false) => {
    // Filter out passed users
    const filteredUsers = users?.filter(user => !passedUserIds.has(user.id)) || [];
    
    return (
      <View style={styles.sectionNew}>
        <View style={styles.sectionHeaderNew}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon} size={18} color="#FFD6F2" />
          </View>
          <Text style={styles.sectionTitleNew}>{title}</Text>
          <View style={styles.countBadgeNew}>
            <Text style={styles.countTextNew}>{filteredUsers?.length || 0}</Text>
          </View>
        </View>
        
        {filteredUsers && filteredUsers.length > 0 ? (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={(props) => renderUserCard({ ...props, showCompatibility })}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="hourglass-outline" size={32} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.emptySectionTitle}>
              We're growing our community!
            </Text>
            <Text style={styles.emptySectionText}>
              We're expanding our user base to help you find your perfect match
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#1a0b2e", "#2d1b4e", "#1a0b2e"]}
          style={styles.backgroundGradient}
        >
          <View style={[styles.floatingOrb, styles.orb1]} />
          <View style={[styles.floatingOrb, styles.orb2]} />
          <View style={[styles.floatingOrb, styles.orb3]} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFE8FF" />
          <Text style={styles.loadingText}>Loading explore...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a0b2e", "#2d1b4e", "#1a0b2e"]}
        style={styles.backgroundGradient}
      >
        <View style={[styles.floatingOrb, styles.orb1]} />
        <View style={[styles.floatingOrb, styles.orb2]} />
        <View style={[styles.floatingOrb, styles.orb3]} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollViewNew}
        contentContainerStyle={styles.contentContainerNew}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadExploreData(true)}
            tintColor="#FFE8FF"
            colors={["#FFE8FF"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Header */}
        <View style={styles.headerNew}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>Explore</Text>
            <Text style={styles.subtitle}>Find your next connection</Text>
          </View>
        </View>

        {/* Announcements - Edge to Edge */}
        <View style={{ marginHorizontal: -16 }}>
          <AnnouncementBanner placement="explore" />
        </View>

        {/* Search Bar - Modern Style */}
        <View style={styles.searchContainerNew}>
          <View style={styles.searchBarNew}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
            <TextInput
              placeholder="Search by name, username, or email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={styles.searchInputNew}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searching && (
              <ActivityIndicator size="small" color="#FFD6F2" />
            )}
          </View>
        </View>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <View style={styles.searchResultsContainer}>
            {searching ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="small" color="#7C2B86" />
                <Text style={styles.searchLoadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              renderSection(
                `Search Results (${searchResults.length})`,
                searchResults,
                'search'
              )
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.noResultsText}>No users found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try a different search term
                </Text>
              </View>
            )}
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
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFE8FF',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 232, 255, 0.7)',
    marginTop: 8,
    textAlign: 'center',
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
});
