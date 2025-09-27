import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Pressable,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function ConfirmationDialog({ 
  visible, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false 
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0.95)']}
            style={styles.dialog}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <Ionicons 
                name={destructive ? "warning-outline" : "help-circle-outline"} 
                size={24} 
                color={destructive ? "#FF4444" : "#7C2B86"} 
              />
              <Text style={styles.title}>{title}</Text>
            </View>
            
            <Text style={styles.message}>{message}</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  destructive ? styles.destructiveButton : styles.confirmButton
                ]} 
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                <Text style={[
                  styles.confirmButtonText,
                  destructive && styles.destructiveButtonText
                ]}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    ...(Platform.OS === 'web' && {
      maxWidth: 350,
    }),
  },
  dialog: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.25)',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
    marginLeft: 12,
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.8)',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  cancelButton: {
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  confirmButton: {
    backgroundColor: '#7C2B86',
  },
  destructiveButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  destructiveButtonText: {
    color: 'white',
  },
});
