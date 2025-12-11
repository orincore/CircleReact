import { INTEREST_CATEGORIES, NEED_OPTIONS, searchInterests } from "@/constants/interests";
import { useTheme } from "@/contexts/ThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

export default function SignupInterests() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();

  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState(new Set(data.interests || []));
  const [needs, setNeeds] = useState(new Set(data.needs || []));
  const [expandedCategories, setExpandedCategories] = useState(new Set(['creative', 'tech', 'fitness'])); // Start with first 3 expanded one dy

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

    // Basic validation (same as final step) but without calling signup yet
    if (!norm.firstName) return alert('First name is required');
    if (!norm.lastName) return alert('Last name is required');
    if (!norm.username || norm.username.length < 3) return alert('Please provide a valid username (3-30, letters, numbers, _ . -)');
    if (!norm.gender) return alert('Please select your gender');
    if (!/[^@\s]+@[^@\s]+\.[^@\s]+/.test(norm.email)) return alert('Please enter a valid email');
    if (!norm.age || norm.age < 16 || norm.age > 120) return alert('Please select a valid age (16-120)');
    if (norm.phoneOut && norm.phoneOut.replace(/[^0-9]/g, '').length < 5) return alert('Phone should be at least 5 digits');

    // Persist interests and needs to context for the About screen / AI generation
    setData((prev) => ({
      ...prev,
      interests: norm.interestArr,
      needs: norm.needsArr,
    }));

    router.push("/signup/about");
  };

  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity 
      key={label} 
      onPress={onPress} 
      style={[
        styles.chip, 
        { backgroundColor: 'transparent', borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : theme.border },
        selected && { backgroundColor: isDarkMode ? 'rgba(161, 106, 232, 0.3)' : 'rgba(161, 106, 232, 0.15)', borderColor: theme.primary }
      ]}
    >
      <Text style={[styles.chipText, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : theme.textSecondary }, selected && { color: isDarkMode ? '#FFFFFF' : theme.primary }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color={theme.primary} />}
    </TouchableOpacity>
  );

  // Dynamic styles similar to other signup steps
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
  };

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.select({ ios: "padding", android: undefined })}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Text style={[styles.stepText, { color: theme.textSecondary }]}>Step 4 of 5</Text>
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
              <Text style={[styles.title, { color: theme.textPrimary }]}>Interests & needs</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select a few interests and what youre looking for. This helps us customise your experience.</Text>
            </Animated.View>

            {/* Main content card */}
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
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Search</Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.background, borderColor: theme.border }]}>
                  <Ionicons name="search" size={18} color={theme.textTertiary} />
                  <TextInput value={query} onChangeText={setQuery} placeholder="Type to filter interests and needs" placeholderTextColor={theme.textTertiary} style={[styles.input, { color: theme.textPrimary }]} />
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Interests ({interests.size} selected)</Text>
              {/* Show all categories vertically - collapsible */}
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const selectedCount = category.interests.filter(i => interests.has(i)).length;
                
                return (
                  <View key={category.id} style={[styles.categorySection, { backgroundColor: 'transparent', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.border }]}>
                    <TouchableOpacity 
                      style={styles.categoryHeader}
                      onPress={() => toggleCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={category.icon} size={18} color={theme.primary} />
                      <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>{category.name}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: isDarkMode ? 'rgba(161, 106, 232, 0.3)' : 'rgba(161, 106, 232, 0.15)' }]}>
                        <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>
                          {selectedCount}/{category.interests.length}
                        </Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color={theme.textSecondary} 
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

              <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>What are you looking for? ({needs.size} selected)</Text>
              <View style={[styles.needsWrap, { marginTop: 8 }]}>
                {filteredNeeds.map((need) => {
                  const isSelected = needs.has(need.label);
                  const isLgbtqNeed = ['queer_relationship', 'lgbtq_friends', 'same_gender_connection'].includes(need.id);

                  const cardInner = (
                    <View
                      style={[
                        styles.needCard,
                        {
                          // For LGBTQ cards we want a solid inner background so gradient stays as border only
                          backgroundColor: isLgbtqNeed ? theme.surface : 'transparent',
                          borderColor: isLgbtqNeed ? 'transparent' : theme.border,
                        },
                        isSelected && styles.needCardSelected,
                        isLgbtqNeed && styles.needCardLgbtq,
                      ]}
                    >
                      <Ionicons
                        name={need.icon}
                        size={18}
                        color={
                          isSelected
                            ? (isLgbtqNeed ? "#EC4899" : theme.primary)
                            : (isLgbtqNeed ? "#EC4899" : theme.textSecondary)
                        }
                      />
                      <View style={styles.needCardContent}>
                        <Text
                          style={[
                            styles.needCardLabel,
                            { color: isLgbtqNeed && isDarkMode ? '#000000' : theme.textPrimary },
                            isSelected && styles.needCardLabelSelected,
                          ]}
                        >
                          {need.label}
                        </Text>
                        <Text
                          style={[
                            styles.needCardDescription,
                            { color: isLgbtqNeed && isDarkMode ? '#000000' : theme.textTertiary },
                          ]}
                        >
                          {need.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={isLgbtqNeed ? "#EC4899" : theme.primary}
                        />
                      )}
                    </View>
                  );

                  return (
                    <TouchableOpacity
                      key={need.id}
                      onPress={() => toggle(setNeeds, needs, need.label)}
                      activeOpacity={0.9}
                    >
                      {isLgbtqNeed ? (
                        <LinearGradient
                          colors={["#EC4899", "#F97316", "#FACC15", "#22C55E", "#3B82F6", "#8B5CF6"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.needCardLgbtqWrapper}
                        >
                          {cardInner}
                        </LinearGradient>
                      ) : (
                        cardInner
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* Next Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
              <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton} onPress={onSubmit}>
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
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
  appName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 13,
    fontWeight: "600",
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
  
  // Needs list cards (used for "What are you looking for?")
  needsWrap: {
    gap: 10,
  },
  needCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Outer gradient wrapper for LGBTQ-focused needs
  needCardLgbtqWrapper: {
    borderRadius: 14,
    padding: 1.5,
  },
  // Inner card gets slight transparency when in rainbow wrapper
  needCardLgbtq: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  // Selected state gets a subtle tint; unselected cards stay transparent via inline style
  needCardSelected: {
    backgroundColor: 'rgba(124, 43, 134, 0.08)',
  },
  needCardContent: {
    flex: 1,
  },
  needCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  needCardLabelSelected: {
    color: '#7C2B86',
  },
  needCardDescription: {
    fontSize: 12,
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
    backgroundColor: 'transparent',
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
