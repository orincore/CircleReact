import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PrivacyPolicy() {
  const router = useRouter();

  if (Platform.OS !== 'web') {
    return null; // Only show on web
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#7C2B86', '#B24592']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.lastUpdated}>Last Updated: October 5, 2025</Text>
          
          <Text style={styles.intro}>
            At Circle, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect information that you provide directly to us, including:
            </Text>
            <Text style={styles.bulletPoint}>• Account information (name, email, phone number, date of birth)</Text>
            <Text style={styles.bulletPoint}>• Profile information (photos, bio, interests, preferences)</Text>
            <Text style={styles.bulletPoint}>• Location data (with your permission)</Text>
            <Text style={styles.bulletPoint}>• Messages and communications with other users</Text>
            <Text style={styles.bulletPoint}>• Device information and usage data</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use the information we collect to:
            </Text>
            <Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
            <Text style={styles.bulletPoint}>• Match you with compatible users</Text>
            <Text style={styles.bulletPoint}>• Send you notifications and updates</Text>
            <Text style={styles.bulletPoint}>• Ensure safety and prevent fraud</Text>
            <Text style={styles.bulletPoint}>• Analyze usage patterns and improve user experience</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>3. Information Sharing</Text>
            <Text style={styles.paragraph}>
              We do not sell your personal information. We may share your information only in the following circumstances:
            </Text>
            <Text style={styles.bulletPoint}>• With other users as part of the matching service</Text>
            <Text style={styles.bulletPoint}>• With service providers who assist in our operations</Text>
            <Text style={styles.bulletPoint}>• When required by law or to protect rights and safety</Text>
            <Text style={styles.bulletPoint}>• With your consent or at your direction</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>5. Your Rights</Text>
            <Text style={styles.paragraph}>
              You have the right to:
            </Text>
            <Text style={styles.bulletPoint}>• Access and update your personal information</Text>
            <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
            <Text style={styles.bulletPoint}>• Opt-out of promotional communications</Text>
            <Text style={styles.bulletPoint}>• Control location sharing and other permissions</Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Circle is not intended for users under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </Text>
          </View>

          <View style={styles.policySection}>
            <Text style={styles.sectionTitle}>8. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>Email: privacy@orincore.com</Text>
            <Text style={styles.contactInfo}>Address: ORINCORE Technologies</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>An App by ORINCORE Technologies</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    width: '100%',
    padding: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 30,
  },
  policySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7C2B86',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginLeft: 20,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    lineHeight: 24,
    color: '#7C2B86',
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 8,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});
