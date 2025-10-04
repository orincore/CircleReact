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
  Image,
  Alert,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { authApi } from "@/src/api/auth";
import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";

const GENDER_OPTIONS = ["female", "male", "non-binary", "prefer not to say"];
const AGE_OPTIONS = Array.from({ length: 120 - 13 + 1 }, (_, i) => String(13 + i));

export default function SignupStepOne() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [age, setAge] = useState(String(data.age || ""));
  const [gender, setGender] = useState(data.gender);
  const [username, setUsername] = useState(data.username);
  const [password, setPassword] = useState(data.password);
  const [errors, setErrors] = useState({});
  const [usernameAvail, setUsernameAvail] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [ageQuery, setAgeQuery] = useState("");
  const [genderQuery, setGenderQuery] = useState("");

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

  // Confetti animation when username is available
  useEffect(() => {
    if (usernameAvail === true) {
      Animated.sequence([
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 0,
          duration: 300,
          delay: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [usernameAvail]);

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

  const handleImageSelected = (uri) => {
    setProfileImage(uri);
    console.log('📸 Profile image selected:', uri);
  };

  const generateUsernameSuggestions = (base) => {
    const suggestions = [];
    const random = Math.floor(Math.random() * 999);
    suggestions.push(`${base}${random}`);
    suggestions.push(`${base}_${random}`);
    suggestions.push(`${base}.${random}`);
    if (firstName && lastName) {
      suggestions.push(`${firstName.toLowerCase()}.${lastName.toLowerCase()}`);
      suggestions.push(`${firstName.toLowerCase()}_${lastName.toLowerCase()}`);
    }
    return suggestions.slice(0, 3);
  };

  const onUsernameBlur = async () => {
    validateField('username');
    const u = username.trim();
    if (!u || errors.username) return;
    try {
      setCheckingUsername(true);
      setUsernameAvail(null);
      setSuggestedUsernames([]);
      const resp = await authApi.usernameAvailable(u);
      const available = Boolean(resp.available);
      setUsernameAvail(available);
      
      if (!available) {
        setSuggestedUsernames(generateUsernameSuggestions(u));
      }
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
      password.length >= 6 &&
      !!profileImage // Profile picture is now mandatory
    );
    return baseOk && (usernameAvail !== false);
  }, [firstName, lastName, gender, age, username, password, usernameAvail, profileImage]);

  const onNext = () => {
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
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: Number(age),
      gender: gender.trim(),
      username: username.trim(),
      password,
      profileImage,
    }));
    router.push("/signup/contact");
  };

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} showsVerticalScrollIndicator={false}>
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
            {/* Header with animated logo and progress */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <View style={styles.brandRow}>
                <Image 
                  source={require('@/assets/logo/circle-logo.png')} 
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>Circle</Text>
              </View>
              <CircularProgress progress={20} currentStep={1} totalSteps={5} />
            </Animated.View>

            {/* Welcome block with animation */}
            <Animated.View 
              style={[
                styles.welcomeBlock, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.title}>What should we call you? 👋</Text>
              <Text style={styles.subtitle}>Let's start with the basics. Don't worry, you can always change this later!</Text>
              <Text style={styles.nextStep}>✨ Next: Contact info 📧</Text>
            </Animated.View>

            {/* Glassmorphism card with animation */}
            <Animated.View 
              style={[
                styles.glassCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Profile Picture Upload */}
              <ProfilePictureUpload
                currentImage={profileImage}
                onImageSelected={handleImageSelected}
                size={120}
              />

              {/* Name inputs */}
              <View style={styles.row2}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>👤 First Name</Text>
                  <View style={[styles.inputWrapper, firstName.trim() && styles.inputWrapperFilled]}>
                    <TextInput 
                      value={firstName} 
                      onChangeText={setFirstName} 
                      onBlur={() => validateField('firstName')} 
                      placeholder="Alex" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      style={styles.input} 
                    />
                  </View>
                  {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>👤 Last Name</Text>
                  <View style={[styles.inputWrapper, lastName.trim() && styles.inputWrapperFilled]}>
                    <TextInput 
                      value={lastName} 
                      onChangeText={setLastName} 
                      onBlur={() => validateField('lastName')} 
                      placeholder="Parker" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      style={styles.input} 
                    />
                  </View>
                  {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
              </View>

              {/* Age and Gender */}
              <View style={styles.row2}>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>🎂 Age</Text>
                  <TouchableOpacity style={[styles.inputWrapper, age && styles.inputWrapperFilled]} onPress={() => setShowAgePicker(true)}>
                    <Text style={[styles.input, { paddingVertical: 14 }, !age && styles.placeholderText]}>
                      {age || "Select age"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                  {!!errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                </View>
                <View style={[styles.inputGroup, styles.col]}>
                  <Text style={styles.inputLabel}>💫 Gender</Text>
                  <TouchableOpacity style={[styles.inputWrapper, gender && styles.inputWrapperFilled]} onPress={() => setShowGenderPicker(true)}>
                    <Text style={[styles.input, { paddingVertical: 14 }, !gender && styles.placeholderText]}>
                      {gender ? formatTitleCase(gender) : "Select gender"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                  {!!errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                </View>
              </View>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>✨ Pick your unique handle</Text>
                <View style={[styles.inputWrapper, username.trim() && styles.inputWrapperFilled]}>
                  <Ionicons name="at" size={18} color="#8880B6" />
                  <TextInput 
                    value={username} 
                    onChangeText={(t) => { setUsername(t); setUsernameAvail(null); setSuggestedUsernames([]); }} 
                    onBlur={onUsernameBlur} 
                    placeholder="alex.parker" 
                    placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                    autoCapitalize="none" 
                    style={styles.input} 
                  />
                  {checkingUsername && <Ionicons name="hourglass" size={18} color="#8880B6" />}
                  {!checkingUsername && usernameAvail === true && (
                    <Animated.View style={{ transform: [{ scale: confettiAnim }] }}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </Animated.View>
                  )}
                  {!checkingUsername && usernameAvail === false && <Ionicons name="close-circle" size={20} color="#EF4444" />}
                </View>
                {!!errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                {checkingUsername && <Text style={styles.infoText}>Checking availability...</Text>}
                {!checkingUsername && usernameAvail === true && (
                  <Text style={styles.successText}>✓ Username is available!</Text>
                )}
                {!checkingUsername && usernameAvail === false && (
                  <View>
                    <Text style={styles.errorText}>✗ Username is taken. Try these:</Text>
                    <View style={styles.suggestionsWrap}>
                      {suggestedUsernames.map((suggestion) => (
                        <TouchableOpacity 
                          key={suggestion} 
                          style={styles.suggestionChip}
                          onPress={() => {
                            setUsername(suggestion);
                            setUsernameAvail(null);
                            setSuggestedUsernames([]);
                          }}
                        >
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🔒 Password</Text>
                <View style={[styles.inputWrapper, password && styles.inputWrapperFilled]}>
                  <TextInput 
                    value={password} 
                    onChangeText={setPassword} 
                    onBlur={() => validateField('password')} 
                    placeholder="Create a strong password" 
                    placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                    secureTextEntry={!showPassword}
                    style={styles.input} 
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#8880B6" />
                  </TouchableOpacity>
                </View>
                {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                <Text style={styles.trustText}>🔐 Your password stays private and secure</Text>
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

      {/* Age Picker Modal */}
      <Modal transparent visible={showAgePicker} animationType="slide" onRequestClose={() => setShowAgePicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAgePicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select your age 🎂</Text>
              <TouchableOpacity onPress={() => setShowAgePicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput 
                value={ageQuery} 
                onChangeText={setAgeQuery} 
                placeholder="Search age" 
                style={styles.searchInput} 
                placeholderTextColor="#8880B6" 
                keyboardType="numeric"
              />
            </View>
            <FlatList 
              data={filteredAges} 
              keyExtractor={(i) => i} 
              style={{ maxHeight: 300 }} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => { 
                    setAge(item); 
                    setShowAgePicker(false);
                    // Clear any existing error when selecting
                    setErrors(prev => ({ ...prev, age: '' }));
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                  {age === item && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
                </TouchableOpacity>
              )} 
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal transparent visible={showGenderPicker} animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGenderPicker(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How do you identify? 💫</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#8880B6" />
              <TextInput 
                value={genderQuery} 
                onChangeText={setGenderQuery} 
                placeholder="Search gender" 
                style={styles.searchInput} 
                placeholderTextColor="#8880B6" 
              />
            </View>
            <FlatList 
              data={filteredGenders} 
              keyExtractor={(i) => i} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.optionRow} 
                  onPress={() => { 
                    setGender(item); 
                    setShowGenderPicker(false);
                    // Clear any existing error when selecting
                    setErrors(prev => ({ ...prev, gender: '' }));
                  }}
                >
                  <Text style={styles.optionText}>{formatTitleCase(item)}</Text>
                  {gender === item && <Ionicons name="checkmark" size={20} color="#A16AE8" />}
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
  
  profilePictureSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Platform.OS === 'web' ? "#FFFFFF" : "#58468B",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  profilePictureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  profilePicture: {
    width: "100%",
    height: "100%",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(161, 106, 232, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(161, 106, 232, 0.3)",
    borderStyle: "dashed",
  },
  profilePlaceholderText: {
    fontSize: 12,
    color: "#A16AE8",
    fontWeight: "600",
    marginTop: 4,
  },
  
  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
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
    transition: "all 0.3s ease",
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
  placeholderText: {
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.5)" : "rgba(31, 17, 71, 0.35)",
  },
  
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: "rgba(161, 106, 232, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(161, 106, 232, 0.3)",
  },
  suggestionText: {
    color: Platform.OS === 'web' ? "#FFD6F2" : "#7C2B86",
    fontSize: 13,
    fontWeight: "600",
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
  
  trustText: {
    fontSize: 12,
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.7)" : "rgba(31, 17, 71, 0.6)",
    fontStyle: "italic",
    marginTop: 4,
  },
  
  errorText: { 
    marginTop: 4, 
    color: "#EF4444", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  successText: { 
    marginTop: 4, 
    color: "#10B981", 
    fontSize: 12, 
    fontWeight: "700" 
  },
  infoText: { 
    marginTop: 4, 
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.7)" : "#6B7280", 
    fontSize: 12 
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
