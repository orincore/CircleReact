import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import NotificationManager from "@/src/components/NotificationManager";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <NotificationManager />
    </AuthProvider>
  );
}
