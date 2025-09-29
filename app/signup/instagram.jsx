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
  View,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";

export default function InstagramStep() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const [instagramUsername, setInstagramUsername] = useState(data.instagramUsername);
  const [error, setError] = useState("");

  const validateInstagramUsername = () => {
    const username = instagramUsername.trim().replace('@', '');
    
    if (!username) {
      setError("Instagram username is required");
      return false;
    }
    
    if (username.length < 1 || username.length > 30) {
      setError("Instagram username must be between 1 and 30 characters");
      return false;
    }
    
    // Basic Instagram username validation
    const instagramRegex = /^[a-zA-Z0-9._]+$/;
    if (!instagramRegex.test(username)) {
      setError("Instagram username can only contain letters, numbers, periods, and underscores");
      return false;
    }
    
    setError("");
    return true;
  };

  const onNext = () => {
    if (!validateInstagramUsername()) return;
    
    const cleanUsername = instagramUsername.trim().replace('@', '');
    console.log('📸 Saving Instagram username to signup data:', cleanUsername);
    setData((prev) => ({
      ...prev,
      instagramUsername: cleanUsername,
    }));
    router.push("/signup/interests");
  };

  const onBack = () => {
    router.back();
  };

  const handleUsernameChange = (text) => {
    // Remove @ symbol if user types it
    const cleanText = text.replace('@', '');
    setInstagramUsername(cleanText);
    if (error) setError(""); // Clear error when user starts typing
  };

  const canContinue = instagramUsername.trim().length > 0;

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
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.keyboardAvoidingView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#FFE8FF" />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '80%' }]} />
                  </View>
                  <Text style={styles.progressText}>Step 4 of 5</Text>
                </View>
              </View>

              {/* Content */}
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <View style={styles.instagramIconBg}>
                    <Ionicons name="logo-instagram" size={48} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.title}>Connect Your Instagram</Text>
                <Text style={styles.subtitle}>
                  Add your Instagram username to help others discover you and build meaningful connections.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Instagram Username</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      style={[styles.input, error ? styles.inputError : null]}
                      value={instagramUsername}
                      onChangeText={handleUsernameChange}
                      placeholder="username"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      returnKeyType="next"
                      onSubmitEditing={onNext}
                    />
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#FFD6F2" />
                  <Text style={styles.infoText}>
                    This helps verify your identity and allows others to connect with you on Instagram.
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]} 
                  onPress={onNext}
                  disabled={!canContinue}
                >
                  <Text style={[styles.nextButtonText, !canContinue && styles.nextButtonTextDisabled]}>
                    Continue
                  </Text>
                  <Ionicons 
                    name="arrow-forward" 
                    size={20} 
                    color={canContinue ? "#7C2B86" : "rgba(124, 43, 134, 0.5)"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
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
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
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
    backgroundColor: "#FFD6F2",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: "#FFD6F2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(255, 214, 242, 0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C2B86",
  },
  nextButtonTextDisabled: {
    color: "rgba(124, 43, 134, 0.5)",
  },
});
