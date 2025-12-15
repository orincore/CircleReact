#!/bin/bash

# Build iOS IPA for Sideloadly (Personal Use)
# This script builds an unsigned IPA that can be sideloaded

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
BUILD_DIR="$PROJECT_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/Circle.xcarchive"
IPA_PATH="$BUILD_DIR/Circle.ipa"

echo "🔧 Building Circle iOS App for Sideloadly..."
echo "📁 Project Directory: $PROJECT_DIR"

# Clean previous builds
rm -rf "$BUILD_DIR/Circle.xcarchive"
rm -rf "$BUILD_DIR/Circle.ipa"
rm -rf "$BUILD_DIR/Payload"
mkdir -p "$BUILD_DIR"

# Clean Xcode derived data to avoid build issues
echo "🧹 Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/Circle-*

# Clean iOS build folder
echo "🧹 Cleaning iOS build folder..."
rm -rf "$IOS_DIR/build"

# Update pods to ensure compatibility
echo "📦 Updating CocoaPods..."
cd "$IOS_DIR"
pod install --repo-update

cd "$PROJECT_DIR"

# Build the archive using xcodebuild with additional flags to handle Swift compilation
echo "📦 Building archive..."
xcodebuild archive \
    -workspace "$IOS_DIR/Circle.xcworkspace" \
    -scheme "Circle" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    -destination "generic/platform=iOS" \
    ONLY_ACTIVE_ARCH=NO \
    SWIFT_COMPILATION_MODE=wholemodule \
    SWIFT_OPTIMIZATION_LEVEL="-O" \
    GCC_OPTIMIZATION_LEVEL=s \
    VALIDATE_PRODUCT=NO \
    -allowProvisioningUpdates

# Create IPA from archive
echo "📱 Creating IPA..."
mkdir -p "$BUILD_DIR/Payload"
cp -r "$ARCHIVE_PATH/Products/Applications/Circle.app" "$BUILD_DIR/Payload/"

cd "$BUILD_DIR"
zip -r "Circle.ipa" Payload
rm -rf Payload

echo ""
echo "✅ Build Complete!"
echo "📍 IPA Location: $IPA_PATH"
echo ""
echo "📲 To install with Sideloadly:"
echo "   1. Open Sideloadly"
echo "   2. Connect your iOS device"
echo "   3. Drag and drop Circle.ipa into Sideloadly"
echo "   4. Enter your Apple ID and sign the app"
echo "   5. Trust the developer profile on your device (Settings > General > VPN & Device Management)"
