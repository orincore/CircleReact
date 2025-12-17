/**
 * OTA Update Integration Tests
 * Tests the complete OTA update flow including service initialization,
 * update detection, user notifications, and update application
 */

import { jest } from '@jest/globals';

// Mock dependencies first
jest.mock('expo-updates', () => ({
  isEnabled: true,
  runtimeVersion: '1.0.0',
  updateUrl: 'https://api.circle.orincore.com/api/updates/manifest',
  channel: 'default',
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  getUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

// Import after mocking
const AsyncStorage = require('@react-native-async-storage/async-storage');
const Updates = require('expo-updates');
const { Alert, Platform } = require('react-native');

// Import the service after mocking
import { otaUpdateService } from '../src/services/otaUpdateService';

describe('OTA Update Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset service state
    otaUpdateService.isChecking = false;
    otaUpdateService.lastCheckTime = 0;
    otaUpdateService.updateAvailable = false;
    otaUpdateService.retryCount = 0;
    otaUpdateService.isInitialized = false;
    otaUpdateService.updateNotificationHandler = null;
    
    // Setup default mock implementations
    Updates.isEnabled = true;
    Updates.runtimeVersion = '1.0.0';
    Updates.updateUrl = 'https://api.circle.orincore.com/api/updates/manifest';
    Updates.channel = 'default';
    
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();
  });

  describe('Service Initialization', () => {
    test('should initialize successfully in production environment', async () => {
      // Mock production environment
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: false,
      });

      await otaUpdateService.initialize();

      expect(otaUpdateService.isInitialized).toBe(true);
      expect(otaUpdateService.isProductionBuild).toBe(true);
    });

    test('should handle development environment gracefully', async () => {
      // Mock development environment
      global.__DEV__ = true;
      
      await otaUpdateService.initialize();

      expect(otaUpdateService.isInitialized).toBe(true);
      expect(otaUpdateService.isProductionBuild).toBe(false);
    });

    test('should handle initialization errors gracefully', async () => {
      global.__DEV__ = false;
      Updates.checkForUpdateAsync.mockRejectedValue(new Error('Network error'));

      await otaUpdateService.initialize();

      expect(otaUpdateService.isInitialized).toBe(true);
      expect(otaUpdateService.retryCount).toBeGreaterThan(0);
    });
  });

  describe('Update Detection', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      // Initialize service
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should detect available updates', async () => {
      const mockUpdate = {
        isAvailable: true,
        manifest: {
          id: 'test-update-id',
          runtimeVersion: '1.0.0',
          launchAsset: {
            hash: 'test-hash',
            size: 1024 * 1024,
          },
        },
      };

      Updates.checkForUpdateAsync.mockResolvedValue(mockUpdate);

      await otaUpdateService.checkForUpdates(false, true);

      expect(otaUpdateService.updateAvailable).toBe(true);
    });

    test('should handle no updates available', async () => {
      Updates.checkForUpdateAsync.mockResolvedValue({
        isAvailable: false,
      });

      await otaUpdateService.checkForUpdates(false, true);

      expect(otaUpdateService.updateAvailable).toBe(false);
    });

    test('should retry on network failures', async () => {
      Updates.checkForUpdateAsync
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({ isAvailable: false });

      await otaUpdateService.checkForUpdatesWithRetry(false, true);

      expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(3);
      expect(otaUpdateService.retryCount).toBe(0); // Reset on success
    });

    test('should respect runtime version compatibility', async () => {
      const mockUpdate = {
        isAvailable: true,
        manifest: {
          id: 'test-update-id',
          runtimeVersion: '2.0.0', // Different runtime version
          launchAsset: {
            hash: 'test-hash',
          },
        },
      };

      Updates.checkForUpdateAsync.mockResolvedValue(mockUpdate);

      await otaUpdateService.checkForUpdates(false, true);

      expect(otaUpdateService.updateAvailable).toBe(false);
    });
  });

  describe('User Notification System', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should use custom notification handler when available', async () => {
      const mockHandler = jest.fn();
      otaUpdateService.setUpdateNotificationHandler(mockHandler);

      const updateInfo = {
        id: 'test-update-id',
        runtimeVersion: '1.0.0',
        launchAsset: { size: 1024 * 1024 },
      };

      await otaUpdateService.promptUserForUpdate(updateInfo);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-update-id',
          version: '1.0.0',
          size: 1024 * 1024,
        })
      );
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should fallback to system alert when no custom handler', async () => {
      const updateInfo = {
        id: 'test-update-id',
        runtimeVersion: '1.0.0',
        launchAsset: { size: 1024 * 1024 },
      };

      await otaUpdateService.promptUserForUpdate(updateInfo);

      expect(Alert.alert).toHaveBeenCalledWith(
        '🚀 Update Available',
        expect.stringContaining('A new version of the app is available'),
        expect.any(Array)
      );
    });

    test('should handle user acceptance correctly', async () => {
      const updateInfo = { id: 'test-update-id' };

      await otaUpdateService.handleUserAccept(updateInfo);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:ota_logs',
        expect.stringContaining('user_accepted')
      );
    });

    test('should handle user decline correctly', async () => {
      const updateInfo = { id: 'test-update-id' };

      await otaUpdateService.handleUserDecline(updateInfo);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:update_declined',
        expect.stringContaining('test-update-id')
      );
    });

    test('should schedule reminders for postponed updates', async () => {
      const updateInfo = { id: 'test-update-id' };

      await otaUpdateService.handleUserPostpone(updateInfo);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:update_reminder',
        expect.stringContaining('test-update-id')
      );
    });
  });

  describe('Update Download and Installation', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should download updates successfully', async () => {
      const mockDownloadResult = {
        isNew: true,
        manifest: {
          id: 'test-update-id',
          launchAsset: {
            hash: 'a'.repeat(64), // Valid 64-char hex hash
          },
        },
      };

      Updates.fetchUpdateAsync.mockResolvedValue(mockDownloadResult);

      const result = await otaUpdateService.downloadUpdate(false);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:pending_update',
        expect.stringContaining('test-update-id')
      );
    });

    test('should handle download failures with retry', async () => {
      Updates.fetchUpdateAsync
        .mockRejectedValueOnce(new Error('Download failed'))
        .mockRejectedValueOnce(new Error('Download failed'))
        .mockResolvedValue({
          isNew: true,
          manifest: {
            id: 'test-update-id',
            launchAsset: { hash: 'a'.repeat(64) },
          },
        });

      const result = await otaUpdateService.downloadUpdate(false);

      expect(result).toBe(true);
      expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(3);
    });

    test('should verify download integrity', async () => {
      const mockDownloadResult = {
        isNew: true,
        manifest: {
          id: 'test-update-id',
          launchAsset: {
            hash: 'a'.repeat(64), // Valid hash format
          },
        },
      };

      Updates.fetchUpdateAsync.mockResolvedValue(mockDownloadResult);

      const result = await otaUpdateService.downloadUpdate(false);

      expect(result).toBe(true);
      // Verify that integrity verification was logged
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:ota_logs',
        expect.stringContaining('integrity_verified')
      );
    });

    test('should handle app restart for update application', async () => {
      Updates.getUpdateAsync.mockResolvedValue({
        updateId: 'current-update-id',
      });
      Updates.reloadAsync.mockResolvedValue();

      await otaUpdateService.restartApp();

      expect(Updates.reloadAsync).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:pre_restart_update',
        expect.stringContaining('current-update-id')
      );
    });
  });

  describe('Error Handling and Rollback', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should trigger rollback on integrity failure', async () => {
      const updateId = 'failed-update-id';
      const reason = 'integrity_verification_failed';

      await otaUpdateService.triggerRollback(reason, updateId);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:rollback_info',
        expect.stringContaining(updateId)
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:update_blockade',
        expect.stringContaining(updateId)
      );
    });

    test('should detect rollback conditions on startup', async () => {
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@circle:rollback_info') {
          return Promise.resolve(JSON.stringify({
            reason: 'integrity_verification_failed',
            updateId: 'failed-update-id',
            timestamp: Date.now(),
          }));
        }
        return Promise.resolve(null);
      });

      const rollbackDetected = await otaUpdateService.checkForRollbackNeeded();

      expect(rollbackDetected).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:rollback_info');
    });

    test('should block problematic updates', async () => {
      const updateId = 'problematic-update-id';
      
      await otaUpdateService.setUpdateBlockade(updateId, 'repeated_failures');
      
      const isBlocked = await otaUpdateService.isUpdateBlocked(updateId);
      
      expect(isBlocked).toBe(true);
    });

    test('should expire update blockades', async () => {
      const updateId = 'old-problematic-update-id';
      const expiredBlockade = {
        updateId,
        reason: 'repeated_failures',
        blockedAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        expiresAt: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
      };
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@circle:update_blockade') {
          return Promise.resolve(JSON.stringify(expiredBlockade));
        }
        return Promise.resolve(null);
      });
      
      const isBlocked = await otaUpdateService.isUpdateBlocked(updateId);
      
      expect(isBlocked).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:update_blockade');
    });
  });

  describe('Configuration and State Management', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should load and save configuration', async () => {
      const newConfig = {
        autoDownload: false,
        autoRestart: true,
        checkInterval: 10 * 60 * 1000,
      };

      await otaUpdateService.updateConfiguration(newConfig);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:ota_config',
        JSON.stringify(expect.objectContaining(newConfig))
      );
    });

    test('should provide comprehensive status information', async () => {
      Updates.getUpdateAsync.mockResolvedValue({
        updateId: 'current-update-id',
        manifest: { runtimeVersion: '1.0.0' },
      });

      const status = await otaUpdateService.getUpdateStatus();

      expect(status).toMatchObject({
        isInitialized: true,
        isEnabled: true,
        platform: 'android',
        runtimeVersion: '1.0.0',
        otaAvailable: true,
        currentUpdateId: 'current-update-id',
      });
    });

    test('should reset update state completely', async () => {
      await otaUpdateService.resetUpdateState();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:pending_update');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:update_reminder');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:update_declined');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:update_blockade');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:rollback_info');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:ota_logs');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@circle:ota_config');
      
      expect(otaUpdateService.isChecking).toBe(false);
      expect(otaUpdateService.updateAvailable).toBe(false);
      expect(otaUpdateService.retryCount).toBe(0);
    });
  });

  describe('Diagnostic and Monitoring', () => {
    beforeEach(async () => {
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
      await otaUpdateService.initialize();
    });

    test('should provide comprehensive diagnostic information', async () => {
      // Mock fetch for network test
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
      });

      const diagnosticInfo = await otaUpdateService.getDiagnosticInfo();

      expect(diagnosticInfo).toMatchObject({
        system: expect.objectContaining({
          isInitialized: true,
          otaAvailable: true,
          platform: 'android',
        }),
        status: expect.objectContaining({
          isInitialized: true,
          otaAvailable: true,
        }),
        history: expect.objectContaining({
          logs: expect.any(Array),
          statistics: expect.any(Object),
        }),
        network: expect.objectContaining({
          connected: true,
        }),
        summary: expect.objectContaining({
          healthy: expect.any(Boolean),
          issues: expect.any(Array),
          recommendations: expect.any(Array),
        }),
      });
    });

    test('should log update activities correctly', async () => {
      await otaUpdateService.logUpdateActivity('test_activity', {
        testData: 'test_value',
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@circle:ota_logs',
        expect.stringContaining('test_activity')
      );
    });

    test('should track update history and statistics', async () => {
      // Mock some activity logs
      const mockLogs = [
        { activity: 'check_success', timestamp: new Date().toISOString() },
        { activity: 'update_applied', timestamp: new Date().toISOString() },
        { activity: 'user_accepted', timestamp: new Date().toISOString() },
        { activity: 'download_failed', timestamp: new Date().toISOString() },
      ];

      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === '@circle:ota_logs') {
          return Promise.resolve(JSON.stringify(mockLogs));
        }
        return Promise.resolve(null);
      });

      const history = await otaUpdateService.getUpdateHistory();

      expect(history.statistics).toMatchObject({
        totalChecks: 1,
        successfulUpdates: 1,
        failedUpdates: 1,
        userAccepts: 1,
      });
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('should work correctly on iOS', async () => {
      Platform.OS = 'ios';
      global.__DEV__ = false;
      Updates.isEnabled = true;
      Updates.runtimeVersion = '1.0.0';
      
      Updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });

      await otaUpdateService.initialize();

      const status = await otaUpdateService.getUpdateStatus();
      expect(status.platform).toBe('ios');
      expect(status.otaAvailable).toBe(true);
    });

    test('should handle web platform gracefully', async () => {
      Platform.OS = 'web';
      global.__DEV__ = false;
      Updates.isEnabled = false; // Updates typically disabled on web
      
      await otaUpdateService.initialize();

      const status = await otaUpdateService.getUpdateStatus();
      expect(status.platform).toBe('web');
      expect(status.otaAvailable).toBe(false);
    });
  });
});