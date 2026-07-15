import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Loader from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { chatApi } from "@/src/api/chat";
import { friendsApi } from "@/src/api/friends";

const BRAND_GRADIENT = ["#7C2B86", "#5D5FEF"];
const AVATAR_RADIUS = 16;

export default function GroupInfoScreen() {
  const { chatId, name: paramName } = useLocalSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState(typeof paramName === "string" ? paramName : "");

  // Deep link / no params -- hydrate the name directly rather than relying
  // on whatever navigated here to have passed it along.
  useEffect(() => {
    if (groupName || !token || !chatId) return;
    (async () => {
      try {
        const { chat } = await chatApi.getChat(chatId, token);
        if (chat?.group_name) setGroupName(chat.group_name);
      } catch (error) {
        console.error("Failed to load group chat info:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, token]);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addableFriends, setAddableFriends] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const myUserId = user?.id ? String(user.id) : null;
  const isOwner = members.some((m) => String(m.user_id) === myUserId && m.role === "owner");

  const loadMembers = useCallback(async () => {
    if (!token || !chatId) return;
    try {
      const { members: rows } = await chatApi.getMembers(chatId, token);
      setMembers(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Failed to load group members:", error);
      Alert.alert("Error", "Failed to load group info.");
    } finally {
      setLoading(false);
    }
  }, [chatId, token]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const memberIds = useMemo(() => new Set(members.map((m) => String(m.user_id))), [members]);

  const openRename = () => {
    setRenameValue(groupName);
    setRenaming(true);
  };

  const submitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || busy) return;
    try {
      setBusy(true);
      await chatApi.renameGroup(chatId, trimmed, token);
      setGroupName(trimmed);
      setRenaming(false);
    } catch (error) {
      console.error("Failed to rename group:", error);
      Alert.alert("Error", "Failed to rename group.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    Alert.alert(
      "Remove member",
      `Remove ${memberName} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await chatApi.removeGroupMember(chatId, memberId, token);
              await loadMembers();
            } catch (error) {
              console.error("Failed to remove member:", error);
              Alert.alert("Error", "Failed to remove member.");
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave group",
      "Are you sure you want to leave this group?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await chatApi.leaveGroup(chatId, token);
              router.replace("/secure/(tabs)/chat");
            } catch (error) {
              console.error("Failed to leave group:", error);
              Alert.alert("Error", "Failed to leave group.");
            }
          },
        },
      ]
    );
  };

  const openAddPicker = async () => {
    setShowAddPicker(true);
    setSelectedToAdd(new Set());
    try {
      const response = await friendsApi.getFriendsList(token);
      const friends = (response?.friends || []).filter((f) => !memberIds.has(String(f.id)));
      setAddableFriends(friends);
    } catch (error) {
      console.error("Failed to load friends to add:", error);
    }
  };

  const submitAddMembers = async () => {
    if (selectedToAdd.size === 0 || busy) return;
    try {
      setBusy(true);
      await chatApi.addGroupMembers(chatId, Array.from(selectedToAdd), token);
      setShowAddPicker(false);
      await loadMembers();
    } catch (error) {
      console.error("Failed to add members:", error);
      Alert.alert("Error", "Failed to add members.");
    } finally {
      setBusy(false);
    }
  };

  const toggleAddSelected = (id) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={{ width: 34 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.centerLoader}>
          <Loader size={20} color={theme.primary} />
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.nameRow, { borderBottomColor: theme.border }]}
            onPress={isOwner ? openRename : undefined}
            disabled={!isOwner}
            activeOpacity={isOwner ? 0.7 : 1}
          >
            <View style={[styles.groupAvatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.groupAvatarInitial, { color: theme.primary }]}>
                {(groupName || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.groupName, { color: theme.textPrimary }]} numberOfLines={1}>
                {groupName || "Group"}
              </Text>
              <Text style={[styles.memberCount, { color: theme.textMuted }]}>
                {members.length} member{members.length !== 1 ? "s" : ""}
              </Text>
            </View>
            {isOwner && <Ionicons name="create-outline" size={20} color={theme.textMuted} />}
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity style={styles.addRow} onPress={openAddPicker} activeOpacity={0.7}>
              <View style={[styles.addIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="person-add-outline" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.addRowText, { color: theme.primary }]}>Add members</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={members}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim() || item.username || "Member";
              const isSelf = String(item.user_id) === myUserId;
              return (
                <View style={styles.memberRow}>
                  {item.profile_photo_url ? (
                    <Image source={{ uri: item.profile_photo_url }} style={[styles.avatar, { borderColor: theme.primary + "26" }]} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.avatarInitial, { color: theme.primary }]}>{fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.memberName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {isSelf ? "You" : fullName}
                    </Text>
                    {item.role === "owner" && (
                      <Text style={[styles.roleLabel, { color: theme.primary }]}>Owner</Text>
                    )}
                  </View>
                  {isOwner && !isSelf && (
                    <TouchableOpacity onPress={() => handleRemoveMember(item.user_id, fullName)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={22} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />

          <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeave} activeOpacity={0.85}>
              <Ionicons name="exit-outline" size={18} color="#FF4444" />
              <Text style={styles.leaveButtonText}>Leave Group</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Rename modal */}
      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Rename Group</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
              value={renameValue}
              onChangeText={setRenameValue}
              maxLength={80}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setRenaming(false)} style={styles.modalActionButton}>
                <Text style={{ color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={styles.modalActionButton} disabled={busy}>
                {busy ? <Loader size={14} color={theme.primary} /> : <Text style={{ color: theme.primary, fontWeight: "700" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add members modal */}
      <Modal visible={showAddPicker} transparent animationType="slide" onRequestClose={() => setShowAddPicker(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.addSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Members</Text>
            <FlatList
              data={addableFriends}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 16 }}>No friends left to add.</Text>}
              renderItem={({ item }) => {
                const isSelected = selectedToAdd.has(item.id);
                return (
                  <TouchableOpacity style={styles.memberRow} onPress={() => toggleAddSelected(item.id)} activeOpacity={0.7}>
                    {item.profile_photo_url ? (
                      <Image source={{ uri: item.profile_photo_url }} style={[styles.avatar, { borderColor: theme.primary + "26" }]} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primaryLight }]}>
                        <Text style={[styles.avatarInitial, { color: theme.primary }]}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={[styles.memberName, { color: theme.textPrimary, flex: 1, marginLeft: 12 }]} numberOfLines={1}>
                      {item.name || "Friend"}
                    </Text>
                    <View style={[styles.checkbox, { borderColor: theme.primary }, isSelected && { backgroundColor: theme.primary }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddPicker(false)} style={styles.modalActionButton}>
                <Text style={{ color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitAddMembers} style={styles.modalActionButton} disabled={selectedToAdd.size === 0 || busy}>
                {busy ? <Loader size={14} color={theme.primary} /> : <Text style={{ color: theme.primary, fontWeight: "700" }}>Add ({selectedToAdd.size})</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  centerLoader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  groupAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: AVATAR_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarInitial: {
    fontSize: 22,
    fontWeight: "700",
  },
  groupName: {
    fontSize: 17,
    fontWeight: "700",
  },
  memberCount: {
    fontSize: 13,
    marginTop: 2,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  addRowText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memberRow: {
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
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
  },
  leaveButtonText: {
    marginLeft: 8,
    color: "#FF4444",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCard: {
    width: "85%",
    borderRadius: 16,
    padding: 20,
  },
  addSheet: {
    width: "90%",
    maxHeight: "70%",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 20,
  },
  modalActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
