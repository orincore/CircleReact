import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';

export default function CareersNativePlaceholder() {
  const handleEmail = () => {
    Linking.openURL('mailto:careers@orincore.com?subject=Career Inquiry');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.centered}>
      <View style={styles.card}>
        <Text style={styles.title}>Careers</Text>
        <Text style={styles.subtitle}>This page is available on our website.</Text>
        <Text style={styles.description}>
          Please visit our Careers page on the web to view open roles and apply. You can also email us directly with your resume.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleEmail} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Email careers@orincore.com</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 560,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7C2B86',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#7C2B86',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
