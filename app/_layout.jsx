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
