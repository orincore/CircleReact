import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import TabBarWithNotifications from "@/components/TabBarWithNotifications";

const TAB_COLORS = {
  background: "rgba(22, 9, 45, 0.85)",
  active: "#FF1493", // Deep pink for maximum visibility
  inactive: "rgba(255, 255, 255, 0.52)",
  activeBackground: "rgba(255, 20, 147, 0.15)", // Subtle background for active tab
};

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="match"
      tabBar={(props) => <TabBarWithNotifications {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="match"
        options={{ title: "Match" }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore" }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "700", // Slightly bolder for chat
          }
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
    </Tabs>
  );
}
