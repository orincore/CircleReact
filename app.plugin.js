const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Plugin to force Play Billing Library version 6.2.1
 * This ensures compliance with Google Play Store requirements
 */
const withPlayBillingLibrary = (config) => {
  // Modify app/build.gradle to force billing library version
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Add configurations block to force billing library version
      const configurationsBlock = `
configurations.all {
    resolutionStrategy {
        force 'com.android.billingclient:billing:6.2.1'
        force 'com.android.billingclient:billing-ktx:6.2.1'
    }
}
`;
      
      // Check if configurations block already exists
      if (!buildGradle.includes('com.android.billingclient:billing:6.2.1')) {
        // Add after dependencies block
        if (buildGradle.includes('dependencies {')) {
          buildGradle = buildGradle.replace(
            /(dependencies\s*{[^}]*})/s,
            `$1\n\n${configurationsBlock}`
          );
        } else {
          // Add at the end of the file
          buildGradle += `\n${configurationsBlock}`;
        }
      }
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });

  // Also add to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Add billing version to ext block
      if (!buildGradle.includes('billingVersion')) {
        const extBlockRegex = /(ext\s*{)/;
        if (extBlockRegex.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            extBlockRegex,
            '$1\n        billingVersion = "6.2.1"'
          );
        } else {
          // Add ext block after buildscript
          const buildscriptRegex = /(buildscript\s*{[^}]*})/s;
          buildGradle = buildGradle.replace(
            buildscriptRegex,
            '$1\n\next {\n    billingVersion = "6.2.1"\n}'
          );
        }
        
        config.modResults.contents = buildGradle;
      }
    }
    return config;
  });

  return config;
};

module.exports = withPlayBillingLibrary;
