import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/src/api/config';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// All paid plans (monthly/yearly) grant the same feature set -- there is no
// tiered premium/premium_plus split anymore, just a billing-period choice.
const FREE_FEATURES = ['basic_chat', 'limited_matches', 'basic_profile'];
const PREMIUM_FEATURES = [
  'basic_chat',
  'unlimited_matches',
  'instagram_usernames',
  'ad_free',
  'premium_badge',
  'priority_support',
  'advanced_filters',
  'see_who_liked',
  'profile_boost',
  'super_likes',
  'read_receipts',
  'incognito_mode',
];

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchLimit, setMatchLimit] = useState({ canMatch: true, matchesUsed: 0, limit: 3 });

  const isPremium = () => {
    if (!subscription) return false;
    return !!subscription.is_premium;
  };

  const getPlan = () => {
    if (!subscription || !subscription.is_premium) return 'free';
    return subscription.plan || 'free';
  };

  const currentFeatures = isPremium() ? PREMIUM_FEATURES : FREE_FEATURES;

  const hasFeature = (feature) => currentFeatures.includes(feature);

  // Show ads for free users. CRITICAL: default to showing ads if subscription
  // data is unavailable (safe default for revenue).
  const shouldShowAds = () => {
    if (!subscription || loading) return true;
    return !hasFeature('ad_free');
  };

  const canMakeMatch = () => {
    if (isPremium()) return true;
    return matchLimit.canMatch;
  };

  const getRemainingMatches = () => {
    if (isPremium()) return -1; // Unlimited
    return Math.max(0, matchLimit.limit - matchLimit.matchesUsed);
  };

  const fetchSubscription = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) {
        setSubscription({ plan: 'free', is_premium: false });
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/billing/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
        setMatchLimit(data.match_limit || { canMatch: true, matchesUsed: 0, limit: 3 });
      } else {
        console.log('⚠️ Subscription API failed, defaulting to free plan (ads will show)');
        setSubscription({ plan: 'free', is_premium: false });
      }
    } catch (error) {
      console.warn('❌ Failed to fetch subscription:', error);
      // CRITICAL: Always default to free plan to ensure ads show
      setSubscription({ plan: 'free', is_premium: false });
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription. Store purchases (iOS/Android) can't be cancelled via
  // this API -- the backend returns a `store_managed_subscription` error
  // telling the user to cancel via the App Store / Play Store instead.
  const cancelSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/billing/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        await fetchSubscription();
        return { success: true };
      }
      return { success: false, error: data.error, message: data.message };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshMatchLimit = async () => {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/billing/match-limit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMatchLimit({
          canMatch: data.canMatch,
          matchesUsed: data.matchesUsed,
          limit: data.limit
        });
      }
    } catch (error) {
      console.warn('Failed to refresh match limit:', error);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const value = {
    // State
    subscription,
    loading,
    matchLimit,

    // Computed values
    isPremium: isPremium(),
    plan: getPlan(),
    shouldShowAds: shouldShowAds,
    canMakeMatch: canMakeMatch(),
    remainingMatches: getRemainingMatches(),

    // Functions
    hasFeature,
    fetchSubscription,
    cancelSubscription,
    refreshMatchLimit,

    // Premium features
    features: {
      unlimitedMatches: hasFeature('unlimited_matches'),
      instagramUsernames: hasFeature('instagram_usernames'),
      adFree: hasFeature('ad_free'),
      premiumBadge: hasFeature('premium_badge'),
      prioritySupport: hasFeature('priority_support'),
      advancedFilters: hasFeature('advanced_filters'),
      seeWhoLiked: hasFeature('see_who_liked'),
      profileBoost: hasFeature('profile_boost'),
      superLikes: hasFeature('super_likes'),
      readReceipts: hasFeature('read_receipts'),
      incognitoMode: hasFeature('incognito_mode')
    }
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
