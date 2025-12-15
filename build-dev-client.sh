#!/bin/bash

# Build Expo Development Client for iOS
# This creates a development build that you can install via TestFlight or direct install

set -e

echo "🔧 Building Expo Development Client for iOS..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "Installing EAS CLI..."
    npm install -g @expo/eas-cli
fi

# Check authentication
if ! eas whoami &> /dev/null; then
    echo "Please log in to your Expo account:"
    eas login
fi

echo "📦 Building development client..."
echo "This creates a development build that can run your app code."
echo ""

# Build development client
eas build --platform ios --profile development

echo ""
echo "✅ Development build submitted!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait for build completion"
echo "   2. Install the development client on your device"
echo "   3. Run 'npx expo start --dev-client' to load your app"
echo ""
echo "This approach doesn't require Apple Developer credentials for the build itself."