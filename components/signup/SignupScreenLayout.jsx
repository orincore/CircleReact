import { useTheme } from "@/contexts/ThemeContext";
import WavyBackground from "@/components/WavyBackground";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Shared shell for every screen in the signup wizard. Mirrors app/login.jsx
// and components/LandingPage.jsx exactly (WavyBackground, Poppins, same
// card/button tokens) so the whole onboarding flow reads as one continuous
// design instead of drifting screen to screen.
export const PRIMARY_BUTTON_COLOR = "#8B5CF6";
export const SECONDARY_BORDER_COLOR = "#7C2B86";

export default function SignupScreenLayout({ onBack, step, totalSteps, title, subtitle, children, footer }) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <WavyBackground />

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.content,
              isLargeScreen && styles.contentLarge,
              { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            {(onBack || (step && totalSteps)) && (
              <View style={styles.headerRow}>
                {onBack ? (
                  <TouchableOpacity
                    onPress={onBack}
                    style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.backButton} />
                )}
                {step && totalSteps ? (
                  <View style={[styles.stepBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.stepBadgeText, { color: theme.textSecondary }]}>
                      Step {step} of {totalSteps}
                    </Text>
                  </View>
                ) : (
                  <View />
                )}
              </View>
            )}

            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.shadowColor,
                  shadowOpacity: isDarkMode ? 0.3 : 0.08,
                },
              ]}
            >
              {!!title && <Text style={[styles.formTitle, { color: theme.textPrimary }]}>{title}</Text>}
              {!!subtitle && <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
              {children}
            </View>

            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
    zIndex: 1,
  },
  contentLarge: {
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  formCard: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "900",
    fontFamily: "Poppins",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Poppins",
    marginBottom: 20,
    lineHeight: 21,
  },
});
