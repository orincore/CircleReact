import { useAuth } from "@/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();
  const { logIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email/username and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await logIn(email, password);
    } catch (e) {
      setError(e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <View style={styles.blurCircleLarge} />
          <View style={styles.blurCircleSmall} />

          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={24} color="#FFE8FF" />
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <View style={styles.circleLogo}>
                  <Text style={styles.logoText}>C</Text>
                </View>
                <Text style={styles.appName}>Circle</Text>
              </View>
            </View>

            <View style={styles.welcomeBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Let’s pick up where your heart left off.</Text>
            </View>

            <View style={styles.card}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={18} color="#8880B6" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(31, 17, 71, 0.35)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={18} color="#8880B6" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(31, 17, 71, 0.35)"
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={handleLogin}
                disabled={submitting}
              >
                <Text style={styles.primaryButtonText}>{submitting ? "Logging in..." : "Log in"}</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.85} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomPrompt}>
              <Text style={styles.promptText}>New to Circle?</Text>
              <Link href="/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.promptLink}>Create an account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
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
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: "space-between",
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
    borderWidth: 1,
    borderColor: "rgba(255, 214, 242, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 214, 242, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  welcomeBlock: {
    marginTop: 48,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.82)",
  },
  card: {
    marginTop: 36,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    padding: 24,
    gap: 22,
    boxShadow: "0px 12px 24px rgba(18, 8, 43, 0.35)",
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
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F1147",
  },
  primaryButton: {
    backgroundColor: "#FFD6F2",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#7C2B86",
  },
  secondaryAction: {
    alignSelf: "flex-start",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C68E4",
  },
  bottomPrompt: {
    alignItems: "center",
    gap: 6,
    marginTop: 32,
  },
  promptText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.78)",
  },
  promptLink: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFE8FF",
  },
  blurCircleLarge: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 214, 242, 0.32)",
    top: -100,
    right: -50,
  },
  blurCircleSmall: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    bottom: 40,
    left: -70,
  },
});
