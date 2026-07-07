import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import SignupInput from "@/components/signup/SignupInput";
import { SignupPrimaryButton, SignupSecondaryButton } from "@/components/signup/SignupButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/src/api/auth";
import { MIN_AGE, calculateAge, formatDateOfBirth, isValidDateOfBirth, maxDateOfBirthFor, toDateOfBirthString } from "@/src/utils/age";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SignupWizardContext } from "./_layout";

const GENDER_OPTIONS = [
  "female", "male", "non-binary", "transgender woman", "transgender man",
  "genderqueer", "genderfluid", "agender", "gay", "lesbian", "bisexual",
  "pansexual", "queer", "asexual", "prefer not to say",
];

export default function GoogleSignupCompletion() {
  const router = useRouter();
  const { googleCompleteSignup } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { data, setData } = useContext(SignupWizardContext);
  const params = useLocalSearchParams();

  const googleProfile = params.googleProfile ? JSON.parse(params.googleProfile) : null;
  const idToken = params.idToken;

  const [firstName, setFirstName] = useState(googleProfile?.firstName || data.firstName || "");
  const [lastName, setLastName] = useState(googleProfile?.lastName || data.lastName || "");
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth ? new Date(data.dateOfBirth) : null);
  const [tempDob, setTempDob] = useState(null);
  const [gender, setGender] = useState(data.gender || "");
  const [username, setUsername] = useState(data.username || "");
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber || "");
  const [countryCode] = useState(data.countryCode || "+1");
  const [errors, setErrors] = useState({});
  const [usernameAvail, setUsernameAvail] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [genderQuery, setGenderQuery] = useState("");

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

  const filteredGenders = useMemo(
    () => GENDER_OPTIONS.filter((g) => g.toLowerCase().includes(genderQuery.toLowerCase())),
    [genderQuery]
  );

  const formatTitleCase = (s) => {
    if (!s) return s;
    return s.split(' ').map(w => w.split('-').map(seg => seg ? seg[0].toUpperCase() + seg.slice(1) : seg).join('-')).join(' ');
  };

  const handleSubmit = async () => {
    if (!idToken) {
      alert('Google authentication expired. Please try again.');
      router.back();
      return;
    }

    if (!firstName.trim()) return setErrors({ firstName: 'First name is required' });
    if (!lastName.trim()) return setErrors({ lastName: 'Last name is required' });
    if (!isValidDateOfBirth(dateOfBirth)) return setErrors({ dateOfBirth: `You must be at least ${MIN_AGE} years old` });
    if (!gender) return setErrors({ gender: 'Please select your gender' });
    if (!username || username.length < 3) return setErrors({ username: 'Username must be at least 3 characters' });
    if (usernameAvail === false) return setErrors({ username: 'Username is already taken' });

    setSubmitting(true);
    setErrors({});

    try {
      const signupData = {
        idToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: toDateOfBirthString(dateOfBirth),
        gender: gender.trim(),
        username: username.trim().toLowerCase(),
        phoneNumber: phoneNumber ? `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}` : undefined,
        interests: data.interests || [],
        needs: data.needs || [],
        instagramUsername: data.instagramUsername || undefined,
        about: data.about || undefined,
      };

      await googleCompleteSignup(signupData);
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
      <SignupScreenLayout title="Something went wrong" subtitle="Invalid Google authentication data.">
        <SignupSecondaryButton label="Go Back" onPress={() => router.back()} />
      </SignupScreenLayout>
    );
  }

  return (
    <SignupScreenLayout
      onBack={() => router.back()}
      title="Complete your profile"
      subtitle={`We've got your basic info from Google (${googleProfile.email}). Just fill in a few more details to get started.`}
    >
      <View style={styles.row}>
        <View style={styles.halfField}>
          <SignupInput label="First name" error={errors.firstName}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={theme.textPlaceholder}
              style={[styles.input, { color: theme.textPrimary }]}
            />
          </SignupInput>
        </View>
        <View style={styles.halfField}>
          <SignupInput label="Last name" error={errors.lastName}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={theme.textPlaceholder}
              style={[styles.input, { color: theme.textPrimary }]}
            />
          </SignupInput>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <SignupInput label="Date of birth" error={errors.dateOfBirth}>
            <TouchableOpacity
              style={styles.pickerRow}
              activeOpacity={0.7}
              onPress={() => { setTempDob(dateOfBirth || maxDateOfBirthFor(MIN_AGE)); setShowDobPicker(true); }}
            >
              <Text style={[styles.input, { color: dateOfBirth ? theme.textPrimary : theme.textPlaceholder }]} numberOfLines={1}>
                {dateOfBirth ? `${formatDateOfBirth(dateOfBirth)} (${calculateAge(dateOfBirth)})` : "Select date"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </SignupInput>
        </View>
        <View style={styles.halfField}>
          <SignupInput label="Gender" error={errors.gender}>
            <TouchableOpacity style={styles.pickerRow} activeOpacity={0.7} onPress={() => setShowGenderPicker(true)}>
              <Text style={[styles.input, { color: gender ? theme.textPrimary : theme.textPlaceholder }]} numberOfLines={1}>
                {gender ? formatTitleCase(gender) : "Select gender"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </SignupInput>
        </View>
      </View>

      <SignupInput label="Username" error={errors.username}>
        <Ionicons name="at" size={18} color={theme.textMuted} />
        <TextInput
          value={username}
          onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
          placeholder="Choose a unique username"
          placeholderTextColor={theme.textPlaceholder}
          style={[styles.input, { color: theme.textPrimary }]}
          autoCapitalize="none"
        />
        {checkingUsername && <Ionicons name="hourglass-outline" size={18} color={theme.textMuted} />}
        {!checkingUsername && usernameAvail === true && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
        {!checkingUsername && usernameAvail === false && <Ionicons name="close-circle" size={18} color="#EF4444" />}
      </SignupInput>
      {usernameAvail === true && <Text style={styles.successText}>Username is available!</Text>}

      <SignupInput label="Phone number (optional)">
        <Ionicons name="call-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="1234567890"
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="phone-pad"
          style={[styles.input, { color: theme.textPrimary }]}
        />
      </SignupInput>

      <SignupPrimaryButton
        label={submitting ? "Creating account..." : "Complete Signup"}
        onPress={handleSubmit}
        disabled={submitting || usernameAvail === false}
        loading={submitting}
      />
      <SignupSecondaryButton label="Skip for now, add interests" onPress={() => router.push('/signup/interests')} />

      {/* Date of Birth Picker Modal */}
      <Modal transparent visible={showDobPicker} animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select date of birth</Text>
              <TouchableOpacity onPress={() => setShowDobPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDob || maxDateOfBirthFor(MIN_AGE)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maxDateOfBirthFor(MIN_AGE)}
              minimumDate={new Date(1900, 0, 1)}
              themeVariant={isDarkMode ? 'dark' : 'light'}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDobPicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setDateOfBirth(selectedDate);
                    setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                  }
                } else if (selectedDate) {
                  setTempDob(selectedDate);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <SignupPrimaryButton
                label="Done"
                onPress={() => {
                  setDateOfBirth(tempDob);
                  setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                  setShowDobPicker(false);
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Gender Picker Modal */}
      <Modal transparent visible={showGenderPicker} animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select gender</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput
                value={genderQuery}
                onChangeText={setGenderQuery}
                placeholder="Search"
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholderTextColor={theme.textPlaceholder}
              />
            </View>
            <FlatList
              data={filteredGenders}
              keyExtractor={(item) => item}
              style={styles.optionsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomColor: theme.border }]}
                  activeOpacity={0.6}
                  onPress={() => { setGender(item); setShowGenderPicker(false); setErrors(prev => ({ ...prev, gender: '' })); }}
                >
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>{formatTitleCase(item)}</Text>
                  {gender === item && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  pickerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins",
    padding: 0,
  },
  successText: {
    marginTop: -10,
    marginBottom: 16,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
    color: "#10B981",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: "Poppins",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins",
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontFamily: "Poppins",
    fontWeight: '500',
  },
});
