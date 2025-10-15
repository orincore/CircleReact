import { Alert as RNAlert, Platform } from 'react-native';

/**
 * Cross-platform Alert that works on both native and web
 */
export const Alert = {
  alert: (title, message, buttons = [{ text: 'OK' }], options = {}) => {
    if (Platform.OS === 'web') {
      // Web implementation using window.confirm/alert
      const buttonText = buttons.map(b => b.text).join(' / ');
      const fullMessage = message ? `${message}\n\n${buttonText}` : buttonText;
      
      if (buttons.length === 1) {
        // Single button - just show alert
        window.alert(`${title}\n\n${message || ''}`);
        if (buttons[0].onPress) {
          buttons[0].onPress();
        }
      } else if (buttons.length === 2) {
        // Two buttons - use confirm
        const result = window.confirm(`${title}\n\n${message || ''}`);
        const button = result ? buttons[0] : buttons[1];
        if (button.onPress) {
          button.onPress();
        }
      } else {
        // Multiple buttons - show all options
        const choice = window.prompt(
          `${title}\n\n${message || ''}\n\nEnter choice:`,
          buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n')
        );
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < buttons.length && buttons[index].onPress) {
          buttons[index].onPress();
        }
      }
    } else {
      // Native implementation
      RNAlert.alert(title, message, buttons, options);
    }
  }
};

export default Alert;
