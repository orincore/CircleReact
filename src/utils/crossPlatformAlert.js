import { Alert, Platform } from 'react-native';

/**
 * Cross-platform Alert utility that works on both mobile and web
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Array} buttons - Array of button objects with text, onPress, and style properties
 * @param {Object} options - Additional options for the alert
 */
export const showAlert = (title, message, buttons = [{ text: 'OK' }], options = {}) => {
  if (Platform.OS === 'web') {
    // For web, use browser's confirm/alert or create a custom modal
    if (buttons.length === 1) {
      // Simple alert
      window.alert(`${title}\n\n${message}`);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else if (buttons.length === 2) {
      // Confirm dialog
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && buttons[1].onPress) {
        buttons[1].onPress();
      } else if (!result && buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      // For more complex alerts, fall back to simple alert
      window.alert(`${title}\n\n${message}`);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Use React Native's Alert for mobile platforms
    Alert.alert(title, message, buttons, options);
  }
};

export default showAlert;
