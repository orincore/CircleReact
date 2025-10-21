# Build AAB Locally for Play Store Deployment

This guide explains how to build an Android App Bundle (AAB) locally for Play Store submission.

## Prerequisites

1. **Java Development Kit (JDK)** - Version 17 or higher
2. **Android SDK** - Installed via Android Studio
3. **Keystore File** - For signing your release build

---

## Step 1: Generate a Keystore (First Time Only)

If you don't have a keystore, generate one:

```bash
cd android/app

keytool -genkeypair -v -storetype PKCS12 -keystore circle-release-key.keystore -alias circle-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important:** 
- Save the passwords securely
- Backup the keystore file - you cannot update your app without it
- Never commit the keystore to version control

---

## Step 2: Configure Keystore Credentials

Edit `android/gradle.properties` and update these values:

```properties
CIRCLE_UPLOAD_STORE_FILE=circle-release-key.keystore
CIRCLE_UPLOAD_KEY_ALIAS=circle-key-alias
CIRCLE_UPLOAD_STORE_PASSWORD=your_actual_keystore_password
CIRCLE_UPLOAD_KEY_PASSWORD=your_actual_key_password
```

**Security Note:** The `android/gradle.properties` file is gitignored to prevent credential leaks.

---

## Step 3: Build the AAB

### Option A: Using Expo CLI (Recommended)

```bash
# Navigate to project root
cd "c:\Mac\Home\Desktop\circle prj\Circle"

# Clean cache
npx expo start --clear

# Build AAB
npx expo run:android --variant release
```

### Option B: Using Gradle Directly

```bash
# Navigate to android directory
cd android

# Clean previous builds
./gradlew clean

# Build AAB
./gradlew bundleRelease

# On Windows use:
gradlew bundleRelease
```

---

## Step 4: Locate Your AAB File

The AAB will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Step 5: Test the AAB (Optional)

Before uploading to Play Store, test locally:

```bash
# Install bundletool
# Download from: https://github.com/google/bundletool/releases

# Generate APKs from AAB
java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks --mode=universal

# Install on device
java -jar bundletool.jar install-apks --apks=app.apks
```

---

## Step 6: Upload to Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **Circle**
3. Navigate to **Production** → **Releases**
4. Click **Create new release**
5. Upload the `app-release.aab` file
6. Fill in release notes
7. Review and rollout

---

## Troubleshooting

### Build Fails with "Keystore not found"

- Ensure the keystore file path in `gradle.properties` is correct
- The path is relative to `android/app/` directory

### Build Fails with "Execution failed for task ':app:bundleRelease'"

```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew bundleRelease --stacktrace
```

### "Duplicate resources" error

- Clear build cache: `rm -rf android/app/build`
- Clear node modules: `rm -rf node_modules && npm install`

### Version Code Conflicts

- Update `versionCode` in `android/app/build.gradle`
- Current version: 24
- Each Play Store release needs a higher version code

---

## Build Configuration Summary

### Current Settings:
- **Package Name:** com.orincore.Circle
- **Version Code:** 24
- **Version Name:** 1.0.3
- **Min SDK:** 24
- **Target SDK:** 35
- **Build Type:** AAB (Android App Bundle)
- **Signing:** Release keystore
- **Optimization:** Enabled (R8, ProGuard)
- **MultiDex:** Enabled

---

## Important Notes

1. **Same Fingerprint:** Using the same keystore ensures consistent app fingerprint for updates
2. **Backup Keystore:** Store your keystore and passwords in a secure location
3. **Version Management:** Increment versionCode for each Play Store release
4. **Testing:** Always test the AAB before uploading to production

---

## Quick Build Commands

```bash
# Full clean build
cd "c:\Mac\Home\Desktop\circle prj\Circle"
npx expo start --clear
cd android
gradlew clean bundleRelease

# AAB location
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## Next Steps After Build

1. ✅ AAB file generated successfully
2. ✅ Test on physical device (optional)
3. ✅ Upload to Play Store Console
4. ✅ Submit for review
5. ✅ Monitor rollout and crash reports

---

**Need Help?** Check the [Android Developer Documentation](https://developer.android.com/studio/publish/app-signing)
