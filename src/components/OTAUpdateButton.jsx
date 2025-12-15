/**
 * OTA Update Button Component
 * Allows manual checking and downloading of OTA updates
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { otaUpdateService } from '@/src/services/otaUpdateService';
import { useTheme } from '@/contexts/ThemeContext';

export default function OTAUpdateButton({ style }) {
  const { theme } = useTheme();
  const [isChecking, setIsChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleCheckForUpdates = async () => {
    try {
      setIsChecking(true);
      
      // Get current status first
      const status = await otaUpdateService.getUpdateStatus();
      setUpdateStatus(status);
      
      // Check if OTA is available in this environment
      if (!status?.otaAvailable) {
        Alert.alert(
          'OTA Updates Not Available',
          `Over-the-air updates are only available in production builds.\n\nReason: ${status?.otaUnavailableReason || 'Development mode or Expo Go'}\n\nTo test OTA updates, please create a production build using EAS Build.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Force check for updates (bypasses throttling)
      // The service will show its own alerts
      await otaUpdateService.forceCheckForUpdates();
      
      // Get updated status
      const newStatus = await otaUpdateService.getUpdateStatus();
      setUpdateStatus(newStatus);
      
      // Show result if no update was found (service handles update available case)
      if (!newStatus.isUpdateAvailable) {
        Alert.alert(
          'Up to Date',
          'You have the latest version of the app.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error checking for updates:', error);
      Alert.alert(
        'Update Check Failed',
        `Failed to check for updates: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      Alert.alert(
        'Downloading Update',
        'The update is being downloaded in the background...',
        [{ text: 'OK' }]
      );
      
      // The service will handle the download automatically
      // Just refresh the status
      const status = await otaUpdateService.getUpdateStatus();
      setUpdateStatus(status);
      
    } catch (error) {
      console.error('Error downloading update:', error);
      Alert.alert(
        'Download Failed',
        `Failed to download update: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    icon: {
      marginRight: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    status: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      backgroundColor: theme.colors.border,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    buttonTextDisabled: {
      color: theme.colors.textSecondary,
    },
    statusInfo: {
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
    },
    statusText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Ionicons 
          name="cloud-download-outline" 
          size={24} 
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text style={styles.title}>App Updates</Text>
      </View>
      
      <Text style={styles.status}>
        Check for the latest app updates and features
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isChecking && styles.buttonDisabled]}
        onPress={handleCheckForUpdates}
        disabled={isChecking}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="refresh" size={20} color="white" />
        )}
        <Text style={[styles.buttonText, isChecking && styles.buttonTextDisabled]}>
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </Text>
      </TouchableOpacity>
      
      {updateStatus && (
        <View style={styles.statusInfo}>
          {/* OTA Availability Status */}
          <Text style={[styles.statusText, { 
            color: updateStatus.otaAvailable ? (theme.colors.success || '#34C759') : (theme.colors.warning || '#FF9500'),
            fontWeight: '600'
          }]}>
            OTA Available: {updateStatus.otaAvailable ? 'Yes' : 'No'}
          </Text>
          {!updateStatus.otaAvailable && updateStatus.otaUnavailableReason && (
            <Text style={[styles.statusText, { color: theme.colors.warning || '#FF9500' }]}>
              Reason: {updateStatus.otaUnavailableReason}
            </Text>
          )}
          <Text style={styles.statusText}>
            Runtime Version: {updateStatus.runtimeVersion}
          </Text>
          <Text style={styles.statusText}>
            Update ID: {updateStatus.currentUpdateId?.substring(0, 8) || 'Unknown'}
          </Text>
          <Text style={styles.statusText}>
            Channel: {updateStatus.channel}
          </Text>
          <Text style={styles.statusText}>
            Updates Enabled: {updateStatus.isEnabled ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.statusText}>
            Service Initialized: {updateStatus.isInitialized ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.statusText}>
            Platform: {updateStatus.platform}
          </Text>
          <Text style={styles.statusText}>
            Development Mode: {updateStatus.isDevelopment ? 'Yes' : 'No'}
          </Text>
          {updateStatus.lastCheckTime > 0 && (
            <Text style={styles.statusText}>
              Last Check: {new Date(updateStatus.lastCheckTime).toLocaleTimeString()}
            </Text>
          )}
          {updateStatus.retryCount > 0 && (
            <Text style={[styles.statusText, { color: theme.colors.warning || '#FF9500' }]}>
              Retry Count: {updateStatus.retryCount}
            </Text>
          )}
          {updateStatus.pendingUpdate && (
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>
              Update pending - restart app to apply
            </Text>
          )}
          {updateStatus.isUpdateAvailable && (
            <Text style={[styles.statusText, { color: theme.colors.success || '#34C759' }]}>
              Update available!
            </Text>
          )}
          {updateStatus.recentLogs && updateStatus.recentLogs.length > 0 && (
            <Text style={styles.statusText}>
              Recent Activity: {updateStatus.recentLogs[0]?.activity || 'None'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
