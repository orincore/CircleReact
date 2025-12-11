import { useTheme } from "@/contexts/ThemeContext";
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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

export default function SignupInstagram() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();
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

  const canContinue = true; // Instagram is optional

  // Dynamic styles similar to SignupStepOne/Contact
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
              <Animated.View style={[styles.header, { opacity: fadeAnim }] }>
                <View style={styles.headerLeft}>
                  <TouchableOpacity onPress={onBack} style={styles.backButton}>
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
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>Step 3 of 5</Text>
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
                <Text style={[styles.title, { color: theme.textPrimary }]}>Your Instagram</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Share your Instagram username so people can get a better sense of who you are.
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
                <View style={styles.inputGroup}>
                  <Text style={dynamicStyles.label}>Instagram username (optional)</Text>
                  <View style={[
                    dynamicStyles.inputContainer,
                    instagramUsername.trim() && dynamicStyles.inputContainerFocused,
                  ]}>
                    <Text style={[styles.atSymbol, { color: theme.textTertiary }]}>@</Text>
                    <TextInput
                      value={instagramUsername}
                      onChangeText={setInstagramUsername}
                      placeholder="yourusername"
                      placeholderTextColor={theme.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={dynamicStyles.input}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                  <Text style={[styles.helperText, { color: theme.textTertiary }]}>
                    Add your handle to make it easier for people to know you better. You can skip this for now.
                  </Text>
                </View>
              </Animated.View>

              {/* Next Button */}
              <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
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

  // Title section
  welcomeBlock: {
    marginBottom: 24,
    gap: 8,
  },
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
  inputGroup: {
    gap: 8,
    marginBottom: 20,
  },
  atSymbol: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
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
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },
});
