import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

export default function SignupInstagram() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const [instagramUsername, setInstagramUsername] = useState(data.instagramUsername || '');
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
    setData((prev) => ({ ...prev, instagramUsername: instagramUsername.trim() }));
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

    const trimmedUsername = instagramUsername.trim();
    //console.log('📸 Saving Instagram username to context:', trimmedUsername);
    setData((prev) => {
      const newData = { ...prev, instagramUsername: trimmedUsername };
      //console.log('📸 Updated context data:', newData);
      return newData;
    });
    router.push("/signup/interests");
  };

  const canContinue = instagramUsername.trim().length > 0; // Instagram is required

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} showsVerticalScrollIndicator={false}>
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.brandRow}>
                  <Image 
                    source={require('@/assets/logo/circle-logo.png')} 
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.appName}>Circle</Text>
                </View>
                <CircularProgress progress={80} currentStep={4} totalSteps={5} />
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
                <Text style={styles.title}>Connect your Instagram 📸</Text>
                <Text style={styles.subtitle}>
                  Share your Instagram username so others can see more of your world. This is required to help build trust and authenticity!
                </Text>
                <Text style={styles.nextStep}>✨ Next: Choose interests 🎯</Text>
              </Animated.View>

              {/* Glassmorphism card */}
              <Animated.View 
                style={[
                  styles.glassCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>📷 Instagram Username</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      value={instagramUsername}
                      onChangeText={setInstagramUsername}
                      placeholder="yourusername"
                      placeholderTextColor="rgba(31, 17, 71, 0.4)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
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
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
  },
  nextStep: {
    fontSize: 14,
    color: "rgba(255, 214, 242, 0.95)",
    fontWeight: "600",
    marginBottom: 32,
    textAlign: "center",
  },
  iconContainer: {
    marginBottom: 32,
  },
  instagramIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E4405F",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E4405F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFE8FF",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    paddingHorizontal: 16,
  },
  atSymbol: {
    fontSize: 18,
    color: "#FFE8FF",
    fontWeight: "600",
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 8,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 214, 242, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  footer: {
    paddingTop: 24,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A16AE8",
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: "#A16AE8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#D1C9FF",
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  
  // Primary button styles (for consistency with other pages)
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A16AE8",
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: "#A16AE8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
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
  
  // Form styles
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    padding: 24,
    gap: 20,
    shadowColor: "rgba(18, 8, 43, 0.35)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#58468B",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(93, 95, 239, 0.25)",
    backgroundColor: "rgba(246, 245, 255, 0.9)",
    paddingHorizontal: 16,
    height: 52,
  },
  atSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A16AE8",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F1147",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },
  welcomeBlock: {
    marginBottom: 20,
    gap: 8,
  },
});
