import useAndroidNotifications from '../hooks/useAndroidNotifications';

// Renders nothing -- it exists purely to keep useAndroidNotifications mounted
// at the app root so its socket listeners (friend requests, matches,
// reactions, etc.) stay registered for the whole session. In-app toast
// banners were removed; OS-level push/local notifications are unaffected.
export default function NotificationManager() {
  useAndroidNotifications();
  return null;
}
