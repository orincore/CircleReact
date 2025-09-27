import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatOptionsMenu({ 
  visible, 
  onClose, 
  onMuteToggle,
  isMuted = false,
  position = { x: 0, y: 0 }
}) {
  const insets = useSafeAreaInsets();
  const options = [
    {
      id: 'mute',
      label: isMuted ? 'Unmute Notifications' : 'Mute Notifications',
      icon: isMuted ? 'notifications' : 'notifications-off',
      onPress: onMuteToggle,
    },
    {
      id: 'clear',
      label: 'Clear Chat History',
      icon: 'trash-outline',
      onPress: () => {
        // TODO: Implement clear chat history
        console.log('Clear chat history');
        onClose();
      },
      destructive: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[
          styles.container, 
          Platform.OS === 'web' ? styles.webPosition : { 
            top: 60 + insets.top, 
            right: 20 
          }
        ]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.menu}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  index === options.length - 1 && styles.lastOptionButton,
                ]}
                onPress={() => {
                  option.onPress();
                  onClose();
                }}
              >
                <Ionicons 
                  name={option.icon} 
                  size={20} 
                  color={option.destructive ? '#FF4444' : '#7C2B86'} 
                />
                <Text style={[
                  styles.optionText,
                  option.destructive && styles.destructiveText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    position: 'absolute',
    minWidth: 200,
  },
  webPosition: {
    top: 60,
    right: 20,
  },
  mobilePosition: {
    top: 100,
    right: 20,
  },
  menu: {
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    }),
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  lastOptionButton: {
    borderBottomWidth: 0,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#7C2B86',
  },
  destructiveText: {
    color: '#FF4444',
  },
});
