import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

const TAB_COLORS = {
  background: "rgba(22, 9, 45, 0.85)",
  active: "#FFD6F2",
  inactive: "rgba(255, 255, 255, 0.52)",
};

export default function SecureLayout() {
  return (
    <Tabs
      initialRouteName="match"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: TAB_COLORS.background,
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: TAB_COLORS.active,
        tabBarInactiveTintColor: TAB_COLORS.inactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            match: "heart",
            chat: "chatbubbles",
            profile: "person",
          };

          const iconName = iconMap[route.name] ?? "ellipse";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="match"
        options={{ title: "Match" }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
    </Tabs>
  );
}
