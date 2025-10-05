import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Information We Collect</Text>
              <Text style={styles.sectionText}>
                We collect information you provide directly to us, such as when you create an account, 
                update your profile, or communicate with other users. This includes:
              </Text>
              <Text style={styles.bulletPoint}>• Profile information (name, age, photos, bio)</Text>
              <Text style={styles.bulletPoint}>• Location data to find nearby matches</Text>
              <Text style={styles.bulletPoint}>• Messages and interactions with other users</Text>
              <Text style={styles.bulletPoint}>• Device information and usage analytics</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
              <Text style={styles.sectionText}>
                We use the information we collect to:
              </Text>
              <Text style={styles.bulletPoint}>• Provide and improve our dating services</Text>
              <Text style={styles.bulletPoint}>• Match you with compatible users</Text>
              <Text style={styles.bulletPoint}>• Send you notifications and updates</Text>
              <Text style={styles.bulletPoint}>• Ensure safety and prevent fraud</Text>
              <Text style={styles.bulletPoint}>• Analyze usage patterns to improve the app</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Information Sharing</Text>
              <Text style={styles.sectionText}>
                We do not sell, trade, or otherwise transfer your personal information to third parties 
                without your consent, except as described in this policy. We may share information:
              </Text>
              <Text style={styles.bulletPoint}>• With other users as part of the matching service</Text>
              <Text style={styles.bulletPoint}>• With service providers who assist our operations</Text>
              <Text style={styles.bulletPoint}>• When required by law or to protect our rights</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Location Information</Text>
              <Text style={styles.sectionText}>
                We use your location to help you find nearby matches and improve your experience. 
                You can control location sharing in your device settings. Location data is:
              </Text>
              <Text style={styles.bulletPoint}>• Used only for matching and safety features</Text>
              <Text style={styles.bulletPoint}>• Not shared with other users without your consent</Text>
              <Text style={styles.bulletPoint}>• Stored securely and deleted when no longer needed</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Data Security</Text>
              <Text style={styles.sectionText}>
                We implement appropriate security measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. However, no method of 
                transmission over the internet is 100% secure.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Your Rights</Text>
              <Text style={styles.sectionText}>
                You have the right to:
              </Text>
              <Text style={styles.bulletPoint}>• Access and update your personal information</Text>
              <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
              <Text style={styles.bulletPoint}>• Opt out of certain communications</Text>
              <Text style={styles.bulletPoint}>• Request a copy of your data</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Analytics and Tracking</Text>
              <Text style={styles.sectionText}>
                We use analytics services to understand how you use our app and improve our services. 
                This includes tracking:
              </Text>
              <Text style={styles.bulletPoint}>• App usage patterns and feature adoption</Text>
              <Text style={styles.bulletPoint}>• Performance metrics and crash reports</Text>
              <Text style={styles.bulletPoint}>• User engagement and retention data</Text>
              <Text style={styles.bulletPoint}>• Anonymous usage statistics</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
              <Text style={styles.sectionText}>
                Our service is not intended for users under 18 years of age. We do not knowingly 
                collect personal information from children under 18.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
              <Text style={styles.sectionText}>
                We may update this privacy policy from time to time. We will notify you of any 
                changes by posting the new policy in the app and updating the "last updated" date.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Contact Us</Text>
              <Text style={styles.sectionText}>
                If you have any questions about this privacy policy, please contact us at:
              </Text>
              <Text style={styles.contactInfo}>Email: privacy@circle.orincore.com</Text>
              <Text style={styles.contactInfo}>Address: Orincore Technologies, India</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By using Circle, you agree to this Privacy Policy and our Terms of Service.
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sectionText: {
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
