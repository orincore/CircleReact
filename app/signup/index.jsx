import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/src/api/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

const GENDER_OPTIONS = [
  "female", 
  "male", 
  "non-binary", 
  "transgender female",
  "transgender male",
  "genderqueer",
  "genderfluid",
  "agender",
  "two-spirit",
  "other",
  "prefer not to say"
];
const AGE_OPTIONS = Array.from({ length: 120 - 16 + 1 }, (_, i) => String(16 + i));
const DEFAULT_PROFILE_IMAGE_URL =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

export default function SignupStepOne() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
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
      next.age = n && n >= 16 && n <= 120 ? '' : 'Please select a valid age (16-120)';
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
    //console.log('📸 Profile image selected:', uri);
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
      !!age && ageNum >= 16 && ageNum <= 120 &&
      username.trim().length >= 3 &&
      password.length >= 6 &&
      true // Profile picture is optional
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
      // If user didn't upload a photo, store default avatar URL
      profileImage: profileImage || DEFAULT_PROFILE_IMAGE_URL,
    }));
    router.push("/signup/contact");
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowColor || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    inputContainer: {
      backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    inputContainerFocused: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
      fontWeight: '400',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonDisabled: {
      backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.border,
      opacity: 0.7,
    },
    secondaryText: {
      color: theme.textSecondary,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '500',
    },
    successText: {
      color: '#10B981',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '500',
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.headerLeft}>
                  <Image 
                    source={require('@/assets/logo/circle-logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={[styles.logoText, { color: theme.textPrimary }]}>Circle</Text>
                </View>
                <View style={[styles.stepIndicator, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.border }]}>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>Step 1 of 5</Text>
                </View>
              </Animated.View>

              {/* Title Section */}
              <Animated.View 
                style={[
                  styles.titleSection, 
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={[styles.title, { color: theme.textPrimary }]}>Create your profile</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Let's start with the basics. This helps others know who they're connecting with.
                </Text>
              </Animated.View>

              {/* Main Form Card */}
              <Animated.View 
                style={[
                  dynamicStyles.card,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                {/* Profile Picture */}
                <View style={styles.profileSection}>
                  <ProfilePictureUpload
                    currentImage={profileImage}
                    onImageSelected={handleImageSelected}
                    size={100}
                  />
                  <Text style={[styles.profileHint, { color: theme.textTertiary }]}>
                    Profile photo (optional)
                  </Text>
                </View>

                {/* Name Row */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={[dynamicStyles.label]}>First name</Text>
                    <View style={[dynamicStyles.inputContainer, firstName.trim() && dynamicStyles.inputContainerFocused]}>
                      <TextInput 
                        value={firstName} 
                        onChangeText={setFirstName} 
                        onBlur={() => validateField('firstName')} 
                        placeholder="Alex" 
                        placeholderTextColor={theme.textTertiary} 
                        style={dynamicStyles.input} 
                      />
                    </View>
                    {!!errors.firstName && <Text style={dynamicStyles.errorText}>{errors.firstName}</Text>}
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[dynamicStyles.label]}>Last name</Text>
                    <View style={[dynamicStyles.inputContainer, lastName.trim() && dynamicStyles.inputContainerFocused]}>
                      <TextInput 
                        value={lastName} 
                        onChangeText={setLastName} 
                        onBlur={() => validateField('lastName')} 
                        placeholder="Parker" 
                        placeholderTextColor={theme.textTertiary} 
                        style={dynamicStyles.input} 
                      />
                    </View>
                    {!!errors.lastName && <Text style={dynamicStyles.errorText}>{errors.lastName}</Text>}
                  </View>
                </View>

                {/* Age and Gender Row */}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={[dynamicStyles.label]}>Age</Text>
                    <TouchableOpacity 
                      style={[dynamicStyles.inputContainer, age && dynamicStyles.inputContainerFocused]} 
                      onPress={() => setShowAgePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[dynamicStyles.input, !age && { color: theme.textTertiary }]}>
                        {age || "Select"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                    {!!errors.age && <Text style={dynamicStyles.errorText}>{errors.age}</Text>}
                  </View>
                  <View style={styles.halfField}>
                    <Text style={[dynamicStyles.label]}>Gender</Text>
                    <TouchableOpacity 
                      style={[dynamicStyles.inputContainer, gender && dynamicStyles.inputContainerFocused]} 
                      onPress={() => setShowGenderPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[dynamicStyles.input, !gender && { color: theme.textTertiary }]} numberOfLines={1}>
                        {gender ? formatTitleCase(gender) : "Select"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                    {!!errors.gender && <Text style={dynamicStyles.errorText}>{errors.gender}</Text>}
                  </View>
                </View>

                {/* Username */}
                <View style={styles.fieldGroup}>
                  <Text style={[dynamicStyles.label]}>Username</Text>
                  <View style={[dynamicStyles.inputContainer, username.trim() && dynamicStyles.inputContainerFocused]}>
                    <Text style={[styles.atSymbol, { color: theme.textTertiary }]}>@</Text>
                    <TextInput 
                      value={username} 
                      onChangeText={(t) => { setUsername(t); setUsernameAvail(null); setSuggestedUsernames([]); }} 
                      onBlur={onUsernameBlur} 
                      placeholder="username" 
                      placeholderTextColor={theme.textTertiary}
                      autoCapitalize="none" 
                      style={dynamicStyles.input} 
                    />
                    {checkingUsername && <ActivityIndicator size="small" color={theme.primary} />}
                    {!checkingUsername && usernameAvail === true && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                    {!checkingUsername && usernameAvail === false && (
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                  {!!errors.username && <Text style={dynamicStyles.errorText}>{errors.username}</Text>}
                  {checkingUsername && <Text style={[styles.helperText, { color: theme.textTertiary }]}>Checking availability...</Text>}
                  {!checkingUsername && usernameAvail === true && (
                    <Text style={dynamicStyles.successText}>Username is available</Text>
                  )}
                  {!checkingUsername && usernameAvail === false && (
                    <View>
                      <Text style={dynamicStyles.errorText}>Username taken. Try one of these:</Text>
                      <View style={styles.suggestionsRow}>
                        {suggestedUsernames.map((suggestion) => (
                          <TouchableOpacity 
                            key={suggestion} 
                            style={[styles.suggestionChip, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.background, borderColor: theme.border }]}
                            onPress={() => {
                              setUsername(suggestion);
                              setUsernameAvail(null);
                              setSuggestedUsernames([]);
                            }}
                          >
                            <Text style={[styles.suggestionText, { color: theme.primary }]}>{suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <Text style={[dynamicStyles.label]}>Password</Text>
                  <View style={[dynamicStyles.inputContainer, password && dynamicStyles.inputContainerFocused]}>
                    <TextInput 
                      value={password} 
                      onChangeText={setPassword} 
                      onBlur={() => validateField('password')} 
                      placeholder="Min. 6 characters" 
                      placeholderTextColor={theme.textTertiary}
                      secureTextEntry={!showPassword}
                      style={dynamicStyles.input} 
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={theme.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  {!!errors.password && <Text style={dynamicStyles.errorText}>{errors.password}</Text>}
                </View>

              </Animated.View>

              {/* Continue Button */}
              <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={[dynamicStyles.primaryButton, !canContinue && dynamicStyles.primaryButtonDisabled]} 
                  onPress={onNext} 
                  disabled={!canContinue}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>

              {/* Info hint when form incomplete */}
              {!canContinue && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <Text style={[styles.formHint, { color: theme.textTertiary }]}>
                    Please fill in all required fields to continue. You can add a photo now or later.
                  </Text>
                </Animated.View>
              )}

              {/* Legal */}
              <View style={styles.legalContainer}>
                <Text style={[styles.legalText, { color: theme.textTertiary }]}>
                  By continuing, you agree to our{' '}
                  <Text 
                    style={[styles.legalLink, { color: theme.primary }]} 
                    onPress={() => Platform.OS === 'web' ? router.push('/terms') : Linking.openURL('https://circle.orincore.com/terms.html')}
                  >
                    Terms
                  </Text>
                  {' '}and{' '}
                  <Text 
                    style={[styles.legalLink, { color: theme.primary }]} 
                    onPress={() => Platform.OS === 'web' ? router.push('/legal/privacy-policy') : Linking.openURL('https://circle.orincore.com/privacy.html')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Age Picker Modal */}
      <Modal transparent visible={showAgePicker} animationType="slide" onRequestClose={() => setShowAgePicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAgePicker(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select age</Text>
              <TouchableOpacity onPress={() => setShowAgePicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textTertiary} />
              <TextInput 
                value={ageQuery} 
                onChangeText={setAgeQuery} 
                placeholder="Search" 
                style={[styles.searchInput, { color: theme.textPrimary }]} 
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <FlatList 
              data={filteredAges} 
              keyExtractor={(i) => i} 
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.optionItem, { borderBottomColor: theme.border }]} 
                  onPress={() => { 
                    setAge(item); 
                    setShowAgePicker(false);
                    setErrors(prev => ({ ...prev, age: '' }));
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>{item} years</Text>
                  {age === item && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                </TouchableOpacity>
              )} 
            />
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal transparent visible={showGenderPicker} animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGenderPicker(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select gender</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textTertiary} />
              <TextInput 
                value={genderQuery} 
                onChangeText={setGenderQuery} 
                placeholder="Search" 
                style={[styles.searchInput, { color: theme.textPrimary }]} 
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <FlatList 
              data={filteredGenders} 
              keyExtractor={(i) => i} 
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.optionItem, { borderBottomColor: theme.border }]} 
                  onPress={() => { 
                    setGender(item); 
                    setShowGenderPicker(false);
                    setErrors(prev => ({ ...prev, gender: '' }));
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>{formatTitleCase(item)}</Text>
                  {gender === item && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                </TouchableOpacity>
              )} 
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 12, 
    paddingBottom: 40 
  },
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
    maxWidth: 560,
    width: '100%',
  },

  // Header
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: { 
    width: 36, 
    height: 36,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Title Section
  titleSection: { 
    marginBottom: 24,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 15, 
    lineHeight: 22,
  },

  // Profile Section
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileHint: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },

  // Form Layout
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
  },

  // Username @ symbol
  atSymbol: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 2,
  },

  // Helper text
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },

  // Suggestions
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Button
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },

  // Form hint
  formHint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },

  // Legal
  legalContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  legalText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  legalLink: {
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: { 
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  optionText: { 
    fontSize: 16,
    fontWeight: "500",
  },

  // Divider (kept for compatibility)
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
});
