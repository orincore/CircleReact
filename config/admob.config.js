/**
 * AdMob Configuration for Circle App
 * Production Ad Unit IDs
 * 
 * App ID: ca-app-pub-7904629558122562~8832481283
 */

import { Platform } from 'react-native';

// Check if running in production
const __DEV__ = 'production';

/**
 * AdMob Ad Unit IDs
 * Use test IDs in development, production IDs in release
 */
export const ADMOB_CONFIG = {
  // App ID
  APP_ID: Platform.select({
    android: 'ca-app-pub-7904629558122562~8832481283',
    ios: 'ca-app-pub-3940256099942544~1458002511', // Replace with your iOS App ID
  }),

  // Banner Ad
  BANNER_AD_UNIT: Platform.select({
    android: __DEV__ 
      ? 'ca-app-pub-3940256099942544/6300978111' // Test ID
      : 'ca-app-pub-7904629558122562/9034368639', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/2934735716' // Test ID
      : 'ca-app-pub-3940256099942544/2934735716', // Replace with your iOS ID
  }),

  // Interstitial Ad
  INTERSTITIAL_AD_UNIT: Platform.select({
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/1033173712' // Test ID
      : 'ca-app-pub-7904629558122562/1811125366', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/4411468910' // Test ID
      : 'ca-app-pub-3940256099942544/4411468910', // Replace with your iOS ID
  }),

  // Rewarded Ad
  REWARDED_AD_UNIT: Platform.select({
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/5224354917' // Test ID
      : 'ca-app-pub-7904629558122562/7582326795', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/1712485313' // Test ID
      : 'ca-app-pub-3940256099942544/1712485313', // Replace with your iOS ID
  }),

  // Rewarded Interstitial Ad
  REWARDED_INTERSTITIAL_AD_UNIT: Platform.select({
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/5354046379' // Test ID
      : 'ca-app-pub-7904629558122562/6408205290', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/6978759866' // Test ID
      : 'ca-app-pub-3940256099942544/6978759866', // Replace with your iOS ID
  }),

  // App Open Ad
  APP_OPEN_AD_UNIT: Platform.select({
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/3419835294' // Test ID
      : 'ca-app-pub-7904629558122562/4823660885', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/5662855259' // Test ID
      : 'ca-app-pub-3940256099942544/5662855259', // Replace with your iOS ID
  }),

  // Native Advanced Ad
  NATIVE_ADVANCED_AD_UNIT: Platform.select({
    android: __DEV__
      ? 'ca-app-pub-3940256099942544/2247696110' // Test ID
      : 'ca-app-pub-7904629558122562/8635554012', // Production ID
    ios: __DEV__
      ? 'ca-app-pub-3940256099942544/3986624511' // Test ID
      : 'ca-app-pub-3940256099942544/3986624511', // Replace with your iOS ID
  }),
};

/**
 * Ad Placement Strategy
 * Where and when to show ads
 */
export const AD_PLACEMENT = {
  // Banner Ads
  BANNER: {
    // Show banner at bottom of these screens
    SCREENS: ['explore', 'profile', 'settings'],
    POSITION: 'bottom',
  },

  // Interstitial Ads
  INTERSTITIAL: {
    // Show after these actions
    TRIGGERS: [
      'after_5_matches', // After user makes 5 matches
      'after_10_messages', // After sending 10 messages
      'profile_view_exit', // When exiting profile view
    ],
    FREQUENCY: 'once_per_session', // or 'every_time'
    MIN_INTERVAL: 60000, // Minimum 60 seconds between ads
  },

  // Rewarded Ads
  REWARDED: {
    // Offer rewards for watching
    REWARDS: [
      {
        action: 'unlock_super_like',
        reward: '1 Super Like',
        coins: 10,
      },
      {
        action: 'unlock_premium_filter',
        reward: '24h Premium Filter Access',
        coins: 50,
      },
      {
        action: 'boost_profile',
        reward: 'Profile Boost (1 hour)',
        coins: 25,
      },
    ],
  },

  // App Open Ads
  APP_OPEN: {
    ENABLED: true,
    // Show when app comes to foreground
    MIN_INTERVAL: 240000, // Minimum 4 minutes between app open ads
    SKIP_ON_FIRST_LAUNCH: true,
  },

  // Native Ads
  NATIVE: {
    // Show in feed/list views
    SCREENS: ['match_list', 'chat_list'],
    FREQUENCY: 'every_5_items', // Show native ad every 5 list items
  },
};

/**
 * Ad Frequency Limits
 * Prevent ad fatigue
 */
export const AD_LIMITS = {
  MAX_INTERSTITIAL_PER_HOUR: 3,
  MAX_REWARDED_PER_DAY: 10,
  MAX_APP_OPEN_PER_DAY: 5,
};

/**
 * Premium User Settings
 * Disable ads for premium users
 */
export const PREMIUM_AD_SETTINGS = {
  DISABLE_ALL_ADS: true, // Premium users see no ads
  EXCEPT_REWARDED: true, // But can still watch rewarded ads for bonuses
};

/**
 * Reward Values
 * What users get for watching rewarded ads
 */
export const REWARD_VALUES = {
  SUPER_LIKE: 1, // 1 Super Like per rewarded ad
  PROFILE_BOOST: 60, // 60 minutes boost
  PREMIUM_FILTER: 1440, // 24 hours (in minutes)
  FOCUS_COINS: 10, // 10 coins per ad
};

export default ADMOB_CONFIG;
