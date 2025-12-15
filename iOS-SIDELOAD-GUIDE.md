# iOS Sideloading Guide for Circle App

This guide will help you build and sideload the Circle app on your iPhone using Sideloadly.

## Prerequisites

1. **macOS with Xcode** (for local builds)
2. **Sideloadly** - Download from [sideloadly.io](https://sideloadly.io/)
3. **Apple ID** (free Apple Developer account works)
4. **iOS Device** with iOS 12.0 or later

## Method 1: EAS Build (Recommended)

EAS Build is the most reliable method for Expo projects as it handles all dependencies and compilation in a controlled environment.

### Steps:

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Run the EAS build script**:
   ```bash
   ./build-ios-eas.sh
   ```

3. **Wait for build completion**:
   - You'll receive an email when the build is complete
   - Or check the build status at: https://expo.dev/

4. **Download the IPA** from the provided link

5. **Sideload with Sideloadly**:
   - Open Sideloadly
   - Connect your iPhone via USB
   - Drag the downloaded IPA into Sideloadly
   - Enter your Apple ID credentials
   - Wait for installation to complete

## Method 2: Local Build

If you prefer to build locally, use the improved build script:

### Steps:

1. **Run the local build script**:
   ```bash
   ./build-ios-ipa.sh
   ```

2. **If build fails**, try these troubleshooting steps:
   - Clean derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
   - Update pods: `cd ios && pod install --repo-update`
   - Restart Xcode and try again

3. **Sideload the generated IPA** (located in `build/Circle.ipa`)

## Troubleshooting

### Common Issues:

1. **Swift Compilation Errors**:
   - Use EAS Build instead of local build
   - Clean derived data and rebuild

2. **Code Signing Errors**:
   - Ensure you're using the unsigned build profiles
   - Check that CODE_SIGNING_REQUIRED=NO is set

3. **Sideloadly Installation Fails**:
   - Make sure your device is trusted on your computer
   - Try a different Apple ID
   - Ensure iOS version compatibility

4. **App Crashes on Launch**:
   - Check that all environment variables are properly set
   - Verify the backend API is accessible from your device

### Build Profiles Available:

- `preview` - Unsigned IPA for sideloading (recommended)
- `sideload` - Specifically configured for sideloading
- `ios-simulator` - For iOS Simulator only
- `production` - For App Store distribution

## Environment Configuration

Make sure your `.env` file contains the correct API endpoints:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
EXPO_PUBLIC_WS_BASE_URL=wss://your-websocket-url.com
EXPO_PUBLIC_FRONTEND_URL=https://your-frontend-url.com
```

## Device Trust Setup

After installing via Sideloadly:

1. Go to **Settings > General > VPN & Device Management**
2. Find your Apple ID under "Developer App"
3. Tap **Trust "[Your Apple ID]"**
4. Confirm by tapping **Trust**

## App Refresh

Sideloaded apps need to be refreshed every 7 days (free Apple ID) or 365 days (paid Apple Developer account). You can:

1. Re-sideload the same IPA
2. Use tools like AltStore for automatic refresh
3. Get a paid Apple Developer account for longer validity

## Support

If you encounter issues:

1. Check the build logs for specific error messages
2. Ensure all dependencies are up to date
3. Try the EAS Build method if local builds fail
4. Verify your device and iOS version compatibility

## Files Created/Modified:

- `build-ios-ipa.sh` - Improved local build script
- `build-ios-eas.sh` - EAS build script (recommended)
- `eas.json` - Updated with sideload profile
- `iOS-SIDELOAD-GUIDE.md` - This guide

Choose the method that works best for your setup. EAS Build is generally more reliable for complex Expo projects like this one.