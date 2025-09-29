import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePreferencesGql } from '@/src/api/graphql';

export const LOCATION_PREFERENCES = {
  local: { maxDistance: 10, label: 'Local Only' },
  nearby: { maxDistance: 50, label: 'Nearby' },
  city: { maxDistance: 100, label: 'Same City' },
  region: { maxDistance: 300, label: 'Same Region' },
  country: { maxDistance: 1000, label: 'Same Country' },
  international: { maxDistance: null, label: 'International' },
};

export const AGE_PREFERENCES = {
  close: { range: 2, label: 'Close Age (±2 years)' },
  similar: { range: 5, label: 'Similar Age (±5 years)' },
  flexible: { range: 10, label: 'Flexible (±10 years)' },
  open: { range: 15, label: 'Very Open (±15 years)' },
  any: { range: null, label: 'Any Age' },
};

export const DEFAULT_PREFERENCES = {
  locationPreference: 'nearby',
  agePreference: 'flexible',
  friendshipLocationPriority: true,
  relationshipDistanceFlexible: true,
};

export async function getUserPreferences() {
  try {
    const preferences = await AsyncStorage.getItem('matchingPreferences');
    if (preferences) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(preferences) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

export async function saveUserPreferences(preferences) {
  try {
    const updatedPreferences = {
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem('matchingPreferences', JSON.stringify(updatedPreferences));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
}

export async function syncPreferencesWithBackend(preferences, token) {
  try {
    console.log('🔄 Syncing preferences with backend:', preferences);
    
    // Update preferences in the backend database
    const result = await updatePreferencesGql(preferences, token);
    
    if (result) {
      console.log('✅ Preferences synced successfully with backend');
      
      // Also save locally for offline access
      await saveUserPreferences(preferences);
      
      return { success: true, data: result };
    } else {
      console.error('❌ Failed to sync preferences with backend');
      return { success: false, error: 'Backend update failed' };
    }
  } catch (error) {
    console.error('❌ Error syncing preferences with backend:', error);
    
    // Still save locally even if backend sync fails
    const localSaved = await saveUserPreferences(preferences);
    
    return { 
      success: false, 
      error: error.message,
      localSaved 
    };
  }
}

export async function loadPreferencesFromUser(user) {
  try {
    // If user has backend preferences, use those
    if (user?.preferences) {
      const backendPrefs = {
        locationPreference: user.preferences.locationPreference || DEFAULT_PREFERENCES.locationPreference,
        agePreference: user.preferences.agePreference || DEFAULT_PREFERENCES.agePreference,
        friendshipLocationPriority: user.preferences.friendshipLocationPriority ?? DEFAULT_PREFERENCES.friendshipLocationPriority,
        relationshipDistanceFlexible: user.preferences.relationshipDistanceFlexible ?? DEFAULT_PREFERENCES.relationshipDistanceFlexible,
      };
      
      // Also save to local storage for offline access
      await saveUserPreferences(backendPrefs);
      
      console.log('📥 Loaded preferences from backend:', backendPrefs);
      return backendPrefs;
    }
    
    // Fallback to local preferences
    return await getUserPreferences();
  } catch (error) {
    console.error('Error loading preferences from user:', error);
    return await getUserPreferences();
  }
}

export function getMaxDistanceFromPreference(locationPreference, isForFriendship = false, relationshipDistanceFlexible = true) {
  const basePref = LOCATION_PREFERENCES[locationPreference];
  if (!basePref) return LOCATION_PREFERENCES.nearby.maxDistance;
  
  let maxDistance = basePref.maxDistance;
  
  // If it's international, return null (no limit)
  if (maxDistance === null) return null;
  
  // For friendship with location priority, reduce the distance
  if (isForFriendship) {
    // Friendship prioritizes closer distances
    maxDistance = Math.min(maxDistance, 100); // Cap at 100km for friendship
  } else if (relationshipDistanceFlexible) {
    // For relationships with flexible distance, allow 2x the base distance
    maxDistance = maxDistance * 2;
  }
  
  return maxDistance;
}

export function getAgeRangeFromPreference(agePreference, userAge) {
  const agePref = AGE_PREFERENCES[agePreference];
  if (!agePref || agePref.range === null) return null;
  
  const minAge = Math.max(18, userAge - agePref.range); // Minimum age 18
  const maxAge = Math.min(100, userAge + agePref.range); // Maximum age 100
  
  return [minAge, maxAge];
}

export function getPreferencesForMatching(preferences, user, isForFriendship = false) {
  const maxDistance = getMaxDistanceFromPreference(
    preferences.locationPreference,
    isForFriendship,
    preferences.relationshipDistanceFlexible
  );
  
  const ageRange = getAgeRangeFromPreference(preferences.agePreference, user?.age);
  
  return {
    maxDistance,
    ageRange,
    friendshipLocationPriority: preferences.friendshipLocationPriority,
    relationshipDistanceFlexible: preferences.relationshipDistanceFlexible,
  };
}
