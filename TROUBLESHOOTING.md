# iOS Build Troubleshooting Guide

## Current Situation

You've encountered the common issue where EAS Build requires Apple Developer credentials even for internal distribution. Since you don't have a paid Apple Developer account, we need to focus on local builds.

## Build Scripts Available

1. **`./build-ios-simple.sh`** - Recommended first try
2. **`./build-ios-ipa.sh`** - Original approach with more build flags
3. **`./build-ios-auto.sh`** - Tries local first, then guides through EAS

## Common Issues and Solutions

### 1. EAS Build Credential Errors

**Error:** "You have no team associated with your Apple account"

**Solution:** 
- EAS Build requires a paid Apple Developer account ($99/year)
- For free accounts, use local builds instead
- Consider upgrading to paid account for most reliable builds

### 2. Swift Compilation Errors (Local Builds)

**Error:** Swift compilation failures in EXUpdates or other modules

**Solutions:**
- Update Xcode to latest version
- Clean derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Update CocoaPods: `cd ios && pod install --repo-update`
- Try the simple build script: `./build-ios-simple.sh`

### 3. Code Signing Issues

**Error:** Code signing required even with unsigned flags

**Solutions:**
- Open project in Xcode and set up a development team (free)
- Go to Circle target > Signing & Capabilities > Team
- Select your Apple ID (free account works)
- This doesn't affect the final unsigned IPA

### 4. Missing Dependencies

**Error:** Module not found or linking errors

**Solutions:**
```bash
# Clean and reinstall everything
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/build
npm install
cd ios && pod install --repo-update
```

### 5. Xcode Version Issues

**Error:** Unsupported Xcode version or SDK issues

**Solutions:**
- Update Xcode from App Store
- Check iOS deployment target in project settings
- Ensure Xcode command line tools are installed: `xcode-select --install`

## Alternative Solutions

### Option 1: Use Development Build

Instead of creating an IPA, you can run the app directly on your device:

```bash
# Connect your iPhone and trust the computer
expo run:ios --device
```

This installs the app directly without needing Sideloadly.

### Option 2: Paid Apple Developer Account

For $99/year, you get:
- Reliable EAS builds that work consistently
- Apps valid for 365 days (vs 7 days with free account)
- Access to advanced iOS features
- Ability to distribute to TestFlight

### Option 3: Use Expo Go (Limited)

For development/testing only:
```bash
expo start
# Scan QR code with Expo Go app
```

Note: This won't work if your app uses custom native code.

## Recommended Approach

1. **First, try the simple build:**
   ```bash
   ./build-ios-simple.sh
   ```

2. **If it fails with Swift errors:**
   - Update Xcode to latest version
   - Clean everything and try again
   - Consider the paid Apple Developer account

3. **If you need a reliable solution:**
   - Get Apple Developer account ($99/year)
   - Use EAS Build for consistent results

## Success Indicators

**Local build successful if you see:**
- "Build successful!"
- IPA file created in `build/Circle.ipa`
- No critical errors in the build log

**Ready for sideloading when:**
- IPA file exists and is > 50MB
- Sideloadly can read the IPA without errors
- App installs and launches on device

## Getting Help

If builds continue to fail:

1. Check the exact error message
2. Try updating all tools (Xcode, CocoaPods, Node.js)
3. Consider the paid Apple Developer account for reliable builds
4. The development build approach (`expo run:ios --device`) often works when IPA builds fail

Remember: Complex React Native apps with many native dependencies (like yours) are notoriously difficult to build locally. The paid Apple Developer account + EAS Build combination is the most reliable solution.