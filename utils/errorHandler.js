/**
 * Comprehensive Error Handler Utility
 * Provides consistent error handling across all screens
 */

/**
 * Safe async function wrapper with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error logging
 * @param {*} fallbackValue - Value to return on error
 */
export const safeAsync = async (fn, context = 'Unknown', fallbackValue = null) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return fallbackValue;
  }
};

/**
 * Safe async function with timeout
 * @param {Function} fn - Async function to wrap
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} context - Context for error logging
 * @param {*} fallbackValue - Value to return on error/timeout
 */
export const safeAsyncWithTimeout = async (
  fn,
  timeout = 10000,
  context = 'Unknown',
  fallbackValue = null
) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), timeout)
    );
    return await Promise.race([fn(), timeoutPromise]);
  } catch (error) {
    console.error(`[${context}] Error:`, error);
    return fallbackValue;
  }
};

/**
 * Safe data fetch with validation
 * @param {Function} fetchFn - Function that fetches data
 * @param {Function} validator - Function to validate response
 * @param {string} context - Context for error logging
 * @param {*} fallbackValue - Value to return on error
 */
export const safeFetch = async (
  fetchFn,
  validator = (data) => data !== null && data !== undefined,
  context = 'Unknown',
  fallbackValue = null
) => {
  try {
    const data = await fetchFn();
    if (validator(data)) {
      return data;
    }
    console.warn(`[${context}] Invalid data received:`, data);
    return fallbackValue;
  } catch (error) {
    console.error(`[${context}] Fetch error:`, error);
    return fallbackValue;
  }
};

/**
 * Safe array operation
 * @param {Array} array - Array to operate on
 * @param {Function} operation - Operation to perform
 * @param {string} context - Context for error logging
 * @param {Array} fallbackValue - Value to return on error
 */
export const safeArrayOp = (
  array,
  operation,
  context = 'Unknown',
  fallbackValue = []
) => {
  try {
    if (!Array.isArray(array)) {
      console.warn(`[${context}] Not an array:`, array);
      return fallbackValue;
    }
    return operation(array);
  } catch (error) {
    console.error(`[${context}] Array operation error:`, error);
    return fallbackValue;
  }
};

/**
 * Safe object access with default value
 * @param {Object} obj - Object to access
 * @param {string} path - Path to property (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path doesn't exist
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    return result !== undefined ? result : defaultValue;
  } catch (error) {
    console.error(`[safeGet] Error accessing path '${path}':`, error);
    return defaultValue;
  }
};

/**
 * Safe permission request
 * @param {Function} requestFn - Permission request function
 * @param {string} permissionName - Name of permission for logging
 */
export const safePermissionRequest = async (requestFn, permissionName = 'Unknown') => {
  try {
    const result = await requestFn();
    return result?.status || 'denied';
  } catch (error) {
    console.error(`[${permissionName}] Permission request error:`, error);
    return 'denied';
  }
};

/**
 * Safe state update
 * @param {Function} setState - State setter function
 * @param {*} value - New value
 * @param {string} context - Context for error logging
 */
export const safeSetState = (setState, value, context = 'Unknown') => {
  try {
    if (typeof setState === 'function') {
      setState(value);
    } else {
      console.warn(`[${context}] setState is not a function`);
    }
  } catch (error) {
    console.error(`[${context}] State update error:`, error);
  }
};

/**
 * Safe navigation
 * @param {Object} router - Router object
 * @param {string} path - Path to navigate to
 * @param {Object} options - Navigation options
 */
export const safeNavigate = (router, path, options = {}) => {
  try {
    if (!router) {
      console.error('[Navigation] Router not available');
      return false;
    }
    if (options.replace) {
      router.replace(path);
    } else if (options.back) {
      router.back();
    } else {
      router.push(path);
    }
    return true;
  } catch (error) {
    console.error(`[Navigation] Error navigating to '${path}':`, error);
    return false;
  }
};

/**
 * Safe parallel operations with individual error handling
 * @param {Array<Function>} operations - Array of async operations
 * @param {string} context - Context for error logging
 */
export const safeParallel = async (operations, context = 'Unknown') => {
  try {
    const promises = operations.map((op, index) =>
      op().catch((err) => {
        console.error(`[${context}] Operation ${index} failed:`, err);
        return null;
      })
    );
    return await Promise.allSettled(promises);
  } catch (error) {
    console.error(`[${context}] Parallel operations error:`, error);
    return [];
  }
};

/**
 * Validate and sanitize user input
 * @param {string} input - User input
 * @param {Object} options - Validation options
 */
export const safeInput = (input, options = {}) => {
  const {
    maxLength = 1000,
    allowEmpty = false,
    trim = true,
    sanitize = true,
  } = options;

  try {
    if (typeof input !== 'string') {
      return allowEmpty ? '' : null;
    }

    let result = trim ? input.trim() : input;

    if (!allowEmpty && result.length === 0) {
      return null;
    }

    if (result.length > maxLength) {
      result = result.substring(0, maxLength);
    }

    if (sanitize) {
      // Basic XSS prevention
      result = result.replace(/[<>]/g, '');
    }

    return result;
  } catch (error) {
    console.error('[safeInput] Input validation error:', error);
    return allowEmpty ? '' : null;
  }
};

/**
 * Safe JSON parse
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallbackValue - Value to return on error
 */
export const safeJsonParse = (jsonString, fallbackValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[safeJsonParse] Parse error:', error);
    return fallbackValue;
  }
};

/**
 * Safe number conversion
 * @param {*} value - Value to convert
 * @param {number} fallbackValue - Value to return on error
 */
export const safeNumber = (value, fallbackValue = 0) => {
  try {
    const num = Number(value);
    return isNaN(num) ? fallbackValue : num;
  } catch (error) {
    console.error('[safeNumber] Conversion error:', error);
    return fallbackValue;
  }
};

/**
 * Safe date parsing
 * @param {*} value - Value to parse as date
 * @param {Date} fallbackValue - Value to return on error
 */
export const safeDate = (value, fallbackValue = new Date()) => {
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? fallbackValue : date;
  } catch (error) {
    console.error('[safeDate] Parse error:', error);
    return fallbackValue;
  }
};

/**
 * Create a safe event handler
 * @param {Function} handler - Event handler function
 * @param {string} context - Context for error logging
 */
export const safeHandler = (handler, context = 'Unknown') => {
  return (...args) => {
    try {
      return handler(...args);
    } catch (error) {
      console.error(`[${context}] Handler error:`, error);
    }
  };
};

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @param {string} context - Context for error logging
 */
export const retryWithBackoff = async (
  operation,
  maxRetries = 3,
  initialDelay = 1000,
  context = 'Unknown'
) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[${context}] Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error(`[${context}] All ${maxRetries} attempts failed:`, lastError);
  throw lastError;
};

export default {
  safeAsync,
  safeAsyncWithTimeout,
  safeFetch,
  safeArrayOp,
  safeGet,
  safePermissionRequest,
  safeSetState,
  safeNavigate,
  safeParallel,
  safeInput,
  safeJsonParse,
  safeNumber,
  safeDate,
  safeHandler,
  retryWithBackoff,
};
