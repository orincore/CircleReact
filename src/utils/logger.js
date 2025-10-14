/**
 * Production Logger
 * All logging is disabled in production mode
 */

// Production mode - no logging
const PRODUCTION_MODE = true;

/**
 * Silent logger for production
 */
export const logger = {
  log: (...args) => {
    // Silent in production
  },
  debug: (...args) => {
    // Silent in production
  },
  warn: (...args) => {
    // Silent in production
  },
  info: (...args) => {
    // Silent in production
  },
  error: console.error // Keep errors for critical issues
};

// Export individual functions
export const log = logger.log;
export const debug = logger.debug;
export const warn = logger.warn;
export const info = logger.info;
export const error = logger.error;

export default logger;
