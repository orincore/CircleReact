import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';

export default function AppTestingNativeFallback() {
  const getWebBaseUrl = () => process.env.EXPO_PUBLIC_WEB_BASE_URL || 'http://localhost:8081';
  const openWeb = () => {
    const url = `${getWebBaseUrl()}/careers/app-testing`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
      <View style={styles.card}>
        <Text style={styles.title}>App Testing Application</Text>
        <Text style={styles.subtitle}>This application can be completed on our website.</Text>
        <Text style={styles.description}>
          Please open the web application form to apply for the App Testing role. You will need your Circle account and email.
        </Text>
        <TouchableOpacity style={styles.button} onPress={openWeb} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Open Web Application</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff', width: '100%', maxWidth: 560, borderRadius: 12, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#7C2B86', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  button: { backgroundColor: '#7C2B86', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
