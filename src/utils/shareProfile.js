import { Share, Alert, Platform } from 'react-native';

const DEFAULT_PUBLIC_WEB_BASE_URL = 'https://circle.orincore.com';

export async function shareProfile({
  userId,
  username,
  displayName,
  publicWebBaseUrl = DEFAULT_PUBLIC_WEB_BASE_URL,
  title = 'Circle Profile'
}) {
  if (!userId) {
    throw new Error('userId is required to share profile');
  }

  const safeBase = (publicWebBaseUrl || DEFAULT_PUBLIC_WEB_BASE_URL).replace(/\/$/, '');
  const cleanUsername = (username || '').toString().trim().replace(/^@/, '');
  const profilePath = cleanUsername
    ? `/${encodeURIComponent(cleanUsername)}`
    : `/profile/${encodeURIComponent(String(userId))}`;
  const profileUrl = `${safeBase}${profilePath}`;

  const name = displayName || username || 'someone';
  const message = `Check out ${name}'s profile on Circle`;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title,
        text: message,
        url: profileUrl
      });
      return { method: 'web_share', url: profileUrl };
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(profileUrl);
      Alert.alert('Link Copied', 'Profile link copied to clipboard.');
      return { method: 'clipboard', url: profileUrl };
    }

    Alert.alert('Share', profileUrl);
    return { method: 'alert', url: profileUrl };
  }

  await Share.share({
    title,
    message,
    url: profileUrl
  });

  return { method: 'native_share', url: profileUrl };
}
