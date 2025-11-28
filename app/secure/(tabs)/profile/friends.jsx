import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { friendsApi } from "@/src/api/friends";
import { chatApi } from "@/src/api/chat";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FriendsScreen() {
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const router = useRouter();

  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingChatFor, setCreatingChatFor] = useState(null);
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

  const renderFriend = ({ item }) => {
    const isCreating = creatingChatFor === item.id;
    return (
      <TouchableOpacity
        style={[styles.friendRow, { backgroundColor: theme.surface }]}
        activeOpacity={0.8}
        onPress={() => handleStartChat(item)}
        disabled={isCreating}
      >
        <View style={styles.avatarContainer}>
          {item.profile_photo_url && item.profile_photo_url.trim() ? (
            <Image
              source={{ uri: item.profile_photo_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(item.name && item.name.charAt(0).toUpperCase()) || "?"}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {item.name || "Unknown"}
          </Text>
          {!!item.username && (
            <Text style={[styles.username, { color: theme.textSecondary }]}>@{item.username}</Text>
          )}
        </View>
        <View style={styles.chatIconContainer}>
          {isCreating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="chatbubble" size={20} color={theme.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const visibleFriends = friends.slice(0, visibleCount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Friends</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading friends...</Text>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={64}
            color={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
          />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No friends yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Add friends from matches and chat to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleFriends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (visibleCount < friends.length) {
              setVisibleCount((prev) => Math.min(prev + 20, friends.length));
            }
          }}
          onEndReachedThreshold={0.3}
          refreshing={refreshing}
          onRefresh={() => loadFriends(true)}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7C2B86",
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 13,
    marginTop: 2,
  },
  chatIconContainer: {
    marginLeft: 12,
  },
});
