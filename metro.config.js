const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for serving static files from public directory
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');

// Ensure proper source map support for production builds
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: function () {
    return function (path) {
      // Use relative path for module IDs to ensure consistency
      return require('crypto').createHash('sha1').update(path).digest('hex').substr(0, 8);
    };
  },
};

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  alias: {
    '@': require('path').resolve(__dirname, 'src'),
  },
};

// Transformer configuration for better compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
