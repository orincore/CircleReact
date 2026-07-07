import { useTheme } from "@/contexts/ThemeContext";
import { PRIMARY_BUTTON_COLOR } from "./SignupScreenLayout";
import { StyleSheet, TextInput, View } from "react-native";

// Shared 6-digit OTP box row used by both the email-verification and
// password-reset OTP screens, so they read as one identical component.
export default function SignupOtpInput({ otp, onChange, onKeyPress, inputRefs, disabled }) {
  const { theme } = useTheme();

  return (
    <View style={styles.otpContainer}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.otpInput,
            {
              color: theme.textPrimary,
              backgroundColor: theme.background,
              borderColor: digit ? PRIMARY_BUTTON_COLOR : theme.border,
            },
            digit && styles.otpInputFilled,
            disabled && styles.otpInputDisabled,
          ]}
          value={digit}
          onChangeText={(value) => onChange(value, index)}
          onKeyPress={(e) => onKeyPress(e, index)}
          keyboardType="numeric"
          maxLength={1}
          selectTextOnFocus
          editable={!disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  otpInputFilled: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
});
