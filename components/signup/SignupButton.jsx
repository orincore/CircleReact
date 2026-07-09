import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Loader from '@/components/Loader';
import { PRIMARY_BUTTON_COLOR, SECONDARY_BORDER_COLOR } from "./SignupScreenLayout";
import { useTheme } from "@/contexts/ThemeContext";

// Same solid #8B5CF6 pill button used on the login and landing screens.
export function SignupPrimaryButton({ label, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[
        styles.primaryButtonWrap,
        { backgroundColor: PRIMARY_BUTTON_COLOR },
        disabled && styles.primaryButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.primaryButton}>
        {loading ? <Loader size={16} color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// Outline variant matching the landing page's "Log In" secondary button.
export function SignupSecondaryButton({ label, onPress, disabled }) {
  const { isDarkMode } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.secondaryButton,
        {
          borderColor: SECONDARY_BORDER_COLOR,
          backgroundColor: isDarkMode ? "rgba(139, 92, 246, 0.08)" : "rgba(139, 92, 246, 0.05)",
        },
        disabled && styles.primaryButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.secondaryButtonText, { color: SECONDARY_BORDER_COLOR }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryButtonWrap: {
    borderRadius: 20,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "900",
    fontFamily: "Poppins",
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Poppins",
  },
});
