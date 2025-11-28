import React, { useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Animated,
  useWindowDimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { useTheme } from "@/contexts/ThemeContext";
import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";

export default function SignupAbout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
  const [about, setAbout] = useState(data.about || "");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onBack = () => {
    setData((prev) => ({ ...prev, about: about.trim() }));
    router.back();
  };

  const onNext = () => {
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setData((prev) => ({ ...prev, about: about.trim() }));
    router.push("/signup/instagram");
  };

  const canContinue = about.trim().length >= 10;

  const getCharacterCountColor = () => {
    const length = about.length;
    if (length < 10) return '#EF4444'; // Red - too short
    if (length < 100) return '#F59E0B'; // Orange - getting there
    if (length < 300) return '#10B981'; // Green - good
    return '#A16AE8'; // Purple - excellent
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

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} showsVerticalScrollIndicator={false}>
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <Image 
                  source={require('@/assets/logo/circle-logo.png')} 
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>Circle</Text>
              </View>
              <CircularProgress progress={60} currentStep={3} totalSteps={5} />
            </Animated.View>

            {/* Welcome block */}
            <Animated.View 
              style={[
                styles.welcomeBlock, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.title}>Tell us your story 📖</Text>
              <Text style={styles.subtitle}>
                Share a bit about who you are and what makes you unique. This helps others get to know the real you!
              </Text>
              <Text style={styles.nextStep}>✨ Next: Connect Instagram 📸</Text>
            </Animated.View>

            {/* Glassmorphism card */}
            <Animated.View 
              style={[
                styles.glassCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : theme.surface,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : theme.border,
                  borderWidth: 1,
                }
              ]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? 'rgba(255,255,255,0.9)' : theme.textSecondary }]}>📝 About Me</Text>
                <View style={[
                  styles.textAreaWrapper,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.surfaceSecondary, borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : theme.border },
                  isFocused && { borderColor: theme.primary },
                  about.trim().length >= 10 && { borderColor: theme.primary }
                ]}>
                  <TextInput
                    value={about}
                    onChangeText={(text) => {
                      setAbout(text);
                      if (error) validateAbout();
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                      setIsFocused(false);
                      validateAbout();
                    }}
                    placeholder="I'm passionate about technology and love exploring new places. When I'm not coding, you can find me hiking or trying out new coffee shops. I believe in making meaningful connections and always up for a good conversation about life, dreams, and everything in between..."
                    placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.4)' : theme.textTertiary}
                    style={[styles.textArea, { color: isDarkMode ? '#FFFFFF' : theme.textPrimary }]}
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
                    { color: getCharacterCountColor() }
                  ]}>
                    {about.length}/500 characters
                  </Text>
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}
                
                {/* Tips */}
                <View style={[styles.tipsContainer, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 214, 242, 0.2)', borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 214, 242, 0.3)' }]}>
                  <Text style={[styles.tipsTitle, { color: isDarkMode ? '#FFFFFF' : '#7C2B86' }]}>💡 Tips for a great profile:</Text>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.tipText, { color: isDarkMode ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>Share your interests and hobbies</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.tipText, { color: isDarkMode ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>Mention what you're looking for</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.tipText, { color: isDarkMode ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>Be authentic and genuine</Text>
                  </View>
                  <View style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.tipText, { color: isDarkMode ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>Keep it positive and engaging</Text>
                  </View>
                </View>
              </View>

              {/* Next Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]} 
                  onPress={onNext} 
                  disabled={!canContinue}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  scrollContentLarge: {
    paddingHorizontal: 60,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
  },
  contentWrapperLarge: {
    maxWidth: 800,
    width: '100%',
  },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: { 
    width: 48, 
    height: 48,
  },
  appName: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  
  welcomeBlock: { marginBottom: 20, gap: 8 },
  title: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#FFFFFF",
    lineHeight: 38,
  },
  subtitle: { 
    fontSize: 16, 
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 22,
  },
  nextStep: {
    fontSize: 14,
    color: "rgba(255, 214, 242, 0.95)",
    fontWeight: "600",
    marginTop: 4,
  },
  
  glassCard: { 
    backgroundColor: Platform.OS === 'web' 
      ? "rgba(255, 255, 255, 0.15)" 
      : "rgba(255, 255, 255, 0.92)", 
    borderRadius: 28, 
    padding: 24, 
    gap: 20,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    }),
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  inputGroup: { gap: 8 },
  inputLabel: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.95)" : "#58468B",
    letterSpacing: 0.3,
  },
  textAreaWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.2)" : "rgba(93, 95, 239, 0.2)",
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.1)" : "rgba(246, 245, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 140,
  },
  textAreaWrapperFocused: {
    borderColor: Platform.OS === 'web' ? "rgba(255, 214, 242, 0.6)" : "rgba(161, 106, 232, 0.5)",
  },
  textAreaWrapperFilled: {
    borderColor: Platform.OS === 'web' ? "rgba(255, 214, 242, 0.5)" : "rgba(161, 106, 232, 0.4)",
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 1)",
  },
  textArea: {
    fontSize: 16,
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    lineHeight: 22,
    minHeight: 120,
    fontWeight: "500",
  },
  characterCount: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tipsContainer: {
    backgroundColor: Platform.OS === 'web' ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 214, 242, 0.2)",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 214, 242, 0.3)",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Platform.OS === 'web' ? "#FFFFFF" : "#7C2B86",
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.85)" : "rgba(31, 17, 71, 0.7)",
    lineHeight: 18,
    flex: 1,
  },
  primaryButton: { 
    backgroundColor: "#A16AE8",
    borderRadius: 999, 
    paddingVertical: 18, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#A16AE8",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#D1C9FF",
  },
  primaryButtonText: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  errorText: { 
    marginTop: 4, 
    color: "#EF4444", 
    fontSize: 12, 
    fontWeight: "600" 
  },
});
