import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
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

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchLimit, setMatchLimit] = useState({ canMatch: true, matchesUsed: 0, limit: 3 });

  // Check if user is premium
  const isPremium = () => {
    // Check if subscription is active (not expired or cancelled without access)
    if (subscription?.is_premium === false || subscription?.status === 'expired') {
      return false;
    }
    return subscription?.is_premium || subscription?.plan === 'premium' || subscription?.plan === 'premium_plus';
  };

  // Get user's plan
  const getPlan = () => {
    // If subscription is expired or not active, return free
    if (subscription?.is_premium === false || subscription?.status === 'expired' || subscription?.status === 'free') {
      return 'free';
    }
    return subscription?.plan || 'free';
  };

  // Check if feature is available for current plan
  const hasFeature = (feature) => {
    const plan = getPlan();
    
    const features = {
      free: [
        'basic_chat',
        'limited_matches',
        'basic_profile'
      ],
      premium: [
        'basic_chat',
        'unlimited_matches',
        'instagram_usernames',
        'ad_free',
        'premium_badge',
        'priority_support',
        'advanced_filters'
      ],
      premium_plus: [
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
        'incognito_mode'
      ]
    };

    return features[plan]?.includes(feature) || false;
  };

  // Show ads for free users
  const shouldShowAds = () => {
    return !hasFeature('ad_free');
  };

  // Check match limit
  const canMakeMatch = () => {
    if (isPremium()) return true;
    return matchLimit.canMatch;
  };

  // Get remaining matches for free users
  const getRemainingMatches = () => {
    if (isPremium()) return -1; // Unlimited
    return Math.max(0, matchLimit.limit - matchLimit.matchesUsed);
  };

  // Fetch subscription data from API
  const fetchSubscription = async () => {
    try {
      setLoading(true);
      
      // Get auth token (using same key as AuthContext)
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) {
        setSubscription({ plan: 'free', is_premium: false });
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/subscription/current`, {
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
        // Default to free plan if API fails
        setSubscription({ plan: 'free', is_premium: false });
      }
    } catch (error) {
      console.warn('Failed to fetch subscription:', error);
      setSubscription({ plan: 'free', is_premium: false });
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to premium
  const subscribeToPremium = async (planType = 'premium') => {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/payment/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_type: planType,
          payment_method: 'mock',
          payment_token: 'mock_token'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh subscription data
        await fetchSubscription();
        return { success: true, data };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Subscription error:', error);
      return { success: false, error: error.message };
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${API_BASE_URL}/api/cashfree/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh subscription data
        await fetchSubscription();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return { success: false, error: error.message };
    }
  };

  // Refresh match limit
  const refreshMatchLimit = async () => {
    try {
      const token = await AsyncStorage.getItem('@circle:access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/subscription/match-limit`, {
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

  // Initialize subscription data
  useEffect(() => {
    fetchSubscription();
  }, []);

  // Compute features object
  const currentPlan = getPlan();
  const planFeatures = {
    free: [
      'basic_chat',
      'limited_matches',
      'basic_profile'
    ],
    premium: [
      'basic_chat',
      'unlimited_matches',
      'instagram_usernames',
      'ad_free',
      'premium_badge',
      'priority_support',
      'advanced_filters'
    ],
    premium_plus: [
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
      'incognito_mode'
    ]
  };

  const currentFeatures = planFeatures[currentPlan] || planFeatures.free;

  const value = {
    // State
    subscription,
    loading,
    matchLimit,
    
    // Computed values
    isPremium: isPremium(),
    plan: currentPlan,
    shouldShowAds: shouldShowAds,
    canMakeMatch: canMakeMatch(),
    remainingMatches: getRemainingMatches(),
    
    // Functions
    hasFeature,
    fetchSubscription,
    subscribeToPremium,
    cancelSubscription,
    refreshMatchLimit,
    
    // Premium features
    features: {
      unlimitedMatches: currentFeatures.includes('unlimited_matches'),
      instagramUsernames: currentFeatures.includes('instagram_usernames'),
      adFree: currentFeatures.includes('ad_free'),
      premiumBadge: currentFeatures.includes('premium_badge'),
      prioritySupport: currentFeatures.includes('priority_support'),
      advancedFilters: currentFeatures.includes('advanced_filters'),
      seeWhoLiked: currentFeatures.includes('see_who_liked'),
      profileBoost: currentFeatures.includes('profile_boost'),
      superLikes: currentFeatures.includes('super_likes'),
      readReceipts: currentFeatures.includes('read_receipts'),
      incognitoMode: currentFeatures.includes('incognito_mode')
    }
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
