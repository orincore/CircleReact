const baseConfig = require('./app.json');

function injectGoogleMapsConfig(config, apiKey) {
  if (!apiKey) {
    console.warn(
      '⚠️  GOOGLE_MAPS_API_KEY is not set. Location search on native platforms will keep failing until you add it to your env file.'
    );
    return config;
  }

  // NOTE: We intentionally do NOT set ios.config.googleMapsApiKey.
  // The app never uses PROVIDER_GOOGLE, so iOS uses Apple Maps (MapKit), which
  // needs no extra pod. Setting the iOS key makes Expo prebuild add the
  // `react-native-google-maps` pod, which react-native-maps 1.27 doesn't ship a
  // podspec for, breaking `pod install`. Android still needs the Google key, and
  // `extra.googleMapsApiKey` remains for JS-side Places/geocoding usage.
  return {
    ...config,
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
