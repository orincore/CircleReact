import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import WavyBackground from "@/components/WavyBackground";
import { MIN_AGE, calculateAge, formatDateOfBirth, isValidDateOfBirth, maxDateOfBirthFor } from "@/src/utils/age";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY_BUTTON_COLOR = "#8B5CF6";

// Existing users signed up before date-of-birth was collected only have an
// `age` snapshot on file, which goes stale. This modal is mandatory (no
// close button, Android back does nothing) and blocks the app until the
// user supplies a real date of birth so profiles.age can be kept accurate
// going forward - see workers/age-resync.ts on the backend.
export default function DateOfBirthMigrationModal() {
  const { user, updateProfile } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [showPicker, setShowPicker] = useState(Platform.OS === "android" ? false : true);
  const [submitting, setSubmitting] = useState(false);

  const visible = !!user?.needsDobMigration;
  if (!visible) return null;

  const handleSubmit = async () => {
    if (!isValidDateOfBirth(dateOfBirth)) {
      Alert.alert("Invalid date", `You must be at least ${MIN_AGE} years old.`);
      return;
    }
    try {
      setSubmitting(true);
      const isoDate = dateOfBirth.toISOString().slice(0, 10);
      await updateProfile({ dateOfBirth: isoDate });
    } catch (e) {
      Alert.alert("Something went wrong", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WavyBackground />
        <View
          style={[
            styles.content,
            { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="calendar" size={40} color={PRIMARY_BUTTON_COLOR} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>One quick thing</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We need your date of birth to keep your age accurate on Circle. This only takes a second.
          </Text>

          {Platform.OS === "android" && (
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
              <Text style={[styles.dateButtonText, { color: dateOfBirth ? theme.textPrimary : theme.textPlaceholder }]}>
                {dateOfBirth ? `${formatDateOfBirth(dateOfBirth)} (${calculateAge(dateOfBirth)})` : "Select date of birth"}
              </Text>
            </TouchableOpacity>
          )}

          {showPicker && (
            <View style={[styles.pickerWrap, Platform.OS === "ios" && { backgroundColor: theme.surface }]}>
              <DateTimePicker
                value={dateOfBirth || maxDateOfBirthFor(MIN_AGE)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={maxDateOfBirthFor(MIN_AGE)}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant={isDarkMode ? "dark" : "light"}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === "android") {
                    setShowPicker(false);
                    if (event.type === "set" && selectedDate) setDateOfBirth(selectedDate);
                  } else if (selectedDate) {
                    setDateOfBirth(selectedDate);
                  }
                }}
              />
            </View>
          )}

          {Platform.OS === "ios" && dateOfBirth && (
            <Text style={[styles.iosPreview, { color: theme.textSecondary }]}>
              {formatDateOfBirth(dateOfBirth)} (Age {calculateAge(dateOfBirth)})
            </Text>
          )}

          <View style={styles.spacer} />

          <TouchableOpacity
            style={[
              styles.continueButtonWrap,
              { backgroundColor: PRIMARY_BUTTON_COLOR },
              (!dateOfBirth || submitting) && styles.continueButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!dateOfBirth || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>{submitting ? "Saving..." : "Continue"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 1,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  pickerWrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  iosPreview: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  spacer: {
    flex: 1,
  },
  continueButtonWrap: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
});
