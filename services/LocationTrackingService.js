import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLocationGql } from '@/src/api/graphql';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_TRACKING_KEY = 'location_tracking_enabled';
const LAST_LOCATION_UPDATE_KEY = 'last_location_update';
const MIN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
      console.log('📍 Background location received:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp).toISOString()
      });
      
      await handleLocationUpdate(location.coords);
    }
  }
});

// Handle location updates with rate limiting
async function handleLocationUpdate(coords) {
  try {
    // Check if enough time has passed since last update
    const lastUpdateTime = await AsyncStorage.getItem(LAST_LOCATION_UPDATE_KEY);
    const now = Date.now();
    
    if (lastUpdateTime && (now - parseInt(lastUpdateTime)) < MIN_UPDATE_INTERVAL) {
      console.log('⏰ Skipping location update - too soon since last update');
      return;
    }

    // Get stored auth token (using the same key as AuthContext)
    const token = await AsyncStorage.getItem('@circle:access_token');
    if (!token) {
      console.log('❌ No auth token found for location update');
      return;
    }

    // Update location in database (only send fields expected by GraphQL schema)
    const locationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      // Note: accuracy and timestamp are not part of LocationInput schema
    };

    console.log('🔄 Updating location in database:', {
      ...locationData,
      accuracy: coords.accuracy,
      timestamp: new Date().toISOString()
    });
    
    await updateLocationGql(locationData, token);
    
    // Store last update time
    await AsyncStorage.setItem(LAST_LOCATION_UPDATE_KEY, now.toString());
    
    console.log('✅ Location updated successfully in background');
    
  } catch (error) {
    console.error('❌ Failed to update location in background:', error);
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
      console.log('🚀 Starting location tracking service...');
      
      // Store auth token if provided (for background access)
      if (authToken) {
        await AsyncStorage.setItem('@circle:access_token', authToken);
        console.log('✅ Auth token stored for background location updates');
      }
      
      // Verify token is available
      const storedToken = await AsyncStorage.getItem('@circle:access_token');
      if (!storedToken) {
        console.warn('⚠️ No auth token available - background location updates may fail');
      }
      
      // Check if already tracking
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTracking) {
        console.log('📍 Location tracking already active');
        return true;
      }

      // Request permissions
      const permissions = await this.requestPermissions();
      
      if (!permissions.foreground) {
        throw new Error('Location permissions required for tracking');
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced, // Good balance of accuracy and battery
        timeInterval: MIN_UPDATE_INTERVAL, // 5 minutes
        distanceInterval: 100, // Update if moved 100 meters
        deferredUpdatesInterval: MIN_UPDATE_INTERVAL,
        foregroundService: {
          notificationTitle: 'Circle Location',
          notificationBody: 'Updating your location for better matches',
          notificationColor: '#7C2B86',
        },
        pausesUpdatesAutomatically: false, // Keep tracking even when stationary
        showsBackgroundLocationIndicator: true, // iOS requirement
      });

      // Mark tracking as enabled
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'true');
      
      console.log('✅ Location tracking started successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      throw error;
    }
  }

  static async stopTracking() {
    try {
      console.log('🛑 Stopping location tracking service...');
      
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      // Mark tracking as disabled
      await AsyncStorage.setItem(LOCATION_TRACKING_KEY, 'false');
      
      console.log('✅ Location tracking stopped successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to stop location tracking:', error);
      throw error;
    }
  }

  static async isTrackingEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(LOCATION_TRACKING_KEY);
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      
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
      console.log('🔄 Manual location update requested...');
      
      const location = await this.getCurrentLocation();
      await handleLocationUpdate(location);
      
      console.log('✅ Manual location update completed');
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
