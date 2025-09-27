import React, { useContext, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { useAuth } from "@/contexts/AuthContext";

const INTEREST_OPTIONS = [
  "art", "music", "coding", "coffee", "running", "yoga", "travel", "books", "movies", "gaming",
  "fitness", "food", "photography", "fashion", "tech", "design", "writing", "finance", "crypto", "ai",
];
const NEED_OPTIONS = [
  "Friendship",
  "Boyfriend",
  "Girlfriend",
  "Dating",
  "Relationship",
  "Casual"
];

export default function SignupInterests() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { signUp } = useAuth();

  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState(new Set(data.interests || []));
  const [needs, setNeeds] = useState(new Set(data.needs || []));

  const filteredInterests = useMemo(() => INTEREST_OPTIONS.filter(i => i.includes(query.toLowerCase())), [query]);
  const filteredNeeds = useMemo(() => NEED_OPTIONS.filter(i => i.includes(query.toLowerCase())), [query]);

  const toggle = (setFn, set, item) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item); else next.add(item);
    setFn(next);
  };

  const onSubmit = async () => {
    // Normalize and validate up-front so values are available in catch as well
    const norm = (() => {
      const firstName = (data.firstName || '').trim();
      const lastName = (data.lastName || '').trim();
      const username = (data.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      const gender = (data.gender || '').trim().toLowerCase();
      const email = (data.email || '').trim().toLowerCase();
      const age = Number(data.age);
      const rawPhone = (data.phoneNumber || '').trim();
      const cleanedDigits = rawPhone ? rawPhone.replace(/[^0-9]/g, '') : '';
      const phoneOut = cleanedDigits ? `${data.countryCode}${cleanedDigits}` : undefined;
      const interestArr = Array.from(interests || []).map(String);
      const needsArr = Array.from(needs || []).map(String);
      return { firstName, lastName, username, gender, email, age, phoneOut, interestArr, needsArr };
    })();

    try {
      // Validate all required fields against backend schema
      if (!norm.firstName) return alert('First name is required');
      if (!norm.lastName) return alert('Last name is required');
      if (!norm.username || norm.username.length < 3) return alert('Please provide a valid username (3-30, letters, numbers, _ . -)');
      if (!norm.gender) return alert('Please select your gender');
      if (!/[^@\s]+@[^@\s]+\.[^@\s]+/.test(norm.email)) return alert('Please enter a valid email');
      if (!norm.age || norm.age < 13 || norm.age > 120) return alert('Please select a valid age (13-120)');
      if (norm.phoneOut && norm.phoneOut.replace(/[^0-9]/g, '').length < 5) return alert('Phone should be at least 5 digits');

      const payload = {
        firstName: norm.firstName,
        lastName: norm.lastName,
        age: norm.age,
        gender: norm.gender,
        email: norm.email,
        phoneNumber: norm.phoneOut,
        username: norm.username,
        password: data.password,
        interests: norm.interestArr,
        needs: norm.needsArr,
      };
      // Debug: surface outgoing payload
      try { console.log('Signup payload', payload); } catch {}
      await signUp(payload);
      router.replace("/signup/summary");
    } catch (e) {
      try { console.log('Signup error details', e?.details); } catch {}
      // If backend complains about invalid body, attempt a single retry with empty interests/needs
      const fieldErrors = e?.details?.details?.fieldErrors || e?.details?.fieldErrors;
      if (e?.status === 400 && (e?.details?.error === 'Invalid body' || fieldErrors)) {
        const retry = {
          firstName: norm.firstName,
          lastName: norm.lastName,
          age: norm.age,
          gender: norm.gender,
          email: norm.email,
          phoneNumber: norm.phoneOut,
          username: norm.username,
          password: data.password,
          interests: [],
          needs: [],
        };
        try {
          try { console.log('Retrying signup with empty interests/needs'); } catch {}
          await signUp(retry);
          router.replace('/signup/summary');
          return;
        } catch (_e) {
          // fall through to user-facing message
        }
      }
      const firstErr = fieldErrors && Object.entries(fieldErrors).find(([, arr]) => Array.isArray(arr) && arr.length)?.[1]?.[0];
      const msg = firstErr || e?.details?.error || e?.message || 'Signup failed. Please check your details and try again.';
      alert(msg);
    }
  };

  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity key={label} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color="#7C2B86" />}
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]} locations={[0, 0.55, 1]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
                <Ionicons name="chevron-back" size={24} color="#FFE8FF" />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <View style={styles.circleLogo}><Text style={styles.logoText}>C</Text></View>
                <Text style={styles.appName}>Circle</Text>
              </View>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.title}>Pick your vibe</Text>
              <Text style={styles.subtitle}>Select interests and needs that describe you.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="search" size={18} color="#8880B6" />
                  <TextInput value={query} onChangeText={setQuery} placeholder="type to filter" placeholderTextColor="rgba(31, 17, 71, 0.35)" style={styles.input} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.chipWrap}>
                {filteredInterests.map((i) => renderChip(i, interests.has(i), () => toggle(setInterests, interests, i)))}
              </View>

              <Text style={styles.sectionTitle}>Needs</Text>
              <View style={styles.chipWrap}>
                {filteredNeeds.map((i) => renderChip(i, needs.has(i), () => toggle(setNeeds, needs, i)))}
              </View>

              <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={onSubmit}>
                <Text style={styles.primaryButtonText}>Create account</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255, 214, 242, 0.4)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.1)" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  circleLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 214, 242, 0.25)", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  appName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  welcomeBlock: { marginTop: 32, gap: 6 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.82)" },
  card: { marginTop: 24, backgroundColor: "rgba(255, 255, 255, 0.92)", borderRadius: 22, padding: 24, gap: 22, boxShadow: "0px 12px 24px rgba(18, 8, 43, 0.35)", elevation: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#58468B", letterSpacing: 0.3, textTransform: "uppercase" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(93, 95, 239, 0.25)", backgroundColor: "rgba(246, 245, 255, 0.9)", paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: 16, color: "#1F1147" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1F1147", textTransform: "uppercase", letterSpacing: 0.5 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(93, 95, 239, 0.25)", backgroundColor: "rgba(246, 245, 255, 0.9)" },
  chipSelected: { backgroundColor: "#FFD6F2", borderColor: "rgba(255, 214, 242, 0.85)", shadowColor: "#7C2B86", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  chipText: { color: "#58468B", fontWeight: "600" },
  chipTextSelected: { color: "#7C2B86" },
  primaryButton: { backgroundColor: "#FFD6F2", borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { fontSize: 16, fontWeight: "800", color: "#7C2B86" },
});
