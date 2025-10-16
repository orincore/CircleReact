const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Plugin to force Play Billing Library version 6.2.1
 * This ensures compliance with Google Play Store requirements
 */
const withPlayBillingLibrary = (config) => {
  // Add to gradle.properties
  config = withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.billingclient.version',
      value: '6.2.1',
    });
    return config;
  });

  // Modify app/build.gradle to add billing library dependencies
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      
      // Only add if not already present
      if (!buildGradle.includes('com.android.billingclient:billing:6.2.1')) {
        // Find the dependencies block and add billing library
        const dependenciesPattern = /dependencies\s*{/;
        if (dependenciesPattern.test(buildGradle)) {
          buildGradle = buildGradle.replace(
            dependenciesPattern,
            `dependencies {
    // Force Play Billing Library 6.2.1 for Google Play compliance
    implementation('com.android.billingclient:billing:6.2.1') {
        force = true
    }
    implementation('com.android.billingclient:billing-ktx:6.2.1') {
        force = true
    }`
          );
        }
      }
      
      // Add configurations block at the end if not present
      if (!buildGradle.includes('configurations.all')) {
        buildGradle += `

// Force Play Billing Library version for all configurations
configurations.all {
    resolutionStrategy {
        force 'com.android.billingclient:billing:6.2.1'
        force 'com.android.billingclient:billing-ktx:6.2.1'
        eachDependency { details ->
            if (details.requested.group == 'com.android.billingclient') {
                details.useVersion '6.2.1'
            }
        }
    }
}
`;
      }
      
      config.modResults.contents = buildGradle;
    }
    return config;
  });

  return config;
};

module.exports = withPlayBillingLibrary;
