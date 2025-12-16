import { Platform } from 'react-native';

/**
 * Google AdMob Configuration for Circle Dating App
 * 
 * Ad Strategy:
 * - Banner Ads: Bottom of chat list, profile screens
 * - Interstitial Ads: After match actions, between screens
 * - Rewarded Ads: Unlock premium features temporarily
 * 
 * Revenue Optimization:
 * - Show ads only to free users
 * - Strategic placement for maximum visibility
 * - Non-intrusive timing to maintain UX
 */

// Test Ad Unit IDs (use these during development)
const TEST_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
};

// Production Ad Unit IDs - Real AdMob IDs for Circle App
const PRODUCTION_AD_UNITS = {
  ios: {
    banner: 'ca-app-pub-7904629558122562/6437001476',
    interstitial: 'ca-app-pub-7904629558122562/2215503678',
    rewarded: 'ca-app-pub-7904629558122562/5546591635',
  },
  android: {
    banner: 'ca-app-pub-7904629558122562/9034368639',
    interstitial: 'ca-app-pub-7904629558122562/1811125366',
    rewarded: 'ca-app-pub-7904629558122562/7582326795',
  },
};

// CRITICAL FIX: Always use production ads in release builds
// Only use test ads in Expo Go or explicit development mode
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
const isDevelopment = __DEV__ || isExpoGo;

// Force production ads in standalone builds
const AD_UNITS = isDevelopment ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;

console.log('🎯 AdMob Config:', {
  isDevelopment,
  isExpoGo,
  usingTestAds: isDevelopment,
  platform: Platform.OS,
  bannerAdUnit: AD_UNITS[Platform.OS === 'ios' ? 'ios' : 'android'].banner
});

/**
 * Get AdMob Unit ID for specific ad type
 * @param {string} adType - 'banner', 'interstitial', or 'rewarded'
 * @returns {string} Ad Unit ID
 */
export const getAdUnitId = (adType) => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return AD_UNITS[platform][adType];
};

/**
 * Ad placement configuration
 * Defines where and when ads should be shown
 */
export const AD_PLACEMENTS = {
  // Banner Ads - Always visible at bottom
  CHAT_LIST_BANNER: {
    type: 'banner',
    location: 'chat_list_bottom',
    frequency: 'always',
    priority: 'high',
  },
  PROFILE_BANNER: {
    type: 'banner',
    location: 'profile_bottom',
    frequency: 'always',
    priority: 'medium',
  },
  EXPLORE_BANNER: {
    type: 'banner',
    location: 'explore_bottom',
    frequency: 'always',
    priority: 'medium',
  },
  
  // Interstitial Ads - Full screen at natural breaks
  AFTER_MATCH: {
    type: 'interstitial',
    location: 'after_match_action',
    frequency: 'every_3_matches',
    cooldown: 300000, // 5 minutes
    priority: 'high',
  },
  SCREEN_TRANSITION: {
    type: 'interstitial',
    location: 'between_screens',
    frequency: 'every_5_transitions',
    cooldown: 600000, // 10 minutes
    priority: 'low',
  },
  
  // Rewarded Ads - User-initiated for benefits
  UNLOCK_INSTAGRAM: {
    type: 'rewarded',
    location: 'instagram_unlock',
    reward: 'view_instagram_username',
    duration: 86400000, // 24 hours
    priority: 'high',
  },
  EXTRA_MATCHES: {
    type: 'rewarded',
    location: 'extra_matches',
    reward: 'additional_matches',
    count: 5,
    priority: 'high',
  },
  PROFILE_BOOST: {
    type: 'rewarded',
    location: 'profile_boost',
    reward: 'visibility_boost',
    duration: 3600000, // 1 hour
    priority: 'medium',
  },
};

/**
 * Ad frequency limits to prevent ad fatigue
 */
export const AD_LIMITS = {
  MAX_INTERSTITIALS_PER_HOUR: 3,
  MAX_INTERSTITIALS_PER_DAY: 15,
  MIN_TIME_BETWEEN_INTERSTITIALS: 300000, // 5 minutes
  MAX_REWARDED_PER_DAY: 10,
};

/**
 * Ad configuration options
 */
export const AD_CONFIG = {
  // Request non-personalized ads for GDPR compliance
  requestNonPersonalizedAdsOnly: false,
  
  // Maximum ad content rating
  maxAdContentRating: 'PG', // 'G', 'PG', 'T', 'MA'
  
  // Tag for child-directed treatment
  tagForChildDirectedTreatment: false,
  
  // Tag for under age of consent
  tagForUnderAgeOfConsent: false,
  
  // Test device IDs (add your test device IDs here)
  testDeviceIds: [
    // Add your test device IDs here
    // Example: '2077ef9a63d2b398840261c8221a0c9b'
  ],
};

export default {
  getAdUnitId,
  AD_PLACEMENTS,
  AD_LIMITS,
  AD_CONFIG,
};
