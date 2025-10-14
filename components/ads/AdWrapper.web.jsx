/**
 * AdWrapper for Web
 * Web doesn't support native AdMob modules, so we return mock components
 */

export const isExpoGo = () => false;

export const shouldEnableAds = () => {
  console.log('🚫 AdMob disabled - Running on web (native modules not supported)');
  return false;
};

export const getAdComponents = () => {
  // Return mock components for web
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
};

export default {
  isExpoGo,
  shouldEnableAds,
  getAdComponents,
};
