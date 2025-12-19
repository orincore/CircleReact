import { Platform } from 'react-native';

/**
 * Minimum iOS version that supports Liquid Glass design
 */
const LIQUID_GLASS_MIN_VERSION = 26;

/**
 * Extracts the major iOS version number from Platform.Version
 * @returns {number | null} The iOS major version as a number, or null if not iOS
 */
export function getIOSVersion() {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const version = Platform.Version;
  
  // Platform.Version on iOS can be a string like "26.0" or a number
  if (typeof version === 'number') {
    return Math.floor(version);
  }
  
  if (typeof version === 'string') {
    const majorVersion = parseInt(version.split('.')[0], 10);
    return isNaN(majorVersion) ? null : majorVersion;
  }
  
  return null;
}

/**
 * Checks if the current device is running iOS 26 or later (supports Liquid Glass)
 * @returns {boolean} True if running on iOS 26+, false otherwise
 */
export function isIOSWithLiquidGlass() {
  const iosVersion = getIOSVersion();
  return iosVersion !== null && iosVersion >= LIQUID_GLASS_MIN_VERSION;
}

/**
 * Determines whether to use the native tab bar (with Liquid Glass on iOS 26+)
 * or the custom TabBarWithNotifications component
 * @returns {boolean} True if native tab bar should be used, false for custom tab bar
 */
export function shouldUseNativeTabBar() {
  return isIOSWithLiquidGlass();
}

/**
 * Formats a badge count for display
 * @param {number} count - The unread count
 * @returns {string | number | undefined} Formatted badge value
 */
export function formatBadgeCount(count) {
  if (typeof count !== 'number' || count <= 0) {
    return undefined;
  }
  if (count > 99) {
    return '99+';
  }
  return count;
}

/**
 * Calculates the new unread count after reading messages
 * @param {number} currentCount - Current unread count
 * @param {number} readCount - Number of messages read
 * @returns {number} New unread count (minimum 0)
 */
export function decrementUnreadCount(currentCount, readCount) {
  const current = typeof currentCount === 'number' ? currentCount : 0;
  const read = typeof readCount === 'number' ? readCount : 0;
  return Math.max(0, current - read);
}
