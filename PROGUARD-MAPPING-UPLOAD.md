# ProGuard/R8 Mapping File Upload Guide

## ✅ Configuration Applied

R8 code shrinking and obfuscation is now enabled for release builds. This will:
- ✅ Reduce app size significantly
- ✅ Obfuscate code for security
- ✅ Generate mapping files for crash deobfuscation

## Changes Made

### 1. Enabled R8 Minification (build.gradle line 69)
```gradle
def enableMinifyInReleaseBuilds = true  // Changed from false
```

### 2. Updated ProGuard Rules (proguard-rules.pro)
Added comprehensive rules for:
- React Native & Hermes
- Expo modules
- Google Play Services & Maps
- Firebase
- AdMob
- Billing Library
- Networking libraries

## Build Your App

```bash
cd android
./gradlew bundleRelease
```

## Locate the Mapping File

After building, the mapping file will be at:
```
android/app/build/outputs/mapping/release/mapping.txt
```

## Upload to Google Play Console

### Method 1: Manual Upload (Current Release)

1. Go to: https://play.google.com/console/
2. Select your app: **Circle**
3. Navigate to: **Release → Production → [Your Release]**
4. Scroll to **App bundles**
5. Click on your uploaded bundle
6. Find **Deobfuscation files** section
7. Click **Upload** next to "ProGuard mapping file"
8. Select: `android/app/build/outputs/mapping/release/mapping.txt`
9. Click **Save**

### Method 2: Automated Upload (Future Releases)

For future releases, you can automate this using Gradle Play Publisher or similar tools.

## Verify Upload

After uploading:
1. Go to **Release → Production → [Your Release]**
2. Check that "Deobfuscation file" shows ✓ (checkmark)
3. Crashes will now show deobfuscated stack traces

## Important Notes

### Always Keep Mapping Files

⚠️ **CRITICAL**: Save every mapping file for every release!

```bash
# Create a mappings directory
mkdir -p mappings

# Copy mapping file after each build
cp android/app/build/outputs/mapping/release/mapping.txt \
   mappings/mapping-v1.0.9-build31.txt
```

**Why?** You need the exact mapping file to deobfuscate crashes for that specific version.

### Mapping File Naming Convention

Use a clear naming pattern:
```
mapping-v{versionName}-build{versionCode}.txt

Examples:
- mapping-v1.0.9-build31.txt
- mapping-v1.1.0-build32.txt
```

### Backup Strategy

Store mapping files in:
- ✅ Secure cloud storage (Google Drive, S3, etc.)
- ✅ Version control (separate private repo)
- ✅ CI/CD artifacts
- ❌ Never lose these files!

## App Size Reduction

With R8 enabled, expect:
- **30-50% reduction** in APK/AAB size
- Faster downloads for users
- Better performance

## Troubleshooting

### Build Fails After Enabling R8

If you get errors like "class not found" or crashes:

1. Check ProGuard rules in `proguard-rules.pro`
2. Add keep rules for the affected classes:
   ```proguard
   -keep class com.yourpackage.YourClass { *; }
   ```

### Crashes After Release

If users experience crashes:

1. Go to: Play Console → **Quality → Crashes & ANRs**
2. View crash reports (will be deobfuscated automatically)
3. If not deobfuscated, verify mapping file was uploaded

### Missing Mapping File

If you forgot to save the mapping file:
- You **cannot** deobfuscate crashes for that version
- Always rebuild from the exact same code to regenerate
- This is why backups are critical!

## Build Script for Releases

Create a script to automate the process:

**build-release.sh:**
```bash
#!/bin/bash

# Get version from build.gradle
VERSION_NAME=$(grep "versionName" android/app/build.gradle | awk '{print $2}' | tr -d '"')
VERSION_CODE=$(grep "versionCode" android/app/build.gradle | awk '{print $2}')

echo "Building version $VERSION_NAME (build $VERSION_CODE)"

# Clean and build
cd android
./gradlew clean bundleRelease

# Copy mapping file
mkdir -p ../mappings
cp app/build/outputs/mapping/release/mapping.txt \
   ../mappings/mapping-v${VERSION_NAME}-build${VERSION_CODE}.txt

echo "✅ Build complete!"
echo "📦 Bundle: android/app/build/outputs/bundle/release/app-release.aab"
echo "🗺️  Mapping: mappings/mapping-v${VERSION_NAME}-build${VERSION_CODE}.txt"
echo ""
echo "Next steps:"
echo "1. Upload app-release.aab to Play Console"
echo "2. Upload mapping file to Play Console"
echo "3. Backup mapping file to secure storage"
```

## Current Status

- ✅ R8 minification enabled
- ✅ ProGuard rules configured
- ✅ Ready to build
- ⏳ Build release bundle
- ⏳ Upload mapping file to Play Console

## Next Steps

1. **Build release:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. **Save mapping file:**
   ```bash
   cp android/app/build/outputs/mapping/release/mapping.txt \
      mappings/mapping-v1.0.9-build31.txt
   ```

3. **Upload to Play Console:**
   - Upload AAB
   - Upload mapping.txt

4. **Backup mapping file** to secure storage

---

**Remember**: Every release needs its mapping file uploaded to Play Console!
