// Crash Prevention Utilities
// This module provides utilities to prevent common React Native crashes

import { Platform } from 'react-native';

/**
 * Safe window access for web environments
 * Prevents "Cannot read property 'hostname' of undefined" errors
 */
export const safeWindow = {
  get location() {
    if (typeof window !== 'undefined' && window.location) {
      return window.location;
    }
    return {
      hostname: 'localhost',
      protocol: 'http:',
      href: 'http://localhost',
      pathname: '/',
      search: '',
      hash: ''
    };
  },
  
  get navigator() {
    if (typeof navigator !== 'undefined') {
      return navigator;
    }
    return {
      userAgent: 'Unknown',
      platform: Platform.OS
    };
  }
};

/**
 * Safe environment variable access
 * Prevents undefined environment variable errors
 */
export const safeEnv = {
  get(key, defaultValue = '') {
    try {
      const value = process.env[key];
      return value && value.trim() && value !== 'undefined' ? value.trim() : defaultValue;
    } catch (error) {
      console.warn(`Failed to access environment variable ${key}:`, error);
      return defaultValue;
    }
  },
  
  isDev() {
    try {
      return (
        (typeof __DEV__ !== 'undefined' && __DEV__) ||
        process.env.NODE_ENV === 'development' ||
        process.env.FORCE_DEV_MODE === 'true'
      );
    } catch (error) {
      return false;
    }
  },
  
  isProd() {
    return !this.isDev();
  }
};

/**
 * Safe network detection
 * Prevents hostname-related crashes
 */
export const safeNetwork = {
  isLocalhost() {
    try {
      if (Platform.OS === 'web') {
        const hostname = safeWindow.location.hostname;
        return (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.includes('localhost')
        );
      }
      return false;
    } catch (error) {
      console.warn('Failed to detect localhost:', error);
      return false;
    }
  },
  
  getHostname() {
    try {
      if (Platform.OS === 'web') {
        return safeWindow.location.hostname;
      }
      return 'unknown';
    } catch (error) {
      console.warn('Failed to get hostname:', error);
      return 'unknown';
    }
  },
  
  getProtocol() {
    try {
      if (Platform.OS === 'web') {
        return safeWindow.location.protocol;
      }
      return 'http:';
    } catch (error) {
      console.warn('Failed to get protocol:', error);
      return 'http:';
    }
  }
};

/**
 * Safe async operation wrapper
 * Prevents unhandled promise rejections
 */
export const safeAsync = {
  async execute(asyncFn, fallbackValue = null) {
    try {
      return await asyncFn();
    } catch (error) {
      console.warn('Async operation failed:', error);
      return fallbackValue;
    }
  },
  
  wrap(asyncFn) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        console.error('Wrapped async function failed:', error);
        throw error;
      }
    };
  }
};

/**
 * Safe JSON operations
 * Prevents JSON parsing crashes
 */
export const safeJSON = {
  parse(jsonString, fallback = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('JSON parse failed:', error);
      return fallback;
    }
  },
  
  stringify(obj, fallback = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.warn('JSON stringify failed:', error);
      return fallback;
    }
  }
};

/**
 * Safe storage operations
 * Prevents AsyncStorage crashes
 */
export const safeStorage = {
  async get(key, fallback = null) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const value = await AsyncStorage.getItem(key);
      return value ? safeJSON.parse(value, fallback) : fallback;
    } catch (error) {
      console.warn(`Storage get failed for key ${key}:`, error);
      return fallback;
    }
  },
  
  async set(key, value) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, safeJSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Storage set failed for key ${key}:`, error);
      return false;
    }
  },
  
  async remove(key) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Storage remove failed for key ${key}:`, error);
      return false;
    }
  }
};

/**
 * Global error handler setup
 * Prevents app crashes from unhandled errors
 */
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    global.addEventListener?.('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  }
  
  // Handle uncaught exceptions
  if (typeof process !== 'undefined' && process.on) {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });
  }
  
  // React Native specific error handling
  if (Platform.OS !== 'web') {
    const ErrorUtils = require('react-native').ErrorUtils;
    if (ErrorUtils) {
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.error('Global error handler:', error, 'isFatal:', isFatal);
      });
    }
  }
};

export default {
  safeWindow,
  safeEnv,
  safeNetwork,
  safeAsync,
  safeJSON,
  safeStorage,
  setupGlobalErrorHandlers
};
