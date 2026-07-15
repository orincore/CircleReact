import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Loader from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { chatApi } from "@/src/api/chat";
import { friendsApi } from "@/src/api/friends";

// Same brand gradient + squircle avatar radius as the chat list / friends
// screens, so this reads as part of the same flow rather than a bolted-on one.
const BRAND_GRADIENT = ["#7C2B86", "#5D5FEF"];
const AVATAR_RADIUS = 16;
const MIN_MEMBERS = 2;

export default function GroupCreateScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await friendsApi.getFriendsList(token);
        if (!cancelled) setFriends(response?.friends || []);
      } catch (error) {
        console.error("Failed to load friends for group creation:", error);
        if (!cancelled) Alert.alert("Error", "Failed to load friends list. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [friends, search]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCreate = name.trim().length > 0 && selectedIds.size >= MIN_MEMBERS && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      setCreating(true);
      const memberIds = Array.from(selectedIds);
      const { chat } = await chatApi.createGroup(name.trim(), memberIds, token);
      router.replace({
        pathname: "/secure/chat-conversation",
        params: {
          id: chat.id,
          name: name.trim(),
          avatar: "",
          isGroup: "true",
        },
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      const message = error?.data?.message || error?.message || "Failed to create group. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <View style={{ width: 34 }} />
      </LinearGradient>

      <View style={[styles.nameRow, { borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.nameInput, { color: theme.textPrimary }]}
          placeholder="Group name"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
      </View>

      <View style={[styles.searchRow, { backgroundColor: isDarkMode ? theme.surface : "#F5F5F5" }]}>
        <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.textPrimary }]}
          placeholder="Search friends"
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <Text style={[styles.hint, { color: theme.textMuted }]}>
        {selectedIds.size > 0
          ? `${selectedIds.size} selected (min ${MIN_MEMBERS})`
          : `Pick at least ${MIN_MEMBERS} friends`}
      </Text>

      {loading ? (
        <View style={styles.centerLoader}>
          <Loader size={20} color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {friends.length === 0 ? "No friends yet to add to a group." : "No matches."}
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                style={styles.friendRow}
                activeOpacity={0.7}
                onPress={() => toggleSelected(item.id)}
              >
                {item.profile_photo_url ? (
                  <Image source={{ uri: item.profile_photo_url }} style={[styles.avatar, { borderColor: theme.primary + "26" }]} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                      {(item.name || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.friendName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {item.name || "Friend"}
                </Text>
                <View style={[styles.checkbox, { borderColor: theme.primary }, isSelected && { backgroundColor: theme.primary }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 14 }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: canCreate ? theme.primary : theme.textMuted + "55" }]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.85}
        >
          {creating ? <Loader size={16} color="#FFFFFF" /> : <Text style={styles.createButtonText}>Create Group</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  nameRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  nameInput: {
    fontSize: 17,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  hint: {
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  centerLoader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: AVATAR_RADIUS,
    borderWidth: 1.5,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: AVATAR_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
  },
  friendName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  createButton: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
