# Circle Production AAB Setup Guide

## 🏗️ Production Build Configuration

### 1. Keystore Setup
```bash
# Generate release keystore (one-time setup)
cd android/app
keytool -genkeypair -v -keystore circle-release.keystore -alias circle-key -keyalg RSA -keysize 2048 -validity 10000
```

**Keystore Details:**
- **File:** `android/app/circle-release.keystore`
- **Alias:** `circle-key`
- **Password:** (set during creation)

### 2. Google Maps API Configuration

**Get Release SHA-1:**
```bash
keytool -list -v -keystore android/app/circle-release.keystore -alias circle-key
```

**Add to Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → APIs & Services → Credentials
3. Click your API key → Application restrictions
4. Add Android app:
   - **Package name:** `com.orincore.Circle`
   - **SHA-1 fingerprint:** (from above command)

### 3. Firebase Configuration
Ensure `android/app/google-services.json` contains client for `com.orincore.Circle`

### 4. Build Production AAB

**Option A: Using Script**
```bash
chmod +x build-production-aab.sh
./build-production-aab.sh
```

**Option B: Manual Build**
```bash
cd android
export CIRCLE_UPLOAD_STORE_FILE="circle-release.keystore"
export CIRCLE_UPLOAD_STORE_PASSWORD="your_password"
export CIRCLE_UPLOAD_KEY_ALIAS="circle-key"
export CIRCLE_UPLOAD_KEY_PASSWORD="your_password"

./gradlew clean
./gradlew bundleRelease
```

**AAB Location:** `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Play Store Upload

1. **Internal Testing First:**
   - Upload AAB to internal track
   - Add test users
   - Verify all features work

2. **Production Release:**
   - Create production release
   - Upload AAB
   - Add release notes

### 6. Version Information
- **Version Code:** 26
- **Version Name:** 1.0.4
- **Package Name:** `com.orincore.Circle`

### 7. Security Checklist
- ✅ Release keystore generated
- ✅ Google Maps API key restricted
- ✅ Firebase properly configured
- ✅ No debug code in production
- ✅ Proper error handling added
- ✅ Minification enabled

### 8. Testing Checklist
- [ ] Location search works
- [ ] No crashes on all screens
- [ ] Authentication flow
- [ ] Chat functionality
- [ ] Profile features
- [ ] Notifications
- [ ] In-app purchases (if applicable)

### 9. Post-Build Steps
1. Test AAB on multiple devices
2. Check app size and performance
3. Verify Google Maps works with release key
4. Test all critical user flows
5. Upload to Play Console internal track

## 🔧 Troubleshooting

**Maps not working:** Check SHA-1 in Google Cloud Console
**Firebase errors:** Verify package name in google-services.json
**Build fails:** Check keystore path and passwords
**App crashes:** Check logcat for specific errors

## 📱 APK Testing (Optional)
```bash
# Generate APKs from AAB for local testing
bundletool build-apks --bundle=app-release.aab --output=app.apks
bundletool install-apks --apks=app.apks
```
