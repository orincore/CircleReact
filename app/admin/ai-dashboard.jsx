import React from 'react';
import { View, StyleSheet } from 'react-native';
import AIDashboard from '@/app/secure/admin/ai-dashboard';

export default function AdminAIDashboard() {
  return (
    <View style={styles.container}>
      <AIDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
