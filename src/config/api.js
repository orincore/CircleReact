// API Configuration for different environments

const getApiBaseUrl = () => {
  // ALWAYS check for explicit env variable first (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    //console.log('🌐 API Configuration: Using EXPO_PUBLIC_API_BASE_URL from .env:', envUrl.trim());
    return envUrl.trim();
  }

  // Fallback: MacBook IP address for testing (no SSL)
  const MACBOOK_IP = '172.20.10.14';
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Browser environment - check hostname
    const hostname = window.location.hostname;
    //console.log('🔍 Hostname detection:', { hostname, isDev, nodeEnv: process.env.NODE_ENV });
    
    // Force MacBook IP for development (no SSL)
    if (isDev || hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development - use MacBook IP with HTTP (no SSL)
      //console.log('🏠 Using MacBook IP backend (no SSL):', `http://${MACBOOK_IP}:8080`);
      return `http://${MACBOOK_IP}:8080`;
    } else {
      // Production - using custom domain with SSL
      //console.log('🌐 Using production backend');
      return 'https://api.circle.orincore.com';
    }
  }
  
  // Node.js environment (React Native) - fallback only
  //console.log('🏠 Using fallback MacBook IP backend:', `http://${MACBOOK_IP}:8080`);
  return `http://${MACBOOK_IP}:8080`;
};

export const API_BASE_URL = getApiBaseUrl();

// OAuth redirect URLs for different environments
export const getOAuthRedirectUrl = (platform) => {
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:8081';
    
  return `${baseUrl}/auth/${platform}/callback`;
};

// Environment detection
export const isProduction = () => {
  if (typeof window !== 'undefined') {
    return !window.location.hostname.includes('localhost');
  }
  return process.env.NODE_ENV === 'production';
};


