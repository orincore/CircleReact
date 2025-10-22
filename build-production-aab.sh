#!/bin/bash

echo "🚀 Building Circle Production AAB..."

# Navigate to project root
cd ~/Desktop/circle\ prj/Circle

# Step 1: Check if keystore exists
if [ ! -f "circle-release-key.keystore" ]; then
    echo "❌ Keystore not found at: circle-release-key.keystore"
    echo "Please ensure the keystore file is in the project root directory"
    exit 1
fi

echo "✅ Found keystore at: circle-release-key.keystore"

# Step 2: Keystore is configured in build.gradle with actual credentials
echo "🔑 Using configured Circle keystore..."
echo "📋 Key Alias: acb48b393cf48068a3cb4081f571cdb5"
echo "🔒 SHA-1: 98:FA:79:41:FE:50:74:05:CE:E5:FE:8E:4A:98:BF:9F:CE:52:D2:EA"

# Step 3: Clean and build
echo "🧹 Cleaning project..."
cd android
./gradlew clean

echo "🔨 Building production AAB..."
./gradlew bundleRelease

echo "✅ Production AAB built!"
echo "📱 Location: android/app/build/outputs/bundle/release/app-release.aab"

echo ""
echo "🎯 Next steps:"
echo "1. ✅ Add this SHA-1 to Google Cloud Console for Maps API:"
echo "   98:FA:79:41:FE:50:74:05:CE:E5:FE:8E:4A:98:BF:9F:CE:52:D2:EA"
echo "2. ✅ Package name: com.orincore.Circle"
echo "3. Upload AAB to Play Console"
echo "4. Test on internal track first"
