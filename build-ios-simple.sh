#!/bin/bash

# Simple iOS IPA Builder - Focuses on local build with better error handling
# This creates an unsigned IPA that can be sideloaded

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
BUILD_DIR="$PROJECT_DIR/build"

echo "🔧 Building Circle iOS App (Simple Local Build)..."
echo "📁 Project Directory: $PROJECT_DIR"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode not found. Please install Xcode from the App Store."
    exit 1
fi

if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods not found. Installing..."
    sudo gem install cocoapods
fi

# Clean everything thoroughly
echo "🧹 Cleaning build environment..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
rm -rf "$IOS_DIR/build"
rm -rf ~/Library/Developer/Xcode/DerivedData/Circle-*

# Update dependencies
echo "📦 Updating dependencies..."
cd "$IOS_DIR"
pod deintegrate || true
pod install --repo-update

cd "$PROJECT_DIR"

# Try building with Expo CLI first (simpler approach)
echo "🏗️  Attempting build with Expo CLI..."
if command -v expo &> /dev/null; then
    echo "Using Expo CLI to create local build..."
    
    # Export the iOS bundle first
    echo "📦 Exporting iOS bundle..."
    expo export --platform ios --output-dir "$BUILD_DIR/export"
    
    # Try to build using expo run:ios with specific flags
    echo "🔨 Building with expo run:ios..."
    expo run:ios --configuration Release --no-install --no-bundler || {
        echo "⚠️  Expo build failed, trying direct xcodebuild..."
    }
fi

# Fallback to direct xcodebuild
echo "🔨 Building with xcodebuild..."

# Use a more conservative xcodebuild approach
xcodebuild \
    -workspace "$IOS_DIR/Circle.xcworkspace" \
    -scheme "Circle" \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$BUILD_DIR/Circle.xcarchive" \
    archive \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    DEVELOPMENT_TEAM="" \
    PROVISIONING_PROFILE="" \
    ONLY_ACTIVE_ARCH=NO \
    EXCLUDED_ARCHS="" \
    VALID_ARCHS="arm64" \
    ARCHS="arm64" \
    -allowProvisioningUpdates \
    -quiet || {
    
    echo "❌ Build failed. Common issues and solutions:"
    echo ""
    echo "1. Swift compilation errors:"
    echo "   - This is common with complex Expo projects"
    echo "   - Try updating Xcode to the latest version"
    echo "   - Consider using a paid Apple Developer account with EAS Build"
    echo ""
    echo "2. Missing dependencies:"
    echo "   - Run: cd ios && pod install --repo-update"
    echo "   - Check that all node_modules are installed"
    echo ""
    echo "3. Code signing issues:"
    echo "   - This script should build unsigned, but Xcode might still require it"
    echo "   - Try opening the project in Xcode and setting up a development team"
    echo ""
    echo "💡 Alternative: Use a paid Apple Developer account ($99/year) with EAS Build"
    echo "   This is the most reliable way to build complex React Native apps"
    echo ""
    exit 1
}

# Create IPA from archive
echo "📱 Creating IPA from archive..."
mkdir -p "$BUILD_DIR/Payload"
cp -r "$BUILD_DIR/Circle.xcarchive/Products/Applications/Circle.app" "$BUILD_DIR/Payload/"

cd "$BUILD_DIR"
zip -r "Circle.ipa" Payload
rm -rf Payload

echo ""
echo "🎉 Build successful!"
echo "📍 IPA Location: $BUILD_DIR/Circle.ipa"
echo ""
echo "📲 To install with Sideloadly:"
echo "   1. Download Sideloadly from https://sideloadly.io/"
echo "   2. Connect your iPhone via USB"
echo "   3. Open Sideloadly"
echo "   4. Drag Circle.ipa into Sideloadly"
echo "   5. Enter your Apple ID (free account works)"
echo "   6. Wait for installation"
echo "   7. Trust the developer profile on your device:"
echo "      Settings > General > VPN & Device Management"
echo ""
echo "⏰ Note: With a free Apple ID, you'll need to re-sideload every 7 days"