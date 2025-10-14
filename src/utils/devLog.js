import { devLog, devDebug, devWarn } from './utils/dev-logger';
/**
 * Development Logger Utility for React Native
 * Defaults to production mode (no logs) if __DEV__ is not defined
 * Only logs when __DEV__ is explicitly true
 */

// Default to production (false) if __DEV__ is not defined
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

/**
 * Log only in development (silent by default)
 */
export const devLog = (...args) => {
  if (isDevelopment) {
    devLog(...args);
  }
};

/**
 * Debug log (only in development)
 */
export const devDebug = (...args) => {
  if (isDevelopment) {
    devDebug(...args);
  }
};

/**
 * Warning log (shown only in development)
 */
export const devWarn = (...args) => {
  if (isDevelopment) {
    devWarn(...args);
  }
};

/**
 * Error log (always shown - critical errors)
 */
export const logError = console.error;

/**
 * Production-safe logger object
 * All methods are silent by default unless __DEV__ is true
 */
export default {
  log: devLog,
  debug: devDebug,
  warn: devWarn,
  error: logError
};
