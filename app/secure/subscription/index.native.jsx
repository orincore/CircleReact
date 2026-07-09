import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Loader from '@/components/Loader';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import axios from 'axios';

// react-native-iap needs the NitroModules native library linked into the
// build. When it isn't (e.g. a JS-only dev build that hasn't run `pod
// install` for it yet), importing it throws at module-evaluation time --
// and since expo-router eagerly requires every route file to build its
// navigation tree, that throw would crash the entire app, not just this
// screen. Guard it so a missing native module only disables purchasing here.
let useIAP, deepLinkToSubscriptions, ErrorCode;
try {
  ({ useIAP, deepLinkToSubscriptions, ErrorCode } = require('react-native-iap'));
} catch (error) {
  console.warn('[Subscription] react-native-iap native module unavailable:', error?.message);
  useIAP = () => ({
    connected: false,
    subscriptions: [],
    fetchProducts: async () => {},
    requestPurchase: async () => {},
    finishTransaction: async () => {},
  });
  deepLinkToSubscriptions = async () => {};
  ErrorCode = { UserCancelled: 'E_USER_CANCELLED' };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.circle.orincore.com';

const FEATURE_LABELS = {
  unlimited_messaging: 'Unlimited messaging',
  advanced_matching: 'Advanced matching',
  see_who_liked: 'See who liked you',
  priority_support: 'Priority support',
  ad_free: 'Ad-free experience',
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { subscription, isPremium, fetchSubscription, cancelSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [backendPlans, setBackendPlans] = useState([]);
  const [purchasingPlanId, setPurchasingPlanId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const productIdForPlan = (plan) => (Platform.OS === 'ios' ? plan.apple_product_id : plan.google_product_id);

  const findBackendPlanByProductId = useCallback((productId) => {
    return backendPlans.find((p) => productIdForPlan(p) === productId);
  }, [backendPlans]);

  const handlePurchaseSuccess = useCallback(async (purchase) => {
    const plan = findBackendPlanByProductId(purchase.productId);
    if (!plan) {
      console.error('No matching backend plan for productId', purchase.productId);
      setPurchasingPlanId(null);
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        await axios.post(
          `${API_URL}/api/billing/apple/verify`,
          { transaction_id: purchase.transactionId, plan_id: plan.plan_id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/billing/google/verify`,
          { purchase_token: purchase.purchaseToken, product_id: purchase.productId, plan_id: plan.plan_id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await finishTransaction({ purchase, isConsumable: false });
      await fetchSubscription();

      Alert.alert('Success!', 'Your subscription has been activated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error verifying purchase:', error);
      Alert.alert(
        'Verification Failed',
        'Your purchase went through but we could not verify it with our server. Please contact support with your order details.'
      );
    } finally {
      setPurchasingPlanId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findBackendPlanByProductId, token]);

  const {
    connected,
    subscriptions: storeSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: (error) => {
      setPurchasingPlanId(null);
      if (error.code !== ErrorCode.UserCancelled) {
        console.error('Purchase error:', error);
        Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
      }
    },
  });

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (connected && backendPlans.length > 0) {
      const skus = backendPlans.map(productIdForPlan).filter(Boolean);
      if (skus.length) {
        fetchProducts({ skus, type: 'subs' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, backendPlans]);

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/billing/plans`);
      setBackendPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    const productId = productIdForPlan(plan);
    if (!productId) {
      Alert.alert('Unavailable', 'This plan is not yet available on this platform.');
      return;
    }

    setPurchasingPlanId(plan.plan_id);
    try {
      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: { apple: { sku: productId } },
          type: 'subs',
        });
      } else {
        const storeProduct = storeSubscriptions.find((s) => s.id === productId);
        const offerToken = storeProduct?.subscriptionOffers?.[0]?.offerToken;
        await requestPurchase({
          request: {
            google: {
              skus: [productId],
              subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined,
            },
          },
          type: 'subs',
        });
      }
    } catch (error) {
      console.error('Error requesting purchase:', error);
      setPurchasingPlanId(null);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: confirmCancelSubscription },
      ]
    );
  };

  const confirmCancelSubscription = async () => {
    setCancelling(true);
    try {
      const result = await cancelSubscription();
      if (result.success) {
        Alert.alert('Subscription Cancelled', 'You will retain access until it expires.');
      } else if (result.error === 'store_managed_subscription') {
        Alert.alert(
          'Manage Subscription',
          result.message || 'Manage or cancel this subscription through the store.',
          [
            { text: 'Open Subscription Settings', onPress: () => deepLinkToSubscriptions().catch(() => {}) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to cancel subscription');
      }
    } finally {
      setCancelling(false);
    }
  };

  const renderPlanCard = (plan) => {
    const productId = productIdForPlan(plan);
    const storeProduct = storeSubscriptions.find((s) => s.id === productId);
    const isPopular = plan.plan_id === 'yearly';
    const isCurrentPlan = isPremium && subscription?.subscription?.plan_id === plan.plan_id;
    const isPurchasing = purchasingPlanId === plan.plan_id;
    const displayPrice = storeProduct?.displayPrice || `₹${plan.price_inr}`;

    return (
      <View key={plan.plan_id} style={styles.planCard}>
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{displayPrice}</Text>
          <Text style={styles.duration}>/{plan.billing_period === 'monthly' ? 'month' : 'year'}</Text>
        </View>

        <View style={styles.featuresContainer}>
          {(plan.features || []).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>{FEATURE_LABELS[feature] || feature}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.subscribeButton, isPopular && styles.popularButton]}
            onPress={() => handleSubscribe(plan)}
            disabled={!!purchasingPlanId || !connected}
          >
            <LinearGradient
              colors={isPopular ? ['#FF6FB5', '#A16AE8'] : ['#7C2B86', '#5D5FEF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isPurchasing ? (
                <Loader size={16} color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Subscribe Now</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1F1147', '#2D1B69']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Loader size={36} color="#FF6FB5" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1F1147', '#2D1B69']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <View style={{ width: 24 }} />
          </View>

          {isPremium && subscription?.subscription && (
            <View style={styles.statusCard}>
              <Ionicons
                name={subscription.subscription.status === 'cancelled' ? 'time-outline' : 'checkmark-circle'}
                size={32}
                color={subscription.subscription.status === 'cancelled' ? '#FFA500' : '#4CAF50'}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {subscription.subscription.status === 'cancelled' ? 'Subscription Ending' : 'Active Subscription'}
                </Text>
                <Text style={styles.statusText}>
                  {subscription.subscription.plan_id === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                </Text>
                <Text style={styles.statusExpiry}>
                  {subscription.subscription.status === 'cancelled' ? 'Access until: ' : 'Renews: '}
                  {new Date(subscription.subscription.expires_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription} disabled={cancelling}>
                {cancelling ? (
                  <Loader size={16} color="#FF6B6B" />
                ) : (
                  <Text style={styles.cancelButtonText}>Manage</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.plansContainer}>{backendPlans.map(renderPlanCard)}</View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#FF6FB5" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Subscription Benefits</Text>
              <Text style={styles.infoText}>
                • Unlimited matches{'\n'}
                • Ad-free experience{'\n'}
                • Priority support{'\n'}
                • Cancel anytime
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusInfo: { marginLeft: 12, flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#4CAF50', marginBottom: 4 },
  statusText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 2 },
  statusExpiry: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  plansContainer: { marginBottom: 24 },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FF6FB5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  planName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  price: { fontSize: 40, fontWeight: '900', color: '#FFFFFF' },
  duration: { fontSize: 16, color: 'rgba(255, 255, 255, 0.6)', marginLeft: 4 },
  featuresContainer: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginLeft: 12 },
  subscribeButton: { borderRadius: 12, overflow: 'hidden' },
  popularButton: {
    shadowColor: '#FF6FB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  currentPlanButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  currentPlanText: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 111, 181, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 181, 0.2)',
  },
  infoContent: { marginLeft: 12, flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#FF6FB5', marginBottom: 8 },
  infoText: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 20 },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginLeft: 12,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#FF6B6B' },
});
