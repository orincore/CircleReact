import { useTheme } from "@/contexts/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

// Labeled input wrapper matching app/login.jsx's inputGroup/inputLabel/inputWrapper
// exactly. `children` is the actual TextInput/TouchableOpacity/icon row so this
// works for both text inputs and pressable "picker" fields (date, gender, etc).
export default function SignupInput({ label, error, children }) {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={styles.inputGroup}>
      {!!label && <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.background,
            borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : theme.border,
          },
        ]}
      >
        {children}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Poppins",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
    color: "#EF4444",
  },
});
