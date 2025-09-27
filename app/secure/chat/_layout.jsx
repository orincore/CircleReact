import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Chats" }} />
      <Stack.Screen name="[id]" options={{ title: "Conversation" }} />
    </Stack>
  );
}
