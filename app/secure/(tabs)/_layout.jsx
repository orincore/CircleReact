import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import TabBarWithNotifications from "@/components/TabBarWithNotifications";


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
