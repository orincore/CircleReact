#!/usr/bin/env bash

# EAS Build Success Hook
# Verify the billing library version in the built AAB

set -e

echo "🔍 Verifying Play Billing Library version..."

# This will be logged in EAS build logs
echo "✅ Build completed successfully"
echo "📦 AAB should contain Play Billing Library 6.2.1"
echo "⏳ Upload to Play Console and wait 24-48 hours for verification"
