import UserConsentModal from "@/components/UserConsentModal";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VerificationProvider } from "@/contexts/VerificationContext";
import BrowserNotificationProvider from "@/src/components/BrowserNotificationProvider";
import ConnectionStatus from "@/src/components/ConnectionStatus";
import NotificationManager from "@/src/components/NotificationManager";
import ErrorBoundary from "@/src/components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "@/src/utils/crashPrevention";
import { Stack } from "expo-router";
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import analyticsService from '@/src/services/analyticsService';
import appVersionService from '@/src/services/appVersionService';
// import crashReportingService from '@/src/services/crashReportingService';
import { useUserConsent } from '@/components/UserConsentModal';

export default function RootLayout() {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const { checkConsent, hasConsent } = useUserConsent();

  useEffect(() => {
    // Set up global error handlers first
    setupGlobalErrorHandlers();
    
    // Initialize app services
    const initializeServices = async () => {
      try {
        // Check user consent first
        const consent = await checkConsent();
        
        if (!consent) {
          setShowConsentModal(true);
          return;
        }

        // Initialize services based on consent
        await initializeAppServices(consent);
      } catch (error) {
        console.error('Error initializing services:', error);
      }
    };

    initializeServices();
  }, []);

  const initializeAppServices = async (consent) => {
    try {
      // TODO: Initialize services when packages are installed
      
      // // Always initialize crash reporting (essential for app stability)
      // await crashReportingService.initialize();
      // crashReportingService.setEnabled(consent.crashReporting);

      // Initialize app version tracking and update checks
      try {
        // Register forced update listener (from backend version check)
        appVersionService.onForceUpdateRequired((result) => {
          if (Platform.OS === 'android' || Platform.OS === 'ios') {
            const buttons = result.forceUpdate
              ? [
                  {
                    text: 'Update Now',
                    onPress: () => {
                      try {
                        Linking.openURL(result.storeUrl);
                      } catch (err) {
                        console.error('Failed to open store URL:', err);
                      }
                    },
                  },
                ]
              : [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Update',
                    onPress: () => {
                      try {
                        Linking.openURL(result.storeUrl);
                      } catch (err) {
                        console.error('Failed to open store URL:', err);
                      }
                    },
                  },
                ];

            Alert.alert(
              'Update Required',
              result.message || 'A new version of Circle is available. Please update to continue.',
              buttons,
              { cancelable: !result.forceUpdate },
            );
          }
        });

        // Register OTA update listener (Expo Updates)
        appVersionService.onUpdateAvailable(() => {
          if (Platform.OS === 'android') {
            const url = appVersionService.getPlayStoreUrl();
            Alert.alert(
              'Update available',
              'A new version of Circle is available. Please update to get the latest features and fixes.',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Update',
                  onPress: () => {
                    try {
                      Linking.openURL(url);
                    } catch (err) {
                      console.error('Failed to open Play Store URL:', err);
                    }
                  },
                },
              ],
              { cancelable: true },
            );
          }
        });

        await appVersionService.initialize();
        await appVersionService.trackInstallation();
        await appVersionService.trackUpgrade();
      } catch (versionErr) {
        console.error('Error initializing app version service:', versionErr);
      }

      // // Initialize analytics only if user consented
      // if (consent.analytics) {
      //   analyticsService.setEnabled(true);
      //   await analyticsService.initialize();
        
      //   // Track app launch
      //   await analyticsService.trackEvent('app_launched', {
      //     platform: Platform.OS,
      //     consent_version: consent.version,
      //   });
      // } else {
      //   analyticsService.setEnabled(false);
      // }

    } catch (error) {
      console.error('Error initializing app services:', error);
      // await crashReportingService.reportError(error, { context: 'service_initialization' });
    }
  };

  const handleConsentAccept = async () => {
    setShowConsentModal(false);
    const consent = await checkConsent();
    await initializeAppServices(consent);
  };

  const handleConsentDecline = async () => {
    setShowConsentModal(false);
    const consent = await checkConsent();
    await initializeAppServices(consent);
  };

  useEffect(() => {
    // Fix viewport for mobile browsers
    if (Platform.OS === 'web') {
      // Set viewport meta tag for mobile browsers
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(meta);
      }

      // Set page title with SEO-optimized text
      document.title = 'Circle - No Swiping Dating & Friendship App | AI-Powered Smart Matching';
      
      // Add meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = 'Stop swiping! Circle uses AI-powered smart matching to find your perfect partner or friends automatically. No endless swiping - just real, meaningful connections based on compatibility, interests, and location. Join Circle today!';
      
      // Add keywords meta tag
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = 'no swiping dating app, smart matching, AI dating, friendship app, relationship app, find friends, find love, dating without swiping, intelligent matchmaking, compatibility matching, location based dating, interest based matching, real connections, meaningful relationships, Circle app, ORINCORE';

      // Remove existing favicons
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(link => link.remove());

      // Add favicon
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/png';
      favicon.href = '/favicon.png?' + Date.now(); // Cache bust
      document.head.appendChild(favicon);

      // Add shortcut icon
      const shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.type = 'image/png';
      shortcutIcon.href = '/favicon.png?' + Date.now();
      document.head.appendChild(shortcutIcon);

      // Add apple touch icon
      const appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.href = '/icon.png?' + Date.now();
      document.head.appendChild(appleTouchIcon);

      // Fix body height for mobile browsers - use dvh for dynamic viewport height
      // This accounts for mobile browser chrome (address bar, bottom nav)
      document.body.style.height = '100dvh';
      document.body.style.minHeight = '100dvh';
      document.body.style.maxHeight = '100dvh';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.documentElement.style.height = '100dvh';
      document.documentElement.style.overflow = 'hidden';
      
      // Add CSS custom properties for safe areas
      const style = document.createElement('style');
      style.id = 'circle-mobile-safe-areas';
      style.textContent = `
        :root {
          --safe-area-inset-top: env(safe-area-inset-top, 0px);
          --safe-area-inset-right: env(safe-area-inset-right, 0px);
          --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
          --safe-area-inset-left: env(safe-area-inset-left, 0px);
          --browser-chrome-height: 56px;
        }
        
        /* Ensure the app container uses dynamic viewport height */
        #root {
          height: 100dvh !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* Mobile browser bottom padding for tab bars */
        .mobile-bottom-safe-area {
          padding-bottom: max(env(safe-area-inset-bottom, 12px), 12px) !important;
        }
        
        /* Fallback for browsers that don't support dvh */
        @supports not (height: 100dvh) {
          body, html, #root {
            height: 100vh !important;
            height: -webkit-fill-available !important;
          }
        }
        
        /* Additional mobile browser fixes */
        @media screen and (max-width: 768px) {
          body {
            -webkit-overflow-scrolling: touch;
          }
        }
      `;
      
      // Remove existing style if present
      const existingStyle = document.getElementById('circle-mobile-safe-areas');
      if (existingStyle) {
        existingStyle.remove();
      }
      document.head.appendChild(style);
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <VerificationProvider>
                <SubscriptionProvider>
                <BrowserNotificationProvider>
                  <ConnectionStatus />
                  <Stack screenOptions={{ headerShown: false }} />
                  <NotificationManager />
                  
                  {/* User Consent Modal for GDPR Compliance */}
                  <UserConsentModal
                    visible={showConsentModal}
                    onAccept={handleConsentAccept}
                    onDecline={handleConsentDecline}
                  />
                </BrowserNotificationProvider>
                </SubscriptionProvider>
              </VerificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
