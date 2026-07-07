import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import SignupInput from "@/components/signup/SignupInput";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import LegalContentModal from "@/components/signup/LegalContentModal";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/src/api/auth";
import { MIN_AGE, calculateAge, formatDateOfBirth, isValidDateOfBirth, maxDateOfBirthFor, toDateOfBirthString } from "@/src/utils/age";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
const DEFAULT_PROFILE_IMAGE_URL =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

export default function SignupStepOne() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(data.dateOfBirth ? new Date(data.dateOfBirth) : null);
  const [tempDob, setTempDob] = useState(null);
  const [gender, setGender] = useState(data.gender);
  const [username, setUsername] = useState(data.username);
  const [password, setPassword] = useState(data.password);
  const [errors, setErrors] = useState({});
  const [usernameAvail, setUsernameAvail] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [genderQuery, setGenderQuery] = useState("");
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

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
    if (key === 'dateOfBirth') {
      next.dateOfBirth = isValidDateOfBirth(dateOfBirth) ? '' : `You must be at least ${MIN_AGE} years old`;
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
    const baseOk = (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !!gender &&
      isValidDateOfBirth(dateOfBirth) &&
      username.trim().length >= 3 &&
      password.length >= 6
    );
    return baseOk && (usernameAvail !== false);
  }, [firstName, lastName, gender, dateOfBirth, username, password, usernameAvail]);

  const onNext = () => {
    if (!canContinue) return;

    setData((prev) => ({
      ...prev,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: toDateOfBirthString(dateOfBirth),
      gender: gender.trim(),
      username: username.trim(),
      password,
      profileImage: profileImage || DEFAULT_PROFILE_IMAGE_URL,
    }));
    router.push("/signup/contact");
  };

  return (
    <SignupScreenLayout
      step={1}
      totalSteps={5}
      title="Create your profile"
      subtitle="Let's start with the basics. This helps others know who they're connecting with."
      footer={
        <Text style={[styles.legalText, { color: theme.textSecondary }]}>
          By continuing, you agree to our{' '}
          <Text style={[styles.legalLink, { color: theme.primary }]} onPress={() => setLegalModal('terms')}>
            Terms
          </Text>
          {' '}and{' '}
          <Text style={[styles.legalLink, { color: theme.primary }]} onPress={() => setLegalModal('privacy')}>
            Privacy Policy
          </Text>
        </Text>
      }
    >
      <View style={styles.profileSection}>
        <ProfilePictureUpload
          currentImage={profileImage}
          onImageSelected={handleImageSelected}
          size={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <SignupInput label="First name" error={errors.firstName}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              onBlur={() => validateField('firstName')}
              placeholder="Alex"
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
              onBlur={() => validateField('lastName')}
              placeholder="Parker"
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
              onPress={() => { setTempDob(dateOfBirth || maxDateOfBirthFor(MIN_AGE)); setShowDobPicker(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.input, { color: dateOfBirth ? theme.textPrimary : theme.textPlaceholder }]} numberOfLines={1}>
                {dateOfBirth ? `${formatDateOfBirth(dateOfBirth)} (${calculateAge(dateOfBirth)})` : "Select"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </SignupInput>
        </View>
        <View style={styles.halfField}>
          <SignupInput label="Gender" error={errors.gender}>
            <TouchableOpacity style={styles.pickerRow} onPress={() => setShowGenderPicker(true)} activeOpacity={0.7}>
              <Text style={[styles.input, { color: gender ? theme.textPrimary : theme.textPlaceholder }]} numberOfLines={1}>
                {gender ? formatTitleCase(gender) : "Select"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </SignupInput>
        </View>
      </View>

      <SignupInput label="Username" error={errors.username}>
        <Text style={[styles.atSymbol, { color: theme.textMuted }]}>@</Text>
        <TextInput
          value={username}
          onChangeText={(t) => { setUsername(t); setUsernameAvail(null); setSuggestedUsernames([]); }}
          onBlur={onUsernameBlur}
          placeholder="username"
          placeholderTextColor={theme.textPlaceholder}
          autoCapitalize="none"
          style={[styles.input, { color: theme.textPrimary }]}
        />
        {checkingUsername && <ActivityIndicator size="small" color={theme.primary} />}
        {!checkingUsername && usernameAvail === true && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
        {!checkingUsername && usernameAvail === false && <Ionicons name="close-circle" size={20} color="#EF4444" />}
      </SignupInput>
      {!checkingUsername && usernameAvail === true && (
        <Text style={styles.successText}>Username is available</Text>
      )}
      {!checkingUsername && usernameAvail === false && (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Username taken. Try one of these:</Text>
          <View style={styles.suggestionsRow}>
            {suggestedUsernames.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[styles.suggestionChip, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => { setUsername(suggestion); setUsernameAvail(null); setSuggestedUsernames([]); }}
              >
                <Text style={[styles.suggestionText, { color: theme.primary }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <SignupInput label="Password" error={errors.password}>
        <TextInput
          value={password}
          onChangeText={setPassword}
          onBlur={() => validateField('password')}
          placeholder="Min. 6 characters"
          placeholderTextColor={theme.textPlaceholder}
          secureTextEntry={!showPassword}
          style={[styles.input, { color: theme.textPrimary }]}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </SignupInput>

      <SignupPrimaryButton label="Continue" onPress={onNext} disabled={!canContinue} />

      {/* Date of Birth Picker Modal */}
      <Modal transparent visible={showDobPicker} animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDobPicker(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
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
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowGenderPicker(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHandle} />
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

      <LegalContentModal
        visible={!!legalModal}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
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
  atSymbol: {
    fontSize: 16,
    fontWeight: "500",
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
  suggestionsWrap: {
    marginTop: -10,
    marginBottom: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
    color: "#EF4444",
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    fontFamily: "Poppins",
  },
  legalText: {
    fontSize: 13,
    fontFamily: "Poppins",
    textAlign: "center",
    lineHeight: 20,
  },
  legalLink: {
    fontWeight: "700",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Poppins",
  },
});
