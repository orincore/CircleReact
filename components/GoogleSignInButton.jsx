import { useAuth } from "@/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration (per-platform client IDs)
const GOOGLE_CLIENT_ID = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
};

// Configure redirect URI based on environment
// - Dev (Expo Go): use Expo proxy (auth.expo.io)
// - Prod (standalone builds): use native "circle" scheme
const redirectUri = AuthSession.makeRedirectUri(
  __DEV__
    ? { useProxy: true }
    : { scheme: 'circle', useProxy: false }
);

console.log('Google OAuth Redirect URI:', redirectUri);

export default function GoogleSignInButton({ 
  onSuccess, 
  onError, 
  mode = 'signin', // 'signin' or 'signup'
  style,
  disabled = false 
}) {
  const { googleAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID.ios,
    androidClientId: GOOGLE_CLIENT_ID.android,
    webClientId: GOOGLE_CLIENT_ID.web,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID.ios && !GOOGLE_CLIENT_ID.android && !GOOGLE_CLIENT_ID.web) {
      Alert.alert('Configuration Error', 'Google OAuth is not configured for this platform');
      return;
    }

    if (loading || disabled) return;

    try {
      setLoading(true);
      
      // Prompt for Google authentication
      const result = await promptAsync({ 
        useProxy: __DEV__,
        showInRecents: false 
      });
      
      
      if (result.type === 'success') {
        const { id_token } = result.params;
        
        if (!id_token) {
          throw new Error('No ID token received from Google');
        }

        // Call our backend with the Google ID token
        const authResult = await googleAuth(id_token);
        
        // Add the idToken to the result for new users
        if (authResult.isNewUser) {
          authResult.idToken = id_token;
        }
        
        if (onSuccess) {
          onSuccess(authResult);
        }
      } else if (result.type === 'cancel') {
        // User cancelled - no error needed
        console.log('Google sign-in cancelled by user');
      } else {
        throw new Error('Google authentication failed');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      
      let errorMessage = 'Google sign-in failed. Please try again.';
      if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('cancelled')) {
        errorMessage = 'Sign-in was cancelled.';
      }
      
      if (onError) {
        onError(error);
      } else {
        Alert.alert('Sign-In Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonText = mode === 'signup' 
    ? (loading ? 'Signing up...' : 'Sign up with Google')
    : (loading ? 'Signing in...' : 'Continue with Google');

  return (
    <TouchableOpacity
      style={[styles.googleButton, style, (disabled || loading) && styles.disabled]}
      onPress={handleGoogleSignIn}
      disabled={disabled || loading || !request}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        <Ionicons 
          name="logo-google" 
          size={20} 
          color="#4285F4" 
          style={styles.googleIcon}
        />
        <Text style={styles.buttonText}>{buttonText}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3C4043',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
