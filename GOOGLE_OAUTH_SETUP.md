# Google OAuth Setup Guide

## Issue Fixed
The "Error 400: invalid_request" was caused by incorrect redirect URI configuration. This guide explains the fix and proper setup.

## Root Cause
1. **Incorrect Redirect URI**: The app was generating development URLs (`exp://192.168.0.125:8081`) instead of proper redirect URIs
2. **Missing Scheme Configuration**: The app's custom scheme wasn't being used properly
3. **Google Console Mismatch**: Redirect URIs in Google Console didn't match generated URIs

## Changes Made

### 1. Updated GoogleSignInButton.jsx
- Fixed redirect URI to use custom scheme `circle://`
- Use Expo proxy only in development mode
- Added proper environment-based configuration

### 2. Updated app.json
- Confirmed custom scheme `circle` is configured
- Note: `expo-auth-session` doesn't require a plugin entry

## Google Console Configuration

You need to configure these redirect URIs in your Google Cloud Console:

### For Development (Expo Go)
```
https://auth.expo.io/@orincore/Circle
```

### For Production (Standalone App)
```
circle://
```

### For Web
```
https://circle.orincore.com
https://localhost:8081
```

## Steps to Configure Google Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Credentials"
4. Click on your OAuth 2.0 Client ID
5. Add the redirect URIs listed above to "Authorized redirect URIs"
6. Save the changes

## Environment Variables
Ensure these are set in your `.env` file:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=929576819205-qp5l4n87d3g647nrac87jtnfbdq07c2m.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=929576819205-s8scnmqud2a9n5beaj7o7fs3svvqp6t7.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=929576819205-t5h24c8t7uhe88oevldpgtfuf5mu0g4v.apps.googleusercontent.com
```

## Testing
1. Clear app cache/data
2. Restart the development server
3. Test Google sign-in
4. Check console logs for the redirect URI being used

## Troubleshooting
- If still getting errors, check the console logs for the actual redirect URI
- Ensure the redirect URI in Google Console exactly matches what's logged
- For Expo Go, the redirect URI format is: `https://auth.expo.io/@username/slug`
- For standalone apps, use your custom scheme: `circle://`
