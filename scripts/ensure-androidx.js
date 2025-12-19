#!/usr/bin/env node

/**
 * FINAL AndroidX Fix Script
 * Ensures AndroidX properties are set correctly for EAS builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GRADLE_PROPS_PATH = path.join(__dirname, '..', 'android', 'gradle.properties');
const ANDROID_DIR = path.join(__dirname, '..', 'android');

const ANDROIDX_BLOCK = `# CRITICAL: AndroidX Configuration - MUST be at the very top
# These properties are required for all AndroidX dependencies to work
android.useAndroidX=true
android.enableJetifier=true

# Suppress SDK version warnings
android.suppressUnsupportedCompileSdk=36

# R class optimizations
android.nonTransitiveRClass=true
android.nonFinalResIds=true

`;

function log(message) {
  console.log(`[AndroidX Fix] ${message}`);
}

function ensureAndroidX() {
  log('🔧 Starting AndroidX configuration...');
  
  // Check if this is an Android build
  if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== 'android') {
    log('ℹ️ Not an Android build, skipping AndroidX configuration');
    return;
  }
  
  // Check if android directory exists, if not run prebuild
  if (!fs.existsSync(ANDROID_DIR)) {
    log('📦 Android directory not found, running prebuild...');
    try {
      execSync('npx expo prebuild --platform android --clear', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      log('⚠️ Prebuild failed, but continuing...');
    }
  }
  
  // Create gradle.properties if it doesn't exist
  if (!fs.existsSync(GRADLE_PROPS_PATH)) {
    log('📝 Creating gradle.properties with AndroidX configuration...');
    
    // Ensure android directory exists
    if (!fs.existsSync(ANDROID_DIR)) {
      fs.mkdirSync(ANDROID_DIR, { recursive: true });
    }
    
    const fullContent = ANDROIDX_BLOCK + `
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true

# React Native settings
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=true
hermesEnabled=true

# SDK versions
android.minSdkVersion=24
android.compileSdkVersion=35
android.targetSdkVersion=35
android.ndkVersion=27.0.12077973
`;
    
    fs.writeFileSync(GRADLE_PROPS_PATH, fullContent);
    log('✅ Created gradle.properties with AndroidX configuration');
  }
  
  // FORCE VERSION CODE 100 in build.gradle
  const BUILD_GRADLE_PATH = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  if (fs.existsSync(BUILD_GRADLE_PATH)) {
    log('🔧 Forcing version code 100 in build.gradle...');
    let buildGradle = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
    
    // Force version code to 100
    buildGradle = buildGradle.replace(/versionCode\s+\d+/g, 'versionCode 100');
    buildGradle = buildGradle.replace(/versionName\s+["'][^"']+["']/g, 'versionName "2.0.0"');
    
    fs.writeFileSync(BUILD_GRADLE_PATH, buildGradle);
    log('✅ Forced versionCode 100 in build.gradle');
  }
  
  if (!fs.existsSync(GRADLE_PROPS_PATH)) {
    return;
  }
  
  // Read existing gradle.properties
  let content = fs.readFileSync(GRADLE_PROPS_PATH, 'utf8');
  
  // Check if AndroidX is already properly configured
  if (content.includes('android.useAndroidX=true') && content.indexOf('android.useAndroidX=true') < 500) {
    log('✅ AndroidX already configured at top of gradle.properties');
    return;
  }
  
  log('⚠️ AndroidX not properly configured, fixing...');
  
  // Remove existing AndroidX lines
  const lines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('android.useAndroidX=') &&
           !trimmed.startsWith('android.enableJetifier=') &&
           !trimmed.startsWith('android.suppressUnsupportedCompileSdk=') &&
           !trimmed.startsWith('android.nonTransitiveRClass=') &&
           !trimmed.startsWith('android.nonFinalResIds=') &&
           !trimmed.startsWith('# CRITICAL: AndroidX') &&
           !trimmed.startsWith('# These properties are required') &&
           !trimmed.startsWith('# Suppress SDK version') &&
           !trimmed.startsWith('# R class optimizations');
  });
  
  // Create new content with AndroidX at the top
  const newContent = ANDROIDX_BLOCK + lines.join('\n');
  
  fs.writeFileSync(GRADLE_PROPS_PATH, newContent);
  
  log('✅ AndroidX properties added to top of gradle.properties');
  
  // Verify the fix
  const verifyContent = fs.readFileSync(GRADLE_PROPS_PATH, 'utf8');
  const firstLines = verifyContent.split('\n').slice(0, 15);
  
  log('📋 First 15 lines of gradle.properties:');
  firstLines.forEach((line, i) => console.log(`${i + 1}: ${line}`));
  
  // Final verification
  if (verifyContent.includes('android.useAndroidX=true')) {
    log('✅ Verification passed: android.useAndroidX=true found');
  } else {
    log('❌ Verification failed: android.useAndroidX=true NOT found');
    process.exit(1);
  }
  
  if (verifyContent.includes('android.enableJetifier=true')) {
    log('✅ Verification passed: android.enableJetifier=true found');
  } else {
    log('❌ Verification failed: android.enableJetifier=true NOT found');
    process.exit(1);
  }
}

try {
  ensureAndroidX();
  log('🎉 AndroidX configuration completed successfully!');
} catch (error) {
  log(`❌ Error: ${error.message}`);
  // Don't fail the build, just log the error
  console.error(error);
}