const { withAppBuildGradle, withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * FINAL AndroidX Fix Plugin + Version Code Override
 * This ensures AndroidX is enabled and forces version code 100
 */
const withAndroidXAndVersionFix = (config) => {
  // CRITICAL: Force AndroidX properties in gradle.properties
  config = withGradleProperties(config, (config) => {
    // AndroidX properties that MUST be present
    const androidXProps = [
      { type: 'property', key: 'android.useAndroidX', value: 'true' },
      { type: 'property', key: 'android.enableJetifier', value: 'true' },
      { type: 'property', key: 'android.suppressUnsupportedCompileSdk', value: '36' },
      { type: 'property', key: 'android.nonTransitiveRClass', value: 'true' },
      { type: 'property', key: 'android.nonFinalResIds', value: 'true' }
    ];
    
    // Remove existing AndroidX properties to avoid duplicates
    const keysToRemove = androidXProps.map(p => p.key);
    config.modResults = config.modResults.filter(
      (item) => !keysToRemove.includes(item.key)
    );
    
    // Add AndroidX properties at the BEGINNING (top of file)
    config.modResults = [...androidXProps, ...config.modResults];
    
    console.log('✅ [Plugin] AndroidX properties configured');
    
    return config;
  });

  // FORCE VERSION CODE 100 in build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Force version code to 100 - replace any existing versionCode
      buildGradle = buildGradle.replace(
        /versionCode\s+\d+/g,
        'versionCode 100'
      );
      
      // If no versionCode found, add it after applicationId
      if (!buildGradle.includes('versionCode')) {
        buildGradle = buildGradle.replace(
          /(applicationId\s+['"][^'"]+['"])/,
          '$1\n        versionCode 100'
        );
      }
      
      // Also force version name
      buildGradle = buildGradle.replace(
        /versionName\s+["'][^"']+["']/g,
        'versionName "2.0.0"'
      );
      
      console.log('✅ [Plugin] Forced versionCode 100 and versionName 2.0.0');
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });

  // Ensure root build.gradle has proper AndroidX support
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Add ext block if not present
      if (!buildGradle.includes('ext {')) {
        const buildscriptEnd = buildGradle.indexOf('buildscript {');
        if (buildscriptEnd !== -1) {
          const insertPoint = buildGradle.indexOf('}', buildscriptEnd) + 1;
          const extBlock = `

ext {
    buildToolsVersion = "36.0.0"
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 35
    ndkVersion = "27.0.12077973"
    kotlinVersion = "2.1.20"
}
`;
          buildGradle = buildGradle.slice(0, insertPoint) + extBlock + buildGradle.slice(insertPoint);
        }
      }
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });

  return config;
};

module.exports = withAndroidXAndVersionFix;