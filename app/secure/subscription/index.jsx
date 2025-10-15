import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (token) {
      loadPlans();
      loadSubscriptionStatus();
    }
  }, [token]);

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cashfree/plans`);
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cashfree/subscription-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription status:', error);
    }
  };

  const handleSubscribe = async (planId, isFree = false) => {
    if (!token) {
      Alert.alert('Error', 'Please login to subscribe');
      return;
    }

    setProcessing(true);
    try {
      // Handle free subscription
      if (isFree) {
        const response = await axios.post(
          `${API_URL}/api/cashfree/claim-free-subscription`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          Alert.alert(
            '🎉 Success!',
            'Your free 1-month subscription has been activated!',
            [
              {
                text: 'OK',
                onPress: () => {
                  loadSubscriptionStatus();
                  router.back();
                }
              }
            ]
          );
        }
        return;
      }

      // Create order for paid subscription
      const response = await axios.post(
        `${API_URL}/api/cashfree/create-order`,
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { payment_session_id, order_id } = response.data;

      if (Platform.OS === 'web') {
        // For web, redirect to Cashfree payment page
        const cashfreeUrl = `https://sandbox.cashfree.com/pg/view/order/${payment_session_id}`;
        window.open(cashfreeUrl, '_blank');
        
        // Show instructions
        Alert.alert(
          'Payment Window Opened',
          'Complete the payment in the new window. After payment, return here to verify.',
          [
            {
              text: 'Verify Payment',
              onPress: () => verifyPayment(order_id)
            }
          ]
        );
      } else {
        // For mobile, you would use Cashfree SDK or WebView
        Alert.alert(
          'Payment',
          'Mobile payment integration coming soon. Please use web version.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  const verifyPayment = async (orderId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/cashfree/verify-payment`,
        { orderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          'Success!',
          'Your subscription has been activated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                loadSubscriptionStatus();
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Payment Status', response.data.message);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      Alert.alert('Error', 'Failed to verify payment');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      '⚠️ Important: No refunds will be issued.\n\nYou will retain access to premium features until the end of your current billing period.\n\nAre you sure you want to cancel?',
      [
        {
          text: 'Keep Subscription',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancelSubscription
        }
      ]
    );
  };

  const confirmCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/cashfree/cancel-subscription`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          'Subscription Cancelled',
          response.data.message,
          [
            {
              text: 'OK',
              onPress: () => {
                loadSubscriptionStatus();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to cancel subscription'
      );
    } finally {
      setCancelling(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isPopular = plan.popular;
    const isFree = plan.isFree || false;
    const isCurrentPlan = currentSubscription?.is_subscribed && 
                          currentSubscription?.plan === plan.duration;

    return (
      <View key={plan.id} style={styles.planCard}>
        {isFree && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeText}>🎉 LIMITED OFFER</Text>
          </View>
        )}
        {isPopular && !isFree && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}
        
        <Text style={styles.planName}>{plan.name}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.currency}>₹</Text>
          <Text style={styles.price}>{plan.price}</Text>
          {plan.originalPrice && plan.originalPrice > 0 && (
            <Text style={styles.originalPrice}>₹{plan.originalPrice}</Text>
          )}
          <Text style={styles.duration}>/{plan.duration === 'monthly' ? 'month' : 'year'}</Text>
        </View>

        {isFree && plan.promoMessage && (
          <View style={styles.promoMessageBadge}>
            <Text style={styles.promoMessageText}>{plan.promoMessage}</Text>
          </View>
        )}

        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{plan.savings}</Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.subscribeButton, (isPopular || isFree) && styles.popularButton]}
            onPress={() => handleSubscribe(plan.id, isFree)}
            disabled={processing}
          >
            <LinearGradient
              colors={isFree ? ['#4CAF50', '#45B049'] : isPopular ? ['#FF6FB5', '#A16AE8'] : ['#7C2B86', '#5D5FEF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{isFree ? 'Claim Free Subscription' : 'Subscribe Now'}</Text>
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
            <ActivityIndicator size="large" color="#FF6FB5" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1F1147', '#2D1B69']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Current Subscription Status */}
          {currentSubscription?.is_subscribed && (
            <View style={styles.statusCard}>
              <Ionicons 
                name={currentSubscription.is_cancelled ? "time-outline" : "checkmark-circle"} 
                size={32} 
                color={currentSubscription.is_cancelled ? "#FFA500" : "#4CAF50"} 
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>
                  {currentSubscription.is_cancelled ? 'Subscription Ending' : 'Active Subscription'}
                </Text>
                <Text style={styles.statusText}>
                  {currentSubscription.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                </Text>
                <Text style={styles.statusExpiry}>
                  {currentSubscription.is_cancelled ? 'Access until: ' : 'Expires: '}
                  {new Date(currentSubscription.expires_at).toLocaleDateString()}
                </Text>
                {currentSubscription.is_cancelled && (
                  <Text style={styles.cancelledNote}>
                    Subscription cancelled - No auto-renewal
                  </Text>
                )}
              </View>
              {!currentSubscription.is_cancelled && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#FF6B6B" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map(renderPlanCard)}
          </View>

          {/* Info Section */}
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
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  statusExpiry: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cancelledNote: {
    fontSize: 11,
    color: '#FFA500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  plansContainer: {
    marginBottom: 24,
  },
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
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freeBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  freeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoMessageBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  promoMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  originalPrice: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6FB5',
  },
  price: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  duration: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
  },
  savingsBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 12,
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  popularButton: {
    shadowColor: '#FF6FB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  currentPlanButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 111, 181, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 181, 0.2)',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6FB5',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginLeft: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
