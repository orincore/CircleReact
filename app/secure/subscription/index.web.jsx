import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Loader from '@/components/Loader';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.circle.orincore.com';
const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const FEATURE_LABELS = {
  unlimited_messaging: 'Unlimited messaging',
  advanced_matching: 'Advanced matching',
  see_who_liked: 'See who liked you',
  priority_support: 'Priority support',
  ad_free: 'Ad-free experience',
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { subscription, isPremium, fetchSubscription, cancelSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [purchasingPlanId, setPurchasingPlanId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/billing/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!token) {
      Alert.alert('Error', 'Please login to subscribe');
      return;
    }

    setPurchasingPlanId(plan.plan_id);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        Alert.alert('Error', 'Could not load the payment provider. Check your connection and try again.');
        return;
      }

      const { data } = await axios.post(
        `${API_URL}/api/billing/razorpay/create-subscription`,
        { plan_id: plan.plan_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const checkout = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Circle',
        description: plan.name,
        theme: { color: '#7C2B86' },
        handler: async (response) => {
          try {
            await axios.post(
              `${API_URL}/api/billing/razorpay/verify`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.plan_id,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchSubscription();
            Alert.alert('Success!', 'Your subscription has been activated.');
          } catch (error) {
            console.error('Error verifying payment:', error);
            Alert.alert(
              'Verification Failed',
              'Payment completed but we could not verify it with our server. Please contact support.'
            );
          } finally {
            setPurchasingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => setPurchasingPlanId(null),
        },
      });

      checkout.open();
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start checkout');
      setPurchasingPlanId(null);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'You will retain access until the end of your current billing period. Are you sure you want to cancel?',
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
      } else {
        Alert.alert('Error', result.message || result.error || 'Failed to cancel subscription');
      }
    } finally {
      setCancelling(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isPopular = plan.plan_id === 'yearly';
    const isCurrentPlan = isPremium && subscription?.subscription?.plan_id === plan.plan_id;
    const isPurchasing = purchasingPlanId === plan.plan_id;

    return (
      <View key={plan.plan_id} style={styles.planCard}>
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.currency}>₹</Text>
          <Text style={styles.price}>{plan.price_inr}</Text>
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
            disabled={!!purchasingPlanId}
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
              {subscription.subscription.status !== 'cancelled' && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription} disabled={cancelling}>
                  {cancelling ? (
                    <Loader size={16} color="#FF6B6B" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.plansContainer}>{plans.map(renderPlanCard)}</View>

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
  currency: { fontSize: 24, fontWeight: '700', color: '#FF6FB5' },
  price: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
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
