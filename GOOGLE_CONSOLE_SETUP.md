# Google Console Setup - URGENT

## Add This Redirect URI to Google Console NOW:

```
https://auth.expo.io/@orincore/Circle
```

## Steps:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**
3. **Navigate to**: APIs & Services → Credentials
4. **Click on your OAuth 2.0 Client ID** (the one with your client IDs)
5. **Scroll to "Authorized redirect URIs"**
6. **Click "ADD URI"**
7. **Paste exactly**: `https://auth.expo.io/@orincore/Circle`
8. **Click SAVE**

## Current Client IDs (for reference):
- iOS: `929576819205-qp5l4n87d3g647nrac87jtnfbdq07c2m.apps.googleusercontent.com`
- Android: `929576819205-s8scnmqud2a9n5beaj7o7fs3svvqp6t7.apps.googleusercontent.com`
- Web: `929576819205-t5h24c8t7uhe88oevldpgtfuf5mu0g4v.apps.googleusercontent.com`

## After Adding the Redirect URI:

1. **Restart your Expo server**: `npx expo start -c`
2. **Test Google sign-in**
3. **Check console logs** - should now show: `https://auth.expo.io/@orincore/Circle`

The error will be fixed once you add this redirect URI to Google Console!
