import { Stack } from "expo-router";

export default function MemesLayout() {
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
          title: "Nudges",
          tabBarStyle: undefined
        }}
      />
      <Stack.Screen
        name="connect-requests"
        options={{
          title: "Connect Requests",
          tabBarStyle: { display: 'none' }
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "New Nudge",
          tabBarStyle: { display: 'none' },
          animation: 'slide_from_bottom'
        }}
      />
    </Stack>
  );
}
