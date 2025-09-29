import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { socialAccountsApi } from '@/src/api/social-accounts';

// Complete auth session for better mobile handling
WebBrowser.maybeCompleteAuthSession();

export const useSpotifyAuth = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Spotify OAuth configuration
  const spotifyConfig = {
    clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || 'your_spotify_client_id',
    scopes: [
      'user-read-private',
      'user-read-email', 
      'user-top-read',
      'user-read-recently-played',
      'playlist-read-private'
    ],
    additionalParameters: {
      show_dialog: 'true' // Force login dialog
    },
    responseType: AuthSession.ResponseType.Code,
  };

  // Create redirect URI based on platform
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: Platform.OS === 'web' ? 'https' : 'circle',
    path: 'auth/spotify/callback',
    preferLocalhost: Platform.OS === 'web',
  });

  console.log('🔧 Spotify Auth Config:');
  console.log('Platform:', Platform.OS);
  console.log('Redirect URI:', redirectUri);
  console.log('Client ID:', spotifyConfig.clientId);

  // Create auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      ...spotifyConfig,
      redirectUri,
    },
    {
      authorizationEndpoint: 'https://accounts.spotify.com/authorize',
    }
  );

  // Handle auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response);
    } else if (response?.type === 'error') {
      console.error('Spotify auth error:', response.error);
      setError(response.error?.message || 'Authentication failed');
      setIsLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('Spotify auth cancelled by user');
      setError('Authentication cancelled');
      setIsLoading(false);
    }
  }, [response]);

  const handleAuthSuccess = async (authResponse) => {
    try {
      console.log('✅ Spotify auth success:', authResponse);
      
      const { code, state } = authResponse.params;
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('📤 Sending callback to backend...');
      
      // Send the authorization code to our backend
      const result = await socialAccountsApi.handleSpotifyCallback(code, state || 'expo-auth-session');
      
      if (result.success) {
        console.log('✅ Spotify account linked successfully');
        setError(null);
        return { success: true, account: result.account };
      } else {
        throw new Error(result.message || 'Failed to link Spotify account');
      }
      
    } catch (error) {
      console.error('❌ Spotify callback error:', error);
      setError(error.message || 'Failed to complete authentication');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const startSpotifyAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Starting Spotify authentication...');
      console.log('Auth request ready:', !!request);
      
      if (!request) {
        throw new Error('Auth request not ready');
      }

      // Start the authentication flow
      const result = await promptAsync({
        useProxy: Platform.OS !== 'web', // Use proxy for mobile, direct for web
        showInRecents: true,
      });

      console.log('Auth prompt result:', result);
      
      if (result.type === 'cancel') {
        setIsLoading(false);
        setError('Authentication cancelled');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start Spotify auth:', error);
      setError(error.message || 'Failed to start authentication');
      setIsLoading(false);
      return { type: 'error', error };
    }
  };

  return {
    startSpotifyAuth,
    isLoading,
    error,
    request,
    response,
  };
};
