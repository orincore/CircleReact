import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear stale user data from AsyncStorage
 * Call this function if you're seeing errors about deleted users
 */
export async function clearStaleUserData() {
  try {
    console.log('🧹 Clearing stale user data...');
    
    // List of keys that might contain stale user IDs
    const keysToCheck = [
      'chats',
      'friends', 
      'matches',
      'recent_chats',
      'cached_profiles',
      'user_cache',
    ];
    
    for (const key of keysToCheck) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`✅ Cleared: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Could not clear ${key}:`, error);
      }
    }
    
    console.log('✅ Stale data cleared! Please restart the app.');
    return true;
  } catch (error) {
    console.error('❌ Error clearing stale data:', error);
    return false;
  }
}

/**
 * Get all AsyncStorage keys (for debugging)
 */
export async function debugAsyncStorage() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('📦 AsyncStorage keys:', keys);
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`  ${key}:`, value?.substring(0, 100) + '...');
    }
  } catch (error) {
    console.error('Error reading AsyncStorage:', error);
  }
}
