// Network connectivity test utility for debugging
import { API_BASE_URL } from '../api/config';

export const testNetworkConnectivity = async () => {
  console.log('🔍 Testing network connectivity...');
  console.log('API_BASE_URL:', API_BASE_URL);
  
  try {
    // Test basic connectivity to health endpoint
    const healthUrl = `${API_BASE_URL}/health`;
    console.log('Testing health endpoint:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Disable SSL verification for development
      ...(process.env.NODE_ENV === 'development' && {
        // @ts-ignore - React Native specific options
        trustAllCerts: true,
        rejectUnauthorized: false,
      }),
    });
    
    console.log('Health check response status:', response.status);
    const data = await response.text();
    console.log('Health check response data:', data);
    
    if (response.ok) {
      console.log('✅ Network connectivity test passed');
      return true;
    } else {
      console.log('❌ Health check failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return false;
  }
};

export const debugNetworkInfo = () => {
  console.log('🔧 Network Debug Info:');
  console.log('- API_BASE_URL:', API_BASE_URL);
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- __DEV__:', typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined');
  
  // Platform-specific debug info
  if (typeof navigator !== 'undefined') {
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Online:', navigator.onLine);
  }
};
