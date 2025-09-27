import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

function PlaceholderScreen({ title }) {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>
        This legacy tabs route is kept for backward compatibility. Please navigate using the latest Circle app experience.
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Legacy Home" }}
        redirect={true}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Legacy Explore" }}
        redirect={true}
      />
    </Tabs>
  );
}

export function LegacyHome() {
  return <PlaceholderScreen title="Legacy Home" />;
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1F1147",
  },
  placeholderSubtitle: {
    fontSize: 16,
    color: "#5D4B94",
    textAlign: "center",
    lineHeight: 22,
  },
});
