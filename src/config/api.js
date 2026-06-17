// API Configuration - Unified Environment Management
import { safeEnv, safeNetwork } from '../utils/crashPrevention';

// IMPORTANT: Expo's Babel transform only inlines `process.env.EXPO_PUBLIC_*`
// when it is referenced STATICALLY (written out literally). A dynamic lookup
// like `process.env[key]` (which safeEnv.get does) is NOT replaced and returns
// undefined on native, causing the app to silently fall back to the production
// default. So read these public overrides statically here.
const cleanEnv = (v) => (typeof v === 'string' && v.trim() && v.trim() !== 'undefined' ? v.trim() : undefined);
const ENV_API_BASE_URL = cleanEnv(process.env.EXPO_PUBLIC_API_BASE_URL);
const ENV_WS_BASE_URL = cleanEnv(process.env.EXPO_PUBLIC_WS_BASE_URL);
const ENV_FRONTEND_URL = cleanEnv(process.env.EXPO_PUBLIC_FRONTEND_URL);

const getApiBaseUrl = () => {
  // Check for development override first
  const forceDev = safeEnv.get('FORCE_DEV_MODE') === 'true';
  
  // Determine environment
  const isDev = safeEnv.isDev() || forceDev;
  
  // Browser environment detection
  const isLocalhost = safeNetwork.isLocalhost();

  // Environment-based URL selection
  let apiUrl;
  
  if (isDev || isLocalhost || forceDev) {
    // Development mode
    apiUrl = safeEnv.get('DEV_API_BASE_URL', 'http://localhost:8080');
    console.log('🏠 Development Mode - API URL:', apiUrl);
  } else {
    // Production mode
    apiUrl = safeEnv.get('PROD_API_BASE_URL', 'https://api.circle.orincore.com');
    console.log('🌐 Production Mode - API URL:', apiUrl);
  }

  // Override with explicit EXPO_PUBLIC_API_BASE_URL if provided
  if (ENV_API_BASE_URL) {
    apiUrl = ENV_API_BASE_URL;
    console.log('🔧 Using explicit API URL override:', apiUrl);
  }

  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// OAuth redirect URLs for different environments
export const getOAuthRedirectUrl = (platform) => {
  const isDev = safeEnv.isDev();
  const isLocalhost = safeNetwork.isLocalhost();
  
  let baseUrl;
  
  if (isDev || isLocalhost) {
    baseUrl = safeEnv.get('DEV_FRONTEND_URL', 'http://localhost:8081');
  } else {
    baseUrl = safeEnv.get('PROD_FRONTEND_URL', 'https://circle.orincore.com');
  }
  
  // Override with explicit EXPO_PUBLIC_FRONTEND_URL if provided
  if (ENV_FRONTEND_URL) {
    baseUrl = ENV_FRONTEND_URL;
  }

  return `${baseUrl}/auth/${platform}/callback`;
};

// Environment detection
export const isProduction = () => {
  const forceDev = safeEnv.get('FORCE_DEV_MODE') === 'true';
  if (forceDev) return false;
  
  if (!safeNetwork.isLocalhost()) {
    return safeEnv.isProd();
  }
  return safeEnv.isProd();
};

// WebSocket URL helper
export const getWebSocketUrl = () => {
  const isDev = safeEnv.isDev();
  const isLocalhost = safeNetwork.isLocalhost();
  
  let wsUrl;
  
  if (isDev || isLocalhost) {
    wsUrl = safeEnv.get('DEV_WS_BASE_URL', 'http://localhost:8080');
  } else {
    wsUrl = safeEnv.get('PROD_WS_BASE_URL', 'https://api.circle.orincore.com');
  }
  
  // Override with explicit EXPO_PUBLIC_WS_BASE_URL if provided
  if (ENV_WS_BASE_URL) {
    wsUrl = ENV_WS_BASE_URL;
  }

  return wsUrl;
};


