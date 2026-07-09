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
        // Best-effort fix for an intermittent cold-start-only glitch where
        // another tab's own floating UI (e.g. Match's settings button/
        // full-screen "searching" spinner) briefly appeared bled through
        // over the Chat tab right after switching to it for the first time
        // post-launch. freezeOnBlur stops an inactive tab's screen from
        // rendering/repainting at all while it isn't focused (via
        // react-freeze under the hood), instead of just relying on it being
        // laid out off in a hidden state -- the likelier cause on a cold
        // start, when every tab is still settling into place at once.
        freezeOnBlur: true,
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
        name="memes"
        options={{ title: "Memes" }}
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
