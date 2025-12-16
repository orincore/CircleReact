import { useSubscription } from '@/contexts/SubscriptionContext';
import { getAdUnitId } from '@/src/config/admob';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

/**
 * Banner Ad Component
 * Shows banner ad at bottom of screen for free users
 * 
 * @param {string} placement - Ad placement identifier
 * @param {object} style - Additional styles
 */
const CircleBannerAd = ({ placement = 'default', style }) => {
  const { shouldShowAds } = useSubscription();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(null);

  const adUnitId = getAdUnitId('banner');
  
  // Log ad configuration for debugging
  console.log('🎯 BannerAd Component:', {
    placement,
    shouldShowAds: shouldShowAds(),
    adUnitId,
    isProductionAdUnit: adUnitId?.includes('7904629558122562'),
  });

  // Don't show ads for premium users
  if (!shouldShowAds()) {
    console.log('⭐ Skipping ad - premium user or shouldShowAds returned false');
    return null;
  }

  const handleAdLoaded = () => {
    setAdLoaded(true);
    setAdError(null);
    console.log(`✅ Banner ad loaded successfully: ${placement}`);
  };

  const handleAdFailedToLoad = (error) => {
    setAdError(error);
    console.error(`❌ Banner ad failed to load: ${placement}`, {
      error,
      errorCode: error?.code,
      errorMessage: error?.message,
      adUnitId,
    });
  };

  const handleAdOpened = () => {
    //console.log(`👆 Banner ad opened: ${placement}`);
  };

  const handleAdClosed = () => {
    //console.log(`👋 Banner ad closed: ${placement}`);
  };

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
        onAdOpened={handleAdOpened}
        onAdClosed={handleAdClosed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});

export default CircleBannerAd;
