#!/bin/bash

# Check iOS build setup for Circle app

echo "🔍 Checking iOS build setup for Circle app..."
echo ""

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found. Please run this script from the CircleReact directory."
    exit 1
fi

echo "✅ Found app.json - in correct directory"

# Check Node.js and npm
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found"
fi

# Check Expo CLI
if command -v expo &> /dev/null; then
    echo "✅ Expo CLI: $(expo --version)"
else
    echo "❌ Expo CLI not found - install with: npm install -g @expo/cli"
fi

# Check EAS CLI
if command -v eas &> /dev/null; then
    echo "✅ EAS CLI: $(eas --version)"
else
    echo "❌ EAS CLI not found - install with: npm install -g @expo/eas-cli"
fi

# Check Xcode (for local builds)
if command -v xcodebuild &> /dev/null; then
    echo "✅ Xcode: $(xcodebuild -version | head -n 1)"
else
    echo "⚠️  Xcode not found - required for local builds only"
fi

# Check CocoaPods (for local builds)
if command -v pod &> /dev/null; then
    echo "✅ CocoaPods: $(pod --version)"
else
    echo "⚠️  CocoaPods not found - required for local builds only"
fi

# Check iOS directory
if [ -d "ios" ]; then
    echo "✅ iOS directory exists"
    if [ -d "ios/Circle.xcworkspace" ]; then
        echo "✅ Xcode workspace found"
    else
        echo "⚠️  Xcode workspace not found - run 'cd ios && pod install'"
    fi
else
    echo "❌ iOS directory not found"
fi

# Check package.json dependencies
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo "✅ node_modules directory exists"
    else
        echo "⚠️  node_modules not found - run 'npm install'"
    fi
else
    echo "❌ package.json not found"
fi

# Check EAS configuration
if [ -f "eas.json" ]; then
    echo "✅ eas.json configuration found"
else
    echo "❌ eas.json not found"
fi

# Check environment file
if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "⚠️  .env file not found - copy from .env.example if needed"
fi

echo ""
echo "📋 Build Options Available:"
echo "   1. EAS Build (Recommended): ./build-ios-eas.sh"
echo "   2. Local Build: ./build-ios-ipa.sh"
echo ""

# Check EAS authentication
echo "🔐 Checking EAS authentication..."
if eas whoami &> /dev/null; then
    echo "✅ Logged in to EAS as: $(eas whoami)"
else
    echo "⚠️  Not logged in to EAS - run 'eas login' for EAS builds"
fi

echo ""
echo "🎯 Recommendation:"
if command -v eas &> /dev/null; then
    echo "   Use EAS Build for most reliable results: ./build-ios-eas.sh"
else
    echo "   Install EAS CLI first: npm install -g @expo/eas-cli"
fi

echo ""
echo "📖 For detailed instructions, see: iOS-SIDELOAD-GUIDE.md"