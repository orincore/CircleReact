#!/bin/bash

# Automatic iOS IPA Builder - Tries local build first, falls back to EAS
# This creates an unsigned IPA that can be sideloaded

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🔧 Building Circle iOS App (Auto Mode)..."
echo "📁 Project Directory: $PROJECT_DIR"
echo ""

# Function to check if local build is likely to work
check_local_build_feasibility() {
    echo "🔍 Checking if local build is feasible..."
    
    # Check for Xcode
    if ! command -v xcodebuild &> /dev/null; then
        echo "❌ Xcode not found - local build not possible"
        return 1
    fi
    
    # Check for workspace
    if [ ! -d "ios/Circle.xcworkspace" ]; then
        echo "❌ Xcode workspace not found - local build not possible"
        return 1
    fi
    
    # Check for common build issues
    if [ ! -f "ios/Podfile.lock" ]; then
        echo "❌ Podfile.lock not found - local build not possible"
        return 1
    fi
    
    echo "✅ Local build appears feasible"
    return 0
}

# Function to attempt local build
try_local_build() {
    echo ""
    echo "🏗️  Attempting local build..."
    echo "This may take several minutes..."
    echo ""
    
    if timeout 600 ./build-ios-ipa.sh; then
        echo ""
        echo "🎉 Local build successful!"
        echo "📍 IPA Location: $PROJECT_DIR/build/Circle.ipa"
        echo ""
        echo "📲 To install with Sideloadly:"
        echo "   1. Open Sideloadly"
        echo "   2. Connect your iOS device"
        echo "   3. Drag and drop build/Circle.ipa into Sideloadly"
        echo "   4. Enter your Apple ID and sign the app"
        echo "   5. Trust the developer profile on your device"
        return 0
    else
        echo ""
        echo "❌ Local build failed or timed out"
        return 1
    fi
}

# Function to guide through EAS build
guide_eas_build() {
    echo ""
    echo "🌐 Falling back to EAS Build..."
    echo ""
    echo "EAS Build is more reliable for complex projects like this one."
    echo "It builds your app in the cloud with all dependencies properly configured."
    echo ""
    
    # Check if EAS CLI is available
    if ! command -v eas &> /dev/null; then
        echo "Installing EAS CLI..."
        npm install -g @expo/eas-cli
    fi
    
    # Check authentication
    if ! eas whoami &> /dev/null; then
        echo "Please log in to your Expo account:"
        eas login
    fi
    
    echo "Starting EAS build..."
    echo ""
    echo "📝 Note: You may be prompted to configure credentials."
    echo "   Choose the options for internal distribution/sideloading."
    echo ""
    
    eas build --platform ios --profile preview
    
    echo ""
    echo "✅ EAS build submitted!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait for build completion (you'll get an email)"
    echo "   2. Download the IPA from the provided link"
    echo "   3. Sideload with Sideloadly as described above"
    echo ""
    echo "🌐 Check status: https://expo.dev/"
}

# Main execution flow
echo "Strategy: Try local build first (faster), fallback to EAS build (more reliable)"
echo ""

if check_local_build_feasibility; then
    echo "Attempting local build (10 minute timeout)..."
    if try_local_build; then
        exit 0
    else
        echo ""
        echo "Local build failed. Switching to EAS build..."
        guide_eas_build
    fi
else
    echo "Local build not feasible. Using EAS build..."
    guide_eas_build
fi