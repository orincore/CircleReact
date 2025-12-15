#!/bin/bash

# Build iOS IPA using EAS Build (Recommended for Expo projects)
# This creates an unsigned IPA that can be sideloaded

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 Building Circle iOS App using EAS Build..."
echo "📁 Project Directory: $PROJECT_DIR"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Login to EAS (if not already logged in)
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to your Expo account:"
    eas login
fi

# Build for iOS using the preview profile (creates unsigned IPA)
echo "📦 Starting EAS build for iOS..."
echo "This will create an unsigned IPA that you can sideload with Sideloadly"
echo ""
echo "⚠️  Note: You may be prompted to set up credentials for internal distribution."
echo "   This is normal for creating unsigned IPAs that can be sideloaded."
echo ""

# Use preview profile with interactive mode to handle credentials
eas build --platform ios --profile preview

echo ""
echo "✅ Build submitted to EAS!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for the build to complete (you'll get an email notification)"
echo "   2. Download the IPA from the EAS dashboard or email link"
echo "   3. Use Sideloadly to install the IPA on your device:"
echo "      - Open Sideloadly"
echo "      - Connect your iOS device"
echo "      - Drag and drop the downloaded IPA into Sideloadly"
echo "      - Enter your Apple ID and sign the app"
echo "      - Trust the developer profile on your device"
echo ""
echo "🌐 Check build status at: https://expo.dev/accounts/$(eas whoami)/projects/circle/builds"