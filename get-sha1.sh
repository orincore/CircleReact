#!/bin/bash

echo "🔑 Getting SHA-1 Fingerprint for Google Maps API"
echo ""
echo "Release Keystore SHA-1:"
keytool -list -v -keystore circle-release-key.keystore -alias acb48b393cf48068a3cb4081f571cdb5 -storepass 1b244969565d4c2e3f7765e8e3839b04 -keypass b242f35bbd34af9983d87455957614a0 2>/dev/null | grep SHA1

echo ""
echo "📋 Add this SHA-1 to Google Cloud Console:"
echo "1. Go to: https://console.cloud.google.com/"
echo "2. Select your project"
echo "3. Navigate to: APIs & Services → Credentials"
echo "4. Click your API key: AIzaSyBCouJfeMpQ03QeW6kNJLD7izt5M5BQgLQ"
echo "5. Under 'Application restrictions' → 'Android apps'"
echo "6. Add:"
echo "   Package name: com.orincore.Circle"
echo "   SHA-1 fingerprint: (from above)"
