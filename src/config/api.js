// API Configuration - Unified Environment Management

const getApiBaseUrl = () => {
  // Check for development override first
  const forceDev = process.env.FORCE_DEV_MODE === 'true';
  
  // Determine environment
  const isDev = process.env.NODE_ENV === 'development' || forceDev;
  
  // Browser environment detection
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost')
  );

  // Environment-based URL selection
  let apiUrl;
  
  if (isDev || isLocalhost || forceDev) {
    // Development mode
    apiUrl = process.env.DEV_API_BASE_URL || 'http://localhost:8080';
    console.log('🏠 Development Mode - API URL:', apiUrl);
  } else {
    // Production mode
    apiUrl = process.env.PROD_API_BASE_URL || 'https://api.circle.orincore.com';
    console.log('🌐 Production Mode - API URL:', apiUrl);
  }

  // Override with explicit EXPO_PUBLIC_API_BASE_URL if provided
  const explicitUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitUrl && explicitUrl.trim() && explicitUrl !== 'undefined') {
    apiUrl = explicitUrl.trim();
    console.log('🔧 Using explicit API URL override:', apiUrl);
  }

  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// OAuth redirect URLs for different environments
export const getOAuthRedirectUrl = (platform) => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.FORCE_DEV_MODE === 'true';
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && window.location.hostname.includes('localhost');
  
  let baseUrl;
  
  if (isDev || isLocalhost) {
    baseUrl = process.env.DEV_FRONTEND_URL || 'http://localhost:8081';
  } else {
    baseUrl = process.env.PROD_FRONTEND_URL || 'https://circle.orincore.com';
  }
  
  // Override with explicit EXPO_PUBLIC_FRONTEND_URL if provided
  const explicitUrl = process.env.EXPO_PUBLIC_FRONTEND_URL;
  if (explicitUrl && explicitUrl.trim() && explicitUrl !== 'undefined') {
    baseUrl = explicitUrl.trim();
  }
    
  return `${baseUrl}/auth/${platform}/callback`;
};

// Environment detection
export const isProduction = () => {
  const forceDev = process.env.FORCE_DEV_MODE === 'true';
  if (forceDev) return false;
  
  if (typeof window !== 'undefined') {
    return !window.location.hostname.includes('localhost');
  }
  return process.env.NODE_ENV === 'production';
};

// WebSocket URL helper
export const getWebSocketUrl = () => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.FORCE_DEV_MODE === 'true';
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && window.location.hostname.includes('localhost');
  
  let wsUrl;
  
  if (isDev || isLocalhost) {
    wsUrl = process.env.DEV_WS_BASE_URL || 'http://localhost:8080';
  } else {
    wsUrl = process.env.PROD_WS_BASE_URL || 'https://api.circle.orincore.com';
  }
  
  // Override with explicit EXPO_PUBLIC_WS_BASE_URL if provided
  const explicitUrl = process.env.EXPO_PUBLIC_WS_BASE_URL;
  if (explicitUrl && explicitUrl.trim() && explicitUrl !== 'undefined') {
    wsUrl = explicitUrl.trim();
  }
  
  return wsUrl;
};


