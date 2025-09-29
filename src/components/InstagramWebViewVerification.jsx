import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socialAccountsApi } from '../api/social-accounts';

// Try to import WebBrowser from Expo
let WebBrowser;
try {
  WebBrowser = require('expo-web-browser');
} catch (error) {
  console.log('WebBrowser not available');
}

const InstagramWebViewVerification = ({ 
  visible, 
  onClose, 
  onSuccess, 
  token 
}) => {
  const [startingOAuth, setStartingOAuth] = useState(false);

  // Start Instagram OAuth flow
  const startInstagramOAuth = async () => {
    if (startingOAuth) return;
    
    setStartingOAuth(true);
    
    try {
      console.log('🔐 Starting Instagram OAuth flow...');
      
      const result = await socialAccountsApi.linkInstagram(token);
      
      if (result.authUrl) {
        console.log('✅ Got Instagram OAuth URL:', result.authUrl);
        
        if (Platform.OS === 'web') {
          // For web, open in same window
          window.location.href = result.authUrl;
        } else {
          // For mobile, use WebBrowser
          if (WebBrowser && WebBrowser.openBrowserAsync) {
            const browserResult = await WebBrowser.openBrowserAsync(result.authUrl, {
              presentationStyle: Platform.OS === 'ios' 
                ? WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN
                : WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
              controlsColor: '#E4405F',
              toolbarColor: '#FFFFFF',
              showTitle: true,
              dismissButtonStyle: Platform.OS === 'ios' ? 'close' : 'cancel',
            });
            
            console.log('WebBrowser result:', browserResult);
            
            // Note: The actual OAuth callback will be handled by the backend
            // and the user will need to return to the app manually
            Alert.alert(
              'OAuth Complete?',
              'If you completed the Instagram authorization, your account should now be linked. Please check your profile.',
              [
                { 
                  text: 'Check Status', 
                  onPress: () => {
                    onSuccess({ platform: 'instagram', username: 'Linked via OAuth' });
                    onClose();
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          } else {
            // Fallback to external linking
            await Linking.openURL(result.authUrl);
            
            Alert.alert(
              'Complete Authorization',
              'Please complete the Instagram authorization in your browser, then return to the app.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to start Instagram OAuth:', error);
      Alert.alert(
        'OAuth Failed',
        error.message || 'Failed to start Instagram authorization. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setStartingOAuth(false);
    }
  };

  const resetAndClose = () => {
    setStartingOAuth(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={resetAndClose}
            disabled={startingOAuth}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="logo-instagram" size={64} color="#E4405F" />
          </View>
          
          <Text style={styles.title}>Link Your Instagram</Text>
          <Text style={styles.description}>
            Connect your Instagram account using secure OAuth authentication to verify your identity.
          </Text>
          
          {/* OAuth Flow */}
          <View style={styles.oauthContainer}>
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Secure Instagram authorization</Text>
            </View>
            
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Automatic account verification</Text>
            </View>
            
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Instant profile linking</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.oauthButton, startingOAuth && styles.oauthButtonDisabled]}
            onPress={startInstagramOAuth}
            disabled={startingOAuth}
          >
            {startingOAuth ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.oauthButtonText}>
              {startingOAuth ? 'Starting Authorization...' : 'Connect Instagram Account'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.securityNote}>
            🔒 Your Instagram credentials are never stored. We use Instagram's secure OAuth system.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  oauthContainer: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C2B86',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4405F',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginBottom: 24,
  },
  oauthButtonDisabled: {
    backgroundColor: 'rgba(228, 64, 95, 0.6)',
  },
  oauthButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityNote: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default InstagramWebViewVerification;
