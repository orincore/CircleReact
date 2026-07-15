import { useEffect, useState } from "react";
import { Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchParty } from "@/contexts/WatchPartyContext";
import { friendsApi } from "@/src/api/friends";

// Floating overlay for an active Scroll Together session -- participant
// avatars, a quick-reaction row, and host/guest controls. Rendered over the
// video/image cards, so it follows MemeCard's white-on-black-with-shadow
// convention (see MemeCard.jsx) rather than the app's light/dark theme.
const REACTION_EMOJIS = ["🔥", "😂", "😍", "👀", "💀"];

export default function WatchPartyBar({ topOffset = 60 }) {
  const { token, user } = useAuth();
  const { session, participants, reactions, isHost, endParty, leaveParty, sendReaction, invite } = useWatchParty();
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState(() => new Set());

  useEffect(() => {
    if (!showInvite) return;
    (async () => {
      try {
        const res = await friendsApi.getFriendsList(token);
        setFriends(res?.friends || []);
      } catch (error) {
        console.error("Failed to load friends for watch party invite:", error);
      }
    })();
  }, [showInvite, token]);

  if (!session) return null;

  const handleEndOrLeave = () => {
    if (isHost) {
      Alert.alert("End Watch Party", "End this watch party for everyone?", [
        { text: "Cancel", style: "cancel" },
        { text: "End", style: "destructive", onPress: endParty },
      ]);
    } else {
      leaveParty();
    }
  };

  const toggleInvite = (id) => {
    setSelectedInviteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitInvite = async () => {
    await invite(Array.from(selectedInviteIds));
    setShowInvite(false);
    setSelectedInviteIds(new Set());
  };

  return (
    <>
      <View style={[styles.bar, { top: topOffset }]} pointerEvents="box-none">
        <View style={styles.pill}>
          <Ionicons name="people" size={14} color="#FFFFFF" />
          <Text style={styles.pillText}>Scroll Together</Text>
        </View>

        <View style={styles.avatarRow}>
          {participants.slice(0, 5).map((p) => (
            <View key={p.user_id} style={styles.avatarWrap}>
              {p.profile_photo_url ? (
                <Image source={{ uri: p.profile_photo_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {(p.first_name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {participants.length > 5 && (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>+{participants.length - 5}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {isHost && (
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowInvite(true)} hitSlop={8}>
              <Ionicons name="person-add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleEndOrLeave} hitSlop={8}>
            <Ionicons name={isHost ? "stop-circle" : "exit"} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.reactionRow} pointerEvents="box-none">
        {REACTION_EMOJIS.map((emoji) => (
          <TouchableOpacity key={emoji} style={styles.reactionButton} onPress={() => sendReaction(emoji)}>
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Floating reaction bubbles -- ephemeral, auto-removed by the context */}
      <View style={styles.reactionsOverlay} pointerEvents="none">
        {reactions.map((r, i) => (
          <Text
            key={r.id}
            style={[styles.floatingEmoji, { right: 24 + (i % 3) * 20, bottom: 100 + (i % 4) * 30 }]}
          >
            {r.emoji}
          </Text>
        ))}
      </View>

      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <View style={styles.inviteBackdrop}>
          <View style={styles.inviteSheet}>
            <Text style={styles.inviteTitle}>Invite friends</Text>
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={<Text style={styles.inviteEmpty}>No friends to invite.</Text>}
              renderItem={({ item }) => {
                const isSelected = selectedInviteIds.has(item.id);
                return (
                  <TouchableOpacity style={styles.inviteRow} onPress={() => toggleInvite(item.id)} activeOpacity={0.7}>
                    {item.profile_photo_url ? (
                      <Image source={{ uri: item.profile_photo_url }} style={styles.inviteAvatar} />
                    ) : (
                      <View style={[styles.inviteAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={styles.inviteName} numberOfLines={1}>{item.name || "Friend"}</Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.inviteActions}>
              <TouchableOpacity onPress={() => setShowInvite(false)} style={styles.inviteActionButton}>
                <Text style={{ color: "#999" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitInvite} style={styles.inviteActionButton} disabled={selectedInviteIds.size === 0}>
                <Text style={{ color: "#7C2B86", fontWeight: "700" }}>Invite ({selectedInviteIds.size})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 50,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  avatarRow: {
    flexDirection: "row",
    marginLeft: 10,
  },
  avatarWrap: {
    marginLeft: -6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  avatarPlaceholder: {
    backgroundColor: "#7C2B86",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    marginLeft: "auto",
  },
  actionButton: {
    marginLeft: 10,
  },
  reactionRow: {
    position: "absolute",
    right: 12,
    bottom: 140,
    zIndex: 50,
  },
  reactionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 40,
  },
  floatingEmoji: {
    position: "absolute",
    fontSize: 28,
  },
  inviteBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  inviteSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },
  inviteEmpty: {
    textAlign: "center",
    color: "#999",
    marginTop: 16,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  inviteName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#111",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#7C2B86",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#7C2B86",
  },
  inviteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 20,
  },
  inviteActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});
