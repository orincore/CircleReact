import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function PhotoPlaceholder({ style, size = 'medium' }) {
  const sizeStyles = {
    small: { width: 60, height: 60 },
    medium: { width: 100, height: 100 },
    large: { width: 150, height: 150 }
  };

  const iconSizes = {
    small: 20,
    medium: 32,
    large: 48
  };

  return (
    <View style={[styles.container, sizeStyles[size], style]}>
      <Ionicons 
        name="image-outline" 
        size={iconSizes[size]} 
        color="#CBD5E1" 
      />
      <Text style={styles.text}>No Image</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  text: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
