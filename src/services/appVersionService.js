import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';

const VERSION_KEY = '@circle:app_version';
const UPDATE_CHECK_KEY = '@circle:last_update_check';

class AppVersionService {
  constructor() {
    this.currentVersion = Constants.expoConfig?.version || '1.0.0';
    this.buildNumber = Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || 1;
    this.platform = Platform.OS;
  }

  /**
   * Initialize version tracking
   */
  async initialize() {
    try {
      // Track app version on startup
      await this.trackAppVersion();
      
      // Check for updates if not in development
      if (!__DEV__) {
        await this.checkForUpdates();
      }
      
      //console.log(`📱 App Version Service initialized - v${this.currentVersion} (${this.buildNumber})`);
    } catch (error) {
      console.error('App version service initialization error:', error);
    }
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
    } catch (error) {
      console.error('Error handling update:', error);
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
