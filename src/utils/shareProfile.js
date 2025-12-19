import { Share, Alert, Platform } from 'react-native';

const DEFAULT_PUBLIC_WEB_BASE_URL = 'https://circle.orincore.com';
const APP_SCHEME = 'circle';

export async function shareProfile({
  userId,
  username,
  displayName,
  publicWebBaseUrl = DEFAULT_PUBLIC_WEB_BASE_URL,
  title = 'Check out my Circle profile!'
}) {
  if (!userId) {
    throw new Error('userId is required to share profile');
  }

  const safeBase = (publicWebBaseUrl || DEFAULT_PUBLIC_WEB_BASE_URL).replace(/\/$/, '');
  const cleanUsername = (username || '').toString().trim().replace(/^@/, '');
  
  // Use username-based URL for cleaner sharing (works with deep linking)
  const profilePath = cleanUsername
    ? `/${encodeURIComponent(cleanUsername)}`
    : `/profile/${encodeURIComponent(String(userId))}`;
  
  // Web URL that will be shared - this URL will:
  // 1. Open in app if installed (via Universal Links / App Links)
  // 2. Fall back to web browser if app not installed
  const profileUrl = `${safeBase}${profilePath}`;

  const name = displayName || username || 'someone';
  
  // Professional, attractive share message without duplicate link
  const shareMessage = `✨ Meet ${name} on Circle!\n\nDiscover meaningful connections on Circle – the dating & friendship app that matches you based on compatibility, not just looks.\n\n🔗 View Profile`;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) {
      // Web Share API - don't include URL in text to avoid duplication
      await navigator.share({
        title,
        text: shareMessage,
        url: profileUrl
      });
      return { method: 'web_share', url: profileUrl };
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(profileUrl);
      Alert.alert('Link Copied!', 'Profile link copied to clipboard. Share it anywhere!');
      return { method: 'clipboard', url: profileUrl };
    }

    Alert.alert('Share Profile', profileUrl);
    return { method: 'alert', url: profileUrl };
  }

  // For native platforms, use message without URL to avoid duplication
  // React Native Share will add the URL separately
  await Share.share({
    title,
    message: shareMessage,
    url: profileUrl
  });

  return { method: 'native_share', url: profileUrl };
}

/**
 * Get the deep link URL for a profile (for internal use)
 */
export function getProfileDeepLink(userId, username) {
  const cleanUsername = (username || '').toString().trim().replace(/^@/, '');
  if (cleanUsername) {
    return `${APP_SCHEME}://${cleanUsername}`;
  }
  return `${APP_SCHEME}://profile/${userId}`;
}

/**
 * Get the web URL for a profile
 */
export function getProfileWebUrl(userId, username, baseUrl = DEFAULT_PUBLIC_WEB_BASE_URL) {
  const safeBase = baseUrl.replace(/\/$/, '');
  const cleanUsername = (username || '').toString().trim().replace(/^@/, '');
  if (cleanUsername) {
    return `${safeBase}/${encodeURIComponent(cleanUsername)}`;
  }
  return `${safeBase}/profile/${encodeURIComponent(String(userId))}`;
}
