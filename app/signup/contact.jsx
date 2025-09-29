import React, { useContext, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";

const COUNTRY_CODES = [
  "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39",
  "+40", "+41", "+43", "+44", "+45", "+46", "+47", "+48", "+49",
  "+52", "+53", "+54", "+55", "+56", "+57", "+58",
  "+60", "+61", "+62", "+63", "+64", "+65", "+66",
  "+81", "+82", "+84", "+86",
  "+90", "+91", "+92", "+93", "+94", "+95", "+98",
  "+212", "+213", "+216", "+218",
  "+351", "+352", "+353", "+354", "+355", "+356", "+357", "+358", "+359",
  "+380", "+381", "+382", "+383", "+385", "+386", "+387", "+389",
];

export default function SignupContact() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const [email, setEmail] = useState(data.email);
  const [countryCode, setCountryCode] = useState(data.countryCode || "+1");
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber);

  const [showCodePicker, setShowCodePicker] = useState(false);
  const [errors, setErrors] = useState({});

  const canContinue = useMemo(() => {
    const okEmail = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim());
    const phoneOk = !phoneNumber || String(phoneNumber).trim().length >= 5;
    return okEmail && phoneOk;
  }, [email, phoneNumber]);

  const onNext = () => {
    // Validate inline
    const next = { ...errors };
    next.email = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim()) ? '' : 'Please enter a valid email';
    next.phoneNumber = !phoneNumber || String(phoneNumber).trim().length >= 5 ? '' : 'Phone should be at least 5 digits';
    setErrors(next);
    if (!canContinue) return;
    setData((prev) => ({ ...prev, email: email.trim(), countryCode, phoneNumber: (phoneNumber || '').trim() }));
    router.push("/signup/about");
  };

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
              <Text style={styles.title}>How can we reach you?</Text>
              <Text style={styles.subtitle}>We’ll use this to keep your account secure.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={18} color="#8880B6" />
                  <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="rgba(31, 17, 71, 0.35)" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
                </View>
                {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone (optional)</Text>
                <View style={styles.row2}>
                  <TouchableOpacity style={[styles.inputWrapper, styles.ccCol]} onPress={() => setShowCodePicker(true)}>
                    <Ionicons name="flag" size={18} color="#8880B6" />
                    <Text style={[styles.input, { paddingVertical: 14 }]}>{countryCode}</Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                  <View style={[styles.inputWrapper, styles.col]}>
                    <Ionicons name="call" size={18} color="#8880B6" />
                    <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="555-0100" placeholderTextColor="rgba(31, 17, 71, 0.35)" keyboardType="phone-pad" style={styles.input} />
                  </View>
                </View>
                {!!errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
              </View>

              <TouchableOpacity activeOpacity={0.85} style={[styles.primaryButton, !canContinue && { opacity: 0.6 }]} onPress={onNext} disabled={!canContinue}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country code picker */}
      <Modal transparent visible={showCodePicker} animationType="fade" onRequestClose={() => setShowCodePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCodePicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select country code</Text>
            <FlatList data={COUNTRY_CODES} keyExtractor={(i) => i} style={{ maxHeight: 300 }} renderItem={({ item }) => (
              <TouchableOpacity style={styles.optionRow} onPress={() => { setCountryCode(item); setShowCodePicker(false); }}>
                <Text style={styles.optionText}>{item}</Text>
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
  backButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255, 214, 242, 0.4)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 255, 255, 0.1)" },
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
  ccCol: { width: 110 },
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
});
