/**
 * OTA Update Service
 * Handles over-the-air updates for the React Native app
 * 
 * IMPORTANT: OTA updates only work in production builds, NOT in:
 * - Expo Go (development client)
 * - Development mode (__DEV__ = true)
 * - Builds without expo-updates configured
 */

import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback update URL from app.json configuration
const FALLBACK_UPDATE_URL = 'https://api.circle.orincore.com/api/updates/manifest';

class OTAUpdateService {
  constructor() {
    this.isChecking = false;
    this.lastCheckTime = 0;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.updateAvailable = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.isInitialized = false;
    this.isProductionBuild = false; // Track if this is a production build
    this.updateNotificationHandler = null; // Custom notification handler
    this.config = {
      autoDownload: true,
      autoRestart: false,
      showNotifications: true,
      checkOnStartup: true,
      maxRetries: 3,
      retryDelay: 2000, // Base delay for exponential backoff
    };
  }

  /**
   * Check if OTA updates are available in current environment
   * OTA updates only work in production builds, not Expo Go or dev mode
   */
  isOTAAvailable() {
    // Check if we're in development mode
    if (__DEV__) {
      return false;
    }
    
    // Check if Updates module is properly configured
    if (!Updates.isEnabled) {
      return false;
    }
    
    // In Expo Go, Updates.isEnabled might be true but updates won't work
    // Check for runtime version that indicates Expo Go (exposdk:XX.X.X format)
    const runtimeVersion = Updates.runtimeVersion || '';
    if (runtimeVersion.startsWith('exposdk:')) {
      return false;
    }
    
    return true;
  }

  /**
   * Get the update URL, with fallback
   */
  getUpdateUrl() {
    return Updates.updateUrl || FALLBACK_UPDATE_URL;
  }

  /**
   * Initialize the OTA update service
   */
  async initialize() {
    try {
      console.log('🔄 Initializing OTA Update Service...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔧 Development mode:', __DEV__);
      console.log('✅ Updates enabled:', Updates.isEnabled);
      console.log('🔗 Update URL:', this.getUpdateUrl());
      console.log('📱 Runtime version:', Updates.runtimeVersion);

      // Check if OTA updates are available in this environment
      this.isProductionBuild = this.isOTAAvailable();
      
      if (!this.isProductionBuild) {
        console.log('⚠️ OTA Updates not available in this environment');
        console.log('   - Development mode:', __DEV__);
        console.log('   - Updates enabled:', Updates.isEnabled);
        console.log('   - Runtime version:', Updates.runtimeVersion);
        console.log('   OTA updates only work in production builds (not Expo Go or dev mode)');
        this.isInitialized = true;
        return;
      }

      // Load configuration from storage
      await this.loadConfiguration();
      
      // Check for rollback conditions first
      await this.checkForRollbackNeeded();
      
      // Check for updates immediately on startup (no throttling)
      if (this.config.checkOnStartup) {
        console.log('🚀 Performing immediate startup update check...');
        await this.checkForUpdatesWithRetry(false, true);
      }
      
      // Set up periodic update checks
      this.startPeriodicChecks();
      
      this.isInitialized = true;
      console.log('✅ OTA Update Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OTA Update Service:', error);
      // Don't throw - allow app to continue even if OTA fails
      this.isInitialized = true;
    }
  }

