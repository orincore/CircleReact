import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Modal, 
  FlatList,
  Animated,
  useWindowDimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";

const COUNTRY_CODES = [
  { code: "+1", country: "US/Canada" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "India" },
  { code: "+86", country: "China" },
  { code: "+81", country: "Japan" },
  { code: "+82", country: "South Korea" },
  { code: "+61", country: "Australia" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+39", country: "Italy" },
  { code: "+34", country: "Spain" },
  { code: "+7", country: "Russia" },
  { code: "+55", country: "Brazil" },
  { code: "+52", country: "Mexico" },
  { code: "+27", country: "South Africa" },
];

export default function SignupContact() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const [email, setEmail] = useState(data.email);
  const [countryCode, setCountryCode] = useState(data.countryCode || "+1");
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [codeQuery, setCodeQuery] = useState("");
  const [referralCode, setReferralCode] = useState(data.referralCode || "");
  const [referralValid, setReferralValid] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const filteredCodes = useMemo(() => 
    COUNTRY_CODES.filter(item => 
      item.code.includes(codeQuery) || 
      item.country.toLowerCase().includes(codeQuery.toLowerCase())
    ), 
    [codeQuery]
  );

  const canContinue = useMemo(() => {
    const okEmail = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim());
    const phoneOk = !phoneNumber || String(phoneNumber).trim().length >= 5;
    return okEmail && phoneOk;
  }, [email, phoneNumber]);

  const validateEmail = () => {
    const next = { ...errors };
    next.email = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim()) 
      ? '' 
      : 'Please enter a valid email';
    setErrors(next);
  };

  const validatePhone = () => {
    const next = { ...errors };
    next.phoneNumber = !phoneNumber || String(phoneNumber).trim().length >= 5 
      ? '' 
      : 'Phone should be at least 5 digits';
    setErrors(next);
  };

  const onNext = () => {
    validateEmail();
    validatePhone();
    if (!canContinue) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setData((prev) => ({ 
      ...prev, 
      email: email.trim(), 
      countryCode, 
      phoneNumber: (phoneNumber || '').trim(),
      referralCode: referralCode.trim().toUpperCase()
    }));
    router.push("/signup/about");
  };

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} showsVerticalScrollIndicator={false}>
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <Image 
                  source={require('@/assets/logo/circle-logo.png')} 
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>Circle</Text>
              </View>
              <CircularProgress progress={40} currentStep={2} totalSteps={5} />
            </Animated.View>

            {/* Welcome block */}
            <Animated.View 
              style={[
                styles.welcomeBlock, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.title}>How can we reach you? 📧</Text>
              <Text style={styles.subtitle}>We'll use this to keep your account secure and send you updates.</Text>
              <Text style={styles.nextStep}>✨ Next: Tell us about yourself 📝</Text>
            </Animated.View>

            {/* Glassmorphism card */}
            <Animated.View 
              style={[
                styles.glassCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📧 Email Address</Text>
                <View style={[styles.inputWrapper, email.trim() && styles.inputWrapperFilled]}>
                  <Ionicons name="mail" size={18} color={Platform.OS === 'web' ? "#FFD6F2" : "#8880B6"} />
                  <TextInput 
                    value={email} 
                    onChangeText={setEmail} 
                    onBlur={validateEmail}
                    placeholder="you@example.com" 
                    placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                    style={styles.input} 
                  />
                  {email.trim() && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email.trim()) && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
                {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                <Text style={styles.helperText}>We'll never share your email with anyone</Text>
              </View>

              {/* Phone (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📱 Phone Number (Optional)</Text>
                <View style={styles.row2}>
                  <TouchableOpacity 
                    style={[styles.inputWrapper, styles.ccCol]} 
                    onPress={() => setShowCodePicker(true)}
                  >
                    <Ionicons name="flag" size={18} color={Platform.OS === 'web' ? "#FFD6F2" : "#8880B6"} />
                    <Text style={[styles.input, { paddingVertical: 14 }]}>{countryCode}</Text>
                    <Ionicons name="chevron-down" size={18} color={Platform.OS === 'web' ? "#FFD6F2" : "#8880B6"} />
                  </TouchableOpacity>
                  <View style={[styles.inputWrapper, styles.col, phoneNumber && styles.inputWrapperFilled]}>
                    <Ionicons name="call" size={18} color={Platform.OS === 'web' ? "#FFD6F2" : "#8880B6"} />
                    <TextInput 
                      value={phoneNumber} 
                      onChangeText={setPhoneNumber} 
                      onBlur={validatePhone}
                      placeholder="555-0100" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      keyboardType="phone-pad" 
                      style={styles.input} 
                    />
                  </View>
                </View>
                {!!errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                <Text style={styles.helperText}>Optional, but helps with account recovery</Text>
              </View>

              {/* Referral Code (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🎁 Referral Code (Optional)</Text>
                <View style={[styles.inputWrapper, referralCode && styles.inputWrapperFilled]}>
                  <Ionicons name="gift" size={18} color={Platform.OS === 'web' ? "#FFD6F2" : "#8880B6"} />
                  <TextInput 
                    value={referralCode} 
                    onChangeText={(text) => setReferralCode(text.toUpperCase())} 
                    placeholder="Enter referral code" 
                    placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                    autoCapitalize="characters"
                    style={styles.input} 
                  />
                  {referralCode && referralValid && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </View>
                <Text style={styles.helperText}>Have a referral code? Enter it to get rewards! 🎉</Text>
              </View>

              {/* Trust badge */}
              <View style={styles.trustBadge}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                <View style={styles.trustTextContainer}>
                  <Text style={styles.trustTitle}>Your privacy matters</Text>
                  <Text style={styles.trustText}>We use industry-standard encryption to protect your data</Text>
                </View>
              </View>

              {/* Next Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]} 
                  onPress={onNext} 
                  disabled={!canContinue}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Country code picker modal */}
      <Modal transparent visible={showCodePicker} animationType="slide" onRequestClose={() => setShowCodePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCodePicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select country code 🌍</Text>
              <TouchableOpacity onPress={() => setShowCodePicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput 
                value={codeQuery} 
                onChangeText={setCodeQuery} 
                placeholder="Search country or code" 
                style={styles.searchInput} 
                placeholderTextColor="#8880B6" 
              />
            </View>
            <FlatList 
              data={filteredCodes} 
              keyExtractor={(item) => item.code} 
              style={{ maxHeight: 400 }} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => { 
                    setCountryCode(item.code); 
                    setShowCodePicker(false); 
                    setCodeQuery("");
                  }}
                >
                  <Text style={styles.optionText}>{item.code} - {item.country}</Text>
                  {countryCode === item.code && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
                </TouchableOpacity>
              )} 
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  scrollContentLarge: {
    paddingHorizontal: 60,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  contentWrapperLarge: {
    maxWidth: 800,
    width: '100%',
  },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: { 
    width: 48, 
    height: 48,
  },
  appName: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  
  welcomeBlock: { marginBottom: 20, gap: 8 },
  title: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#FFFFFF",
    lineHeight: 38,
  },
  subtitle: { 
    fontSize: 16, 
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
  },
  nextStep: {
    fontSize: 14,
    color: "rgba(255, 214, 242, 0.95)",
    fontWeight: "600",
    marginTop: 4,
  },
  
  glassCard: { 
    backgroundColor: Platform.OS === 'web' 
      ? "rgba(255, 255, 255, 0.15)" 
      : "rgba(255, 255, 255, 0.92)", 
    borderRadius: 28, 
    padding: 24, 
    gap: 20,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    }),
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  
  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  ccCol: { width: 120 },
  inputGroup: { gap: 8 },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.95)" : "#58468B",
    letterSpacing: 0.3,
  },
  inputWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.2)" : "rgba(93, 95, 239, 0.2)", 
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.1)" : "rgba(246, 245, 255, 0.9)", 
    paddingHorizontal: 16, 
    height: 54,
  },
  inputWrapperFilled: {
    borderColor: Platform.OS === 'web' ? "rgba(255, 214, 242, 0.5)" : "rgba(161, 106, 232, 0.4)",
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 1)",
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    fontWeight: "500",
  },
  
  helperText: {
    fontSize: 12,
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.7)" : "rgba(31, 17, 71, 0.6)",
    fontStyle: "italic",
    marginTop: 4,
  },
  
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Platform.OS === 'web' ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)",
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Platform.OS === 'web' ? "#FFFFFF" : "#10B981",
    marginBottom: 2,
  },
  trustText: {
    fontSize: 12,
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.8)" : "rgba(31, 17, 71, 0.7)",
    lineHeight: 16,
  },
  
  primaryButton: { 
    backgroundColor: "#A16AE8",
    borderRadius: 999, 
    paddingVertical: 18, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#A16AE8",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#D1C9FF",
  },
  primaryButtonText: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  
  errorText: { 
    marginTop: 4, 
    color: "#EF4444", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  
  // Modal styles
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "flex-end",
  },
  modalCard: { 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#1F1147" 
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(246, 245, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(93, 95, 239, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F1147",
  },
  optionRow: { 
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(93, 95, 239, 0.1)",
  },
  optionText: { 
    fontSize: 16, 
    color: "#1F1147",
    fontWeight: "500",
  },
});
