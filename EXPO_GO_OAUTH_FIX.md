# Expo Go OAuth Fix for Physical iOS Device

## The Problem
Physical iOS devices with Expo Go require specific redirect URIs that are different from simulators.

## Solution: Add ALL These Redirect URIs to Google Console

Go to your **Web OAuth Client** (`929576819205-t5h24c8t7uhe88oevldpgtfuf5mu0g4v.apps.googleusercontent.com`) and add ALL of these redirect URIs:

### Required Redirect URIs:
```
https://auth.expo.io/@orincore/Circle
https://auth.expo.io/@anonymous/Circle
https://auth.expo.io/*
exp://localhost:8081
exp://127.0.0.1:8081
```

## Steps:
1. **Go to**: https://console.cloud.google.com/
2. **Navigate to**: APIs & Services → Credentials
3. **Find your Web OAuth client**: `929576819205-t5h24c8t7uhe88oevldpgtfuf5mu0g4v.apps.googleusercontent.com`
4. **Add ALL the redirect URIs above**
5. **Save**

## Why Multiple URIs?
- `https://auth.expo.io/@orincore/Circle` - Standard Expo Go
- `https://auth.expo.io/@anonymous/Circle` - Anonymous Expo projects
- `https://auth.expo.io/*` - Wildcard for any Expo project
- `exp://localhost:8081` - Local development
- `exp://127.0.0.1:8081` - Alternative local development

## Test After Adding:
1. **Wait 5 minutes** for Google to propagate
2. **Restart Expo**: `npx expo start -c`
3. **Try Google sign-in on physical device**

This should resolve the redirect_uri_mismatch error for physical iOS devices with Expo Go.
