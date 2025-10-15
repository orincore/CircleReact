import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Cross-platform Alert Modal Component
 * Better UX than native alerts, works consistently on all platforms
 */
export default function CrossPlatformAlert({ 
  visible, 
  title, 
  message, 
  buttons = [{ text: 'OK' }],
  onDismiss 
}) {
  if (!visible) return null;

  const handleButtonPress = (button) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <LinearGradient
            colors={['#2d1b4e', '#1a0b2e']}
            style={styles.alertGradient}
          >
            {/* Title */}
            <Text style={styles.title}>{title}</Text>
            
            {/* Message */}
            {message && (
              <Text style={styles.message}>{message}</Text>
            )}
            
            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === 'cancel' && styles.cancelButton,
                    buttons.length === 1 && styles.singleButton
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      button.style === 'cancel' 
                        ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                        : ['#FF6FB5', '#A16AE8']
                    }
                    style={styles.buttonGradient}
                  >
                    <Text style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelButtonText
                    ]}>
                      {button.text}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  alertGradient: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  singleButton: {
    flex: 1,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    // Styles for cancel button
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
