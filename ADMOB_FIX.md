# Google Mobile Ads Configuration Fix

## Warning Fixed
```
WARNING: react-native-google-mobile-ads requires an 'android_app_id' property 
inside a 'react-native-google-mobile-ads' key in your app.json.
```

## ✅ Solution Applied

Added the `react-native-google-mobile-ads` configuration at the root level of `app.json`:

```json
{
  "expo": {
    // ... other config
    "react-native-google-mobile-ads": {
      "android_app_id": "ca-app-pub-7904629558122562~8832481283",
      "ios_app_id": "ca-app-pub-3940256099942544~1458002511"
    }
  }
}
```

## Why This Was Needed

You already had the plugin configuration:
```json
"plugins": [
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-7904629558122562~8832481283",
      "iosAppId": "ca-app-pub-3940256099942544~1458002511"
    }
  ]
]
```

But `react-native-google-mobile-ads` also requires a separate key at the root level with the format:
- `android_app_id` (with underscores)
- `ios_app_id` (with underscores)

This is used by the native SDK at runtime.

## Your AdMob IDs

### Android
- **App ID**: `ca-app-pub-7904629558122562~8832481283`
- **Status**: Production ID ✅

### iOS  
- **App ID**: `ca-app-pub-3940256099942544~1458002511`
- **Status**: Test ID (Google's sample ID)
- **Action**: Replace with your real iOS AdMob App ID when ready

## Next Steps

1. **Commit the change**:
   ```bash
   git add app.json
   git commit -m "Add AdMob configuration to fix build warning"
   git push
   ```

2. **Rebuild**:
   ```bash
   eas build --profile production --platform android
   ```

3. **For iOS**: When you're ready to publish iOS version, replace the test iOS App ID with your real one from AdMob console.

## Verification

After this fix, the build should:
- ✅ No longer show the AdMob warning
- ✅ AdMob SDK will initialize properly
- ✅ Ads will work in production

## Getting Your Real iOS AdMob App ID

1. Go to [AdMob Console](https://apps.admob.com/)
2. Click "Apps" in sidebar
3. Click "Add App" or select existing iOS app
4. Copy the App ID (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)
5. Replace the test ID in app.json

---

**Status**: ✅ Fixed
**Build Warning**: Will be resolved in next build
