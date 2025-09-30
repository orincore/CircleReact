import { Stack } from "expo-router";
import { useVoiceCall } from "@/src/hooks/useVoiceCall";

export default function SecureLayout() {
  // Initialize voice call service for all logged-in users
  useVoiceCall();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="chat-conversation" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="location" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="voice-call" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }}
      />
    </Stack>
  );
}
