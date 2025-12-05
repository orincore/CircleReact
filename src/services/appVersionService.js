import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';

const VERSION_KEY = '@circle:app_version';
const UPDATE_CHECK_KEY = '@circle:last_update_check';
const FORCE_UPDATE_CHECK_KEY = '@circle:last_force_update_check';

class AppVersionService {
  constructor() {
    this.currentVersion = Constants.expoConfig?.version || '1.0.0';
    this.buildNumber = Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || 1;
    this.platform = Platform.OS;
    this.updateListeners = [];
    this.forceUpdateListeners = [];
    this.lastVersionCheckResult = null;
  }

  /**
   * Initialize version tracking
   */
  async initialize() {
    try {
      // Track app version on startup
      await this.trackAppVersion();
      
      // Check for forced updates from backend (always check, even in dev for testing)
      await this.checkForForcedUpdate();
      
      // Check for OTA updates if not in development
      if (!__DEV__) {
        await this.checkForUpdates();
      }
      
      //console.log(`📱 App Version Service initialized - v${this.currentVersion} (${this.buildNumber})`);
    } catch (error) {
      console.error('App version service initialization error:', error);
    }
  }

  /**
   * Compare two semantic version strings
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    
    return 0;
  }

  /**
   * Check if app needs forced update from backend
   */
  async checkForForcedUpdate() {
    try {
      // Don't check too frequently (every 30 minutes)
      const lastCheck = await AsyncStorage.getItem(FORCE_UPDATE_CHECK_KEY);
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (lastCheck && (now - parseInt(lastCheck)) < thirtyMinutes) {
        // Return cached result if available
        if (this.lastVersionCheckResult) {
          return this.lastVersionCheckResult;
        }
      }

      // Store current check time
      await AsyncStorage.setItem(FORCE_UPDATE_CHECK_KEY, now.toString());

      const response = await fetch(
        `${API_BASE_URL}/api/app-version/check?version=${this.currentVersion}&platform=${this.platform}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Version check failed:', response.status);
        return null;
      }

      const result = await response.json();
      this.lastVersionCheckResult = result;

      // If update is required, notify listeners
      if (result.updateRequired) {
        this.notifyForceUpdateListeners(result);
      }

      return result;
    } catch (error) {
      console.error('Error checking for forced update:', error);
      return null;
    }
  }

  /**
   * Register a callback for forced update notifications
   */
  onForceUpdateRequired(listener) {
    if (typeof listener === 'function') {
      if (!Array.isArray(this.forceUpdateListeners)) {
        this.forceUpdateListeners = [];
      }
      this.forceUpdateListeners.push(listener);
    }
  }

  /**
   * Notify all force update listeners
   */
  notifyForceUpdateListeners(result) {
    try {
      if (Array.isArray(this.forceUpdateListeners)) {
        this.forceUpdateListeners.forEach((listener) => {
          if (typeof listener === 'function') {
            try {
              listener(result);
            } catch (cbErr) {
              console.error('Error in force update listener callback:', cbErr);
            }
          }
        });
      }
    } catch (notifyErr) {
      console.error('Error notifying force update listeners:', notifyErr);
    }
  }

  /**
   * Get the last version check result
   */
  getLastVersionCheckResult() {
    return this.lastVersionCheckResult;
  }

  /**
   * Track current app version
   */
  async trackAppVersion() {
    try {
      const versionInfo = {
        version: this.currentVersion,
        buildNumber: this.buildNumber,
        platform: this.platform,
        timestamp: new Date().toISOString(),
        expoVersion: Constants.expoVersion,
        deviceId: Constants.deviceId,
      };

      // Store locally
      await AsyncStorage.setItem(VERSION_KEY, JSON.stringify(versionInfo));

      // Send to backend for tracking
      await this.reportVersionToBackend(versionInfo);
      
    } catch (error) {
      console.error('Error tracking app version:', error);
    }
  }

  /**
   * Report version info to backend
   */
  async reportVersionToBackend(versionInfo) {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/analytics/app-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(versionInfo),
      });
    } catch (error) {
      console.error('Error reporting version to backend:', error);
    }
  }

  /**
   * Check for app updates
   */
  async checkForUpdates() {
    try {
      // Don't check too frequently
      const lastCheck = await AsyncStorage.getItem(UPDATE_CHECK_KEY);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (lastCheck && (now - parseInt(lastCheck)) < oneHour) {
        return;
      }

      // Store current check time
      await AsyncStorage.setItem(UPDATE_CHECK_KEY, now.toString());

      // Check for Expo updates
      if (Updates.isEnabled) {
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          //console.log('📱 App update available');
          await this.handleUpdateAvailable(update);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  /**
   * Handle when update is available
   */
  async handleUpdateAvailable(update) {
    try {
      // Track update availability
      await this.trackEvent('update_available', {
        currentVersion: this.currentVersion,
        updateId: update.manifest?.id,
      });

      // Auto-download update in background
      await Updates.fetchUpdateAsync();
      
      // Track update downloaded
      await this.trackEvent('update_downloaded', {
        currentVersion: this.currentVersion,
        updateId: update.manifest?.id,
      });

      //console.log('📱 Update downloaded, will apply on next restart');

      // Notify listeners that an update is available/downloaded
      try {
        if (Array.isArray(this.updateListeners)) {
          this.updateListeners.forEach((listener) => {
            if (typeof listener === 'function') {
              try {
                listener({ update, currentVersion: this.currentVersion });
              } catch (cbErr) {
                console.error('Error in update listener callback:', cbErr);
              }
            }
          });
        }
      } catch (notifyErr) {
        console.error('Error notifying update listeners:', notifyErr);
      }
    } catch (error) {
      console.error('Error handling update:', error);
    }
  }

  /**
   * Register a callback to be invoked when an update is available
   */
  onUpdateAvailable(listener) {
    if (typeof listener === 'function') {
      if (!Array.isArray(this.updateListeners)) {
        this.updateListeners = [];
      }
      this.updateListeners.push(listener);
    }
  }

  /**
   * Apply downloaded update
   */
  async applyUpdate() {
    try {
      if (Updates.isEnabled) {
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error('Error applying update:', error);
    }
  }

  /**
   * Get current version info
   */
  getVersionInfo() {
    return {
      version: this.currentVersion,
      buildNumber: this.buildNumber,
      platform: this.platform,
      expoVersion: Constants.expoVersion,
      isDevice: Constants.isDevice,
      deviceName: Constants.deviceName,
    };
  }

  /**
   * Track version-related events
   */
  async trackEvent(eventName, properties = {}) {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) return;

      const event = {
        event_name: eventName,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          app_version: this.currentVersion,
          build_number: this.buildNumber,
          platform: this.platform,
        },
      };

      await fetch(`${API_BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ events: [event] }),
      });
    } catch (error) {
      console.error('Error tracking version event:', error);
    }
  }

  /**
   * Track app installation
   */
  async trackInstallation() {
    try {
      const installKey = '@circle:installation_tracked';
      const isTracked = await AsyncStorage.getItem(installKey);
      
      if (!isTracked) {
        await this.trackEvent('app_installed', {
          first_install: true,
          installation_date: new Date().toISOString(),
        });
        
        await AsyncStorage.setItem(installKey, 'true');
        //console.log('📱 App installation tracked');
      }
    } catch (error) {
      console.error('Error tracking installation:', error);
    }
  }

  /**
   * Track app upgrade
   */
  async trackUpgrade() {
    try {
      const lastVersionKey = '@circle:last_version';
      const lastVersion = await AsyncStorage.getItem(lastVersionKey);
      
      if (lastVersion && lastVersion !== this.currentVersion) {
        await this.trackEvent('app_upgraded', {
          from_version: lastVersion,
          to_version: this.currentVersion,
          upgrade_date: new Date().toISOString(),
        });
        
        //console.log(`📱 App upgrade tracked: ${lastVersion} → ${this.currentVersion}`);
      }
      
      // Update stored version
      await AsyncStorage.setItem(lastVersionKey, this.currentVersion);
    } catch (error) {
      console.error('Error tracking upgrade:', error);
    }
  }

  /**
   * Get Play Store URL for reviews
   */
  getPlayStoreUrl() {
    return `https://play.google.com/store/apps/details?id=com.orincore.Circle`;
  }

  /**
   * Get App Store URL for reviews
   */
  getAppStoreUrl() {
    return `https://apps.apple.com/app/id/your-app-id`; // Replace with actual App Store ID
  }

  /**
   * Prompt for app review
   */
  async promptForReview() {
    try {
      // Track review prompt
      await this.trackEvent('review_prompt_shown');
      
      // You can integrate with expo-store-review here
      //console.log('📱 Review prompt would be shown here');
    } catch (error) {
      console.error('Error prompting for review:', error);
    }
  }
}

export default new AppVersionService();
