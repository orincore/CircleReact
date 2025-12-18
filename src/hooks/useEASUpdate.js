/**
 * EAS Update Hook
 * Lightweight hook for silent background update checking using Expo's official EAS Update service.
 * 
 * This hook:
 * - Checks for updates silently on app launch
 * - Downloads updates in the background without blocking the user
 * - Does NOT trigger automatic reloads - updates apply on next restart
 * - Handles errors silently without interrupting user experience
 */

import { useEffect, useCallback, useState } from 'react';
import * as Updates from 'expo-updates';

/**
 * Hook to handle EAS Update checking and downloading
 * @returns {Object} Update state and manual control functions
 */
export function useEASUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  /**
   * Check for updates silently
   * Does not block the main thread or show any UI
   */
  const checkForUpdates = useCallback(async () => {
    // Skip in development mode - OTA updates only work in production builds
    if (__DEV__) {
      console.log('[EAS Update] Skipping update check in development mode');
      return;
    }

    // Skip if updates are not enabled
    if (!Updates.isEnabled) {
      console.log('[EAS Update] Updates not enabled');
      return;
    }

    try {
      setIsChecking(true);
      console.log('[EAS Update] Checking for updates...');
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('[EAS Update] Update available, downloading in background...');
        setUpdateAvailable(true);
        
        // Download the update in the background
        setIsDownloading(true);
        await Updates.fetchUpdateAsync();
        setIsDownloading(false);
        setUpdateDownloaded(true);
        
        console.log('[EAS Update] Update downloaded, will apply on next restart');
      } else {
        console.log('[EAS Update] App is up to date');
        setUpdateAvailable(false);
      }
    } catch (error) {
      // Silently handle errors - don't interrupt user experience
      console.log('[EAS Update] Update check failed:', error.message);
      setIsDownloading(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Manually reload the app to apply a downloaded update
   * Only use this for critical fixes that require immediate application
   */
  const reloadToApplyUpdate = useCallback(async () => {
    if (!updateDownloaded) {
      console.log('[EAS Update] No update downloaded to apply');
      return false;
    }

    try {
      console.log('[EAS Update] Reloading app to apply update...');
      await Updates.reloadAsync();
      return true;
    } catch (error) {
      console.error('[EAS Update] Failed to reload:', error.message);
      return false;
    }
  }, [updateDownloaded]);

  // Check for updates on mount (app launch)
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  return {
    isChecking,
    isDownloading,
    updateAvailable,
    updateDownloaded,
    checkForUpdates,
    reloadToApplyUpdate,
  };
}

export default useEASUpdate;
