import AnimatedBackground from "@/components/signup/AnimatedBackground";
import CircularProgress from "@/components/signup/CircularProgress";
import { INTEREST_CATEGORIES, NEED_OPTIONS, searchInterests } from "@/constants/interests";
import { useAuth } from "@/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

export default function SignupInterests() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { signUp } = useAuth();

  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState(new Set(data.interests || []));
  const [needs, setNeeds] = useState(new Set(data.needs || []));
  const [expandedCategories, setExpandedCategories] = useState(new Set(['creative', 'tech', 'fitness'])); // Start with first 3 expanded

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

  const filteredCategories = useMemo(() => {
    if (query) {
      // When searching, group results by category
      const results = searchInterests(query);
      const grouped = {};
      results.forEach(item => {
        if (!grouped[item.categoryId]) {
          const cat = INTEREST_CATEGORIES.find(c => c.id === item.categoryId);
          grouped[item.categoryId] = {
            ...cat,
            interests: []
          };
        }
        grouped[item.categoryId].interests.push(item.value);
      });
      return Object.values(grouped);
    }
    // Show all categories
    return INTEREST_CATEGORIES;
  }, [query]);

  const filteredNeeds = useMemo(() => {
    if (!query) return NEED_OPTIONS;
    return NEED_OPTIONS.filter(need => 
      need.label.toLowerCase().includes(query.toLowerCase()) ||
      need.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const toggle = (setFn, set, item) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item); else next.add(item);
    setFn(next);
  };

  const toggleCategory = (categoryId) => {
    const next = new Set(expandedCategories);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    setExpandedCategories(next);
  };

  const onSubmit = async () => {
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

    // Normalize and validate up-front so values are available in catch as well
    const norm = (() => {
      const firstName = (data.firstName || '').trim();
      const lastName = (data.lastName || '').trim();
      const username = (data.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      const gender = (data.gender || '').trim().toLowerCase();
      const email = (data.email || '').trim().toLowerCase();
      const age = Number(data.age);
      const rawPhone = (data.phoneNumber || '').trim();
      const cleanedDigits = rawPhone ? rawPhone.replace(/[^0-9]/g, '') : '';
      // Remove + from country code and combine with phone number
      const countryCodeDigits = data.countryCode ? data.countryCode.replace(/[^0-9]/g, '') : '';
      const phoneOut = cleanedDigits ? `${countryCodeDigits}${cleanedDigits}` : undefined;
      const interestArr = Array.from(interests || []).map(String);
      const needsArr = Array.from(needs || []).map(String);
      return { firstName, lastName, username, gender, email, age, phoneOut, interestArr, needsArr };
    })();

    try {
      // Validate all required fields against backend schema
      if (!norm.firstName) return alert('First name is required');
      if (!norm.lastName) return alert('Last name is required');
      if (!norm.username || norm.username.length < 3) return alert('Please provide a valid username (3-30, letters, numbers, _ . -)');
      if (!norm.gender) return alert('Please select your gender');
      if (!/[^@\s]+@[^@\s]+\.[^@\s]+/.test(norm.email)) return alert('Please enter a valid email');
      if (!norm.age || norm.age < 13 || norm.age > 120) return alert('Please select a valid age (13-120)');
      if (norm.phoneOut && norm.phoneOut.replace(/[^0-9]/g, '').length < 5) return alert('Phone should be at least 5 digits');
      if (!data.instagramUsername || data.instagramUsername.trim().length < 1) return alert('Instagram username is required');


      const instagramUsernameValue = (data.instagramUsername || '').trim().replace('@', '');
      
      const payload = {
        firstName: norm.firstName,
        lastName: norm.lastName,
        age: norm.age,
        gender: norm.gender,
        email: norm.email,
        phoneNumber: norm.phoneOut,
        username: norm.username,
        password: data.password,
        interests: norm.interestArr,
        needs: norm.needsArr,
        instagramUsername: instagramUsernameValue,
        about: (data.about || '').trim(),
        referralCode: data.referralCode || undefined,
      };
      
      await signUp(payload);
      router.replace("/signup/summary");
    } catch (e) {
      try { console.log('Signup error details', e?.details); } catch {}
      // If backend complains about invalid body, attempt a single retry with empty interests/needs
      const fieldErrors = e?.details?.details?.fieldErrors || e?.details?.fieldErrors;
      if (e?.status === 400 && (e?.details?.error === 'Invalid body' || fieldErrors)) {
        const retry = {
          firstName: norm.firstName,
          lastName: norm.lastName,
          age: norm.age,
          gender: norm.gender,
          email: norm.email,
          phoneNumber: norm.phoneOut,
          username: norm.username,
          password: data.password,
          interests: [],
          needs: [],
          instagramUsername: (data.instagramUsername || '').trim().replace('@', ''),
          about: (data.about || '').trim(),
          referralCode: data.referralCode || undefined,
        };
        try {
          console.log('🔄 Retrying signup with empty interests/needs');
          console.log('🔄 Retry payload:', retry);
          console.log('🔄 Instagram username in retry:', retry.instagramUsername);
          await signUp(retry);
          router.replace('/signup/summary');
          return;
        } catch (_e) {
          // fall through to user-facing message
        }
      }
      const firstErr = fieldErrors && Object.entries(fieldErrors).find(([, arr]) => Array.isArray(arr) && arr.length)?.[1]?.[0];
      const msg = firstErr || e?.details?.error || e?.message || 'Signup failed. Please check your details and try again.';
      alert(msg);
    }
  };

  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity key={label} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color="#7C2B86" />}
    </TouchableOpacity>
  );

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
              <CircularProgress progress={100} currentStep={5} totalSteps={5} />
            </Animated.View>

            <Animated.View 
              style={[
                styles.welcomeBlock,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={styles.title}>Pick your vibe 🎨</Text>
              <Text style={styles.subtitle}>Select interests and needs that describe you. This helps us find your perfect matches!</Text>
              <Text style={styles.nextStep}>🎉 Final step - Let's create your account!</Text>
            </Animated.View>

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
                <Text style={styles.inputLabel}>Search</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="search" size={18} color="#8880B6" />
                  <TextInput value={query} onChangeText={setQuery} placeholder="type to filter" placeholderTextColor="rgba(31, 17, 71, 0.35)" style={styles.input} />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Interests ({interests.size} selected)</Text>
              
              {/* Show all categories vertically - collapsible */}
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const selectedCount = category.interests.filter(i => interests.has(i)).length;
                
                return (
                  <View key={category.id} style={styles.categorySection}>
                    <TouchableOpacity 
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={category.icon} size={18} color="#7C2B86" />
                      <Text style={styles.categoryTitle}>{category.name}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {selectedCount}/{category.interests.length}
                        </Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={Platform.OS === 'web' ? "rgba(255, 255, 255, 0.6)" : "#8880B6"} 
                      />
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={styles.chipWrap}>
                        {category.interests.map((interest) => 
                          renderChip(interest, interests.has(interest), () => toggle(setInterests, interests, interest))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={styles.sectionTitle}>What are you looking for? ({needs.size} selected)</Text>
              <View style={styles.chipWrap}>
                {filteredNeeds.map((need) => (
                  <TouchableOpacity 
                    key={need.id} 
                    onPress={() => toggle(setNeeds, needs, need.label)} 
                    style={[styles.needChip, needs.has(need.label) && styles.needChipSelected]}
                  >
                    <Ionicons name={need.icon} size={18} color={needs.has(need.label) ? "#7C2B86" : "#8880B6"} />
                    <View style={styles.needChipContent}>
                      <Text style={[styles.needChipLabel, needs.has(need.label) && styles.needChipLabelSelected]}>{need.label}</Text>
                      <Text style={styles.needChipDescription}>{need.description}</Text>
                    </View>
                    {needs.has(need.label) && <Ionicons name="checkmark-circle" size={20} color="#7C2B86" />}
                  </TouchableOpacity>
                ))}
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={onSubmit}>
                  <Text style={styles.primaryButtonText}>Create Account 🎉</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
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
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  
  // Category Sections
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.2)" : "rgba(124, 43, 134, 0.2)",
  },
  categoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    letterSpacing: 0.3,
  },
  categoryBadge: {
    backgroundColor: Platform.OS === 'web' ? "rgba(124, 43, 134, 0.2)" : "rgba(124, 43, 134, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C2B86",
  },
  
  // Need Chips (Card Style)
  needChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.3)" : "rgba(93, 95, 239, 0.25)",
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.1)" : "rgba(246, 245, 255, 0.9)",
    marginBottom: 10,
    width: '100%',
  },
  needChipSelected: {
    borderColor: "#7C2B86",
    backgroundColor: Platform.OS === 'web' ? "rgba(124, 43, 134, 0.2)" : "rgba(124, 43, 134, 0.15)",
  },
  needChipContent: {
    flex: 1,
  },
  needChipLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    marginBottom: 2,
  },
  needChipLabelSelected: {
    color: "#7C2B86",
  },
  needChipDescription: {
    fontSize: 12,
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.7)" : "#8880B6",
  },
  welcomeBlock: { marginBottom: 20, gap: 8 },
  title: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "#FFFFFF",
  // ... (rest of the styles remain the same)
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
  inputWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.2)" : "rgba(93, 95, 239, 0.2)", 
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.1)" : "rgba(246, 245, 255, 0.9)", 
    paddingHorizontal: 16, 
    height: 54,
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    fontWeight: "500",
  },
  
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: "800", 
    color: Platform.OS === 'web' ? "#FFFFFF" : "#1F1147",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 999, 
    borderWidth: 2, 
    borderColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.3)" : "rgba(93, 95, 239, 0.25)", 
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.1)" : "rgba(246, 245, 255, 0.9)",
  },
  chipSelected: { 
    backgroundColor: Platform.OS === 'web' ? "rgba(255, 214, 242, 0.3)" : "#FFD6F2", 
    borderColor: Platform.OS === 'web' ? "rgba(255, 214, 242, 0.6)" : "rgba(255, 214, 242, 0.85)", 
    shadowColor: "#7C2B86", 
    shadowOpacity: 0.15, 
    shadowRadius: 6, 
    shadowOffset: { width: 0, height: 3 },
  },
  chipText: { 
    color: Platform.OS === 'web' ? "rgba(255, 255, 255, 0.9)" : "#58468B", 
    fontWeight: "600",
    fontSize: 14,
  },
  chipTextSelected: { 
    color: Platform.OS === 'web' ? "#FFFFFF" : "#7C2B86",
    fontWeight: "700",
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
    marginTop: 8,
  },
  primaryButtonText: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
