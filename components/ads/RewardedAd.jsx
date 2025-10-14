import { getAdUnitId } from '@/src/config/admob';
import AdMobService from '@/src/services/AdMobService';
import { useEffect, useRef, useState } from 'react';
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

/**
 * Rewarded Ad Hook
 * Manages rewarded video ads that give users benefits
 * 
 * Usage:
 * const { showRewardedAd, isLoaded } = useRewardedAd('unlock_instagram');
 * showRewardedAd((rewarded) => {
 *   if (rewarded) {
 *     // Grant reward to user
 *   }
 * });
 */
export const useRewardedAd = (rewardType = 'default') => {
  const rewardedRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const callbackRef = useRef(null);

  useEffect(() => {
    // Create and load rewarded ad
    const adUnitId = getAdUnitId('rewarded');
    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Event listeners
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setIsLoaded(true);
        //console.log(`✅ Rewarded ad loaded: ${rewardType}`);
      }
    );

    const unsubscribeError = rewarded.addAdEventListener(
      RewardedAdEventType.ERROR,
      (error) => {
        setIsLoaded(false);
        console.error(`❌ Rewarded ad error: ${rewardType}`, error);
        // Call callback with false (not rewarded)
        if (callbackRef.current) {
          callbackRef.current(false);
          callbackRef.current = null;
        }
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        //console.log(`🎁 User earned reward: ${rewardType}`, reward);
        AdMobService.recordRewardedShown();
        
        // Call callback with true (rewarded)
        if (callbackRef.current) {
          callbackRef.current(true, reward);
          callbackRef.current = null;
        }
      }
    );

    const unsubscribeClosed = rewarded.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        //console.log(`👋 Rewarded ad closed: ${rewardType}`);
        setIsLoaded(false);
        
        // If callback wasn't called yet, user didn't watch full ad
        if (callbackRef.current) {
          callbackRef.current(false);
          callbackRef.current = null;
        }
        
        // Reload ad for next time
        rewarded.load();
      }
    );

    const unsubscribeOpened = rewarded.addAdEventListener(
      RewardedAdEventType.OPENED,
      () => {
        //console.log(`👆 Rewarded ad opened: ${rewardType}`);
      }
    );

    // Load the ad
    rewarded.load();
    rewardedRef.current = rewarded;

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeError();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeOpened();
    };
  }, [rewardType]);

  /**
   * Show rewarded ad
   * @param {function} callback - Called with (rewarded: boolean, reward: object)
   */
  const showRewardedAd = (callback = null) => {
    callbackRef.current = callback;

    // Check if ad can be shown
    if (!AdMobService.canShowRewarded()) {
      //console.log('⏭️ Daily rewarded ad limit reached');
      if (callback) callback(false);
      return;
    }

    // Show ad if loaded
    if (isLoaded && rewardedRef.current) {
      try {
        rewardedRef.current.show();
      } catch (error) {
        console.error('Failed to show rewarded ad:', error);
        if (callback) callback(false);
      }
    } else {
      //console.log('⏭️ Rewarded ad not ready');
      if (callback) callback(false);
    }
  };

  return { showRewardedAd, isLoaded };
};

export default useRewardedAd;
