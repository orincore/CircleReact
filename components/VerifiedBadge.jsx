import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function VerifiedBadge({ size = 20, style }) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons 
        name="checkmark-circle" 
        size={size} 
        color="#1DA1F2" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
