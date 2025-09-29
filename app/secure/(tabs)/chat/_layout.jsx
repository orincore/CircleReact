import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Chats",
          tabBarStyle: undefined // Ensure tab bar is visible
        }} 
      />
    </Stack>
  );
}
