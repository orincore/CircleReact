import Constants from 'expo-constants';

/**
 * Check if app is running in Expo Go
 * Expo Go doesn't support custom native modules like AdMob
 */
export const isExpoGo = () => {
  // Check if running in Expo Go
  return Constants.appOwnership === 'expo';
};

/**
 * Check if ads should be enabled
 * Ads only work in development builds and production builds, not Expo Go
 * Note: Web uses AdWrapper.web.jsx which doesn't import native modules
 */
export const shouldEnableAds = () => {
  const inExpoGo = isExpoGo();
  
  if (inExpoGo) {
    //console.log('🚫 AdMob disabled - Running in Expo Go (custom native modules not supported)');
    return false;
  }
  
  //console.log('✅ AdMob enabled - Running in development/production build');
  return true;
};

/**
 * Safely import AdMob components only when not in Expo Go
 * This prevents import errors in Expo Go
 */
export const getAdComponents = () => {
  if (!shouldEnableAds()) {
    // Return mock components for Expo Go
    return {
      BannerAd: null,
      useInterstitialAd: () => ({ showInterstitial: () => {} }),
      useRewardedAd: () => ({ showRewardedAd: () => {}, isLoaded: false }),
      AdMobService: {
        incrementMatchCount: () => {},
        shouldShowAfterMatch: () => false,
        canShowInterstitial: () => false,
        canShowRewarded: () => false,
        grantReward: () => {},
        hasActiveReward: () => false,
      },
    };
  }

  // Import real components for development/production builds
  try {
    const BannerAd = require('./BannerAd').default;
    const { useInterstitialAd } = require('./InterstitialAd');
    const { useRewardedAd } = require('./RewardedAd');
    const AdMobService = require('@/src/services/AdMobService').default;

    return {
      BannerAd,
      useInterstitialAd,
      useRewardedAd,
      AdMobService,
    };
  } catch (error) {
    console.warn('⚠️ Failed to load AdMob components:', error.message);
    // Return mocks if import fails
    return {
      BannerAd: null,
      useInterstitialAd: () => ({ showInterstitial: () => {} }),
      useRewardedAd: () => ({ showRewardedAd: () => {}, isLoaded: false }),
      AdMobService: {
        incrementMatchCount: () => {},
        shouldShowAfterMatch: () => false,
        canShowInterstitial: () => false,
        canShowRewarded: () => false,
        grantReward: () => {},
        hasActiveReward: () => false,
      },
    };
  }
};

export default {
  isExpoGo,
  shouldEnableAds,
  getAdComponents,
};
