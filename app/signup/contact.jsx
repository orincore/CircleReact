import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { useTheme } from "@/contexts/ThemeContext";

// Removed country codes - phone number field removed

export default function SignupContact() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
  const [email, setEmail] = useState(data.email);
  const [errors, setErrors] = useState({});

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Entrance animation
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

  const canContinue = useMemo(() => {
    const okEmail = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim());
    return okEmail;
  }, [email]);

  const validateEmail = () => {
    const next = { ...errors };
    next.email = /[^@\s]+@[^@\s]+\.[^@\s]+/.test((email || '').trim()) 
      ? '' 
      : 'Please enter a valid email';
    setErrors(next);
  };

  const onNext = () => {
    validateEmail();
    if (!canContinue) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setData((prev) => ({ 
      ...prev, 
      email: email.trim()
    }));
    router.push("/signup/instagram");
  };

  // Dynamic styles to match SignupStepOne
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowColor || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    inputContainer: {
      backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    inputContainerFocused: {
      borderColor: theme.primary,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
      fontWeight: '400',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonDisabled: {
      backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.border,
      opacity: 0.7,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.contentWrapper, isLargeScreen && styles.contentWrapperLarge]}>
              {/* Header */}
              <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.brandRow}>
                    <Image 
                      source={require('@/assets/logo/circle-logo.png')} 
                      style={styles.brandLogo}
                      resizeMode="contain"
                    />
                    <Text style={[styles.appName, { color: theme.textPrimary }]}>Circle</Text>
                  </View>
                </View>
                <View style={[styles.stepIndicator, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.border }]}>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>Step 2 of 5</Text>
                </View>
              </Animated.View>

              {/* Title Section */}
              <Animated.View 
                style={[
                  styles.welcomeBlock, 
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Text style={[styles.title, { color: theme.textPrimary }]}>Contact details</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Use an email address you check often. Well use it for verification and important updates.
                </Text>
              </Animated.View>

              {/* Form Card */}
              <Animated.View 
                style={[
                  dynamicStyles.card,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }
                ]}
              >
                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={dynamicStyles.label}>Email address</Text>
                  <View style={[
                    dynamicStyles.inputContainer,
                    email.trim() && dynamicStyles.inputContainerFocused,
                  ]}>
                    <Ionicons name="mail-outline" size={18} color={theme.textTertiary} style={{ marginRight: 8 }} />
                    <TextInput 
                      value={email} 
                      onChangeText={setEmail} 
                      onBlur={validateEmail}
                      placeholder="you@example.com" 
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="email-address" 
                      autoCapitalize="none" 
                      style={dynamicStyles.input} 
                    />
                    {email.trim() && /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email.trim()) && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </View>
                  {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                  <Text style={[styles.helperText, { color: theme.textTertiary }]}>Well never share your email with anyone.</Text>
                </View>

                {/* Trust badge */}
                <View style={[styles.trustBadge, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.06)', borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.18)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#10B981" />
                  <View style={styles.trustTextContainer}>
                    <Text style={[styles.trustTitle, { color: theme.textPrimary }]}>Secure and private</Text>
                    <Text style={[styles.trustText, { color: theme.textSecondary }]}>Your contact details are encrypted and used only to protect your account.</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Next Button */}
              <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }] }>
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  style={[dynamicStyles.primaryButton, !canContinue && dynamicStyles.primaryButtonDisabled]} 
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
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
    maxWidth: 560,
    width: '100%',
  },

  // Header
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandLogo: { 
    width: 32, 
    height: 32,
  },
  appName: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4 },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Title / welcome block
  welcomeBlock: { marginBottom: 24, gap: 8 },
  title: { 
    fontSize: 24, 
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: { 
    fontSize: 15, 
    lineHeight: 22,
  },

  // Form group
  inputGroup: { gap: 8, marginBottom: 20 },

  helperText: {
    fontSize: 12,
    marginTop: 4,
  },

  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  trustTextContainer: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  trustText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Button
  buttonContainer: {
    marginTop: 8,
  },
  primaryButtonText: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#FFFFFF",
  },

  errorText: { 
    marginTop: 4, 
    color: "#EF4444", 
    fontSize: 12, 
    fontWeight: "500" 
  },
});
