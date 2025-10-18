# EAS Build Fixes

## Issues and Solutions

### Issue 1: Package Lock File Out of Sync
**Error**: `Invalid: lock file's expo-media-library@17.0.6 does not satisfy expo-media-library@18.2.0`

**Solution**: Update package-lock.json
```bash
cd Circle
npm install
git add package-lock.json
git commit -m "Update package-lock.json for expo-media-library"
git push
```

---

### Issue 2: Missing Android Folder
**Error**: `ENOENT: no such file or directory, open '/home/expo/workingdir/build/android/gradlew'`

**Root Cause**: 
- `/android` was in `.gitignore`
- EAS Build expects the android folder to exist
- You're NOT using pure Prebuild (you have custom native code)

**Solution**: Remove `/android` from `.gitignore` and commit the folder

```bash
cd Circle

# Remove /android from .gitignore (already done)

# Add android folder to git
git add android/
git commit -m "Add android folder for EAS Build"
git push
```

---

## Complete Fix Steps

### Step 1: Update Dependencies
```bash
cd Circle
npm install
```

This will:
- Install expo-media-library@18.2.0
- Update package-lock.json
- Sync all dependencies

### Step 2: Commit Changes
```bash
git add package.json package-lock.json .gitignore android/
git commit -m "Fix: Update dependencies and add android folder for EAS Build"
git push
```

### Step 3: Rebuild on EAS
```bash
eas build --profile production --platform android
```

---

## Why This Happened

### Package Lock Issue
- You updated `package.json` to use expo-media-library@18.2.0
- But `package-lock.json` still had 17.0.6
- EAS Build uses `npm ci` which requires exact sync
- Solution: Run `npm install` to update lock file

### Android Folder Issue
- You added `/android` to `.gitignore` thinking you're using pure Prebuild
- But your project has custom native code in the android folder
- EAS Build needs the android folder to build
- Solution: Don't gitignore android folder, commit it

---

## Understanding Your Setup

Your project is **NOT pure Prebuild/CNG** because:
1. You have custom native code modifications
2. You have `android/` folder with custom configurations
3. EAS Build expects the native folders

**Pure Prebuild** means:
- No android/ios folders in git
- Everything configured via app.json
- Folders generated on each build

**Your Setup** (Hybrid):
- Android folder with custom code
- Some config in app.json
- Native folders committed to git

---

## Correct .gitignore

```gitignore
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.meta-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
._*
*.pem

# local env files
.env
.env*.local

# typescript
*.tsbuildinfo

app-example

# generated native folders - ONLY gitignore /ios if you don't use it
/ios
.vercel
```

**Note**: We removed `/android` from gitignore because you need it for builds.

---

## Quick Commands Reference

### Update Dependencies
```bash
npm install
```

### Check What Changed
```bash
git status
git diff package-lock.json
```

### Commit Everything
```bash
git add .
git commit -m "Fix EAS Build: Update dependencies and include android folder"
git push
```

### Trigger New Build
```bash
eas build --profile production --platform android --clear-cache
```

The `--clear-cache` flag ensures EAS starts fresh.

---

## Verification

After pushing changes, your next EAS Build should:
1. ✅ Find package-lock.json in sync with package.json
2. ✅ Find android/gradlew file
3. ✅ Build successfully

---

## If Build Still Fails

### Clear EAS Cache
```bash
eas build --profile production --platform android --clear-cache
```

### Check Build Logs
Look for:
- "Installing dependencies" - should succeed
- "Running gradlew" - should find the file
- Any other errors

### Verify Files Are Committed
```bash
git ls-files | grep -E "(package-lock|android/gradlew)"
```

Should show:
- package-lock.json
- android/gradlew

---

**Status**: Ready to fix
**Action Required**: Run npm install, commit changes, push, and rebuild
