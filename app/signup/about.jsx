import SignupScreenLayout, { PRIMARY_BUTTON_COLOR } from "@/components/signup/SignupScreenLayout";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { calculateAge } from "@/src/utils/age";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SignupWizardContext } from "./_layout";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.circle.orincore.com';

export default function SignupAbout() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
  const [about, setAbout] = useState(data.about || "");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();

  const onBack = () => {
    setData((prev) => ({ ...prev, about: about.trim() }));
    router.back();
  };

  const validateAbout = () => {
    if (about.trim().length < 10) {
      setError("Please write at least 10 characters about yourself");
      return false;
    }
    if (about.trim().length > 500) {
      setError("Please keep it under 500 characters");
      return false;
    }
    setError("");
    return true;
  };

  const onSubmit = async () => {
    if (isSubmitting) return;
    if (!validateAbout()) return;

    setData((prev) => ({ ...prev, about: about.trim() }));
    setSignupError("");

    try {
      setIsSubmitting(true);

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        email: data.email,
        username: data.username,
        password: data.password,
        phoneNumber: data.phoneNumber,
        interests: data.interests || [],
        needs: data.needs || [],
        about: about.trim(),
        instagramUsername: data.instagramUsername,
        referralCode: data.referralCode,
      };

      await signUp(payload);
      router.replace("/signup/summary");
    } catch (e) {
      console.error("Error during signup:", e);
      // http.ts throws a plain Error with .message set to the server's
      // error string directly (e.g. "Email already in use") - not an
      // axios-shaped e.response.data.error, which this used to check.
      setSignupError(e?.details?.error || e?.message || "Something went wrong while creating your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = about.trim().length >= 10 && !isSubmitting;

  const getCharacterCountColor = () => {
    const length = about.length;
    if (length < 10) return '#EF4444';
    if (length < 100) return '#F59E0B';
    if (length < 300) return '#10B981';
    return PRIMARY_BUTTON_COLOR;
  };

  const generateAboutMe = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_URL}/api/ai-support/generate-about-me`,
        {
          firstName: data.firstName || 'User',
          age: calculateAge(data.dateOfBirth),
          gender: data.gender,
          interests: data.interests || [],
          needs: data.needs || [],
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );

      if (response.data?.success && response.data?.bio) {
        setAbout(response.data.bio);
      } else {
        setError("Failed to generate bio. Please try again.");
      }
    } catch (err) {
      console.error('Error generating about me:', err);
      setError("Failed to generate bio. Please write your own!");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SignupScreenLayout
      onBack={onBack}
      step={5}
      totalSteps={5}
      title="Tell us your story"
      subtitle="Share a bit about who you are and what makes you unique. This helps others get to know the real you."
    >
      {!!signupError && (
        <View style={[styles.signupErrorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.signupErrorText}>{signupError}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>About Me</Text>
        <View
          style={[
            styles.textAreaWrapper,
            {
              backgroundColor: theme.background,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.border,
            },
            (isFocused || about.trim().length >= 10) && { borderColor: theme.primary },
          ]}
        >
          <TextInput
            value={about}
            onChangeText={(text) => { setAbout(text); if (error) validateAbout(); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); validateAbout(); }}
            placeholder="I'm passionate about technology and love exploring new places. When I'm not coding, you can find me hiking or trying out new coffee shops..."
            placeholderTextColor={theme.textPlaceholder}
            style={[styles.textArea, { color: theme.textPrimary }]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        <View style={styles.characterCountRow}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' },
              isGenerating && styles.generateButtonDisabled,
            ]}
            onPress={generateAboutMe}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={PRIMARY_BUTTON_COLOR} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={PRIMARY_BUTTON_COLOR} />
                <Text style={[styles.generateButtonText, { color: PRIMARY_BUTTON_COLOR }]}>AI Generate</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[styles.characterCountText, { color: getCharacterCountColor() }]}>{about.length}/500</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View
          style={[
            styles.tipsContainer,
            {
              backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.06)',
              borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.18)',
            },
          ]}
        >
          <Text style={[styles.tipsTitle, { color: theme.textPrimary }]}>Tips for a great profile</Text>
          {[
            'Share your interests and hobbies',
            "Mention what you're looking for",
            'Be authentic and genuine',
            'Keep it positive and engaging',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      <SignupPrimaryButton
        label={isSubmitting ? "Creating account..." : "Create account"}
        onPress={onSubmit}
        disabled={!canContinue}
        loading={isSubmitting}
      />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  signupErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  signupErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Poppins",
    color: "#ef4444",
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Poppins",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  textAreaWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 140,
  },
  textArea: {
    fontSize: 16,
    fontFamily: "Poppins",
    lineHeight: 22,
    minHeight: 120,
  },
  characterCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
  },
  tipsContainer: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins",
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    fontFamily: "Poppins",
    lineHeight: 18,
    flex: 1,
  },
  errorText: {
    marginTop: 8,
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Poppins",
  },
});
