import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// expo-media-library is native-only -- its web build extends
// expo-modules-core's NativeModule class, which throws "Class extends
// value undefined" the moment the module is evaluated. Expo Router's
// static web export evaluates every route's imports up front, so an
// unconditional top-level import here would break every route, not just
// the callers of ensureMediaLibraryPermission (see the same guard in
// app/secure/chat-conversation.jsx).
const MediaLibrary = Platform.OS !== 'web' ? require('expo-media-library') : null;

/**
 * Imperative bridge to PermissionDisclosureContext (mounted once at the
 * app root in app/_layout.jsx). Lets plain service/utility modules that
 * aren't React components -- AndroidNotificationService, mediaUpload.js,
 * chatMediaService.js, etc. -- trigger the same prominent-disclosure modal
 * as components do via usePermissionDisclosure(), without every one of
 * those call sites needing to be lifted into a component.
 */
let requestDisclosureImpl = null;

export function registerDisclosureRequester(fn) {
  requestDisclosureImpl = fn;
}

async function showDisclosure(type) {
  if (!requestDisclosureImpl) {
    // Provider not mounted yet (e.g. a very early service init) -- fail
    // open rather than silently blocking the permission request forever.
    return true;
  }
  return requestDisclosureImpl(type);
}

/**
 * Each ensure* function: no-ops if the permission is already granted,
 * otherwise shows the in-app disclosure first and only calls the real OS
 * permission request if the user taps "Allow". Always returns the same
 * shape the underlying expo API returns ({ status, ... }), so callers can
 * keep checking `status === 'granted'` exactly as before.
 */

export async function ensureLocationPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('location');
  if (!allowed) return current;

  return Location.requestForegroundPermissionsAsync();
}

export async function ensureImagePickerCameraPermission() {
  if (Platform.OS === 'web') return { status: 'granted' };

  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('camera');
  if (!allowed) return current;

  return ImagePicker.requestCameraPermissionsAsync();
}

export async function ensureImagePickerMediaLibraryPermission() {
  if (Platform.OS === 'web') return { status: 'granted' };

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('photoLibrary');
  if (!allowed) return current;

  return ImagePicker.requestMediaLibraryPermissionsAsync();
}

export async function ensureMediaLibraryPermission(writeOnly = false) {
  if (Platform.OS === 'web') return { status: 'granted' };

  const current = await MediaLibrary.getPermissionsAsync(writeOnly);
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('photoLibrary');
  if (!allowed) return current;

  return MediaLibrary.requestPermissionsAsync(writeOnly);
}

export async function ensureMicrophonePermission() {
  const current = await Camera.getMicrophonePermissionsAsync();
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('microphone');
  if (!allowed) return current;

  return Camera.requestMicrophonePermissionsAsync();
}

export async function ensureNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return current;

  const allowed = await showDisclosure('notifications');
  if (!allowed) return current;

  return Notifications.requestPermissionsAsync();
}
