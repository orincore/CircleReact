import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationManager from "@/src/components/NotificationManager";
import BrowserNotificationProvider from "@/src/components/BrowserNotificationProvider";
import ConnectionStatus from "@/src/components/ConnectionStatus";

export default function RootLayout() {
  return (
    <AuthProvider>
      <BrowserNotificationProvider>
        <ConnectionStatus />
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationManager />
      </BrowserNotificationProvider>
    </AuthProvider>
  );
}
