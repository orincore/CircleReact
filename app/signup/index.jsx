import React, { useContext, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { authApi } from "@/src/api/auth";

const GENDER_OPTIONS = ["female", "male", "non-binary", "prefer not to say"];
const AGE_OPTIONS = Array.from({ length: 120 - 13 + 1 }, (_, i) => String(13 + i));

export default function SignupStepOne() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [age, setAge] = useState(String(data.age || ""));
  const [gender, setGender] = useState(data.gender);
  const [username, setUsername] = useState(data.username);
  const [password, setPassword] = useState(data.password);
  const [errors, setErrors] = useState({});
  const [usernameAvail, setUsernameAvail] = useState(null); // true | false | null
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [ageQuery, setAgeQuery] = useState("");
  const [genderQuery, setGenderQuery] = useState("");

  const filteredAges = useMemo(() => AGE_OPTIONS.filter((a) => a.includes(ageQuery.trim())), [ageQuery]);
  const filteredGenders = useMemo(() => GENDER_OPTIONS.filter((g) => g.toLowerCase().includes(genderQuery.toLowerCase())), [genderQuery]);

  const formatTitleCase = (s) => {
    if (!s) return s;
    return s
      .split(' ')
      .map(w => w.split('-').map(seg => seg ? seg[0].toUpperCase() + seg.slice(1) : seg).join('-'))
      .join(' ');
  };

  const validateField = (key) => {
    const next = { ...errors };
    if (key === 'firstName') next.firstName = firstName.trim() ? '' : 'First name is required';
    if (key === 'lastName') next.lastName = lastName.trim() ? '' : 'Last name is required';
    if (key === 'password') next.password = password.length >= 6 ? '' : 'Password must be at least 6 characters';
    if (key === 'age') {
      const n = Number(age);
      next.age = n && n >= 13 && n <= 120 ? '' : 'Please select a valid age (13-120)';
    }
    if (key === 'gender') next.gender = gender ? '' : 'Please select a gender';
    if (key === 'username') {
      const u = username.trim();
      if (!u) next.username = 'Username is required';
      else if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(u)) next.username = '3-30 chars, letters, numbers, _ . - only';
      else next.username = '';
    }
    setErrors(next);
  };

  const onUsernameBlur = async () => {
    validateField('username');
    const u = username.trim();
    if (!u || errors.username) return;
    try {
      setCheckingUsername(true);
      setUsernameAvail(null);
      const resp = await authApi.usernameAvailable(u);
      setUsernameAvail(Boolean(resp.available));
    } catch {
      setUsernameAvail(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const canContinue = useMemo(() => {
    const ageNum = Number(age);
    const baseOk = (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !!gender &&
      !!age && ageNum >= 13 && ageNum <= 120 &&
      username.trim().length >= 3 &&
      password.length >= 6
    );
    return baseOk && (usernameAvail !== false);
  }, [firstName, lastName, gender, age, username, password]);

  const onNext = () => {
    if (!canContinue) return;
    setData((prev) => ({
      ...prev,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: Number(age),
      gender: gender.trim(),
      username: username.trim(),
      password,
    }));
    router.push("/signup/contact");
  };

  return (
    <LinearGradient colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]} locations={[0, 0.55, 1]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <View style={styles.circleLogo}><Text style={styles.logoText}>C</Text></View>
                <Text style={styles.appName}>Circle</Text>
              </View>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.title}>Let’s set up your profile</Text>
              <Text style={styles.subtitle}>We’ll start with the basics.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.row2}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={18} color="#8880B6" />
                    <TextInput value={firstName} onChangeText={(t)=>{ setFirstName(t); }} onBlur={()=>validateField('firstName')} placeholder="Alex" placeholderTextColor="rgba(31, 17, 71, 0.35)" style={styles.input} />
                  </View>
                  {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={18} color="#8880B6" />
                    <TextInput value={lastName} onChangeText={(t)=>{ setLastName(t); }} onBlur={()=>validateField('lastName')} placeholder="Parker" placeholderTextColor="rgba(31, 17, 71, 0.35)" style={styles.input} />
                  </View>
                  {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
              </View>

              <View style={styles.row2}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowAgePicker(true)}>
                    <Ionicons name="calendar" size={18} color="#8880B6" />
                    <Text style={[styles.input, { paddingVertical: 14 }]}>{age || "Select age"}</Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                </View>
                {!!errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowGenderPicker(true)}>
                    <Ionicons name="male-female" size={18} color="#8880B6" />
                    <Text style={[styles.input, { paddingVertical: 14 }]}>{gender ? formatTitleCase(gender) : "Select gender"}</Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                </View>
                {!!errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="at" size={18} color="#8880B6" />
                  <TextInput value={username} onChangeText={(t)=>{ setUsername(t); setUsernameAvail(null); }} onBlur={onUsernameBlur} placeholder="alex.parker" placeholderTextColor="rgba(31, 17, 71, 0.35)" autoCapitalize="none" style={styles.input} />
                </View>
                {!!errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                {checkingUsername && <Text style={styles.infoText}>Checking availability...</Text>}
                {!checkingUsername && usernameAvail === true && <Text style={styles.successText}>Username is available</Text>}
                {!checkingUsername && usernameAvail === false && <Text style={styles.errorText}>Username is taken</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={18} color="#8880B6" />
                  <TextInput value={password} onChangeText={(t)=>{ setPassword(t); }} onBlur={()=>validateField('password')} placeholder="Create a strong password" placeholderTextColor="rgba(31, 17, 71, 0.35)" secureTextEntry style={styles.input} />
                </View>
                {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              <TouchableOpacity activeOpacity={0.85} style={[styles.primaryButton, !canContinue && { opacity: 0.6 }]} onPress={onNext} disabled={!canContinue}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Age Picker */}
      <Modal transparent visible={showAgePicker} animationType="fade" onRequestClose={() => setShowAgePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAgePicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select age</Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput value={ageQuery} onChangeText={setAgeQuery} placeholder="Search age" style={styles.searchInput} placeholderTextColor="#8880B6" />
            </View>
            <FlatList data={filteredAges} keyExtractor={(i) => i} style={{ maxHeight: 300 }} renderItem={({ item }) => (
              <TouchableOpacity style={styles.optionRow} onPress={() => { setAge(item); setShowAgePicker(false); }}>
                <Text style={styles.optionText}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gender Picker */}
      <Modal transparent visible={showGenderPicker} animationType="fade" onRequestClose={() => setShowGenderPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select gender</Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput value={genderQuery} onChangeText={setGenderQuery} placeholder="Search gender" style={styles.searchInput} placeholderTextColor="#8880B6" />
            </View>
            <FlatList data={filteredGenders} keyExtractor={(i) => i} renderItem={({ item }) => (
              <TouchableOpacity style={styles.optionRow} onPress={() => { setGender(item); setShowGenderPicker(false); }}>
                <Text style={styles.optionText}>{formatTitleCase(item)}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  circleLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 214, 242, 0.25)", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  appName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  welcomeBlock: { marginTop: 32, gap: 6 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.82)" },
  card: { marginTop: 24, backgroundColor: "rgba(255, 255, 255, 0.92)", borderRadius: 22, padding: 24, gap: 22, boxShadow: "0px 12px 24px rgba(18, 8, 43, 0.35)", elevation: 20 },
  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#58468B", letterSpacing: 0.3, textTransform: "uppercase" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(93, 95, 239, 0.25)", backgroundColor: "rgba(246, 245, 255, 0.9)", paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: 16, color: "#1F1147" },
  primaryButton: { backgroundColor: "#FFD6F2", borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { fontSize: 16, fontWeight: "800", color: "#7C2B86" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: "#1F1147" },
  optionRow: { paddingVertical: 10 },
  optionText: { fontSize: 16, color: "#1F1147" },
  errorText: { marginTop: 6, color: "#D92D20", fontSize: 12, fontWeight: "600" },
  successText: { marginTop: 6, color: "#0F7B36", fontSize: 12, fontWeight: "700" },
  infoText: { marginTop: 6, color: "#6B7280", fontSize: 12 },
});
