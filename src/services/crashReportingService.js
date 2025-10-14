import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';

const CRASH_REPORTS_KEY = '@circle:crash_reports';
const MAX_STORED_CRASHES = 10;

class CrashReportingService {
  constructor() {
    this.isEnabled = true;
    this.userId = null;
    this.sessionId = null;
    this.originalHandler = null;
  }

  /**
   * Initialize crash reporting
   */
  async initialize() {
    try {
      // Get user info
      this.userId = await AsyncStorage.getItem('@circle:userId');
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up global error handler
      this.setupGlobalErrorHandler();
      
      // Set up unhandled promise rejection handler
      this.setupUnhandledRejectionHandler();
      
      // Send any stored crash reports
      await this.sendStoredCrashReports();
      
      //console.log('💥 Crash reporting initialized');
    } catch (error) {
      console.error('Crash reporting initialization error:', error);
    }
  }

  /**
   * Set up global JavaScript error handler
   */
  setupGlobalErrorHandler() {
    // Store original handler
    this.originalHandler = global.ErrorUtils?.getGlobalHandler();
    
    // Set custom handler
    global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
      this.reportCrash(error, isFatal, 'javascript_error');
      
      // Call original handler if it exists
      if (this.originalHandler) {
        this.originalHandler(error, isFatal);
      }
    });
  }

  /**
   * Set up unhandled promise rejection handler
   */
  setupUnhandledRejectionHandler() {
    if (typeof global !== 'undefined' && global.HermesInternal) {
      // For Hermes engine
      global.addEventListener?.('unhandledrejection', (event) => {
        this.reportCrash(event.reason, false, 'unhandled_promise_rejection');
      });
    }
  }

  /**
   * Report a crash
   */
  async reportCrash(error, isFatal = false, type = 'unknown') {
    if (!this.isEnabled) return;

    try {
      const crashReport = {
        id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type,
        isFatal,
        userId: this.userId,
        sessionId: this.sessionId,
        error: {
          name: error?.name || 'Unknown Error',
          message: error?.message || 'No message',
          stack: error?.stack || 'No stack trace',
        },
        device: {
          platform: Platform.OS,
          version: Platform.Version,
          model: Constants.deviceName,
          appVersion: Constants.expoConfig?.version || '1.0.0',
          buildNumber: Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || 1,
        },
        app: {
          isDevice: Constants.isDevice,
          expoVersion: Constants.expoVersion,
        }
      };

      // Store crash report locally
      await this.storeCrashReport(crashReport);
      
      // Try to send immediately
      await this.sendCrashReport(crashReport);
      
      console.error('💥 Crash reported:', crashReport.error.message);
    } catch (reportError) {
      console.error('Error reporting crash:', reportError);
    }
  }

  /**
   * Store crash report locally
   */
  async storeCrashReport(crashReport) {
    try {
      const storedReports = await this.getStoredCrashReports();
      storedReports.push(crashReport);
      
      // Keep only the most recent crashes
      const recentReports = storedReports.slice(-MAX_STORED_CRASHES);
      
      await AsyncStorage.setItem(CRASH_REPORTS_KEY, JSON.stringify(recentReports));
    } catch (error) {
      console.error('Error storing crash report:', error);
    }
  }

  /**
   * Get stored crash reports
   */
  async getStoredCrashReports() {
    try {
      const reports = await AsyncStorage.getItem(CRASH_REPORTS_KEY);
      return reports ? JSON.parse(reports) : [];
    } catch (error) {
      console.error('Error getting stored crash reports:', error);
      return [];
    }
  }

  /**
   * Send crash report to backend
   */
  async sendCrashReport(crashReport) {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/crash-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(crashReport),
      });

      if (response.ok) {
        // Remove from local storage if sent successfully
        await this.removeCrashReport(crashReport.id);
        //console.log('💥 Crash report sent successfully');
      }
    } catch (error) {
      console.error('Error sending crash report:', error);
    }
  }

  /**
   * Send all stored crash reports
   */
  async sendStoredCrashReports() {
    try {
      const storedReports = await this.getStoredCrashReports();
      
      for (const report of storedReports) {
        await this.sendCrashReport(report);
      }
    } catch (error) {
      console.error('Error sending stored crash reports:', error);
    }
  }

  /**
   * Remove crash report from local storage
   */
  async removeCrashReport(crashId) {
    try {
      const storedReports = await this.getStoredCrashReports();
      const filteredReports = storedReports.filter(report => report.id !== crashId);
      
      await AsyncStorage.setItem(CRASH_REPORTS_KEY, JSON.stringify(filteredReports));
    } catch (error) {
      console.error('Error removing crash report:', error);
    }
  }

  /**
   * Manually report an error
   */
  async reportError(error, context = {}) {
    const enhancedError = new Error(error.message || 'Manual error report');
    enhancedError.stack = error.stack || new Error().stack;
    enhancedError.context = context;
    
    await this.reportCrash(enhancedError, false, 'manual_report');
  }

  /**
   * Report a handled exception
   */
  async reportHandledException(error, context = {}) {
    await this.reportError(error, { ...context, handled: true });
  }

  /**
   * Set user context
   */
  async setUserContext(userId, userInfo = {}) {
    this.userId = userId;
    await AsyncStorage.setItem('@circle:userId', userId);
    
    // You can store additional user context for crash reports
    await AsyncStorage.setItem('@circle:userContext', JSON.stringify(userInfo));
  }

  /**
   * Add breadcrumb for debugging
   */
  async addBreadcrumb(message, category = 'general', level = 'info') {
    try {
      const breadcrumb = {
        timestamp: new Date().toISOString(),
        message,
        category,
        level,
      };

      const breadcrumbsKey = '@circle:breadcrumbs';
      const storedBreadcrumbs = await AsyncStorage.getItem(breadcrumbsKey);
      const breadcrumbs = storedBreadcrumbs ? JSON.parse(storedBreadcrumbs) : [];
      
      breadcrumbs.push(breadcrumb);
      
      // Keep only the last 50 breadcrumbs
      const recentBreadcrumbs = breadcrumbs.slice(-50);
      
      await AsyncStorage.setItem(breadcrumbsKey, JSON.stringify(recentBreadcrumbs));
    } catch (error) {
      console.error('Error adding breadcrumb:', error);
    }
  }

  /**
   * Enable/disable crash reporting
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Get crash statistics
   */
  async getCrashStatistics() {
    try {
      const storedReports = await this.getStoredCrashReports();
      
      return {
        totalCrashes: storedReports.length,
        fatalCrashes: storedReports.filter(r => r.isFatal).length,
        recentCrashes: storedReports.filter(r => {
          const crashTime = new Date(r.timestamp);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return crashTime > oneDayAgo;
        }).length,
      };
    } catch (error) {
      console.error('Error getting crash statistics:', error);
      return { totalCrashes: 0, fatalCrashes: 0, recentCrashes: 0 };
    }
  }

  /**
   * Clear all stored crash reports
   */
  async clearStoredReports() {
    try {
      await AsyncStorage.removeItem(CRASH_REPORTS_KEY);
      //console.log('💥 Cleared all stored crash reports');
    } catch (error) {
      console.error('Error clearing crash reports:', error);
    }
  }
}

export default new CrashReportingService();
