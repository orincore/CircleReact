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
    ios: 'ca-app-pub-7904629558122562~2514886576',
  }),

  // Banner Ad
  BANNER_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/9034368639',
    ios: 'ca-app-pub-7904629558122562/6437001476',
  }),

  // Interstitial Ad
  INTERSTITIAL_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/1811125366',
    ios: 'ca-app-pub-7904629558122562/2215503678',
  }),

  // Rewarded Ad
  REWARDED_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/7582326795',
    ios: 'ca-app-pub-7904629558122562/5546591635',
  }),

  // Rewarded Interstitial Ad
  REWARDED_INTERSTITIAL_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/6408205290',
    ios: 'ca-app-pub-7904629558122562/7060829767',
  }),

  // App Open Ad
  APP_OPEN_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/4823660885',
    ios: 'ca-app-pub-7904629558122562/1979893473',
  }),

  // Native Advanced Ad
  NATIVE_ADVANCED_AD_UNIT: Platform.select({
    android: 'ca-app-pub-7904629558122562/8635554012',
    ios: 'ca-app-pub-7904629558122562/6844195585',
  }),
};

/**
 * Ad Placement Strategy - Optimized for Maximum Revenue
 * Strategic placement to maximize impressions while maintaining UX
 */
export const AD_PLACEMENT = {
  // Banner Ads - Always visible, high impression rate
  BANNER: {
    ENABLED: true,
    // Show banner at bottom of ALL major screens for maximum visibility
    SCREENS: [
      'explore',        // Main discovery screen
      'profile',        // User profile view
      'settings',       // Settings screen
      'friends',        // Friends list
      'notifications',  // Notifications screen
      'profile_edit',   // Edit profile
      'help_requests',  // Help requests screen
    ],
    POSITION: 'bottom',
    REFRESH_INTERVAL: 60000, // Refresh every 60 seconds for new impressions
    AUTO_SHOW: true,
  },

  // Interstitial Ads - High eCPM, strategic timing
  INTERSTITIAL: {
    ENABLED: true,
    // Show at natural break points to avoid disruption
    TRIGGERS: [
      'after_3_matches',        // After user makes 3 matches (increased frequency)
      'after_5_messages',       // After sending 5 messages (increased frequency)
      'profile_view_exit',      // When exiting profile view
      'after_friend_request',   // After sending friend request
      'after_help_request',     // After creating help request
      'screen_navigation',      // Between major screen transitions
      'after_photo_upload',     // After uploading photos
      'after_settings_change',  // After changing settings
    ],
    FREQUENCY: 'adaptive', // Show based on user engagement
    MIN_INTERVAL: 45000, // Reduced to 45 seconds for more impressions
    MAX_PER_HOUR: 4,     // Increased from 3 to 4
    MAX_PER_DAY: 20,     // Increased from 15 to 20
    COOLDOWN_AFTER_REWARDED: 120000, // 2 min cooldown after rewarded ad
  },

  // Rewarded Ads - User-initiated, high engagement
  REWARDED: {
    ENABLED: true,
    // Offer valuable rewards to encourage watching
    REWARDS: [
      {
        action: 'unlock_super_like',
        reward: '3 Super Likes',
        coins: 30,
        description: 'Get 3 Super Likes to stand out',
      },
      {
        action: 'unlock_premium_filter',
        reward: '24h Premium Filter Access',
        coins: 50,
        description: 'Access advanced filters for 24 hours',
      },
      {
        action: 'boost_profile',
        reward: 'Profile Boost (2 hours)',
        coins: 40,
        description: 'Boost your profile visibility for 2 hours',
      },
      {
        action: 'unlock_chat_request',
        reward: '5 Chat Requests',
        coins: 25,
        description: 'Send 5 additional chat requests',
      },
      {
        action: 'reveal_profile',
        reward: 'Reveal 1 Profile',
        coins: 15,
        description: 'See who viewed your profile',
      },
      {
        action: 'extra_matches',
        reward: '10 Extra Matches',
        coins: 35,
        description: 'Get 10 more daily matches',
      },
    ],
    // Prompt user to watch rewarded ads
    PROMPT_LOCATIONS: [
      'out_of_super_likes',
      'out_of_chat_requests',
      'profile_boost_expired',
      'premium_filter_locked',
      'match_limit_reached',
    ],
    MAX_PER_DAY: 15, // Increased from 10 to 15
  },

  // Rewarded Interstitial Ads - Hybrid approach
  REWARDED_INTERSTITIAL: {
    ENABLED: true,
    TRIGGERS: [
      'after_10_matches',
      'after_profile_complete',
      'after_verification',
    ],
    REWARDS: [
      {
        action: 'bonus_coins',
        reward: '50 Bonus Coins',
        coins: 50,
      },
      {
        action: 'premium_trial',
        reward: '1 Day Premium Trial',
        duration: 86400000, // 24 hours
      },
    ],
    MIN_INTERVAL: 180000, // 3 minutes
    MAX_PER_DAY: 5,
  },

  // App Open Ads - High visibility on app launch
  APP_OPEN: {
    ENABLED: true,
    // Show when app comes to foreground
    MIN_INTERVAL: 180000, // Reduced to 3 minutes for more impressions
    MAX_PER_DAY: 8, // Increased from 5 to 8
    SKIP_ON_FIRST_LAUNCH: true,
    SKIP_ON_CRITICAL_FLOWS: ['chat_active', 'voice_call', 'payment'], // Don't interrupt
    SHOW_ON_RESUME: true, // Show when app resumes from background
  },

  // Native Ads - Seamless integration in feeds
  NATIVE: {
    ENABLED: true,
    // Show in all list/feed views for maximum impressions
    SCREENS: [
      'match_list',      // Match suggestions feed
      'chat_list',       // Chat conversations list
      'friends_list',    // Friends list
      'explore_feed',    // Explore/discovery feed
      'notifications',   // Notifications list
      'help_requests',   // Help requests list
      'profile_visitors', // Profile visitors list
    ],
    FREQUENCY: 'every_4_items', // Increased from every 5 to every 4 items
    FIRST_AD_POSITION: 3, // Show first ad after 3 items
    MAX_ADS_PER_SCREEN: 5, // Maximum 5 native ads per screen
    REFRESH_ON_SCROLL: true,
  },
};

/**
 * Ad Frequency Limits - Optimized for Revenue
 * Balanced to maximize impressions while preventing ad fatigue
 */
export const AD_LIMITS = {
  MAX_INTERSTITIAL_PER_HOUR: 4,     // Increased from 3
  MAX_INTERSTITIAL_PER_DAY: 20,     // Increased from 15
  MAX_REWARDED_PER_DAY: 15,         // Increased from 10
  MAX_REWARDED_INTERSTITIAL_PER_DAY: 5,
  MAX_APP_OPEN_PER_DAY: 8,          // Increased from 5
  MAX_NATIVE_ADS_PER_SCREEN: 5,
  MIN_TIME_BETWEEN_INTERSTITIALS: 45000, // 45 seconds
  MIN_TIME_BETWEEN_APP_OPENS: 180000,    // 3 minutes
  BANNER_REFRESH_INTERVAL: 60000,        // 60 seconds
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
