#!/bin/bash

# EAS Build Pre-Install Hook
# This runs BEFORE npm install - just logs info

set -e

echo "🔧 EAS Pre-Install: Starting build process..."

# Check build platform
if [ "$EAS_BUILD_PLATFORM" = "android" ]; then
    echo "📱 Android build detected"
    echo "🔧 AndroidX configuration will be handled in post-install hook"
else
    echo "📱 Non-Android build detected"
fi

echo "✅ EAS Pre-Install: Complete"