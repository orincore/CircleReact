import { useTheme } from "@/contexts/ThemeContext";
import { PRIMARY_BUTTON_COLOR } from "./SignupScreenLayout";
import {
  PRIVACY_FOOTER,
  PRIVACY_SECTIONS,
  TERMS_FOOTER,
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
} from "@/constants/legalContent";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// In-app Terms / Privacy Policy viewer for the signup flow, so native users
// aren't kicked out to a browser mid-signup. Content lives in
// constants/legalContent.js, shared with the standalone web pages at
// app/terms.jsx and app/legal/privacy-policy.jsx.
export default function LegalContentModal({ visible, type, onClose }) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const isTerms = type === 'terms';
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const footer = isTerms ? TERMS_FOOTER : PRIVACY_FOOTER;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.lastUpdated, { color: theme.textTertiary }]}>
            {isTerms ? `Last updated: ${TERMS_LAST_UPDATED}` : `Last updated: ${new Date().toLocaleDateString()}`}
          </Text>

          {isTerms && <Text style={[styles.intro, { color: theme.textSecondary }]}>{TERMS_INTRO}</Text>}

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section.title}</Text>
              {section.paragraphs?.map((p, i) => (
                <Text key={i} style={[styles.paragraph, { color: theme.textSecondary }]}>{p}</Text>
              ))}
              {section.bullets?.map((b, i) => (
                <Text key={i} style={[styles.bulletPoint, { color: theme.textSecondary }]}>• {b}</Text>
              ))}
              {section.trailingParagraphs?.map((p, i) => (
                <Text key={i} style={[styles.paragraph, { color: theme.textSecondary, marginTop: 8 }]}>{p}</Text>
              ))}
              {section.contact?.map((c, i) => (
                <Text key={i} style={[styles.contactInfo, { color: PRIMARY_BUTTON_COLOR }]}>{c}</Text>
              ))}
            </View>
          ))}

          <View
            style={[
              styles.footer,
              { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.06)', borderColor: 'rgba(139, 92, 246, 0.2)' },
            ]}
          >
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>{footer}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Poppins',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    fontFamily: 'Poppins',
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Poppins',
    lineHeight: 21,
    marginBottom: 6,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: 'Poppins',
    lineHeight: 21,
    marginLeft: 8,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  footer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Poppins',
    textAlign: 'center',
    fontWeight: '500',
  },
});
