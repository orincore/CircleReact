import React, { useContext, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";

export default function SignupAbout() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const [about, setAbout] = useState(data.about || "");
  const [error, setError] = useState("");

  const validateAbout = () => {
    const trimmedAbout = about.trim();
    if (!trimmedAbout) {
      setError("About section is required");
      return false;
    }
    if (trimmedAbout.length < 10) {
      setError("About section must be at least 10 characters");
      return false;
    }
    if (trimmedAbout.length > 500) {
      setError("About section must be less than 500 characters");
      return false;
    }
    setError("");
    return true;
  };

  const onNext = () => {
    if (!validateAbout()) return;
    
    setData((prev) => ({
      ...prev,
      about: about.trim(),
    }));
    router.push("/signup/instagram");
  };

  const onBack = () => {
    router.back();
  };

  const canContinue = about.trim().length >= 10 && about.trim().length <= 500;

  return (
    <LinearGradient 
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]} 
      locations={[0, 0.55, 1]} 
      style={styles.gradient} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.flex} 
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <View style={styles.circleLogo}>
                  <Text style={styles.logoText}>C</Text>
                </View>
                <Text style={styles.appName}>Circle</Text>
              </View>
              <View style={styles.placeholder} />
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '60%' }]} />
              </View>
              <Text style={styles.progressText}>Step 3 of 5</Text>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.title}>Tell us about yourself</Text>
              <Text style={styles.subtitle}>
                Share a bit about who you are and what makes you unique. This helps others get to know you better.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>About Me</Text>
                <View style={styles.textAreaWrapper}>
                  <TextInput
                    value={about}
                    onChangeText={(text) => {
                      setAbout(text);
                      if (error) validateAbout();
                    }}
                    onBlur={validateAbout}
                    placeholder="I'm passionate about technology and love exploring new places. When I'm not coding, you can find me hiking or trying out new coffee shops. I believe in making meaningful connections and always up for a good conversation about life, dreams, and everything in between..."
                    placeholderTextColor="rgba(31, 17, 71, 0.35)"
                    style={styles.textArea}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
                
                {/* Character count */}
                <View style={styles.characterCount}>
                  <Text style={[
                    styles.characterCountText,
                    about.length > 450 && styles.characterCountWarning,
                    about.length >= 500 && styles.characterCountError
                  ]}>
                    {about.length}/500 characters
                  </Text>
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}
                
                {/* Tips */}
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsTitle}>💡 Tips for a great about section:</Text>
                  <Text style={styles.tipText}>• Share your interests and hobbies</Text>
                  <Text style={styles.tipText}>• Mention what you're looking for</Text>
                  <Text style={styles.tipText}>• Be authentic and genuine</Text>
                  <Text style={styles.tipText}>• Keep it positive and engaging</Text>
                </View>
              </View>

              <TouchableOpacity 
                activeOpacity={0.85} 
                style={[styles.primaryButton, !canContinue && { opacity: 0.6 }]} 
                onPress={onNext} 
                disabled={!canContinue}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#7C2B86" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40 },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 16
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  circleLogo: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: "rgba(255, 214, 242, 0.25)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  logoText: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  appName: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  placeholder: { width: 40 },
  progressContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD6F2",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  welcomeBlock: { marginBottom: 24, gap: 6 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { 
    fontSize: 16, 
    color: "rgba(255, 255, 255, 0.82)",
    lineHeight: 22
  },
  card: { 
    backgroundColor: "rgba(255, 255, 255, 0.92)", 
    borderRadius: 22, 
    padding: 24, 
    gap: 22, 
    boxShadow: "0px 12px 24px rgba(18, 8, 43, 0.35)", 
    elevation: 20 
  },
  inputGroup: { gap: 8 },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#58468B", 
    letterSpacing: 0.3, 
    textTransform: "uppercase" 
  },
  textAreaWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(93, 95, 239, 0.25)",
    backgroundColor: "rgba(246, 245, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
  },
  textArea: {
    fontSize: 16,
    color: "#1F1147",
    lineHeight: 22,
    minHeight: 96,
  },
  characterCount: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    color: "rgba(31, 17, 71, 0.5)",
    fontWeight: "500",
  },
  characterCountWarning: {
    color: "#F59E0B",
  },
  characterCountError: {
    color: "#DC2626",
  },
  tipsContainer: {
    backgroundColor: "rgba(255, 214, 242, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C2B86",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: "rgba(31, 17, 71, 0.7)",
    marginBottom: 4,
    lineHeight: 18,
  },
  primaryButton: { 
    backgroundColor: "#FFD6F2", 
    borderRadius: 999, 
    paddingVertical: 16, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { 
    fontSize: 16, 
    fontWeight: "800", 
    color: "#7C2B86" 
  },
  errorText: { 
    marginTop: 6, 
    color: "#D92D20", 
    fontSize: 12, 
    fontWeight: "600" 
  },
});
