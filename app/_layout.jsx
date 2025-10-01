import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationManager from "@/src/components/NotificationManager";
import BrowserNotificationProvider from "@/src/components/BrowserNotificationProvider";
import ConnectionStatus from "@/src/components/ConnectionStatus";
import { Platform } from 'react-native';
import { useEffect } from 'react';

export default function RootLayout() {
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

      // Set page title
      document.title = 'Circle - Find Your Circle';

      // Set favicon
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.href = '/favicon.png';
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = '/favicon.png';
        document.head.appendChild(link);
      }

      // Add apple touch icon
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        const link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.href = '/icon.png';
        document.head.appendChild(link);
      }

      // Fix body height for mobile browsers
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BrowserNotificationProvider>
            <ConnectionStatus />
            <Stack screenOptions={{ headerShown: false }} />
            <NotificationManager />
          </BrowserNotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
