import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Contact() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  if (Platform.OS !== 'web') {
    return null; // Only show on web
  }

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get API base URL - use production API
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';
      
    

      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        setSuccessMessage(result);
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        // Reset submitted state after 5 seconds
        setTimeout(() => {
          setIsSubmitted(false);
          setSuccessMessage(null);
        }, 5000);
      } else {
        console.error('❌ Contact form submission failed:', result);
        Alert.alert('Error', result.error || 'Failed to submit contact form. Please try again.');
      }
    } catch (error) {
      console.error('❌ Contact form network error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Text style={styles.headerTitle}>Contact Us</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.intro}>
            Have questions or feedback? We'd love to hear from you. Fill out the form below or reach out to us directly.
          </Text>

          <View style={styles.contactGrid}>
            {/* Contact Information */}
            <View style={styles.contactInfo}>
              <View style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={24} color="#7C2B86" />
                </View>
                <Text style={styles.infoTitle}>Email</Text>
                <Text style={styles.infoText}>support@orincore.com</Text>
                <Text style={styles.infoSubtext}>We'll respond within 24 hours</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={24} color="#7C2B86" />
                </View>
                <Text style={styles.infoTitle}>Address</Text>
                <Text style={styles.infoText}>ORINCORE Technologies</Text>
                <Text style={styles.infoSubtext}>Building connections worldwide</Text>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="time" size={24} color="#7C2B86" />
                </View>
                <Text style={styles.infoTitle}>Business Hours</Text>
                <Text style={styles.infoText}>Monday - Friday</Text>
                <Text style={styles.infoSubtext}>9:00 AM - 6:00 PM</Text>
              </View>

              <View style={styles.socialLinks}>
                <Text style={styles.socialTitle}>Follow Us</Text>
                <View style={styles.socialIcons}>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => window.open('https://x.com/orincore_tweet', '_blank')}
                  >
                    <Ionicons name="logo-twitter" size={20} color="#7C2B86" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => window.open('https://instagram.com/ig_orincore', '_blank')}
                  >
                    <Ionicons name="logo-instagram" size={20} color="#7C2B86" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => window.open('https://www.facebook.com/orincore', '_blank')}
                  >
                    <Ionicons name="logo-facebook" size={20} color="#7C2B86" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Contact Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Send us a Message</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What is this about?"
                  value={formData.subject}
                  onChangeText={(text) => setFormData({ ...formData, subject: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us more..."
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Success Message Display */}
              {successMessage && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  <View style={styles.successTextContainer}>
                    <Text style={styles.successTitle}>Message Sent Successfully!</Text>
                    <Text style={styles.successText}>{successMessage.message}</Text>
                    <Text style={styles.successTimestamp}>
                      Sent at {new Date(successMessage.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, (isSubmitting || isSubmitted) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || isSubmitted}
              >
                <LinearGradient
                  colors={isSubmitted ? ['#22C55E', '#16A34A'] : ['#7C2B86', '#B24592']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isSubmitting ? (
                    <Text style={styles.submitButtonText}>Sending...</Text>
                  ) : isSubmitted ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submitted</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Send Message</Text>
                      <Ionicons name="send" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#F9FAFB',
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
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
    padding: 40,
  },
  intro: {
    fontSize: 18,
    lineHeight: 28,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 40,
  },
  contactInfo: {
    flex: 1,
    gap: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#7C2B86',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  socialLinks: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  socialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  formContainer: {
    flex: 1.5,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    outlineStyle: 'none',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
    marginBottom: 4,
  },
  successText: {
    fontSize: 14,
    color: '#15803D',
    marginBottom: 4,
  },
  successTimestamp: {
    fontSize: 12,
    color: '#22C55E',
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
