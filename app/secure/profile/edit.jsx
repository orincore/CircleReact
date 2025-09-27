import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/contexts/AuthContext";

export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();

  const initial = useMemo(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    age: typeof user?.age === "number" ? String(user.age) : "",
    gender: user?.gender || "",
    phoneNumber: user?.phoneNumber || "",
    interests: Array.isArray(user?.interests) ? user.interests.join(", ") : "",
    needs: Array.isArray(user?.needs) ? user.needs.join(", ") : "",
    profilePhotoUrl: user?.profilePhotoUrl || "",
  }), [user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const parseList = (text) => text.split(",").map(s => s.trim()).filter(Boolean);

  const onSave = async () => {
    try {
      setSaving(true);
      const payload = {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        gender: form.gender.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        profilePhotoUrl: form.profilePhotoUrl.trim() || undefined,
      };

  // Hide the bottom tab bar on this screen and restore on exit
  useEffect(() => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.setOptions?.({ tabBarStyle: { display: "none" } });
    }
    return () => {
      if (parent) {
        parent.setOptions?.({
          tabBarStyle: {
            backgroundColor: "rgba(22, 9, 45, 0.85)",
            borderTopWidth: 0,
            height: 72,
            paddingBottom: 12,
            paddingTop: 10,
          },
        });
      }
    };
  }, [navigation]);
      const ageNum = Number(form.age);
      if (!Number.isNaN(ageNum) && ageNum > 0) payload.age = ageNum;
      if (form.interests.trim()) payload.interests = parseList(form.interests);
      if (form.needs.trim()) payload.needs = parseList(form.needs);

      await updateProfile(payload);
      Alert.alert("Profile", "Profile updated successfully");
      router.back();
    } catch (e) {
      Alert.alert("Update failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
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
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#FFE8FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Basic</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={form.firstName}
                  onChangeText={v => setField("firstName", v)}
                  placeholder="Alex"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  value={form.lastName}
                  onChangeText={v => setField("lastName", v)}
                  placeholder="Parker"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.fieldRow, styles.col]}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    value={form.age}
                    onChangeText={v => setField("age", v.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder="29"
                    placeholderTextColor="rgba(31, 17, 71, 0.35)"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldRow, styles.col]}>
                  <Text style={styles.label}>Gender</Text>
                  <TextInput
                    value={form.gender}
                    onChangeText={v => setField("gender", v)}
                    placeholder="female / male / non-binary"
                    placeholderTextColor="rgba(31, 17, 71, 0.35)"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  value={form.phoneNumber}
                  onChangeText={v => setField("phoneNumber", v)}
                  placeholder="+1-555-0100"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Photo URL</Text>
                <TextInput
                  value={form.profilePhotoUrl}
                  onChangeText={v => setField("profilePhotoUrl", v)}
                  placeholder="https://..."
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>About you</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Interests</Text>
                <TextInput
                  value={form.interests}
                  onChangeText={v => setField("interests", v)}
                  placeholder="art, coffee, running"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Needs</Text>
                <TextInput
                  value={form.needs}
                  onChangeText={v => setField("needs", v)}
                  placeholder="communication, adventure"
                  placeholderTextColor="rgba(31, 17, 71, 0.35)"
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onSave}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            >
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.45)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: { width: 44 },
  container: { padding: 24, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1147",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldRow: { gap: 8 },
  label: { fontSize: 13, color: "#58468B" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(93, 95, 239, 0.25)",
    backgroundColor: "rgba(246, 245, 255, 0.9)",
    paddingHorizontal: 14,
    height: 46,
    color: "#1F1147",
  },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  saveBtn: {
    marginTop: 4,
    backgroundColor: "#FFD6F2",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#7C2B86", fontWeight: "800", fontSize: 16 },
});
