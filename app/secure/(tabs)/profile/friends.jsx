import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { friendsApi } from "@/src/api/friends";
import { chatApi } from "@/src/api/chat";
import { FriendRequestService } from "@/src/services/FriendRequestService";
import { useResponsiveDimensions } from "@/src/hooks/useResponsiveDimensions";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Loader from '@/components/Loader';
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Same brand gradient + squircle avatar radius as the chat list screen and
// the "Start New Chat" modal, so this reads as part of the same design system.
const BRAND_GRADIENT = ['#7C2B86', '#5D5FEF'];
const AVATAR_RADIUS = 16;

export default function FriendsScreen() {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();
  const responsive = useResponsiveDimensions();
  const insets = useSafeAreaInsets();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingChatFor, setCreatingChatFor] = useState(null);
  const [showOptionsFor, setShowOptionsFor] = useState(null);
  const [unfriendingUser, setUnfriendingUser] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (!token) return;
    loadFriends();
  }, [token]);

  const loadFriends = async (isRefresh = false) => {
    if (!token) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const response = await friendsApi.getFriendsList(token);
      setFriends(response.friends || []);
      setVisibleCount(20);
    } catch (error) {
      console.error("Failed to load friends:", error);
      Alert.alert("Error", "Failed to load friends. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartChat = async (friend) => {
    if (!token || creatingChatFor) return;
    try {
      setCreatingChatFor(friend.id);
      setShowOptionsFor(null);
      const response = await chatApi.createChatWithUser(friend.id, token);
      router.push({
        pathname: "/secure/chat-conversation",
        params: {
          id: response.chat.id,
          name: response.otherUser.name,
          avatar: response.otherUser.profilePhoto,
          otherUserId: response.otherUser.id,
        },
      });
    } catch (error) {
      console.error("Failed to start chat:", error);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    } finally {
      setCreatingChatFor(null);
    }
  };

  const handleUnfriend = async (friend) => {
    if (!token || unfriendingUser) return;

    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name} from your friends list? You will no longer be able to message each other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnfriendingUser(friend.id);
              setShowOptionsFor(null);

              await FriendRequestService.unfriendUser(friend.id, token);

              setFriends(prevFriends => prevFriends.filter(f => f.id !== friend.id));

              Alert.alert('Friend Removed', `${friend.name} has been removed from your friends list.`);

            } catch (error) {
              console.error('Failed to unfriend:', error);

              let errorMessage = 'Failed to remove friend. Please try again.';
              if (error.message?.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your connection and try again.';
              } else if (error.message?.includes('Socket connection not available')) {
                errorMessage = 'Connection issue. Please refresh the page and try again.';
              }

              Alert.alert('Error', errorMessage);
            } finally {
              setUnfriendingUser(null);
            }
          }
        }
      ]
    );
  };

  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const visibleFriends = filteredFriends.slice(0, visibleCount);

  const headerTopPadding = (insets.top || (Platform.OS === 'android' ? 24 : 0)) + (Platform.OS === 'web' ? 20 : 12);

  const renderFriend = ({ item }) => {
    const isCreating = creatingChatFor === item.id;
    const isUnfriending = unfriendingUser === item.id;
    const showOptions = showOptionsFor === item.id;
    const subtitle = isCreating ? 'Starting chat...' : isUnfriending ? 'Removing friend...' : (item.username ? `@${item.username}` : 'Tap to start chat');

    return (
      <View style={styles.friendRowContainer}>
        <TouchableOpacity
          style={[styles.chatRow, { paddingHorizontal: Math.max(16, responsive.horizontalPadding) }]}
          activeOpacity={0.6}
          onPress={() => handleStartChat(item)}
          disabled={isCreating || isUnfriending}
        >
          <View style={styles.avatarContainer}>
            {item.profile_photo_url && item.profile_photo_url.trim() ? (
              <View style={{ overflow: 'hidden', borderRadius: AVATAR_RADIUS, borderWidth: 1.5, borderColor: theme.primary + '26' }}>
                <Image
                  source={{ uri: item.profile_photo_url }}
                  style={{ width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: AVATAR_RADIUS }}
                />
              </View>
            ) : (
              <View style={[styles.fallbackAvatar, { width: responsive.avatarSize, height: responsive.avatarSize, borderRadius: AVATAR_RADIUS, backgroundColor: theme.primaryLight, borderWidth: 1.5, borderColor: theme.primary + '26' }]}>
                <Text style={[styles.fallbackAvatarText, { fontSize: responsive.isSmallScreen ? 18 : 20, color: theme.primary }]}>
                  {(item.name && item.name.charAt(0).toUpperCase()) || '?'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.chatInfo}>
            <Text style={[styles.chatName, { color: theme.textPrimary, fontSize: responsive.fontSize.large }]} numberOfLines={1}>
              {item.name || 'Unknown'}
            </Text>
            <Text style={[styles.chatMessage, { color: theme.textSecondary, fontSize: responsive.fontSize.medium }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            {isCreating ? (
              <Loader size={16} color={theme.primary} />
            ) : isUnfriending ? (
              <Loader size={16} color="#FF4D4F" />
            ) : (
              <Ionicons name="chatbubble" size={20} color={theme.primary} />
            )}

            <TouchableOpacity
              style={[styles.rowMenuButton, { backgroundColor: theme.surfaceSecondary }]}
              onPress={() => setShowOptionsFor(showOptions ? null : item.id)}
              disabled={isCreating || isUnfriending}
              hitSlop={6}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={showOptions ? theme.primary : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {showOptions && (
          <View style={[styles.rowMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.rowMenuItem} onPress={() => handleUnfriend(item)}>
              <Ionicons name="person-remove-outline" size={16} color="#FF4D4F" />
              <Text style={[styles.rowMenuItemText, { color: '#FF4D4F' }]}>Remove Friend</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header: same brand gradient chrome as the chat list screen. */}
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerTopPadding }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleTap}>
            <Text style={[styles.headerTitle, { fontSize: responsive.isSmallScreen ? 26 : 30 }]}>
              Friends
            </Text>
            <Text style={styles.headerSubtitle}>
              {friends.length} friend{friends.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.headerIconButton} />
        </View>
      </LinearGradient>

      {/* Content sheet: rounded top corners overlap the header, matching
          the chat list's "card peeking out" transition. */}
      <View style={styles.sheetShadowWrap}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.searchBarWrap, { paddingHorizontal: Math.max(16, responsive.horizontalPadding) }]}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.surface,
                  borderWidth: isDarkMode ? 0 : 1,
                  borderColor: isDarkMode ? 'transparent' : theme.border,
                  shadowColor: theme.shadowColor,
                  shadowOpacity: isDarkMode ? 0.25 : 0.06,
                },
              ]}
            >
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                placeholder="Search friends"
                placeholderTextColor={theme.textPlaceholder}
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Loader size={36} color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading friends...</Text>
            </View>
          ) : (
            <FlatList
              data={visibleFriends}
              keyExtractor={(item) => item.id}
              renderItem={renderFriend}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textPrimary }]}>
                    {searchQuery ? 'No friends found' : 'No friends yet'}
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Add friends from matches and chat to see them here'
                    }
                  </Text>
                </View>
              }
              onEndReached={() => {
                if (visibleCount < filteredFriends.length) {
                  setVisibleCount((prev) => Math.min(prev + 20, filteredFriends.length));
                }
              }}
              onEndReachedThreshold={0.3}
              refreshing={refreshing}
              onRefresh={() => loadFriends(true)}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#3D1240',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleTap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  sheetShadowWrap: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  searchBarWrap: {
    paddingTop: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingTop: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  friendRowContainer: {
    position: 'relative',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  fallbackAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontWeight: '700',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  chatName: {
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  chatMessage: {
    marginTop: 2,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMenuButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rowMenu: {
    position: 'absolute',
    top: '100%',
    right: 20,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
    zIndex: 9999,
    elevation: 8,
    boxShadow: Platform.OS === 'web' ? '0 8px 24px rgba(0,0,0,0.2)' : undefined,
  },
  rowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
