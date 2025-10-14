import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_LIMITS } from '../config/admob';

/**
 * AdMob Service
 * Manages ad frequency, cooldowns, and user ad experience
 */
class AdMobService {
  constructor() {
    this.STORAGE_KEY = '@circle:admob_state';
    this.state = {
      interstitialCount: {
        hourly: 0,
        daily: 0,
        lastHourReset: Date.now(),
        lastDayReset: Date.now(),
      },
      lastInterstitialTime: 0,
      rewardedCount: {
        daily: 0,
        lastDayReset: Date.now(),
      },
      matchCount: 0,
      screenTransitionCount: 0,
      rewards: {}, // { rewardType: expiryTimestamp }
    };
    
    this.loadState();
  }

  /**
   * Load ad state from storage
   */
  async loadState() {
    try {
      const savedState = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        this.state = JSON.parse(savedState);
        this.resetCountersIfNeeded();
      }
    } catch (error) {
      console.error('Failed to load AdMob state:', error);
    }
  }

  /**
   * Save ad state to storage
   */
  async saveState() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save AdMob state:', error);
    }
  }

  /**
   * Reset counters if time periods have elapsed
   */
  resetCountersIfNeeded() {
    const now = Date.now();
    
    // Reset hourly counter
    if (now - this.state.interstitialCount.lastHourReset > 3600000) {
      this.state.interstitialCount.hourly = 0;
      this.state.interstitialCount.lastHourReset = now;
    }
    
    // Reset daily counters
    if (now - this.state.interstitialCount.lastDayReset > 86400000) {
      this.state.interstitialCount.daily = 0;
      this.state.interstitialCount.lastDayReset = now;
      this.state.rewardedCount.daily = 0;
      this.state.rewardedCount.lastDayReset = now;
    }
    
    this.saveState();
  }

  /**
   * Check if interstitial ad can be shown
   * @returns {boolean}
   */
  canShowInterstitial() {
    this.resetCountersIfNeeded();
    
    const now = Date.now();
    const timeSinceLastAd = now - this.state.lastInterstitialTime;
    
    // Check cooldown
    if (timeSinceLastAd < AD_LIMITS.MIN_TIME_BETWEEN_INTERSTITIALS) {
      //console.log('⏳ Interstitial ad on cooldown');
      return false;
    }
    
    // Check hourly limit
    if (this.state.interstitialCount.hourly >= AD_LIMITS.MAX_INTERSTITIALS_PER_HOUR) {
      //console.log('⚠️ Hourly interstitial limit reached');
      return false;
    }
    
    // Check daily limit
    if (this.state.interstitialCount.daily >= AD_LIMITS.MAX_INTERSTITIALS_PER_DAY) {
      //console.log('⚠️ Daily interstitial limit reached');
      return false;
    }
    
    return true;
  }

  /**
   * Record that an interstitial ad was shown
   */
  recordInterstitialShown() {
    this.resetCountersIfNeeded();
    this.state.lastInterstitialTime = Date.now();
    this.state.interstitialCount.hourly++;
    this.state.interstitialCount.daily++;
    this.saveState();
   
  }

  /**
   * Check if rewarded ad can be shown
   * @returns {boolean}
   */
  canShowRewarded() {
    this.resetCountersIfNeeded();
    
    if (this.state.rewardedCount.daily >= AD_LIMITS.MAX_REWARDED_PER_DAY) {
      //console.log('⚠️ Daily rewarded ad limit reached');
      return false;
    }
    
    return true;
  }

  /**
   * Record that a rewarded ad was shown
   */
  recordRewardedShown() {
    this.resetCountersIfNeeded();
    this.state.rewardedCount.daily++;
    this.saveState();
   
  }

  /**
   * Grant reward to user
   * @param {string} rewardType - Type of reward
   * @param {number} duration - Duration in milliseconds (optional)
   */
  grantReward(rewardType, duration = null) {
    if (duration) {
      this.state.rewards[rewardType] = Date.now() + duration;
    } else {
      this.state.rewards[rewardType] = true;
    }
    this.saveState();
    //console.log('🎁 Reward granted:', rewardType);
  }

  /**
   * Check if user has active reward
   * @param {string} rewardType - Type of reward
   * @returns {boolean}
   */
  hasActiveReward(rewardType) {
    const reward = this.state.rewards[rewardType];
    if (!reward) return false;
    
    if (typeof reward === 'boolean') return reward;
    
    // Check if time-based reward is still active
    if (Date.now() < reward) return true;
    
    // Reward expired, remove it
    delete this.state.rewards[rewardType];
    this.saveState();
    return false;
  }

  /**
   * Consume a count-based reward
   * @param {string} rewardType - Type of reward
   */
  consumeReward(rewardType) {
    if (this.state.rewards[rewardType]) {
      delete this.state.rewards[rewardType];
      this.saveState();
    }
  }

  /**
   * Increment match count for interstitial frequency
   */
  incrementMatchCount() {
    this.state.matchCount++;
    this.saveState();
  }

  /**
   * Check if should show interstitial after match
   * @returns {boolean}
   */
  shouldShowAfterMatch() {
    // Show every 3 matches
    return this.state.matchCount % 3 === 0 && this.canShowInterstitial();
  }

  /**
   * Increment screen transition count
   */
  incrementScreenTransition() {
    this.state.screenTransitionCount++;
    this.saveState();
  }

  /**
   * Check if should show interstitial on screen transition
   * @returns {boolean}
   */
  shouldShowOnTransition() {
    // Show every 5 transitions
    return this.state.screenTransitionCount % 5 === 0 && this.canShowInterstitial();
  }

  /**
   * Reset all ad state (for testing or premium upgrade)
   */
  async reset() {
    this.state = {
      interstitialCount: {
        hourly: 0,
        daily: 0,
        lastHourReset: Date.now(),
        lastDayReset: Date.now(),
      },
      lastInterstitialTime: 0,
      rewardedCount: {
        daily: 0,
        lastDayReset: Date.now(),
      },
      matchCount: 0,
      screenTransitionCount: 0,
      rewards: {},
    };
    await this.saveState();
  }

  /**
   * Get current ad statistics
   * @returns {object}
   */
  getStats() {
    this.resetCountersIfNeeded();
    return {
      interstitialsToday: this.state.interstitialCount.daily,
      interstitialsThisHour: this.state.interstitialCount.hourly,
      rewardedAdsToday: this.state.rewardedCount.daily,
      activeRewards: Object.keys(this.state.rewards).filter(key => 
        this.hasActiveReward(key)
      ),
    };
  }
}

// Export singleton instance
export default new AdMobService();
