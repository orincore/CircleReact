import { getAdUnitId } from '@/src/config/admob';
import AdMobService from '@/src/services/AdMobService';
import { useEffect, useRef } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

/**
 * Interstitial Ad Hook
 * Manages full-screen interstitial ads
 * 
 * Usage:
 * const { showInterstitial } = useInterstitialAd('after_match');
 * showInterstitial(() => //console.log('Ad completed'));
 */
export const useInterstitialAd = (placement = 'default') => {
  const interstitialRef = useRef(null);
  const loadedRef = useRef(false);
  const callbackRef = useRef(null);

  useEffect(() => {
    // Create and load interstitial ad
    const adUnitId = getAdUnitId('interstitial');
    const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Event listeners
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        loadedRef.current = true;
        //console.log(`✅ Interstitial ad loaded: ${placement}`);
      }
    );

    const unsubscribeError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        loadedRef.current = false;
        console.error(`❌ Interstitial ad error: ${placement}`, error);
        // Call callback even on error to not block user flow
        if (callbackRef.current) {
          callbackRef.current();
          callbackRef.current = null;
        }
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        //console.log(`👋 Interstitial ad closed: ${placement}`);
        loadedRef.current = false;
        
        // Call callback after ad is closed
        if (callbackRef.current) {
          callbackRef.current();
          callbackRef.current = null;
        }
        
        // Reload ad for next time
        interstitial.load();
      }
    );

    const unsubscribeOpened = interstitial.addAdEventListener(
      AdEventType.OPENED,
      () => {
        //console.log(`👆 Interstitial ad opened: ${placement}`);
        AdMobService.recordInterstitialShown();
      }
    );

    // Load the ad
    interstitial.load();
    interstitialRef.current = interstitial;

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeClosed();
      unsubscribeOpened();
    };
  }, [placement]);

  /**
   * Show interstitial ad if loaded and allowed
   * @param {function} callback - Called after ad is shown or skipped
   */
  const showInterstitial = (callback = null) => {
    callbackRef.current = callback;

    // Check if ad can be shown
    if (!AdMobService.canShowInterstitial()) {
      //console.log('⏭️ Skipping interstitial ad (frequency limit)');
      if (callback) callback();
      return;
    }

    // Show ad if loaded
    if (loadedRef.current && interstitialRef.current) {
      try {
        interstitialRef.current.show();
      } catch (error) {
        console.error('Failed to show interstitial:', error);
        if (callback) callback();
      }
    } else {
      //console.log('⏭️ Interstitial ad not ready');
      if (callback) callback();
    }
  };

  return { showInterstitial };
};

export default useInterstitialAd;
