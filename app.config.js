const baseConfig = require('./app.json');

function injectGoogleMapsConfig(config, apiKey) {
  if (!apiKey) {
    console.warn(
      '⚠️  GOOGLE_MAPS_API_KEY is not set. Location search on native platforms will keep failing until you add it to your env file.'
    );
    return config;
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        googleMapsApiKey: apiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps ?? {}),
          apiKey,
        },
      },
    },
    extra: {
      ...config.extra,
      googleMapsApiKey: apiKey,
    },
  };
}

module.exports = () => {
  const resolved = baseConfig.expo ?? baseConfig;
  const googleMapsKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return injectGoogleMapsConfig(resolved, googleMapsKey);
};
