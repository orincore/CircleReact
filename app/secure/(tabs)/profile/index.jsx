import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, refreshUser, logOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User";
  const detailsParts = [];
  if (typeof user?.age === "number") detailsParts.push(String(user.age));
  if (user?.gender) detailsParts.push(user.gender);
  const displayDetails = detailsParts.join(" · ") || "";

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

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>My Circle</Text>
              <Text style={styles.subtitle}>Curate how the world sees you.</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push("/secure/profile/settings")}
            >
              <Ionicons name="settings" size={22} color="#FFE8FF" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <LinearGradient colors={["#FFD6F2", "#A16AE8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                {user?.profilePhotoUrl ? (
                  <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarEmoji}>✨</Text>
                )}
              </View>
            </LinearGradient>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              {user?.gender ? (
                <Ionicons
                  name={user.gender?.toLowerCase() === "female" ? "female" : user.gender?.toLowerCase() === "male" ? "male" : "male-female"}
                  size={18}
                  color="#7C2B86"
                  style={{ marginLeft: 8 }}
                />
              ) : null}
            </View>
            <Text style={styles.profileDetail}>{displayDetails}</Text>

            {/* Bio Section */}
            {user?.about && (
              <View style={styles.bioSection}>
                <Text style={styles.bioText}>{user.about}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.editButton} onPress={() => router.push("/secure/profile/edit") }>
              <Text style={styles.editButtonText}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* Details card */}
          <View style={styles.detailsCard}>
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
          </View>

          <View style={styles.actionsSection}>
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,
    gap: 24,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.78)",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  profileCard: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 16,
    boxShadow: "0px 18px 48px rgba(18, 8, 43, 0.35)",
    elevation: 18,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 48,
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarEmoji: {
    fontSize: 36,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1147",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileDetail: {
    fontSize: 14,
    color: "rgba(31, 17, 71, 0.62)",
    textAlign: "center",
  },
  editButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#FFD6F2",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C2B86",
  },
  actionsSection: {
    gap: 16,
  },
  detailsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.25)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFE8FF",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.72)",
  },
  detailValue: {
    fontSize: 14,
    color: "#FFE8FF",
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 4,
  },
  detailBlock: {
    gap: 8,
    marginTop: 6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255, 214, 242, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.35)",
  },
  needChip: {
    backgroundColor: "rgba(93, 95, 239, 0.25)",
    borderColor: "rgba(93, 95, 239, 0.35)",
  },
  chipText: {
    fontSize: 12,
    color: "#FFE8FF",
    fontWeight: "600",
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
    backgroundColor: "rgba(255, 214, 242, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 15,
    color: "#1F1147",
    lineHeight: 22,
    fontWeight: "400",
    textAlign: "center",
    fontStyle: "italic",
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
});
