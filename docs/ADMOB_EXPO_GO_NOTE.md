# AdMob Integration - Smart Auto-Detection

## ✅ Automatic Expo Go Detection

The AdMob integration now **automatically detects** whether it's running in Expo Go or a development/production build and enables/disables ads accordingly.

**No manual code changes needed!**

## Why Ads Are Commented Out

**Expo Go Limitation:**
- Expo Go is a sandbox app that only supports a limited set of native modules
- `react-native-google-mobile-ads` requires custom native code
- Custom native modules CANNOT run in Expo Go

**Current Status:**
- ✅ All ad code is written and ready
- ✅ Configuration is complete
- ✅ Smart wrapper automatically detects environment
- ✅ **Expo Go:** Ads disabled automatically (no errors)
- ✅ **Development Build:** Ads enabled automatically
- ✅ **Production Build:** Ads enabled automatically

## How It Works - Smart AdWrapper

### AdWrapper Component (`/components/ads/AdWrapper.jsx`)

The wrapper automatically detects the environment:

```javascript
import { getAdComponents } from "@/components/ads/AdWrapper";

const { BannerAd, useInterstitialAd, AdMobService } = getAdComponents();
```

**In Expo Go:**
- Returns `null` for BannerAd
- Returns mock functions for hooks
- No errors, no crashes
- Console: "🚫 AdMob disabled - Running in Expo Go"

**In Development/Production Build:**
- Returns real AdMob components
- Ads work normally
- Console: "✅ AdMob enabled - Running in development/production build"

### Files Using Smart Wrapper

### 1. Chat List Screen
**File:** `/app/secure/(tabs)/chat/index.jsx`
```javascript
import { getAdComponents } from "@/components/ads/AdWrapper";
const { BannerAd } = getAdComponents();

// Auto-disabled in Expo Go, enabled in builds
{BannerAd && shouldShowAds() && (
  <BannerAd placement="chat_list_bottom" />
)}
```

### 2. Profile Screen
**File:** `/app/secure/(tabs)/profile/index.jsx`
```javascript
import { getAdComponents } from "@/components/ads/AdWrapper";
const { BannerAd } = getAdComponents();

// Auto-disabled in Expo Go, enabled in builds
{BannerAd && shouldShowAds() && (
  <BannerAd placement="profile_bottom" />
)}
```

### 3. Match Screen
**File:** `/app/secure/(tabs)/match.jsx`
```javascript
import { getAdComponents } from "@/components/ads/AdWrapper";
const { useInterstitialAd, AdMobService } = getAdComponents();

const { showInterstitial } = useInterstitialAd('after_match');

// Auto-disabled in Expo Go, enabled in builds
AdMobService.incrementMatchCount();
if (shouldShowAds() && AdMobService.shouldShowAfterMatch()) {
  showInterstitial(() => {
    console.log('✅ Interstitial ad completed');
  });
}
```

## How to Enable Ads (2 Options)

### Option 1: EAS Cloud Build (Recommended - No Xcode Required)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

**Advantages:**
- ✅ No local Xcode/Android Studio setup needed
- ✅ Builds in the cloud
- ✅ Takes ~15-20 minutes
- ✅ Get a downloadable .ipa/.apk file

### Option 2: Local Development Build (Requires Xcode/Android Studio)

**Prerequisites:**
- Xcode installed (for iOS)
- Android Studio installed (for Android)
- CocoaPods installed

**Steps:**

1. **Fix Xcode path (macOS):**
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

2. **Fix encoding:**
```bash
echo 'export LANG=en_US.UTF-8' >> ~/.zshrc
source ~/.zshrc
```

3. **Prebuild and run:**
```bash
# Clean prebuild
npx expo prebuild --clean

# iOS
cd ios && pod install && cd ..
npx expo run:ios

# Android
npx expo run:android
```

## No Code Changes Needed!

The smart wrapper handles everything automatically:

**In Expo Go:**
- ✅ App runs without errors
- ✅ No ads shown
- ✅ Console shows: "🚫 AdMob disabled - Running in Expo Go"

**In Development/Production Build:**
- ✅ App runs with ads
- ✅ Ads display for free users
- ✅ Console shows: "✅ AdMob enabled - Running in development/production build"

**You don't need to change any code!** Just build and deploy.

## Testing Checklist

After creating development build and uncommenting code:

- [ ] App launches without errors
- [ ] Banner ad appears at bottom of chat list (free users only)
- [ ] Banner ad appears at bottom of profile (free users only)
- [ ] Interstitial ad shows after every 3 match passes
- [ ] Premium users see NO ads
- [ ] Test ads display correctly (using test IDs)

## Production Deployment

Before going to production:

1. **Get Real AdMob IDs:**
   - Create app in AdMob console
   - Create ad units (banner, interstitial, rewarded)
   - Copy ad unit IDs

2. **Update Environment Variables:**
   ```env
   EXPO_PUBLIC_ADMOB_IOS_BANNER=ca-app-pub-XXXXX/XXXXX
   EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL=ca-app-pub-XXXXX/XXXXX
   EXPO_PUBLIC_ADMOB_IOS_REWARDED=ca-app-pub-XXXXX/XXXXX
   EXPO_PUBLIC_ADMOB_ANDROID_BANNER=ca-app-pub-XXXXX/XXXXX
   EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL=ca-app-pub-XXXXX/XXXXX
   EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=ca-app-pub-XXXXX/XXXXX
   ```

3. **Update app.json:**
   ```json
   {
     "expo": {
       "plugins": [
         [
           "react-native-google-mobile-ads",
           {
             "androidAppId": "ca-app-pub-XXXXX~XXXXX",
             "iosAppId": "ca-app-pub-XXXXX~XXXXX"
           }
         ]
       ]
     }
   }
   ```

4. **Build for production:**
   ```bash
   eas build --platform all --profile production
   ```

## Summary

| Feature | Expo Go | Development Build | Production Build |
|---------|---------|-------------------|------------------|
| AdMob Ads | ❌ Not supported | ✅ Works with test IDs | ✅ Works with real IDs |
| Native Modules | ❌ Limited | ✅ Full support | ✅ Full support |
| Development Speed | ⚡ Instant | 🔄 Rebuild needed | 🔄 Rebuild needed |
| Use Case | Quick testing | Full feature testing | App Store release |

## Need Help?

- **AdMob Setup:** See `/docs/ADMOB_IMPLEMENTATION_GUIDE.md`
- **Strategy:** See `/docs/ADMOB_STRATEGY.md`
- **EAS Build:** https://docs.expo.dev/build/introduction/

---

**Current Status:** Ads are ready but disabled for Expo Go compatibility. Create a development build to enable and test ads.
