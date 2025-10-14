import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getAdUnitId } from '@/src/config/admob';

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

  // Don't show ads for premium users
  if (!shouldShowAds()) {
    return null;
  }

  const adUnitId = getAdUnitId('banner');

  const handleAdLoaded = () => {
    setAdLoaded(true);
    setAdError(null);
    console.log(`✅ Banner ad loaded: ${placement}`);
  };

  const handleAdFailedToLoad = (error) => {
    setAdError(error);
    console.error(`❌ Banner ad failed to load: ${placement}`, error);
  };

  const handleAdOpened = () => {
    console.log(`👆 Banner ad opened: ${placement}`);
  };

  const handleAdClosed = () => {
    console.log(`👋 Banner ad closed: ${placement}`);
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
