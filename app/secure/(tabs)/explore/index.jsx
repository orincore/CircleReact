import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/contexts/AuthContext';
import { exploreApi } from '@/src/api/explore';
import UserProfileModal from '@/src/components/UserProfileModal';

export default function ExploreScreen() {
  const { token } = useAuth();
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

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Use the new all-sections endpoint for smart user distribution
      const response = await exploreApi.getAllSections(token);

      setTopUsers(response.topUsers || []);
      setNewUsers(response.newUsers || []);
      setCompatibleUsers(response.compatibleUsers || []);

      console.log('Explore data loaded:', {
        topUsers: response.topUsers?.length || 0,
        newUsers: response.newUsers?.length || 0,
        compatibleUsers: response.compatibleUsers?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load explore data:', error);
      Alert.alert('Error', 'Failed to load explore data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = useCallback(async (query) => {
    if (!token || !query.trim() || query.trim().length < 2) {
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

  const renderUserCard = ({ item: user, showCompatibility = false }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(user)}
    >
      <View style={styles.userAvatar}>
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.avatarImage} />
        ) : (
          <View style={styles.fallbackAvatar}>
            <Text style={styles.fallbackAvatarText}>
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        {user.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name || 'Unknown User'}
        </Text>
        {user.username && (
          <Text style={styles.userUsername} numberOfLines={1}>
            @{user.username}
          </Text>
        )}
        {user.age && (
          <Text style={styles.userAge}>
            {user.age} years old
          </Text>
        )}
        
        {showCompatibility && user.compatibilityScore && (
          <View style={styles.compatibilityBadge}>
            <Ionicons name="heart" size={12} color="#FF6B9D" />
            <Text style={styles.compatibilityText}>
              {user.compatibilityScore}% match
            </Text>
          </View>
        )}

        {user.interests && user.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {user.interests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
            {user.interests.length > 3 && (
              <Text style={styles.moreInterests}>+{user.interests.length - 3}</Text>
            )}
          </View>
        )}

        {user.isFriend && (
          <View style={styles.friendBadge}>
            <Ionicons name="people" size={12} color="#22C55E" />
            <Text style={styles.friendText}>Friend</Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="rgba(31, 17, 71, 0.4)" />
    </TouchableOpacity>
  );

  const renderSection = (title, users, icon, showCompatibility = false) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={20} color="#7C2B86" />
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{users?.length || 0}</Text>
          </View>
        </View>
        
        {users && users.length > 0 ? (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={(props) => renderUserCard({ ...props, showCompatibility })}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="hourglass-outline" size={32} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.emptySectionTitle}>
              Don't worry, we are expanding our user base
            </Text>
            <Text style={styles.emptySectionText}>
              to get you matched with the correct one
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFE8FF" />
          <Text style={styles.loadingText}>Loading explore...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <View style={styles.blurCircleLarge} />
      <View style={styles.blurCircleSmall} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Discover new connections</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(31, 17, 71, 0.45)" />
            <TextInput
              placeholder="Search by name, username, or email"
              placeholderTextColor="rgba(31, 17, 71, 0.45)"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searching && (
              <ActivityIndicator size="small" color="#7C2B86" />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 16,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
    marginBottom: 4,
  },
  userAge: {
    fontSize: 12,
    color: 'rgba(31, 17, 71, 0.5)',
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
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  interestText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7C2B86',
  },
  moreInterests: {
    fontSize: 10,
    color: 'rgba(31, 17, 71, 0.5)',
    fontWeight: '500',
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
});
