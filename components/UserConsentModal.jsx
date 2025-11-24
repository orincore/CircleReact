import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = '@circle:user_consent';

export default function UserConsentModal({ visible, onAccept, onDecline }) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      // Store consent in local storage
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        analytics: true,
        crashReporting: true,
        personalization: true,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      
      onAccept();
    } catch (error) {
      console.error('Error storing consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      // Store minimal consent (only essential)
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        analytics: false,
        crashReporting: false,
        personalization: false,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      
      onDecline();
    } catch (error) {
      console.error('Error storing consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPrivacyPolicy = () => {
    const url = Platform.OS === 'web' 
      ? 'https://circle.orincore.com/privacy' 
      : 'https://circle.orincore.com/privacy';
    Linking.openURL(url);
  };

  const openTerms = () => {
    const url = Platform.OS === 'web' 
      ? 'https://circle.orincore.com/terms' 
      : 'https://circle.orincore.com/terms';
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.modal}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#FFFFFF" />
          </View>
          
          <Text style={styles.title}>Your Privacy Matters</Text>
          
          <Text style={styles.description}>
            Circle uses analytics and crash reporting to improve your experience. 
            We respect your privacy and follow GDPR guidelines.
          </Text>

          <View style={styles.permissionsContainer}>
            <View style={styles.permissionItem}>
              <Ionicons name="analytics" size={20} color="#7C2B86" />
              <Text style={styles.permissionText}>Usage analytics to improve the app</Text>
            </View>
            
            <View style={styles.permissionItem}>
              <Ionicons name="bug" size={20} color="#7C2B86" />
              <Text style={styles.permissionText}>Crash reporting for better stability</Text>
            </View>
            
            <View style={styles.permissionItem}>
              <Ionicons name="person" size={20} color="#7C2B86" />
              <Text style={styles.permissionText}>Personalized matching recommendations</Text>
            </View>
          </View>

          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={openPrivacyPolicy} style={styles.link}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>•</Text>
            <TouchableOpacity onPress={openTerms} style={styles.link}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={loading}
            >
              <Text style={styles.acceptButtonText}>
                {loading ? 'Processing...' : 'Accept All'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              disabled={loading}
            >
              <Text style={styles.declineButtonText}>
                Essential Only
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            You can change these preferences anytime in Settings
          </Text>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// Hook to check consent status
export const useUserConsent = () => {
  const [consentStatus, setConsentStatus] = useState(null);

  const checkConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      if (consent) {
        setConsentStatus(JSON.parse(consent));
        return JSON.parse(consent);
      }
      return null;
    } catch (error) {
      console.error('Error checking consent:', error);
      return null;
    }
  };

  const updateConsent = async (newConsent) => {
    try {
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        ...newConsent,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));
      setConsentStatus(newConsent);
    } catch (error) {
      console.error('Error updating consent:', error);
    }
  };

  const hasConsent = (type) => {
    return consentStatus && consentStatus[type] === true;
  };

  return {
    consentStatus,
    checkConsent,
    updateConsent,
    hasConsent,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#7C2B86',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 14,
    color: '#E0E0E0',
    marginHorizontal: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#7C2B86',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  note: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
