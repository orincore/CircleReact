# Circle App - Production Build Instructions

## Version Information
- **App Version**: 1.0.1
- **Android Version Code**: 2
- **Package Name**: com.orincore.Circle

## Version Display Locations
The app version is now displayed in:
1. **Landing Page** - Footer section (desktop view)
2. **Settings Page** - Bottom of the page with copyright info

## Build Configuration

### EAS Build Profiles

#### 1. Production (AAB for Play Store)
```bash
eas build --platform android --profile production
```
- Builds: Android App Bundle (.aab)
- For: Google Play Store submission
- Auto-increments version code

#### 2. Production APK (Direct Distribution)
```bash
eas build --platform android --profile production-apk
```
- Builds: APK file (.apk)
- For: Direct distribution/testing
- Auto-increments version code

## Prerequisites

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo Account
```bash
eas login
```

### 3. Configure Credentials (First Time Only)
```bash
eas credentials
```
This will help you set up:
- Android Keystore
- Upload key
- Service account for Play Store

## Building for Production

### Step 1: Ensure Dependencies are Installed
```bash
cd /Users/orincore/Documents/circle\ prj/Circle
npm install
```

### Step 2: Build AAB for Play Store
```bash
eas build --platform android --profile production
```

### Step 3: Build APK for Testing/Distribution
```bash
eas build --platform android --profile production-apk
```

### Step 4: Monitor Build Progress
- Builds run on Expo's cloud servers
- You'll receive a link to monitor progress
- Build typically takes 10-20 minutes
- Download links will be provided when complete

## Submitting to Play Store

### Option 1: Manual Upload
1. Build the AAB using production profile
2. Download the .aab file from EAS
3. Upload to Google Play Console manually

### Option 2: Automated Submission (Requires Setup)
```bash
eas submit --platform android --profile production
```

## Version Management

### Updating Version for Next Release
1. Update version in `app.json`:
   ```json
   "version": "1.0.2"
   ```

2. Update version code in `app.json`:
   ```json
   "android": {
     "versionCode": 3
   }
   ```

3. Update version in `package.json`:
   ```json
   "version": "1.0.2"
   ```

Note: `versionCode` must increment with each Play Store release.

## Build Artifacts

After successful builds, you'll receive:
- **AAB File**: For Play Store submission (smaller download size for users)
- **APK File**: For direct installation and testing

## Troubleshooting

### Build Fails
- Check EAS build logs for specific errors
- Ensure all dependencies are compatible
- Verify Android permissions in app.json

### Version Conflicts
- Ensure versionCode is higher than previous Play Store version
- Version string should follow semantic versioning (X.Y.Z)

### Credentials Issues
- Run `eas credentials` to reconfigure
- Ensure you have proper Play Store access

## Important Notes

1. **Auto-increment**: Both profiles have `autoIncrement: true`, which automatically bumps the versionCode
2. **Build Type**: 
   - Production profile builds AAB (required for Play Store)
   - Production-apk profile builds APK (for testing/direct distribution)
3. **EAS Project ID**: c9234d97-8ff5-45bc-8f8f-8772ef0926a5

## Support

For build issues:
- Check EAS documentation: https://docs.expo.dev/build/introduction/
- Review build logs in EAS dashboard
- Contact ORINCORE Technologies support
