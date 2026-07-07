import { INTEREST_CATEGORIES, NEED_OPTIONS, searchInterests } from "@/constants/interests";
import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import SignupInput from "@/components/signup/SignupInput";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import { useTheme } from "@/contexts/ThemeContext";
import { MIN_AGE, isValidDateOfBirth } from "@/src/utils/age";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SignupWizardContext } from "./_layout";

export default function SignupInterests() {
  const router = useRouter();
  const { data, setData } = useContext(SignupWizardContext);
  const { theme, isDarkMode } = useTheme();

  const [query, setQuery] = useState("");
  const [interests, setInterests] = useState(new Set(data.interests || []));
  const [needs, setNeeds] = useState(new Set(data.needs || []));
  const [expandedCategories, setExpandedCategories] = useState(new Set(['creative', 'tech', 'fitness']));

  const filteredCategories = useMemo(() => {
    if (query) {
      const results = searchInterests(query);
      const grouped = {};
      results.forEach(item => {
        if (!grouped[item.categoryId]) {
          const cat = INTEREST_CATEGORIES.find(c => c.id === item.categoryId);
          grouped[item.categoryId] = { ...cat, interests: [] };
        }
        grouped[item.categoryId].interests.push(item.value);
      });
      return Object.values(grouped);
    }
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
    if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
    setExpandedCategories(next);
  };

  const onSubmit = async () => {
    const norm = (() => {
      const firstName = (data.firstName || '').trim();
      const lastName = (data.lastName || '').trim();
      const username = (data.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      const gender = (data.gender || '').trim().toLowerCase();
      const email = (data.email || '').trim().toLowerCase();
      const dateOfBirth = data.dateOfBirth || '';
      const rawPhone = (data.phoneNumber || '').trim();
      const cleanedDigits = rawPhone ? rawPhone.replace(/[^0-9]/g, '') : '';
      const countryCodeDigits = data.countryCode ? data.countryCode.replace(/[^0-9]/g, '') : '';
      const phoneOut = cleanedDigits ? `${countryCodeDigits}${cleanedDigits}` : undefined;
      const interestArr = Array.from(interests || []).map(String);
      const needsArr = Array.from(needs || []).map(String);
      return { firstName, lastName, username, gender, email, dateOfBirth, phoneOut, interestArr, needsArr };
    })();

    if (!norm.firstName) return alert('First name is required');
    if (!norm.lastName) return alert('Last name is required');
    if (!norm.username || norm.username.length < 3) return alert('Please provide a valid username (3-30, letters, numbers, _ . -)');
    if (!norm.gender) return alert('Please select your gender');
    if (!/[^@\s]+@[^@\s]+\.[^@\s]+/.test(norm.email)) return alert('Please enter a valid email');
    if (!isValidDateOfBirth(norm.dateOfBirth)) return alert(`You must be at least ${MIN_AGE} years old`);
    if (norm.phoneOut && norm.phoneOut.replace(/[^0-9]/g, '').length < 5) return alert('Phone should be at least 5 digits');

    setData((prev) => ({ ...prev, interests: norm.interestArr, needs: norm.needsArr }));
    router.push("/signup/about");
  };

  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: 'transparent', borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : theme.border },
        selected && { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.1)', borderColor: theme.primary },
      ]}
    >
      <Text style={[styles.chipText, { color: theme.textSecondary }, selected && { color: theme.primary }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={14} color={theme.primary} />}
    </TouchableOpacity>
  );

  return (
    <SignupScreenLayout
      onBack={() => router.back()}
      step={4}
      totalSteps={5}
      title="Interests & needs"
      subtitle="Select a few interests and what you're looking for. This helps us customise your experience."
    >
      <SignupInput label="Search">
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type to filter interests and needs"
          placeholderTextColor={theme.textPlaceholder}
          style={[styles.input, { color: theme.textPrimary }]}
        />
      </SignupInput>

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Interests ({interests.size} selected)</Text>
      {filteredCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.id);
        const selectedCount = category.interests.filter(i => interests.has(i)).length;

        return (
          <View key={category.id} style={styles.categorySection}>
            <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(category.id)} activeOpacity={0.7}>
              <Ionicons name={category.icon} size={18} color={theme.primary} />
              <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>{category.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.1)' }]}>
                <Text style={[styles.categoryBadgeText, { color: theme.primary }]}>
                  {selectedCount}/{category.interests.length}
                </Text>
              </View>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
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

      <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
        What are you looking for? ({needs.size} selected)
      </Text>
      <View style={styles.needsWrap}>
        {filteredNeeds.map((need) => {
          const isSelected = needs.has(need.label);
          const isLgbtqNeed = ['queer_relationship', 'lgbtq_friends', 'same_gender_connection'].includes(need.id);

          const cardInner = (
            <View
              style={[
                styles.needCard,
                {
                  backgroundColor: isLgbtqNeed ? theme.surface : 'transparent',
                  borderColor: isLgbtqNeed ? 'transparent' : theme.border,
                },
                isSelected && styles.needCardSelected,
              ]}
            >
              <Ionicons
                name={need.icon}
                size={18}
                color={isSelected ? (isLgbtqNeed ? "#EC4899" : theme.primary) : (isLgbtqNeed ? "#EC4899" : theme.textSecondary)}
              />
              <View style={styles.needCardContent}>
                <Text
                  style={[
                    styles.needCardLabel,
                    { color: isLgbtqNeed && isDarkMode ? '#000000' : theme.textPrimary },
                    isSelected && { color: theme.primary },
                  ]}
                >
                  {need.label}
                </Text>
                <Text style={[styles.needCardDescription, { color: isLgbtqNeed && isDarkMode ? '#000000' : theme.textTertiary }]}>
                  {need.description}
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={20} color={isLgbtqNeed ? "#EC4899" : theme.primary} />}
            </View>
          );

          return (
            <TouchableOpacity key={need.id} onPress={() => toggle(setNeeds, needs, need.label)} activeOpacity={0.9}>
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

      <SignupPrimaryButton label="Continue" onPress={onSubmit} />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins",
    padding: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins",
    marginTop: 4,
    marginBottom: 14,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 92, 246, 0.15)",
  },
  categoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins",
    letterSpacing: 0.2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipText: {
    fontWeight: "600",
    fontFamily: "Poppins",
    fontSize: 14,
  },
  needsWrap: {
    gap: 10,
    marginBottom: 8,
  },
  needCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  needCardLgbtqWrapper: {
    borderRadius: 16,
    padding: 1.5,
  },
  needCardSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  needCardContent: {
    flex: 1,
  },
  needCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: "Poppins",
    marginBottom: 2,
  },
  needCardDescription: {
    fontSize: 12,
    fontFamily: "Poppins",
  },
});
