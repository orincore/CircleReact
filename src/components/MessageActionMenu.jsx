import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function MessageActionMenu({ 
  visible, 
  onClose, 
  onEdit, 
  onDelete, 
  onReact, 
  position,
  isMine,
  isDeleted 
}) {
  const actions = [
    {
      id: 'react',
      label: 'Add Reaction',
      icon: 'happy-outline',
      onPress: onReact,
      show: !isDeleted,
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: 'create-outline',
      onPress: onEdit,
      show: isMine && !isDeleted,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'trash-outline',
      onPress: onDelete,
      show: isMine && !isDeleted,
      destructive: true,
    },
  ].filter(action => action.show);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, position && { top: position.y, left: position.x }]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.menu}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  index === actions.length - 1 && styles.lastActionButton,
                ]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              >
                <Ionicons 
                  name={action.icon} 
                  size={20} 
                  color={action.destructive ? '#FF4444' : '#7C2B86'} 
                />
                <Text style={[
                  styles.actionText,
                  action.destructive && styles.destructiveText
                ]}>
                  {action.label}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    position: 'absolute',
  },
  menu: {
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(124, 43, 134, 0.1)',
  },
  lastActionButton: {
    borderBottomWidth: 0,
  },
  actionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#7C2B86',
  },
  destructiveText: {
    color: '#FF4444',
  },
});
