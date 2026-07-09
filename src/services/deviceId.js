import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = '@circle:device_id';

// Module-memoized once resolved, so repeated calls within the same app
// session (register-token fires on launch/login/every foreground) don't hit
// AsyncStorage each time.
let cachedDeviceId = null;
let pendingCreation = null;

/**
 * A stable UUID generated once per install and persisted in AsyncStorage --
 * the real per-device identity push-token registration dedupes on, since the
 * push token itself rotates on reinstall/cache-clear/FCM refresh.
 */
export async function getOrCreateDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  if (pendingCreation) return pendingCreation;

  pendingCreation = (async () => {
    try {
      const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (existing) {
        cachedDeviceId = existing;
        return existing;
      }

      const generated = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
      cachedDeviceId = generated;
      return generated;
    } catch (error) {
      console.error('Failed to get/create device id:', error);
      return null;
    } finally {
      pendingCreation = null;
    }
  })();

  return pendingCreation;
}
