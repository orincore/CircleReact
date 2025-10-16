#!/usr/bin/env bash

# EAS Build Pre-Install Hook
# This script runs before npm install during EAS build
# It ensures Play Billing Library 6.2.1 is used

set -e

echo "🔧 Configuring Play Billing Library version 6.2.1..."

# Create/update gradle.properties if it doesn't exist
if [ ! -f "android/gradle.properties" ]; then
    mkdir -p android
    touch android/gradle.properties
fi

# Add billing version to gradle.properties
echo "BILLING_VERSION=6.2.1" >> android/gradle.properties
echo "android.useAndroidX=true" >> android/gradle.properties
echo "android.enableJetifier=true" >> android/gradle.properties

echo "✅ Play Billing Library configuration complete"
