import { Stack } from "expo-router";

export default function SecureLayout() {
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
    </Stack>
  );
}
