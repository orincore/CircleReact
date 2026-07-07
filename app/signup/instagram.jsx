import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import SignupInput from "@/components/signup/SignupInput";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useContext, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { SignupWizardContext } from "./_layout";

export default function SignupInstagram() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme } = useTheme();
  const [instagramUsername, setInstagramUsername] = useState(data.instagramUsername || '');

  const onBack = () => {
    setData((prev) => ({ ...prev, instagramUsername: instagramUsername.trim() }));
    router.back();
  };

  const onNext = () => {
    setData((prev) => ({ ...prev, instagramUsername: instagramUsername.trim() }));
    router.push("/signup/interests");
  };

  return (
    <SignupScreenLayout
      onBack={onBack}
      step={3}
      totalSteps={5}
      title="Your Instagram"
      subtitle="Share your Instagram username so people can get a better sense of who you are."
    >
      <SignupInput label="Instagram username (optional)">
        <Text style={[styles.atSymbol, { color: theme.textMuted }]}>@</Text>
        <TextInput
          value={instagramUsername}
          onChangeText={setInstagramUsername}
          placeholder="yourusername"
          placeholderTextColor={theme.textPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: theme.textPrimary }]}
        />
      </SignupInput>
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        Add your handle to make it easier for people to know you better. You can skip this for now.
      </Text>

      <SignupPrimaryButton label="Continue" onPress={onNext} />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  helperText: {
    fontSize: 12,
    fontFamily: "Poppins",
    marginTop: -10,
  },
});
