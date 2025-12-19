import { Platform, Dimensions } from 'react-native';

/**
 * Calculates responsive searchbar padding based on platform and screen size
 * 
 * Android devices:
 * - Small screens (< 5 inches): 8px vertical padding
 * - Medium/Large screens (≥ 5 inches): 10px vertical padding
 * 
 * iOS and Web: 16px vertical padding (unchanged)
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.screenWidth - Screen width in pixels
 * @param {number} options.screenHeight - Screen height in pixels
 * @param {string} options.platform - Platform ('android', 'ios', 'web')
 * @returns {Object} Padding configuration with paddingVertical and minHeight
 */
export function getSearchbarPaddingConfig(options = {}) {
  const {
    screenWidth = Dimensions.get('window').width,
    screenHeight = Dimensions.get('window').height,
    platform = Platform.OS,
  } = options;

  // Classify device based on screen width (more reliable than diagonal)
  // Android screen width breakpoints:
  // Small: < 400px (typically 4.0-4.7 inch phones)
  // Medium: 400-500px (typically 5.0-5.5 inch phones)
  // Large: >= 500px (typically 5.5+ inch phones)
  const isSmallScreen = screenWidth < 400;
  const isMediumScreen = screenWidth >= 400 && screenWidth < 500;
  const isLargeScreen = screenWidth >= 500;

  // Default configuration
  const config = {
    paddingVertical: 16, // Default for iOS and Web
    minHeight: 48, // Default minimum height
    platform,
    screenSize: 'medium',
  };

  // Apply Android-specific padding
  if (platform === 'android') {
    if (isSmallScreen) {
      // Small Android devices (< 5 inches)
      config.paddingVertical = 8;
      config.screenSize = 'small';
      config.minHeight = 40; // 8px padding × 2 + 16px font + 8px icon = 40px
    } else if (isMediumScreen) {
      // Medium Android devices (5-5.5 inches)
      config.paddingVertical = 10;
      config.screenSize = 'medium';
      config.minHeight = 42; // 10px padding × 2 + 16px font + 6px icon = 42px
    } else {
      // Large Android devices (> 5.5 inches)
      config.paddingVertical = 10;
      config.screenSize = 'large';
      config.minHeight = 42;
    }

    // Ensure accessibility compliance: minimum 44px touch target
    // The searchbar container should be at least 44px
    config.containerMinHeight = 44;
  } else {
    // iOS and Web: keep default
    config.screenSize = 'default';
    config.containerMinHeight = 48;
  }

  return config;
}



/**
 * Gets searchbar padding for current device
 * Convenience function that uses current device dimensions
 * 
 * @returns {Object} Padding configuration
 */
export function getCurrentSearchbarPadding() {
  return getSearchbarPaddingConfig();
}

/**
 * Validates that padding configuration meets accessibility requirements
 * 
 * @param {Object} config - Padding configuration object
 * @returns {boolean} True if configuration meets accessibility standards
 */
export function isAccessiblePaddingConfig(config) {
  if (!config) return false;

  // Minimum touch target height is 44px
  const minTouchTarget = 44;

  // For Android, check containerMinHeight
  if (config.platform === 'android') {
    return config.containerMinHeight >= minTouchTarget;
  }

  // For iOS and Web, check minHeight
  return config.minHeight >= minTouchTarget;
}
