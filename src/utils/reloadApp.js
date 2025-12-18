/**
 * Reload App Utility
 * Provides a manual reload function for applying critical updates.
 * 
 * IMPORTANT: Only use this for critical fixes that require immediate application.
 * Normal updates should apply automatically on next app restart.
 */

import * as Updates from 'expo-updates';

/**
 * Manually reload the app to apply a downloaded update.
 * Only use this for critical fixes that require immediate application.
 * 
 * @returns {Promise<boolean>} True if reload was successful, false otherwise
 */
export async function reloadApp() {
  // Skip in development mode
  if (__DEV__) {
    console.log('[reloadApp] Cannot reload in development mode');
    return false;
  }

  // Skip if updates are not enabled
  if (!Updates.isEnabled) {
    console.log('[reloadApp] Updates not enabled');
    return false;
  }

  try {
    console.log('[reloadApp] Reloading app to apply update...');
    await Updates.reloadAsync();
    return true;
  } catch (error) {
    console.error('[reloadApp] Failed to reload:', error.message);
    return false;
  }
}

export default reloadApp;
