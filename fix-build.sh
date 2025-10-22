#!/bin/bash

echo "🔧 Fixing React Native build issues..."

# Navigate to project root
cd ~/Desktop/circle\ prj/Circle

# Step 1: Clean everything
echo "🧹 Cleaning build artifacts..."
rm -rf android/.gradle
rm -rf android/app/build
rm -rf android/app/.cxx
rm -rf android/build
rm -rf node_modules/.cache
rm -rf .expo

# Step 2: Clean Gradle cache
echo "🧹 Cleaning Gradle cache..."
cd android
./gradlew clean --no-daemon
cd ..

# Step 3: Generate codegen files
echo "📦 Generating codegen files..."
npx expo prebuild --clean --no-install

# Step 4: Build debug APK
echo "🔨 Building debug APK..."
cd android
./gradlew assembleDebug --no-daemon

echo "✅ Build complete!"
echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
