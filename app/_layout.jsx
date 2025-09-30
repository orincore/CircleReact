import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationManager from "@/src/components/NotificationManager";
import BrowserNotificationProvider from "@/src/components/BrowserNotificationProvider";
import ConnectionStatus from "@/src/components/ConnectionStatus";

export default function RootLayout() {
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
