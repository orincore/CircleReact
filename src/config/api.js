// API Configuration for different environments

const getApiBaseUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Browser environment - check hostname
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development - use custom domain with SSL
      return 'https://api.circle.orincore.com';
    } else {
      // Production - using custom domain with SSL
      return 'https://api.circle.orincore.com';
    }
  }
  
  // Node.js environment (React Native)
  if (process.env.NODE_ENV === 'production') {
    // Production - using custom domain with SSL
    return 'https://api.circle.orincore.com';
  } else {
    return 'http://localhost:8080';
  }
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

console.log('🌐 API Configuration:', {
  baseUrl: API_BASE_URL,
  environment: isProduction() ? 'production' : 'development',
  platform: typeof window !== 'undefined' ? 'web' : 'native'
});
