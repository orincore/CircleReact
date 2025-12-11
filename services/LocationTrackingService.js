import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_TRACKING_KEY = 'location_tracking_enabled';
const LAST_LOCATION_UPDATE_KEY = 'last_location_update';
const NEARBY_CHECK_KEY = 'last_nearby_check';

// Random interval between 15-30 minutes for battery efficiency
const MIN_UPDATE_INTERVAL = 15 * 60 * 1000; // 15 minutes minimum
const MAX_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes maximum
const getRandomInterval = () => Math.floor(Math.random() * (MAX_UPDATE_INTERVAL - MIN_UPDATE_INTERVAL + 1)) + MIN_UPDATE_INTERVAL;

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
    
      
      await handleLocationUpdate(location.coords);
    }
  }
});

// Handle location updates with rate limiting and nearby user detection
async function handleLocationUpdate(coords) {
  try {
    // Check if enough time has passed since last update (use random interval)
    const lastUpdateTime = await AsyncStorage.getItem(LAST_LOCATION_UPDATE_KEY);
    const now = Date.now();
    const currentInterval = getRandomInterval();
    
    if (lastUpdateTime && (now - parseInt(lastUpdateTime)) < currentInterval) {
      // Too soon since last update
      return;
    }

    // Get stored auth token (using the same key as AuthContext)
    const token = await AsyncStorage.getItem('@circle:access_token');
    if (!token) {
      return;
    }

    // Step 1: Save location to database via REST API (more reliable for background)
    try {
      await updateLocationInDatabase(coords.latitude, coords.longitude, token);
    } catch (dbError) {
      console.error('Failed to save location to database:', dbError);
      // Continue anyway to try nearby check
    }
    
    // Store last update time
    await AsyncStorage.setItem(LAST_LOCATION_UPDATE_KEY, now.toString());
    
    // Step 2: Check for nearby Circle users and send notifications to BOTH users
    try {
      await checkNearbyUsersAndNotify(coords.latitude, coords.longitude, token);
    } catch (nearbyError) {
      console.error('Failed to check nearby users:', nearbyError);
    }
    
  } catch (error) {
    console.error('❌ Failed to update location in background:', error);
  }
}

// Save location to database via REST API
async function updateLocationInDatabase(latitude, longitude, token) {
  try {
    const { API_BASE_URL } = await import('@/src/config/api');
    
    const response = await fetch(`${API_BASE_URL}/api/location/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Location update failed: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating location in database:', error);
    throw error;
  }
}

// Check for nearby Circle users within 3km and trigger notifications
async function checkNearbyUsersAndNotify(latitude, longitude, token) {
  try {
    const { API_BASE_URL } = await import('@/src/config/api');
    
    const response = await fetch(`${API_BASE_URL}/api/location/check-nearby`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radiusKm: 3, // 3km radius
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nearby check failed:', errorText);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.nearbyUsersNotified > 0) {
      console.log(`📍 Found ${result.nearbyUsersNotified} nearby users, notifications sent`);
    }
  } catch (error) {
    console.error('Error checking nearby users:', error);
  }
}

// Location tracking service class
class LocationTrackingService {
  static async requestPermissions() {
    try {
      // Request foreground location permission first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied - will only track when app is open');
        return { foreground: true, background: false };
      }

      return { foreground: true, background: true };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

  static async startTracking(authToken = null) {
    try {
      //console.log('🚀 Starting location tracking service...');
      
      // Store auth token if provided (for background access)
      if (authToken) {
        await AsyncStorage.setItem('@circle:access_token', authToken);
        //console.log('✅ Auth token stored for background location updates');
      }
      
      // Verify token is available
      const storedToken = await AsyncStorage.getItem('@circle:access_token');
      if (!storedToken) {
        console.warn('⚠️ No auth token available - background location updates may fail');
      }
      
      const hasHasStarted = typeof Location.hasStartedLocationUpdatesAsync === 'function';
      let isTracking = false;
      if (hasHasStarted) {
        isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      } else if (typeof TaskManager.isTaskRegisteredAsync === 'function') {
        isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      }
      if (isTracking) {
        //console.log('📍 Location tracking already active');
        return true;
      }

      // Request permissions
      const permissions = await this.requestPermissions();
      
      if (!permissions.foreground) {
        throw new Error('Location permissions required for tracking');
      }

      // Start background location updates with 15-30 min random interval
      if (typeof Location.startLocationUpdatesAsync === 'function') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced, // Good balance of accuracy and battery
          timeInterval: MIN_UPDATE_INTERVAL, // 15 minutes minimum (rate limiting done in handler)
          distanceInterval: 500, // Update if moved 500 meters (more battery efficient)
          deferredUpdatesInterval: MIN_UPDATE_INTERVAL,
          foregroundService: {
            notificationTitle: 'Circle Location',
            notificationBody: 'Finding Circle users near you',
            notificationColor: '#7C2B86',
          },
          pausesUpdatesAutomatically: false, // Keep tracking even when stationary
          showsBackgroundLocationIndicator: true, // iOS requirement
        });
      }

      // Mark tracking as enabled
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'true');
      
      //console.log('✅ Location tracking started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      throw error;
    }
  }

  static async stopTracking() {
    try {
      //console.log('🛑 Stopping location tracking service...');
      
      const hasHasStarted = typeof Location.hasStartedLocationUpdatesAsync === 'function';
      let isTracking = false;
      if (hasHasStarted) {
        isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      } else if (typeof TaskManager.isTaskRegisteredAsync === 'function') {
        isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      }
      
      if (isTracking && typeof Location.stopLocationUpdatesAsync === 'function') {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Mark tracking as disabled
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'false');
      
      //console.log('✅ Location tracking stopped successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to stop location tracking:', error);
      throw error;
    }
  }

  static async isTrackingEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(LOCATION_TRACKING_KEY);
      const hasHasStarted = typeof Location.hasStartedLocationUpdatesAsync === 'function';
      let isTracking = false;
      if (hasHasStarted) {
        isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      } else if (typeof TaskManager.isTaskRegisteredAsync === 'function') {
        isTracking = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      }
      
      return enabled === 'true' && isTracking;
    } catch (error) {
      console.error('Error checking tracking status:', error);
      return false;
    }
  }

  static async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 60000, // Accept location up to 1 minute old
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString()
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  static async updateLocationNow() {
    try {
      //console.log('🔄 Manual location update requested...');
      
      const location = await this.getCurrentLocation();
      await handleLocationUpdate(location);
      
      //console.log('✅ Manual location update completed');
      return location;
    } catch (error) {
      console.error('❌ Manual location update failed:', error);
      throw error;
    }
  }

  static async getLastLocationUpdate() {
    try {
      const lastUpdate = await AsyncStorage.getItem(LAST_LOCATION_UPDATE_KEY);
      return lastUpdate ? new Date(parseInt(lastUpdate)) : null;
    } catch (error) {
      console.error('Error getting last location update:', error);
      return null;
    }
  }
}

export default LocationTrackingService;