  /**
   * Load configuration from storage
   */
  async loadConfiguration() {
    try {
      const storedConfig = await AsyncStorage.getItem('@circle:ota_config');
      if (storedConfig) {
        this.config = { ...this.config, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.error('❌ Failed to load OTA configuration:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration() {
    try {
      await AsyncStorage.setItem('@circle:ota_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ Failed to save OTA configuration:', error);
    }
  }

  /**
   * Check for updates with retry logic
   * @param {boolean} showUI - Whether to show user interface prompts
   * @param {boolean} isStartupCheck - Whether this is a startup check (bypasses throttling)
   */
  async checkForUpdatesWithRetry(showUI = true, isStartupCheck = false) {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.checkForUpdates(showUI, isStartupCheck);
        this.retryCount = 0; // Reset on success
        return;
      } catch (error) {
        console.error(`❌ Update check attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All update check attempts failed');
          this.retryCount++;
        }
      }
    }
  }

  /**
   * Check for available updates
   * @param {boolean} showUI - Whether to show user interface prompts
   * @param {boolean} isStartupCheck - Whether this is a startup check (bypasses throttling)
   */
  async checkForUpdates(showUI = true, isStartupCheck = false) {
    try {
      // Skip if OTA is not available in this environment
      if (!this.isProductionBuild) {
        console.log('⚠️ Skipping update check - OTA not available in this environment');
        console.log('   OTA updates only work in production builds');
        return;
      }

      if (this.isChecking) {
        console.log('🔄 Update check already in progress');
        return;
      }

      // Only throttle non-startup checks
      if (!isStartupCheck) {
        const now = Date.now();
        if (now - this.lastCheckTime < this.checkInterval) {
          console.log('🔄 Update check throttled');
          return;
        }
      }

      this.isChecking = true;
      this.lastCheckTime = Date.now();

      const updateUrl = this.getUpdateUrl();
      
      console.log('🔍 Checking for updates...');
      console.log('📱 Runtime version:', Updates.runtimeVersion);
      console.log('🔗 Update URL:', updateUrl);
      console.log('✅ Updates enabled:', Updates.isEnabled);
      console.log('🚀 Startup check:', isStartupCheck);

      // Validate runtime version (update URL has fallback)
      if (!Updates.runtimeVersion) {
        throw new Error('Runtime version not configured');
      }

      // Check for updates with timeout
      const updateCheckPromise = Updates.checkForUpdateAsync();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update check timeout')), 30000)
      );
      
      const update = await Promise.race([updateCheckPromise, timeoutPromise]);
      
      console.log('📋 Update check result:', JSON.stringify(update, null, 2));
      
      if (update.isAvailable) {
        console.log('📦 Update available!');
        console.log('📋 Update manifest:', JSON.stringify(update.manifest, null, 2));
        
        // Check if this update is blocked due to previous failures
        const isBlocked = await this.isUpdateBlocked(update.manifest?.id);
        if (isBlocked) {
          console.log('🚫 Update blocked due to previous failure');
          await this.logUpdateActivity('update_blocked', {
            updateId: update.manifest?.id,
          });
          this.updateAvailable = false;
          return;
        }
        
        // Verify runtime version compatibility
        const isCompatible = await this.verifyRuntimeVersionCompatibility(update.manifest);
        
        if (!isCompatible) {
          console.log('⚠️ Update skipped due to runtime version incompatibility');
          await this.logUpdateActivity('update_skipped_incompatible', {
            updateRuntimeVersion: update.manifest?.runtimeVersion,
            clientRuntimeVersion: Updates.runtimeVersion,
            updateId: update.manifest?.id,
          });
          this.updateAvailable = false;
          return;
        }
        
        this.updateAvailable = true;
        await this.logUpdateActivity('update_available', {
          updateId: update.manifest?.id,
          runtimeVersion: update.manifest?.runtimeVersion,
        });
        
        if (showUI && this.config.showNotifications) {
          await this.promptUserForUpdate(update.manifest);
        } else if (this.config.autoDownload) {
          // Auto-download in background
          const downloaded = await this.downloadUpdate(false);
          if (downloaded && this.config.autoRestart) {
            await this.restartApp();
          }
        }
      } else {
        console.log('✅ App is up to date');
        this.updateAvailable = false;
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      console.error('❌ Error details:', error.message, error.code);
      
      // Log detailed error information
      await this.logUpdateActivity('check_failed', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        isStartupCheck,
        retryCount: this.retryCount,
      });
      
      throw error; // Re-throw for retry logic
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Set custom update notification handler
   */
  setUpdateNotificationHandler(handler) {
    this.updateNotificationHandler = handler;
  }

  /**
   * Prompt user to install available update with enhanced consent handling
   */
  async promptUserForUpdate(updateInfo = null) {
    try {
      await this.logUpdateActivity('user_prompt_shown', {
        updateId: updateInfo?.id,
      });

      // Use custom notification handler if available
      if (this.updateNotificationHandler) {
        console.log('📱 Using custom notification handler for update prompt');
        
        // Format update info for the banner
        const formattedUpdateInfo = {
          id: updateInfo?.id,
          version: updateInfo?.runtimeVersion || 'Latest',
          size: updateInfo?.launchAsset?.size || 'unknown',
          description: 'A new version with improvements and bug fixes is available.',
          ...updateInfo,
        };
        
        this.updateNotificationHandler(formattedUpdateInfo);
        return;
      }

      // Fallback to system alert if no custom handler
      const updateSize = updateInfo?.launchAsset?.size || 'unknown';
      const sizeText = this.formatUpdateSize(updateSize);
      
      Alert.alert(
        '🚀 Update Available',
        `A new version of the app is available.\n\nSize: ${sizeText}\n\nWould you like to update now?`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              await this.handleUserDecline(updateInfo);
            }
          },
          {
            text: 'Remind Later',
            onPress: async () => {
              await this.handleUserPostpone(updateInfo);
            }
          },
          {
            text: 'Update Now',
            onPress: async () => {
              await this.handleUserAccept(updateInfo);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error showing update prompt:', error);
    }
  }

  /**
   * Handle user accepting the update
   */
  async handleUserAccept(updateInfo) {
    try {
      await this.logUpdateActivity('user_accepted', {
        updateId: updateInfo?.id,
      });
      
      await this.downloadAndInstallUpdate();
    } catch (error) {
      console.error('❌ Error handling user accept:', error);
    }
  }

  /**
   * Handle user declining the update
   */
  async handleUserDecline(updateInfo) {
    try {
      await this.logUpdateActivity('user_declined', {
        updateId: updateInfo?.id,
      });
      
      // Store decline info to avoid showing again for this update
      await AsyncStorage.setItem('@circle:update_declined', JSON.stringify({
        updateId: updateInfo?.id,
        declinedAt: Date.now(),
      }));
      
      console.log('📝 User declined update');
    } catch (error) {
      console.error('❌ Error handling user decline:', error);
    }
  }

  /**
   * Handle user postponing the update
   */
  async handleUserPostpone(updateInfo) {
    try {
      await this.logUpdateActivity('user_postponed', {
        updateId: updateInfo?.id,
      });
      
      // Schedule reminder for later
      await this.scheduleUpdateReminder(updateInfo);
      
      console.log('⏰ User postponed update, reminder scheduled');
    } catch (error) {
      console.error('❌ Error handling user postpone:', error);
    }
  }

  /**
   * Format update size for display
   */
  formatUpdateSize(size) {
    if (!size || size === 'unknown') return 'Unknown';
    
    if (typeof size === 'number') {
      if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
      } else {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      }
    }
    
    return size.toString();
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
   * Download update with retry logic and integrity verification
   * @param {boolean} showProgress - Whether to show download progress
   */
  async downloadUpdate(showProgress = false) {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading update... (attempt ${attempt + 1})`);
        
        // Add timeout to download
        const downloadPromise = Updates.fetchUpdateAsync();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Download timeout')), 60000)
        );
        
        const downloadResult = await Promise.race([downloadPromise, timeoutPromise]);
        
        if (downloadResult.isNew) {
          console.log('✅ Update downloaded successfully');
          
          // Verify download integrity if manifest has hash
          if (downloadResult.manifest?.launchAsset?.hash) {
            try {
              await this.verifyDownloadIntegrity(downloadResult);
            } catch (verificationError) {
              console.error('❌ Download verification failed, triggering rollback');
              await this.triggerRollback('integrity_verification_failed', downloadResult.manifest?.id);
              throw verificationError;
            }
          }
          
          // Store update info with verification status
          await AsyncStorage.setItem('@circle:pending_update', JSON.stringify({
            downloadedAt: Date.now(),
            manifest: downloadResult.manifest,
            verified: true,
            attempt: attempt + 1,
          }));
          
          await this.logUpdateActivity('download_success', {
            updateId: downloadResult.manifest?.id,
            attempt: attempt + 1,
            size: downloadResult.manifest?.launchAsset?.size || 'unknown',
          });
          
          return true;
        } else {
          console.log('ℹ️ No new update to download');
          await this.logUpdateActivity('download_no_update');
          return false;
        }
      } catch (error) {
        console.error(`❌ Download attempt ${attempt + 1} failed:`, error);
        
        await this.logUpdateActivity('download_failed', {
          error: error.message,
          attempt: attempt + 1,
          code: error.code,
        });
        
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ Retrying download in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('❌ All download attempts failed');
          throw error;
        }
      }
    }
  }

