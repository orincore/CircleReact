# Build Debug APK Locally - Troubleshooting Guide

## Quick Build Commands

```bash
cd /Users/orincore/Desktop/circle\ prj/Circle

# Step 1: Clean everything
rm -rf node_modules/.cache
rm -rf android/app/build
rm -rf android/.gradle
rm -rf .expo

# Step 2: Clear Metro cache
npx expo start --clear

# Step 3: Build debug APK
cd android
./gradlew clean
./gradlew assembleDebug

# APK Location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## Install on Device

```bash
# Install via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or copy to device and install manually
```

---

## Common Crash Fixes

### 1. **Location Permission Crashes**

**Issue:** App crashes when accessing location features

**Fix:** Ensure permissions are requested properly

Check `app/secure/location.jsx` - add error boundaries:

```javascript
useEffect(() => {
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }
      // Continue with location logic
    } catch (error) {
      console.error('Location permission error:', error);
    }
  })();
}, []);
```

### 2. **Font Loading Crashes**

**Issue:** `Unable to download asset from url: Ionicons.ttf`

**Fix:** Preload fonts in `_layout.jsx`:

```javascript
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

const [fontsLoaded] = Font.useFonts({
  ...Ionicons.font,
});

if (!fontsLoaded) {
  return <ActivityIndicator />;
}
```

### 3. **Network Request Crashes**

**Issue:** App crashes on API calls

**Fix:** Add proper error handling:

```javascript
try {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error('Network error');
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error);
  Alert.alert('Error', 'Failed to load data');
}
```

### 4. **Null/Undefined Crashes**

**Issue:** Accessing properties of null/undefined

**Fix:** Add null checks:

```javascript
// Bad
const userName = user.profile.name;

// Good
const userName = user?.profile?.name ?? 'Unknown';
```

### 5. **Memory Leaks**

**Issue:** App crashes after using for a while

**Fix:** Clean up useEffect:

```javascript
useEffect(() => {
  let mounted = true;
  
  const fetchData = async () => {
    const data = await loadData();
    if (mounted) {
      setData(data);
    }
  };
  
  fetchData();
  
  return () => {
    mounted = false;
  };
}, []);
```

---

## Debug with Logcat

```bash
# View all logs
adb logcat

# Filter React Native logs
adb logcat | grep ReactNativeJS

# Filter crash logs
adb logcat | grep AndroidRuntime

# Clear logs and start fresh
adb logcat -c
adb logcat
```

---

## Enable Debug Mode

In `android/gradle.properties`, ensure:

```properties
# Debug settings
android.enableR8.fullMode=false
android.enableMinifyInReleaseBuilds=false
```

---

## Check Specific Crash Logs

After crash, run:

```bash
adb logcat -d > crash_log.txt
```

Then search for:
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `ReactNativeJS`
- `NullPointerException`

---

## Common Screens That Crash

### 1. Location Screen
- **Cause:** Permission not granted
- **Fix:** Add permission checks before accessing location

### 2. Match Screen  
- **Cause:** Null user data
- **Fix:** Add loading states and null checks

### 3. Chat Screen
- **Cause:** WebSocket connection fails
- **Fix:** Add connection error handling

### 4. Profile Screen
- **Cause:** Image loading fails
- **Fix:** Add fallback images

---

## Build Variants

```bash
# Debug (with logging)
./gradlew assembleDebug

# Release (optimized, no logging)
./gradlew assembleRelease

# Specific architecture
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

---

## Performance Monitoring

Add to your app:

```javascript
import { useEffect } from 'react';

// Track screen render time
useEffect(() => {
  const start = Date.now();
  return () => {
    console.log(`Screen rendered in ${Date.now() - start}ms`);
  };
}, []);
```

---

## Quick Fixes Checklist

- [ ] Clear all caches
- [ ] Check AndroidManifest.xml permissions
- [ ] Verify API endpoints are accessible
- [ ] Test with stable internet connection
- [ ] Check for null/undefined values
- [ ] Add try-catch blocks to async functions
- [ ] Verify all required environment variables
- [ ] Test location permissions
- [ ] Check WebSocket connection
- [ ] Verify image URLs are valid

---

## If App Still Crashes

1. **Get crash stack trace:**
   ```bash
   adb logcat -d | grep -A 50 "FATAL EXCEPTION"
   ```

2. **Check specific component:**
   - Comment out sections of code
   - Identify which component causes crash
   - Add error boundaries

3. **Test on different device:**
   - Some crashes are device-specific
   - Test on emulator vs physical device

4. **Rebuild from scratch:**
   ```bash
   cd android
   ./gradlew clean
   rm -rf ~/.gradle/caches
   ./gradlew assembleDebug
   ```

---

## Error Boundaries (React Native)

Add to crash-prone screens:

```javascript
import React from 'react';
import { View, Text, Button } from 'react-native';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Wrap your screens:

```javascript
<ErrorBoundary>
  <YourScreen />
</ErrorBoundary>
```
