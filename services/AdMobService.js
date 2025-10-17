import { Platform } from 'react-native';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AppOpenAd,
} from 'react-native-google-mobile-ads';
import { ADMOB_CONFIG, AD_LIMITS, REWARD_VALUES } from '@/config/admob.config';

/**
 * AdMob Service for Circle App
 * Manages all ad operations
 */
class AdMobService {
  constructor() {
    this.initialized = false;
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.appOpenAd = null;
    this.lastInterstitialTime = 0;
    this.lastAppOpenTime = 0;
    this.interstitialCount = 0;
    this.rewardedCount = 0;
  }

  /**
   * Initialize AdMob
   * Call this on app startup
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await mobileAds().initialize();
      this.initialized = true;
      console.log('✅ AdMob initialized successfully');
      
      // Preload ads
      this.loadInterstitialAd();
      this.loadRewardedAd();
      this.loadAppOpenAd();
    } catch (error) {
      console.error('❌ AdMob initialization failed:', error);
    }
  }

  /**
   * Check if user is premium (no ads)
   */
  async isPremiumUser() {
    // TODO: Implement your premium check logic
    // For now, return false
    return false;
  }

  /**
   * Load Interstitial Ad
   */
  loadInterstitialAd() {
    this.interstitialAd = InterstitialAd.createForAdRequest(
      ADMOB_CONFIG.INTERSTITIAL_AD_UNIT
    );

    this.interstitialAd.addAdEventListener('loaded', () => {
      console.log('📺 Interstitial ad loaded');
    });

    this.interstitialAd.addAdEventListener('error', (error) => {
      console.error('❌ Interstitial ad error:', error);
    });

    this.interstitialAd.load();
  }

  /**
   * Show Interstitial Ad
   * @returns {Promise<boolean>} Success status
   */
  async showInterstitialAd() {
    const isPremium = await this.isPremiumUser();
    if (isPremium) {
      console.log('⭐ Premium user - skipping interstitial ad');
      return false;
    }

    // Check frequency limits
    const now = Date.now();
    const timeSinceLastAd = now - this.lastInterstitialTime;
    
    if (timeSinceLastAd < 60000) { // 1 minute minimum
      console.log('⏱️ Too soon for another interstitial ad');
      return false;
    }

    if (this.interstitialCount >= AD_LIMITS.MAX_INTERSTITIAL_PER_HOUR) {
      console.log('🚫 Interstitial ad limit reached');
      return false;
    }

    try {
      if (this.interstitialAd && this.interstitialAd.loaded) {
        await this.interstitialAd.show();
        this.lastInterstitialTime = now;
        this.interstitialCount++;
        
        // Reload for next time
        this.loadInterstitialAd();
        return true;
      } else {
        console.log('⏳ Interstitial ad not ready');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to show interstitial ad:', error);
      return false;
    }
  }

  /**
   * Load Rewarded Ad
   */
  loadRewardedAd() {
    this.rewardedAd = RewardedAd.createForAdRequest(
      ADMOB_CONFIG.REWARDED_AD_UNIT
    );

    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('🎁 Rewarded ad loaded');
    });

    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('🎉 User earned reward:', reward);
    });

    this.rewardedAd.load();
  }

  /**
   * Show Rewarded Ad
   * @param {string} rewardType - Type of reward (super_like, boost, etc.)
   * @returns {Promise<object>} Reward details
   */
  async showRewardedAd(rewardType = 'coins') {
    return new Promise((resolve, reject) => {
      if (!this.rewardedAd || !this.rewardedAd.loaded) {
        reject(new Error('Rewarded ad not ready'));
        return;
      }

      let rewarded = false;

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        rewarded = true;
        const rewardValue = this.getRewardValue(rewardType);
        resolve({
          success: true,
          type: rewardType,
          value: rewardValue,
          reward,
        });
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        if (!rewarded) {
          reject(new Error('Ad closed without reward'));
        }
        // Reload for next time
        this.loadRewardedAd();
      });

      this.rewardedAd.show();
    });
  }

  /**
   * Get reward value based on type
   */
  getRewardValue(rewardType) {
    switch (rewardType) {
      case 'super_like':
        return REWARD_VALUES.SUPER_LIKE;
      case 'boost':
        return REWARD_VALUES.PROFILE_BOOST;
      case 'filter':
        return REWARD_VALUES.PREMIUM_FILTER;
      case 'coins':
      default:
        return REWARD_VALUES.FOCUS_COINS;
    }
  }

  /**
   * Load App Open Ad
   */
  loadAppOpenAd() {
    this.appOpenAd = AppOpenAd.createForAdRequest(
      ADMOB_CONFIG.APP_OPEN_AD_UNIT
    );

    this.appOpenAd.addAdEventListener('loaded', () => {
      console.log('🚪 App open ad loaded');
    });

    this.appOpenAd.load();
  }

  /**
   * Show App Open Ad
   * Call when app comes to foreground
   */
  async showAppOpenAd() {
    const isPremium = await this.isPremiumUser();
    if (isPremium) return false;

    const now = Date.now();
    const timeSinceLastAd = now - this.lastAppOpenTime;

    if (timeSinceLastAd < 240000) { // 4 minutes minimum
      return false;
    }

    try {
      if (this.appOpenAd && this.appOpenAd.loaded) {
        await this.appOpenAd.show();
        this.lastAppOpenTime = now;
        this.loadAppOpenAd(); // Reload
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to show app open ad:', error);
      return false;
    }
  }

  /**
   * Reset hourly counters
   * Call this every hour
   */
  resetHourlyCounters() {
    this.interstitialCount = 0;
    console.log('🔄 Ad counters reset');
  }
}

// Export singleton instance
const adMobService = new AdMobService();
export default adMobService;

// Export components for easy use
export { BannerAd, BannerAdSize };