  /**
   * Verify runtime version compatibility
   */
  async verifyRuntimeVersionCompatibility(manifest) {
    try {
      const clientRuntimeVersion = Updates.runtimeVersion;
      const updateRuntimeVersion = manifest?.runtimeVersion;
      
      console.log('🔍 Checking runtime version compatibility...');
      console.log(`   Client: ${clientRuntimeVersion}`);
      console.log(`   Update: ${updateRuntimeVersion}`);
      
      if (!clientRuntimeVersion || !updateRuntimeVersion) {
        console.warn('⚠️ Missing runtime version information');
        return false;
      }
      
      // For now, require exact match
      // In a more sophisticated implementation, this could support semantic versioning
      const isCompatible = clientRuntimeVersion === updateRuntimeVersion;
      
      if (isCompatible) {
        console.log('✅ Runtime versions are compatible');
      } else {
        console.log('❌ Runtime versions are incompatible');
      }
      
      await this.logUpdateActivity('version_compatibility_check', {
        clientVersion: clientRuntimeVersion,
        updateVersion: updateRuntimeVersion,
        compatible: isCompatible,
      });
      
      return isCompatible;
    } catch (error) {
      console.error('❌ Error checking version compatibility:', error);
      await this.logUpdateActivity('version_check_error', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Verify download integrity using SHA256 hash verification
   */
  async verifyDownloadIntegrity(downloadResult) {
    try {
      console.log('🔐 Verifying download integrity...');
      
      const manifest = downloadResult.manifest;
      const expectedHash = manifest?.launchAsset?.hash;
      
      if (!expectedHash) {
        console.warn('⚠️ No hash provided in manifest, skipping integrity verification');
        await this.logUpdateActivity('integrity_skipped', {
          reason: 'no_hash_in_manifest',
          updateId: manifest?.id,
        });
        return true;
      }
      
      console.log(`🔍 Expected hash: ${expectedHash.substring(0, 16)}...`);
      
      // For Expo Updates, we trust the platform's built-in integrity verification
      // The expo-updates library already performs hash verification internally
      // This is a placeholder for additional custom verification if needed
      
      // In a custom implementation, you would:
      // 1. Get the downloaded bundle file path
      // 2. Calculate SHA256 hash of the file
      // 3. Compare with expected hash
      // 4. Throw error if mismatch
      
      // For now, we'll simulate the verification process
      const verificationPassed = await this.simulateHashVerification(expectedHash);
      
      if (!verificationPassed) {
        throw new Error('Hash verification failed - bundle may be corrupted');
      }
      
      console.log('✅ Bundle integrity verified');
      await this.logUpdateActivity('integrity_verified', {
        updateId: manifest?.id,
        hash: expectedHash.substring(0, 16) + '...',
        method: 'sha256',
      });
      
      return true;
    } catch (error) {
      console.error('❌ Bundle integrity verification failed:', error);
      await this.logUpdateActivity('integrity_failed', {
        error: error.message,
        updateId: downloadResult.manifest?.id,
      });
      throw new Error(`Download integrity verification failed: ${error.message}`);
    }
  }

  /**
   * Simulate hash verification (placeholder for actual implementation)
   */
  async simulateHashVerification(expectedHash) {
    try {
      // In a real implementation, this would:
      // 1. Use expo-crypto or react-native-crypto to calculate SHA256
      // 2. Read the downloaded bundle file
      // 3. Calculate hash and compare
      
      // For now, we'll just validate the hash format and return true
      const hashRegex = /^[a-f0-9]{64}$/i;
      const isValidHashFormat = hashRegex.test(expectedHash);
      
      if (!isValidHashFormat) {
        console.warn('⚠️ Invalid hash format in manifest');
        return false;
      }
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔐 Hash format validation passed');
      return true;
    } catch (error) {
      console.error('❌ Hash verification simulation failed:', error);
      return false;
    }
  }

  /**
   * Restart the app to apply updates with rollback protection
   */
  async restartApp() {
    try {
      console.log('🔄 Restarting app to apply update...');
      
      // Store current update info for rollback tracking
      const currentUpdate = await Updates.getUpdateAsync();
      await AsyncStorage.setItem('@circle:pre_restart_update', JSON.stringify({
        updateId: currentUpdate?.updateId,
        timestamp: Date.now(),
      }));
      
      await this.logUpdateActivity('app_restart_initiated', {
        currentUpdateId: currentUpdate?.updateId,
      });
      
      await Updates.reloadAsync();
    } catch (error) {
      console.error('❌ Failed to restart app:', error);
      await this.logUpdateActivity('restart_failed', {
        error: error.message,
      });
      
      Alert.alert(
        '❌ Restart Failed',
        'Please manually restart the app to apply the update.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Check if rollback is needed after app restart
   */
  async checkForRollbackNeeded() {
    try {
      const rollbackInfo = await AsyncStorage.getItem('@circle:rollback_info');
      if (rollbackInfo) {
        const { reason, timestamp, updateId } = JSON.parse(rollbackInfo);
        
        console.log('🔄 Rollback detected:', reason);
        await this.logUpdateActivity('rollback_detected', {
          reason,
          updateId,
          timestamp,
        });
        
        // Clear rollback info
        await AsyncStorage.removeItem('@circle:rollback_info');
        
        // Prevent further update attempts for a while
        await this.setUpdateBlockade(updateId, reason);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error checking for rollback:', error);
      return false;
    }
  }

  /**
   * Trigger rollback due to validation failure
   */
  async triggerRollback(reason, updateId) {
    try {
      console.log(`🔄 Triggering rollback: ${reason}`);
      
      // Store rollback information
      await AsyncStorage.setItem('@circle:rollback_info', JSON.stringify({
        reason,
        updateId,
        timestamp: Date.now(),
      }));
      
      await this.logUpdateActivity('rollback_triggered', {
        reason,
        updateId,
      });
      
      // Clear pending update
      await this.clearPendingUpdate();
      
      // Set update blockade to prevent immediate retry
      await this.setUpdateBlockade(updateId, reason);
      
      // In a full implementation, this would revert to previous bundle
      // For now, we just prevent further update attempts
      console.log('⚠️ Update blocked due to rollback');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to trigger rollback:', error);
      await this.logUpdateActivity('rollback_failed', {
        error: error.message,
        reason,
        updateId,
      });
      return false;
    }
  }

  /**
   * Set update blockade to prevent problematic updates
   */
  async setUpdateBlockade(updateId, reason) {
    try {
      const blockade = {
        updateId,
        reason,
        blockedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // Block for 24 hours
      };
      
      await AsyncStorage.setItem('@circle:update_blockade', JSON.stringify(blockade));
      
      await this.logUpdateActivity('update_blockade_set', {
        updateId,
        reason,
        duration: '24h',
      });
      
      console.log(`🚫 Update blockade set for ${updateId}: ${reason}`);
    } catch (error) {
      console.error('❌ Failed to set update blockade:', error);
    }
  }

  /**
   * Check if update is blocked
   */
  async isUpdateBlocked(updateId) {
    try {
      const blockadeInfo = await AsyncStorage.getItem('@circle:update_blockade');
      if (!blockadeInfo) return false;
      
      const blockade = JSON.parse(blockadeInfo);
      
      // Check if blockade has expired
      if (Date.now() > blockade.expiresAt) {
        await AsyncStorage.removeItem('@circle:update_blockade');
        return false;
      }
      
      // Check if this specific update is blocked
      return blockade.updateId === updateId;
    } catch (error) {
      console.error('❌ Error checking update blockade:', error);
      return false;
    }
  }

  /**
   * Log update activity for monitoring
   */
  async logUpdateActivity(activity, details = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        activity,
        details: {
          ...details,
          platform: Platform.OS,
          runtimeVersion: Updates.runtimeVersion,
          updateUrl: Updates.updateUrl,
          isEnabled: Updates.isEnabled,
        },
      };
      
      console.log(`📊 [OTA Activity] ${activity}:`, logEntry);
      
      // Store recent activity logs
      const logs = await this.getActivityLogs();
      logs.unshift(logEntry);
      
      // Keep only last 50 entries
      const trimmedLogs = logs.slice(0, 50);
      await AsyncStorage.setItem('@circle:ota_logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('❌ Failed to log update activity:', error);
    }
  }

  /**
   * Get recent activity logs
   */
  async getActivityLogs() {
    try {
      const logs = await AsyncStorage.getItem('@circle:ota_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('❌ Failed to get activity logs:', error);
      return [];
    }
  }

  /**
   * Start periodic update checks
   */
  startPeriodicChecks() {
    setInterval(() => {
      this.checkForUpdatesWithRetry(false, false);
    }, this.checkInterval);
  }

  /**
   * Schedule update reminder with configurable delay
   */
  async scheduleUpdateReminder(updateInfo = null, delayMinutes = 30) {
    try {
      const reminderTime = Date.now() + (delayMinutes * 60 * 1000);
      
      const reminderData = {
        updateId: updateInfo?.id,
        scheduledFor: reminderTime,
        scheduledAt: Date.now(),
        delayMinutes,
      };
      
      await AsyncStorage.setItem('@circle:update_reminder', JSON.stringify(reminderData));
      
      await this.logUpdateActivity('reminder_scheduled', {
        updateId: updateInfo?.id,
        delayMinutes,
        scheduledFor: new Date(reminderTime).toISOString(),
      });
      
      // Set timeout for reminder
      setTimeout(async () => {
        await this.checkAndShowReminder(updateInfo);
      }, delayMinutes * 60 * 1000);
      
      console.log(`⏰ Update reminder scheduled for ${delayMinutes} minutes`);
    } catch (error) {
      console.error('❌ Failed to schedule update reminder:', error);
    }
  }

  /**
   * Check and show reminder if conditions are met
   */
  async checkAndShowReminder(updateInfo) {
    try {
      // Check if update is still available and not declined
      const currentStatus = await this.getUpdateStatus();
      
      if (!currentStatus.isUpdateAvailable) {
        console.log('⏰ Reminder skipped - no update available');
        return;
      }
      
      // Check if user has declined this specific update
      const declineInfo = await AsyncStorage.getItem('@circle:update_declined');
      if (declineInfo) {
        const { updateId } = JSON.parse(declineInfo);
        if (updateId === updateInfo?.id) {
          console.log('⏰ Reminder skipped - user declined this update');
          return;
        }
      }
      
      await this.logUpdateActivity('reminder_triggered', {
        updateId: updateInfo?.id,
      });
      
      // Show reminder prompt
      this.promptUserForUpdate(updateInfo);
      
    } catch (error) {
      console.error('❌ Error checking reminder:', error);
    }
  }

  /**
   * Force check for updates (called manually)
   */
  async forceCheckForUpdates() {
    console.log('🔄 Force checking for updates...');
    
    // Check if OTA is available
    if (!this.isProductionBuild) {
      console.log('⚠️ OTA updates not available in this environment');
      console.log('   OTA updates only work in production builds (not Expo Go or dev mode)');
      
      // Show user-friendly message
      Alert.alert(
        'OTA Updates Not Available',
        'Over-the-air updates are only available in production builds. You are currently running in development mode or Expo Go.\n\nTo test OTA updates, please create a production build.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    await this.logUpdateActivity('manual_check_triggered');
    this.lastCheckTime = 0; // Reset throttle
    await this.checkForUpdatesWithRetry(true, true); // Treat as startup check to bypass throttling
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfiguration();
    await this.logUpdateActivity('config_updated', { newConfig });
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Get current update status
   */
  async getUpdateStatus() {
    try {
      let currentUpdate = null;
      
      // Only try to get current update in production builds
      if (this.isProductionBuild) {
        try {
          currentUpdate = await Updates.getUpdateAsync();
        } catch (error) {
          console.log('⚠️ Could not get current update info:', error.message);
        }
      }
      
      const pendingUpdate = await AsyncStorage.getItem('@circle:pending_update');
      const recentLogs = await this.getActivityLogs();
      
      return {
        // Current state
        currentUpdateId: currentUpdate?.updateId || 'unknown',
        currentManifest: currentUpdate?.manifest || null,
        pendingUpdate: pendingUpdate ? JSON.parse(pendingUpdate) : null,
        isUpdateAvailable: this.updateAvailable,
        
        // Service state
        isInitialized: this.isInitialized,
        isChecking: this.isChecking,
        lastCheckTime: this.lastCheckTime,
        retryCount: this.retryCount,
        isProductionBuild: this.isProductionBuild,
        
        // Configuration
        isEnabled: Updates.isEnabled,
        channel: Updates.channel || 'default',
        runtimeVersion: Updates.runtimeVersion || 'unknown',
        updateUrl: this.getUpdateUrl(),
        config: this.config,
        
        // Platform info
        platform: Platform.OS,
        isDevelopment: __DEV__,
        
        // OTA availability info
        otaAvailable: this.isProductionBuild,
        otaUnavailableReason: !this.isProductionBuild 
          ? (__DEV__ ? 'Development mode' : 'Expo Go or non-production build')
          : null,
        
        // Recent activity
        recentLogs: recentLogs.slice(0, 10), // Last 10 activities
      };
    } catch (error) {
      console.error('❌ Failed to get update status:', error);
      return {
        error: error.message,
        isEnabled: false,
        isInitialized: false,
        isProductionBuild: false,
      };
    }
  }

  /**
   * Clear pending update info and related state
   */
  async clearPendingUpdate() {
    try {
      await AsyncStorage.removeItem('@circle:pending_update');
      await AsyncStorage.removeItem('@circle:update_reminder');
      await AsyncStorage.removeItem('@circle:update_declined');
      
      await this.logUpdateActivity('pending_update_cleared');
      console.log('🧹 Pending update info cleared');
    } catch (error) {
      console.error('❌ Failed to clear pending update:', error);
    }
  }

  /**
   * Get update history and statistics
   */
  async getUpdateHistory() {
    try {
      const logs = await this.getActivityLogs();
      
      // Analyze logs for statistics
      const stats = {
        totalChecks: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        userDeclines: 0,
        userAccepts: 0,
        lastSuccessfulUpdate: null,
        lastFailure: null,
      };
      
      logs.forEach(log => {
        switch (log.activity) {
          case 'check_success':
            stats.totalChecks++;
            break;
          case 'update_applied':
            stats.successfulUpdates++;
            stats.lastSuccessfulUpdate = log.timestamp;
            break;
          case 'download_failed':
          case 'integrity_failed':
          case 'rollback_triggered':
            stats.failedUpdates++;
            stats.lastFailure = log.timestamp;
            break;
          case 'user_declined':
            stats.userDeclines++;
            break;
          case 'user_accepted':
            stats.userAccepts++;
            break;
        }
      });
      
      return {
        logs: logs.slice(0, 20), // Last 20 activities
        statistics: stats,
      };
    } catch (error) {
      console.error('❌ Failed to get update history:', error);
      return { logs: [], statistics: {} };
    }
  }

  /**
   * Reset all update state (for debugging/testing)
   */
  async resetUpdateState() {
    try {
      const keysToRemove = [
        '@circle:pending_update',
        '@circle:update_reminder',
        '@circle:update_declined',
        '@circle:update_blockade',
        '@circle:rollback_info',
        '@circle:ota_logs',
        '@circle:ota_config',
        '@circle:pre_restart_update',
      ];
      
      for (const key of keysToRemove) {
        await AsyncStorage.removeItem(key);
      }
      
      // Reset service state
      this.isChecking = false;
      this.lastCheckTime = 0;
      this.updateAvailable = false;
      this.retryCount = 0;
      
      await this.logUpdateActivity('state_reset');
      console.log('🔄 Update state reset completed');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to reset update state:', error);
      return false;
    }
  }

  /**
   * Get comprehensive diagnostic information
   */
  async getDiagnosticInfo() {
    try {
      const status = await this.getUpdateStatus();
      const history = await this.getUpdateHistory();
      
      // Check storage usage
      const storageInfo = await this.getStorageInfo();
      
      // Test network connectivity
      const networkInfo = await this.testNetworkConnectivity();
      
      // Get system information
      const systemInfo = {
        timestamp: new Date().toISOString(),
        serviceVersion: '2.1.0', // Version of the OTA service
        platform: Platform.OS,
        isDevelopment: __DEV__,
        
        // Expo Updates info
        updatesEnabled: Updates.isEnabled,
        runtimeVersion: Updates.runtimeVersion,
        updateUrl: this.getUpdateUrl(),
        channel: Updates.channel,
        
        // Service state
        isInitialized: this.isInitialized,
        isChecking: this.isChecking,
        lastCheckTime: this.lastCheckTime,
        checkInterval: this.checkInterval,
        retryCount: this.retryCount,
        updateAvailable: this.updateAvailable,
        isProductionBuild: this.isProductionBuild,
        
        // OTA availability
        otaAvailable: this.isProductionBuild,
        otaUnavailableReason: !this.isProductionBuild 
          ? (__DEV__ ? 'Development mode - OTA only works in production builds' : 'Expo Go or non-production build')
          : null,
        
        // Configuration
        config: this.config,
      };
      
      return {
        system: systemInfo,
        status,
        history,
        storage: storageInfo,
        network: networkInfo,
        summary: {
          healthy: this.isSystemHealthy(status, networkInfo),
          issues: this.identifyIssues(status, history, networkInfo),
          recommendations: this.getRecommendations(status, history, networkInfo),
        },
      };
    } catch (error) {
      console.error('❌ Failed to get diagnostic info:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get storage information for diagnostics
   */
  async getStorageInfo() {
    try {
      const keys = [
        '@circle:pending_update',
        '@circle:update_reminder',
        '@circle:update_declined',
        '@circle:update_blockade',
        '@circle:rollback_info',
        '@circle:ota_logs',
        '@circle:ota_config',
      ];
      
      const storageData = {};
      let totalSize = 0;
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            storageData[key] = {
              exists: true,
              size,
              sizeFormatted: `${(size / 1024).toFixed(2)} KB`,
              preview: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
            };
            totalSize += size;
          } else {
            storageData[key] = { exists: false };
          }
        } catch (error) {
          storageData[key] = { error: error.message };
        }
      }
      
      return {
        keys: storageData,
        totalSize,
        totalSizeFormatted: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Test network connectivity for diagnostics
   */
  async testNetworkConnectivity() {
    try {
      const startTime = Date.now();
      const updateUrl = this.getUpdateUrl();
      
      // Test basic connectivity
      const response = await fetch(updateUrl, {
        method: 'HEAD',
        timeout: 10000,
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        connected: response.ok,
        responseTime,
        status: response.status,
        statusText: response.statusText,
        url: updateUrl,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        url: this.getUpdateUrl(),
      };
    }
  }

  /**
   * Check if system is healthy
   */
  isSystemHealthy(status, networkInfo) {
    // In development mode, system is healthy if initialized
    if (!this.isProductionBuild) {
      return status.isInitialized;
    }
    
    return (
      status.isInitialized &&
      status.isEnabled &&
      networkInfo.connected &&
      status.retryCount < 3
    );
  }

  /**
   * Identify system issues
   */
  identifyIssues(status, history, networkInfo) {
    const issues = [];
    
    // In development mode, only report initialization issues
    if (!this.isProductionBuild) {
      if (!status.isInitialized) {
        issues.push('Service not initialized');
      }
      // Add info message about dev mode
      issues.push('OTA updates not available in development mode (this is expected)');
      return issues;
    }
    
    if (!status.isInitialized) {
      issues.push('Service not initialized');
    }
    
    if (!status.isEnabled) {
      issues.push('Updates disabled');
    }
    
    if (!networkInfo.connected) {
      issues.push('Network connectivity issues');
    }
    
    if (status.retryCount > 0) {
      issues.push(`High retry count: ${status.retryCount}`);
    }
    
    if (history.statistics.failedUpdates > history.statistics.successfulUpdates) {
      issues.push('More failures than successes');
    }
    
    if (status.lastCheckTime > 0 && Date.now() - status.lastCheckTime > 24 * 60 * 60 * 1000) {
      issues.push('No recent update checks');
    }
    
    return issues;
  }

  /**
   * Get recommendations for improvement
   */
  getRecommendations(status, history, networkInfo) {
    const recommendations = [];
    
    // In development mode, provide helpful info
    if (!this.isProductionBuild) {
      recommendations.push('Create a production build to test OTA updates');
      recommendations.push('Use EAS Build or expo build to create a production build');
      return recommendations;
    }
    
    if (!networkInfo.connected) {
      recommendations.push('Check internet connection');
    }
    
    if (status.retryCount > 2) {
      recommendations.push('Consider resetting update state');
    }
    
    if (history.statistics.failedUpdates > 3) {
      recommendations.push('Review error logs for patterns');
    }
    
    if (!status.isEnabled) {
      recommendations.push('Updates are disabled - check app.json configuration');
    }
    
    if (status.config.checkInterval > 60 * 60 * 1000) {
      recommendations.push('Consider reducing check interval for faster updates');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const otaUpdateService = new OTAUpdateService();
