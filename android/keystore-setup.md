# Circle App - Production Keystore Setup

## Required Keystore Information

Your app needs to be signed with the production keystore that has this SHA1 fingerprint:
```
SHA1: 98:FA:79:41:FE:50:74:05:CE:E5:FE:8E:4A:98:BF:9F:CE:52:D2:EA
```

## Setup Instructions

### 1. Locate Your Production Keystore

Find the `.jks` or `.keystore` file that was used to sign your app initially. This file should have the SHA1 fingerprint mentioned above.

**To verify the keystore fingerprint:**
```bash
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-key-alias
```

### 2. Copy Keystore to Android Directory

Copy your production keystore file to:
```
android/app/circle-release.keystore
```

### 3. Configure gradle.properties

Add these lines to `android/gradle.properties` (create it if it doesn't exist):

```properties
# Keystore credentials for release builds
CIRCLE_UPLOAD_STORE_FILE=circle-release.keystore
CIRCLE_UPLOAD_KEY_ALIAS=your-key-alias
CIRCLE_UPLOAD_STORE_PASSWORD=your-store-password
CIRCLE_UPLOAD_KEY_PASSWORD=your-key-password
```

**Replace with your actual values:**
- `your-key-alias`: The alias name used when creating the keystore
- `your-store-password`: The keystore password
- `your-key-password`: The key password

### 4. Secure Your Keystore

**IMPORTANT:** Never commit these files to git:
- ✅ `gradle.properties` is already in `.gitignore`
- ✅ Add `*.keystore` and `*.jks` to `.gitignore` if not already there

### 5. Build Release Bundle

After configuration, build your release bundle:

```bash
cd android
./gradlew bundleRelease
```

The signed bundle will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### If you don't have the original keystore:

**WARNING:** If you've lost the original keystore with SHA1 `98:FA:79:41:FE:50:74:05:CE:E5:FE:8E:4A:98:BF:9F:CE:52:D2:EA`, you have two options:

1. **Search for it:** Check:
   - Your backup drives
   - CI/CD systems (GitHub Actions, Bitbucket, etc.)
   - Previous development machines
   - Cloud storage (Google Drive, Dropbox, etc.)

2. **Contact Google Play Support:** If truly lost, you'll need to:
   - Contact Google Play Console support
   - Request to reset your signing key
   - This may require creating a new app listing

### Verify the signed bundle:

After building, verify the signature:
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

Check the SHA1 matches:
```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```

## Current Issue

You uploaded a bundle signed with:
```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

But Google Play expects:
```
SHA1: 98:FA:79:41:FE:50:74:05:CE:E5:FE:8E:4A:98:BF:9F:CE:52:D2:EA
```

This means you're using the wrong keystore (likely the debug keystore).
