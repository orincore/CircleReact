import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import SignupInput from "@/components/signup/SignupInput";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import { useTheme } from "@/contexts/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SignupWizardContext } from "./_layout";

export default function SignupContact() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState(data.email);
  const [errors, setErrors] = useState({});

  const canContinue = useMemo(() => /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim()), [email]);

  const validateEmail = () => {
    setErrors({
      ...errors,
      email: /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim()) ? '' : 'Please enter a valid email',
    });
  };

  const onNext = () => {
    validateEmail();
    if (!canContinue) return;
    setData((prev) => ({ ...prev, email: email.trim() }));
    router.push("/signup/instagram");
  };

  return (
    <SignupScreenLayout
      onBack={() => router.back()}
      step={2}
      totalSteps={5}
      title="Contact details"
      subtitle="Use an email address you check often. We'll use it for verification and important updates."
    >
      <SignupInput label="Email address" error={errors.email}>
        <Ionicons name="mail-outline" size={20} color={theme.primary} />
        <TextInput
          value={email}
          onChangeText={setEmail}
          onBlur={validateEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: theme.textPrimary }]}
        />
        {email.trim() && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email.trim()) && (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        )}
      </SignupInput>
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        We'll never share your email with anyone.
      </Text>

      <View
        style={[
          styles.trustBadge,
          {
            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.06)',
            borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.18)',
          },
        ]}
      >
        <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />
        <View style={styles.trustTextContainer}>
          <Text style={[styles.trustTitle, { color: theme.textPrimary }]}>Secure and private</Text>
          <Text style={[styles.trustText, { color: theme.textSecondary }]}>
            Your contact details are encrypted and used only to protect your account.
          </Text>
        </View>
      </View>

      <SignupPrimaryButton label="Continue" onPress={onNext} disabled={!canContinue} />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins",
    padding: 0,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Poppins",
    marginTop: -10,
    marginBottom: 20,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins",
    marginBottom: 2,
  },
  trustText: {
    fontSize: 12,
    fontFamily: "Poppins",
    lineHeight: 18,
  },
});
