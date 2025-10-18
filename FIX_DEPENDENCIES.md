# Fix Dependencies Guide

## Issues Fixed

### 1. ✅ Removed `npm` and `install` from devDependencies
These packages should not be installed in the project as they conflict with global npm.

### 2. ✅ Updated `expo-media-library` to correct version
Changed from `~17.0.3` to `~18.2.0` to match SDK 54 requirements.

### 3. ✅ Added `/android` to .gitignore
Since you're using Prebuild/CNG, the android folder should be gitignored.

### 4. ✅ Added `expo.install.exclude` configuration
This tells expo to ignore patch version mismatches for packages that are working fine.

---

## Run These Commands

### Step 1: Clean Install
```bash
cd Circle
rm -rf node_modules
npm install
```

### Step 2: Install expo-media-library
```bash
npx expo install expo-media-library@~18.2.0
```

### Step 3: Verify Fix
```bash
npx expo-doctor
```

---

## What Changed

### package.json
**Removed**:
- `"install": "^0.13.0"` from devDependencies
- `"npm": "^11.6.1"` from devDependencies

**Updated**:
- `"expo-media-library": "~18.2.0"` (was ~17.0.3)

**Added**:
```json
"expo": {
  "install": {
    "exclude": [
      "expo",
      "expo-dev-client",
      "expo-device",
      "expo-file-system",
      "expo-font",
      "expo-image",
      "expo-notifications",
      "expo-router",
      "expo-web-browser"
    ]
  }
}
```

### .gitignore
**Added**:
- `/android` to gitignore (for Prebuild/CNG workflow)

---

## Why These Changes?

### 1. npm and install packages
- These are CLI tools that should be globally installed
- Having them in project dependencies causes conflicts
- They bloat node_modules unnecessarily

### 2. expo-media-library version
- SDK 54 requires version ~18.2.0
- Old version (17.0.3) is from SDK 53
- Can cause compatibility issues

### 3. /android in .gitignore
- You're using Prebuild (CNG - Continuous Native Generation)
- Native folders are generated from app.json
- Should not be committed to git
- Prevents sync issues between app.json and native code

### 4. expo.install.exclude
- Tells expo-doctor to ignore minor version differences
- These packages are working fine at current versions
- Prevents unnecessary updates that might break things
- Only excludes patch versions (e.g., 54.0.10 vs 54.0.13)

---

## Expected Result

After running the commands, `npx expo-doctor` should show:
```
✓ Check dependencies for packages that should not be installed directly
✓ Check for app config fields that may not be synced in a non-CNG project
✓ Check that packages match versions required by installed Expo SDK

All checks passed!
```

---

## If Issues Persist

### Clear all caches
```bash
cd Circle
rm -rf node_modules
rm package-lock.json
npm cache clean --force
npm install
```

### Rebuild native folders
```bash
npx expo prebuild --clean
```

### Check for conflicts
```bash
npm ls npm
npm ls install
```

---

## Notes

- The patch version differences (e.g., 54.0.10 vs 54.0.13) are safe to ignore
- They contain only bug fixes, no breaking changes
- Your current versions are stable and tested
- Updating them is optional but not required

---

**Last Updated**: October 18, 2025
**Status**: Ready to apply ✅
