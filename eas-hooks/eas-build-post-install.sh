#!/bin/bash

# EAS Build Post-Install Hook
# Ensures AndroidX properties are set AFTER prebuild
# This is the FINAL fix for AndroidX build errors

set -e

echo "🔧 EAS Post-Install: Ensuring AndroidX configuration..."

# Check if this is an Android build
if [ "$EAS_BUILD_PLATFORM" != "android" ]; then
    echo "ℹ️ Not an Android build, skipping AndroidX configuration"
    exit 0
fi

# Path to gradle.properties
GRADLE_PROPS="android/gradle.properties"

# AndroidX properties block
ANDROIDX_BLOCK='# CRITICAL: AndroidX Configuration - MUST be at the very top
# These properties are required for all AndroidX dependencies to work
android.useAndroidX=true
android.enableJetifier=true

# Suppress SDK version warnings
android.suppressUnsupportedCompileSdk=36

# R class optimizations
android.nonTransitiveRClass=true
android.nonFinalResIds=true

'

# Wait for prebuild to complete if android folder doesn't exist yet
if [ ! -d "android" ]; then
    echo "📦 Android folder not found, running prebuild first..."
    npx expo prebuild --platform android --clear
fi

# Now check for gradle.properties
if [ -f "$GRADLE_PROPS" ]; then
    echo "📝 Found gradle.properties, ensuring AndroidX is at the top..."
    
    # Check if AndroidX is already properly configured
    if grep -q "^android.useAndroidX=true" "$GRADLE_PROPS"; then
        echo "✅ AndroidX already configured"
    else
        echo "⚠️ AndroidX not found, adding it..."
        
        # Create temp file with AndroidX at top
        TEMP_FILE=$(mktemp)
        echo "$ANDROIDX_BLOCK" > "$TEMP_FILE"
        
        # Append existing content (excluding AndroidX lines)
        grep -v "^android.useAndroidX=" "$GRADLE_PROPS" 2>/dev/null | \
        grep -v "^android.enableJetifier=" 2>/dev/null | \
        grep -v "^android.suppressUnsupportedCompileSdk=" 2>/dev/null | \
        grep -v "^android.nonTransitiveRClass=" 2>/dev/null | \
        grep -v "^android.nonFinalResIds=" 2>/dev/null | \
        grep -v "^# CRITICAL: AndroidX" 2>/dev/null | \
        grep -v "^# These properties are required" 2>/dev/null | \
        grep -v "^# Suppress SDK version" 2>/dev/null | \
        grep -v "^# R class optimizations" 2>/dev/null >> "$TEMP_FILE" || true
        
        # Replace original file
        mv "$TEMP_FILE" "$GRADLE_PROPS"
        echo "✅ AndroidX properties added to gradle.properties"
    fi
else
    echo "📝 Creating gradle.properties with AndroidX configuration..."
    mkdir -p android
    echo "$ANDROIDX_BLOCK" > "$GRADLE_PROPS"
    
    # Add other essential properties
    cat >> "$GRADLE_PROPS" << 'EOF'

# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true

# React Native settings
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=true
hermesEnabled=true

# SDK versions
android.minSdkVersion=24
android.compileSdkVersion=35
android.targetSdkVersion=35
android.ndkVersion=27.0.12077973
EOF
fi

echo ""
echo "📋 Verifying gradle.properties (first 15 lines):"
head -15 "$GRADLE_PROPS"

echo ""
echo "🔍 Verifying AndroidX properties:"
if grep -q "^android.useAndroidX=true" "$GRADLE_PROPS"; then
    echo "✅ android.useAndroidX=true - FOUND"
else
    echo "❌ android.useAndroidX=true - NOT FOUND"
    exit 1
fi

if grep -q "^android.enableJetifier=true" "$GRADLE_PROPS"; then
    echo "✅ android.enableJetifier=true - FOUND"
else
    echo "❌ android.enableJetifier=true - NOT FOUND"
    exit 1
fi

echo ""
echo "✅ EAS Post-Install: AndroidX configuration complete and verified!"