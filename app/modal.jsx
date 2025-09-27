import { StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circle Modal</Text>
      <Text style={styles.subtitle}>This is a modal screen.</Text>
    </View>
  );
}

export const unstable_settings = {
  headerShown: true,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1F1147",
  },
  subtitle: {
    fontSize: 16,
    color: "#5D4B94",
    textAlign: "center",
  },
});
