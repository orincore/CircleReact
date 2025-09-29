import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import browserNotificationService from '../services/browserNotificationService';

export default function NotificationPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Only show on web platform
    if (Platform.OS !== 'web') return;

    const checkPermission = () => {
      const status = browserNotificationService.getStatus();
      
      // Show banner if notifications are supported but not granted
      setShowBanner(
        status.supported && 
        status.permission === 'default' && 
        !localStorage.getItem('notification_permission_dismissed')
      );
    };

    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    
    try {
      const granted = await browserNotificationService.requestPermission();
      
      if (granted) {
        setShowBanner(false);
        
        // Show test notification
        browserNotificationService.showGenericNotification({
          title: '🔔 Notifications Enabled!',
          body: 'You\'ll now receive notifications for messages, friend requests, and matches.',
          type: 'permission_granted'
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification_permission_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={24} color="#7C2B86" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Enable Notifications</Text>
          <Text style={styles.description}>
            Get notified about new messages, friend requests, and matches even when Circle is in the background.
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.dismissButton} 
          onPress={handleDismiss}
        >
          <Text style={styles.dismissText}>Not Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.enableButton, requesting && styles.enableButtonDisabled]} 
          onPress={handleRequestPermission}
          disabled={requesting}
        >
          <Ionicons 
            name={requesting ? "hourglass" : "checkmark"} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.enableText}>
            {requesting ? 'Requesting...' : 'Enable'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(31, 17, 71, 0.7)',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(31, 17, 71, 0.6)',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C2B86',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  enableButtonDisabled: {
    opacity: 0.6,
  },
  enableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
