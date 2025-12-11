/**
 * OTA Update Service
 * Handles over-the-air updates for the React Native app
 */

import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OTAUpdateService {
  constructor() {
    this.isChecking = false;
    this.lastCheckTime = 0;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.updateAvailable = false;
  }

  /**
   * Initialize the OTA update service
   */
  async initialize() {
    try {
      // Only run in production builds
      if (__DEV__ || !Updates.isEnabled) {
        console.log('🔄 OTA Updates disabled in development mode');
        return;
      }

      console.log('🔄 Initializing OTA Update Service...');
      
      // Check for updates on app start
      await this.checkForUpdates(false);
      
      // Set up periodic update checks
      this.startPeriodicChecks();
      
      console.log('✅ OTA Update Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize OTA Update Service:', error);
    }
  }

  /**
   * Check for available updates
   * @param {boolean} showUI - Whether to show user interface prompts
   */
  async checkForUpdates(showUI = true) {
    try {
      if (this.isChecking) {
        console.log('🔄 Update check already in progress');
        return;
      }

      // Throttle update checks
      const now = Date.now();
      if (now - this.lastCheckTime < this.checkInterval) {
        console.log('🔄 Update check throttled');
        return;
      }

      this.isChecking = true;
      this.lastCheckTime = now;

      console.log('🔍 Checking for updates...');

      // Check for updates
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('📦 Update available!');
        this.updateAvailable = true;
        
        if (showUI) {
          this.promptUserForUpdate();
        } else {
          // Auto-download in background
          await this.downloadUpdate(false);
        }
      } else {
        console.log('✅ App is up to date');
        this.updateAvailable = false;
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Prompt user to install available update
   */
  promptUserForUpdate() {
    Alert.alert(
      '🚀 Update Available',
      'A new version of the app is available. Would you like to update now?',
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => {
            // Schedule reminder for later
            this.scheduleUpdateReminder();
          }
        },
        {
          text: 'Update Now',
          onPress: () => {
            this.downloadAndInstallUpdate();
          }
        }
      ]
    );
  }

  /**
   * Download and install update with user feedback
   */
  async downloadAndInstallUpdate() {
    try {
      Alert.alert(
        '📥 Downloading Update',
        'Please wait while we download the latest version...',
        [],
        { cancelable: false }
      );

      await this.downloadUpdate(true);
      
      Alert.alert(
        '🎉 Update Ready',
        'The update has been downloaded. The app will restart now.',
        [
          {
            text: 'Restart Now',
            onPress: () => {
              this.restartApp();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        '❌ Update Failed',
        'Failed to download the update. Please try again later.',
        [{ text: 'OK' }]
      );
      console.error('❌ Update download failed:', error);
    }
  }

  /**
   * Download update silently
   * @param {boolean} showProgress - Whether to show download progress
   */
  async downloadUpdate(showProgress = false) {
    try {
      console.log('📥 Downloading update...');
      
      const downloadResult = await Updates.fetchUpdateAsync();
      
      if (downloadResult.isNew) {
        console.log('✅ Update downloaded successfully');
        
        // Store update info
        await AsyncStorage.setItem('@circle:pending_update', JSON.stringify({
          downloadedAt: Date.now(),
          manifest: downloadResult.manifest
        }));
        
        return true;
      } else {
        console.log('ℹ️ No new update to download');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to download update:', error);
      throw error;
    }
  }

  /**
   * Restart the app to apply updates
   */
  async restartApp() {
    try {
      console.log('🔄 Restarting app to apply update...');
      await Updates.reloadAsync();
    } catch (error) {
      console.error('❌ Failed to restart app:', error);
      Alert.alert(
        '❌ Restart Failed',
        'Please manually restart the app to apply the update.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Start periodic update checks
   */
  startPeriodicChecks() {
    setInterval(() => {
      this.checkForUpdates(false);
    }, this.checkInterval);
  }

  /**
   * Schedule update reminder
   */
  async scheduleUpdateReminder() {
    try {
      const reminderTime = Date.now() + (30 * 60 * 1000); // 30 minutes
      await AsyncStorage.setItem('@circle:update_reminder', reminderTime.toString());
      
      setTimeout(() => {
        if (this.updateAvailable) {
          this.promptUserForUpdate();
        }
      }, 30 * 60 * 1000);
    } catch (error) {
      console.error('❌ Failed to schedule update reminder:', error);
    }
  }

  /**
   * Force check for updates (called manually)
   */
  async forceCheckForUpdates() {
    this.lastCheckTime = 0; // Reset throttle
    await this.checkForUpdates(true);
  }

  /**
   * Get current update status
   */
  async getUpdateStatus() {
    try {
      const currentUpdate = await Updates.getUpdateAsync();
      const pendingUpdate = await AsyncStorage.getItem('@circle:pending_update');
      
      return {
        currentUpdateId: currentUpdate?.updateId || 'unknown',
        currentManifest: currentUpdate?.manifest || null,
        pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null,
        isUpdateAvailable: this.updateAvailable,
        isEnabled: Updates.isEnabled,
        channel: Updates.channel || 'default',
        runtimeVersion: Updates.runtimeVersion || 'unknown'
      };
    } catch (error) {
      console.error('❌ Failed to get update status:', error);
      return null;
    }
  }

  /**
   * Clear pending update info
   */
  async clearPendingUpdate() {
    try {
      await AsyncStorage.removeItem('@circle:pending_update');
      await AsyncStorage.removeItem('@circle:update_reminder');
    } catch (error) {
      console.error('❌ Failed to clear pending update:', error);
    }
  }
}

// Export singleton instance
export const otaUpdateService = new OTAUpdateService();
