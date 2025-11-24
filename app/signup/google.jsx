import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";
import { GENDER_OPTIONS } from "@/constants/genders";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/src/api/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

const AGE_OPTIONS = Array.from({ length: 120 - 13 + 1 }, (_, i) => String(13 + i));

export default function GoogleSignupCompletion() {
  const router = useRouter();
  const { googleCompleteSignup } = useAuth();
  const { data, setData } = useContext(SignupWizardContext);
  const params = useLocalSearchParams();
  
  // Parse Google profile data from params
  const googleProfile = params.googleProfile ? JSON.parse(params.googleProfile) : null;
  const idToken = params.idToken;

  const [firstName, setFirstName] = useState(googleProfile?.firstName || data.firstName || "");
  const [lastName, setLastName] = useState(googleProfile?.lastName || data.lastName || "");
  const [age, setAge] = useState(String(data.age || ""));
  const [gender, setGender] = useState(data.gender || "");
  const [username, setUsername] = useState(data.username || "");
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || "");
  const [countryCode, setCountryCode] = useState(data.countryCode || "+1");
  const [errors, setErrors] = useState({});
  const [usernameAvail, setUsernameAvail] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Modal states
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

  // Check username availability
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvail(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setCheckingUsername(true);
        const response = await authApi.usernameAvailable(username.toLowerCase());
        setUsernameAvail(response.available);
      } catch (error) {
        console.error('Username check failed:', error);
        setUsernameAvail(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const filteredAges = AGE_OPTIONS.filter((a) => a.includes(ageQuery.trim()));
  const filteredGenders = GENDER_OPTIONS.filter((g) => 
    g.toLowerCase().includes(genderQuery.toLowerCase())
  );

  const formatTitleCase = (s) => {
    if (!s) return s;
    return s
      .split(' ')
      .map(w => w.split('-').map(seg => seg ? seg[0].toUpperCase() + seg.slice(1) : seg).join('-'))
      .join(' ');
  };

  const handleSubmit = async () => {
    if (!idToken) {
      alert('Google authentication expired. Please try again.');
      router.back();
      return;
    }

    // Validate required fields
    if (!firstName.trim()) {
      setErrors({ firstName: 'First name is required' });
      return;
    }
    if (!lastName.trim()) {
      setErrors({ lastName: 'Last name is required' });
      return;
    }
    if (!age || Number(age) < 13 || Number(age) > 120) {
      setErrors({ age: 'Please select a valid age (13-120)' });
      return;
    }
    if (!gender) {
      setErrors({ gender: 'Please select your gender' });
      return;
    }
    if (!username || username.length < 3) {
      setErrors({ username: 'Username must be at least 3 characters' });
      return;
    }
    if (usernameAvail === false) {
      setErrors({ username: 'Username is already taken' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Prepare signup data
      const signupData = {
        idToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: Number(age),
        gender: gender.trim(),
        username: username.trim().toLowerCase(),
        phoneNumber: phoneNumber ? `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}` : undefined,
        interests: data.interests || [],
        needs: data.needs || [],
        instagramUsername: data.instagramUsername || undefined,
        about: data.about || undefined,
      };

      await googleCompleteSignup(signupData);
      
      // Success - user will be redirected by the auth context
    } catch (error) {
      console.error('Google signup completion failed:', error);
      
      let errorMessage = 'Signup failed. Please try again.';
      if (error.message?.includes('Username already taken')) {
        setErrors({ username: 'Username is already taken' });
        return;
      } else if (error.message?.includes('Email already in use')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!googleProfile || !idToken) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid Google authentication data</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <CircularProgress progress={60} currentStep={3} totalSteps={5} />
            </Animated.View>

            <Animated.View 
              style={[
                styles.welcomeBlock,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.title}>Complete Your Profile 🎉</Text>
              <Text style={styles.subtitle}>
                We've got your basic info from Google. Just fill in a few more details to get started!
              </Text>
              <Text style={styles.emailInfo}>
                📧 {googleProfile.email}
              </Text>
            </Animated.View>

            <Animated.View 
              style={[
                styles.glassCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Name Fields */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
                    <Ionicons name="person-outline" size={18} color="#8880B6" />
                    <TextInput 
                      value={firstName} 
                      onChangeText={setFirstName} 
                      placeholder="First name" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      style={styles.input} 
                    />
                  </View>
                  {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={[styles.inputWrapper, errors.lastName && styles.inputError]}>
                    <Ionicons name="person-outline" size={18} color="#8880B6" />
                    <TextInput 
                      value={lastName} 
                      onChangeText={setLastName} 
                      placeholder="Last name" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      style={styles.input} 
                    />
                  </View>
                  {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                </View>
              </View>

              {/* Age and Gender */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TouchableOpacity 
                    style={[styles.inputWrapper, errors.age && styles.inputError]} 
                    onPress={() => setShowAgePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#8880B6" />
                    <Text style={[styles.input, !age && styles.placeholder]}>
                      {age || "Select age"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                  {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TouchableOpacity 
                    style={[styles.inputWrapper, errors.gender && styles.inputError]} 
                    onPress={() => setShowGenderPicker(true)}
                  >
                    <Ionicons name="person-outline" size={18} color="#8880B6" />
                    <Text style={[styles.input, !gender && styles.placeholder]}>
                      {gender ? formatTitleCase(gender) : "Select gender"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#8880B6" />
                  </TouchableOpacity>
                  {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                </View>
              </View>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                  <Ionicons name="at" size={18} color="#8880B6" />
                  <TextInput 
                    value={username} 
                    onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))} 
                    placeholder="Choose a unique username" 
                    placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                    style={styles.input}
                    autoCapitalize="none"
                  />
                  {checkingUsername ? (
                    <Ionicons name="hourglass-outline" size={18} color="#8880B6" />
                  ) : usernameAvail === true ? (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  ) : usernameAvail === false ? (
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  ) : null}
                </View>
                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                {usernameAvail === false && <Text style={styles.errorText}>Username is already taken</Text>}
                {usernameAvail === true && <Text style={styles.successText}>Username is available!</Text>}
              </View>

              {/* Phone Number (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.countryCodeWrapper}>
                    <Text style={styles.countryCode}>{countryCode}</Text>
                  </View>
                  <View style={styles.phoneInputContainer}>
                    <Ionicons name="call-outline" size={18} color="#8880B6" />
                    <TextInput 
                      value={phoneNumber} 
                      onChangeText={setPhoneNumber} 
                      placeholder="1234567890" 
                      placeholderTextColor="rgba(31, 17, 71, 0.35)" 
                      keyboardType="phone-pad" 
                      style={styles.input} 
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting || usernameAvail === false}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? "Creating Account..." : "Complete Signup"}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => router.push('/signup/interests')}
              >
                <Text style={styles.skipButtonText}>Skip for now, add interests →</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Age Picker Modal */}
      <Modal visible={showAgePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Age</Text>
              <TouchableOpacity onPress={() => setShowAgePicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={ageQuery}
              onChangeText={setAgeQuery}
              placeholder="Search age..."
              style={styles.searchInput}
            />
            <FlatList
              data={filteredAges}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setAge(item);
                    setShowAgePicker(false);
                    setAgeQuery("");
                  }}
                >
                  <Text style={styles.modalItemText}>{item} years old</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal visible={showGenderPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color="#1F1147" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={genderQuery}
              onChangeText={setGenderQuery}
              placeholder="Search gender..."
              style={styles.searchInput}
            />
            <FlatList
              data={filteredGenders}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setGender(item);
                    setShowGenderPicker(false);
                    setGenderQuery("");
                  }}
                >
                  <Text style={styles.modalItemText}>{formatTitleCase(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  welcomeBlock: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  emailInfo: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  glassCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F1147',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderWidth: 2,
    borderColor: 'rgba(161, 106, 232, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
    fontWeight: '500',
  },
  placeholder: {
    color: 'rgba(31, 17, 71, 0.35)',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeWrapper: {
    backgroundColor: '#F8F9FF',
    borderWidth: 2,
    borderColor: 'rgba(161, 106, 232, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  countryCode: {
    fontSize: 16,
    color: '#1F1147',
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderWidth: 2,
    borderColor: 'rgba(161, 106, 232, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A16AE8',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#A16AE8',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButtonText: {
    color: '#A16AE8',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
  },
  searchInput: {
    margin: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    fontSize: 16,
    color: '#1F1147',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1F1147',
    fontWeight: '500',
  },
});
