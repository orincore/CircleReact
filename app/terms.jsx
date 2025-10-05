import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TermsAndConditions() {
  const router = useRouter();


  return (
    <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last Updated: October 5, 2025</Text>
          
          <Text style={styles.intro}>
            Welcome to Circle. By accessing or using our application, you agree to be bound by these Terms and Conditions. Please read them carefully.
          </Text>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.paragraph}>
              By creating an account and using Circle, you accept and agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our services.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>2. Eligibility</Text>
            <Text style={styles.paragraph}>
              You must be at least 18 years old to use Circle. By using our services, you represent and warrant that:
            </Text>
            <Text style={styles.bulletPoint}>• You are at least 18 years of age</Text>
            <Text style={styles.bulletPoint}>• You have the legal capacity to enter into these Terms</Text>
            <Text style={styles.bulletPoint}>• You will comply with all applicable laws and regulations</Text>
            <Text style={styles.bulletPoint}>• You have not been previously banned from Circle</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>3. Account Registration</Text>
            <Text style={styles.paragraph}>
              To use Circle, you must create an account. You agree to:
            </Text>
            <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
            <Text style={styles.bulletPoint}>• Maintain the security of your account credentials</Text>
            <Text style={styles.bulletPoint}>• Notify us immediately of any unauthorized access</Text>
            <Text style={styles.bulletPoint}>• Be responsible for all activities under your account</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>4. User Conduct</Text>
            <Text style={styles.paragraph}>
              You agree NOT to:
            </Text>
            <Text style={styles.bulletPoint}>• Use Circle for any illegal or unauthorized purpose</Text>
            <Text style={styles.bulletPoint}>• Harass, abuse, or harm other users</Text>
            <Text style={styles.bulletPoint}>• Post false, misleading, or offensive content</Text>
            <Text style={styles.bulletPoint}>• Impersonate any person or entity</Text>
            <Text style={styles.bulletPoint}>• Spam or solicit other users for commercial purposes</Text>
            <Text style={styles.bulletPoint}>• Use automated systems or bots</Text>
            <Text style={styles.bulletPoint}>• Attempt to access unauthorized areas of the service</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>5. Content</Text>
            <Text style={styles.paragraph}>
              You retain ownership of content you post on Circle. However, by posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with our services.
            </Text>
            <Text style={styles.paragraph}>
              We reserve the right to remove any content that violates these Terms or is otherwise objectionable.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>6. Matching and Connections</Text>
            <Text style={styles.paragraph}>
              Circle uses algorithms to suggest potential matches. We do not guarantee:
            </Text>
            <Text style={styles.bulletPoint}>• The accuracy of matching algorithms</Text>
            <Text style={styles.bulletPoint}>• That you will find compatible matches</Text>
            <Text style={styles.bulletPoint}>• The conduct or intentions of other users</Text>
            <Text style={styles.bulletPoint}>• The outcome of any connections or relationships</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>7. Safety and Security</Text>
            <Text style={styles.paragraph}>
              While we implement security measures, you acknowledge that:
            </Text>
            <Text style={styles.bulletPoint}>• You are responsible for your own safety when meeting users</Text>
            <Text style={styles.bulletPoint}>• We cannot guarantee the identity or intentions of users</Text>
            <Text style={styles.bulletPoint}>• You should exercise caution and common sense</Text>
            <Text style={styles.bulletPoint}>• You should report suspicious or inappropriate behavior</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>8. Subscription and Payments</Text>
            <Text style={styles.paragraph}>
              Circle may offer premium features through subscriptions. By purchasing a subscription:
            </Text>
            <Text style={styles.bulletPoint}>• You agree to pay all applicable fees</Text>
            <Text style={styles.bulletPoint}>• Subscriptions auto-renew unless cancelled</Text>
            <Text style={styles.bulletPoint}>• Refunds are subject to our refund policy</Text>
            <Text style={styles.bulletPoint}>• We may change pricing with notice</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>9. Termination</Text>
            <Text style={styles.paragraph}>
              We reserve the right to suspend or terminate your account at any time for:
            </Text>
            <Text style={styles.bulletPoint}>• Violation of these Terms</Text>
            <Text style={styles.bulletPoint}>• Fraudulent or illegal activity</Text>
            <Text style={styles.bulletPoint}>• Harmful behavior towards other users</Text>
            <Text style={styles.bulletPoint}>• Any other reason at our discretion</Text>
            <Text style={styles.paragraph}>
              You may delete your account at any time through the app settings.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>10. Disclaimer of Warranties</Text>
            <Text style={styles.paragraph}>
              Circle is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not warrant that the service will be uninterrupted, secure, or error-free.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
            <Text style={styles.paragraph}>
              To the maximum extent permitted by law, ORINCORE Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Circle.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>12. Changes to Terms</Text>
            <Text style={styles.paragraph}>
              We may modify these Terms at any time. We will notify you of material changes. Your continued use of Circle after changes constitutes acceptance of the modified Terms.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>13. Governing Law</Text>
            <Text style={styles.paragraph}>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>14. Contact Information</Text>
            <Text style={styles.paragraph}>
              For questions about these Terms, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>Email: legal@circle.orincore.com</Text>
            <Text style={styles.contactInfo}>Address: Orincore Technologies, India</Text>
          </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By using Circle, you agree to these Terms of Service and our Privacy Policy.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 24,
  },
  policySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 16,
    color: '#7C2B86',
    fontWeight: '600',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
});
