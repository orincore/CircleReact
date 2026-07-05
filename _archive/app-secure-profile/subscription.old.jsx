import { useAuth } from '@/contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';

export default function SubscriptionPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    if (token) {
      loadPlans();
      loadSubscriptionStatus();
    } else {
      setLoading(false);
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


  const handleSubscribe = async (planId) => {
    if (!token) {
      Alert.alert('Error', 'Please login to subscribe');
      return;
    }

    setProcessing(true);
    try {
      // Create order
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

  // Don't render if not authenticated
  if (!token || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']}
          style={styles.backgroundGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Authentication Required</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Please Log In</Text>
              <Text style={styles.heroSubtitle}>
                You need to be logged in to access subscription features.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (showPaymentForm) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']}
          style={styles.backgroundGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowPaymentForm(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment</Text>
          </View>

          <PaymentForm
            planType={selectedPlan}
            token={token}
            onSuccess={async (data) => {
              const isDemo = data?.demo;
              
              // Refresh both user data and subscription data
              if (!isDemo) {
                try {
                  // Small delay to ensure backend has processed the subscription
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await Promise.all([
                    refreshUser(),
                    fetchSubscription()
                  ]);
                } catch (error) {
                  console.error('Failed to refresh data after payment:', error);
                }
              }
              
              if (Platform.OS === 'web') {
                window.alert(
                  isDemo 
                    ? 'Demo Success!\n\nDemo subscription activated! In a real app, you would now have premium features.'
                    : 'Success!\n\nYour subscription has been activated! You now have access to premium features.'
                );
                router.back();
              } else {
                Alert.alert(
                  isDemo ? 'Demo Success!' : 'Success!',
                  isDemo 
                    ? 'Demo subscription activated! In a real app, you would now have premium features.'
                    : 'Your subscription has been activated! You now have access to premium features.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        router.back();
                      }
                    }
                  ]
                );
              }
            }}
            onCancel={() => setShowPaymentForm(false)}
          />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.limitedOfferBadge}>
              <Ionicons name="flash" size={20} color="#FFD700" />
              <Text style={styles.limitedOfferText}>LIMITED TIME OFFER</Text>
              <Ionicons name="flash" size={20} color="#FFD700" />
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="diamond" size={48} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Get Premium for FREE!</Text>
            <Text style={styles.offerPrice}>
              <Text style={styles.originalPrice}>$9.99</Text>
              <Text style={styles.freePrice}> $0</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              🎉 Special launch offer - Get full premium access at no cost!
            </Text>
            <View style={styles.offerTimer}>
              <Ionicons name="time-outline" size={16} color="#FF6FB5" />
              <Text style={styles.offerTimerText}>Offer ends soon - Claim now!</Text>
            </View>
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.selectedPlan
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                <LinearGradient
                  colors={plan.gradient}
                  style={styles.planGradient}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.planOriginalPrice}>{plan.originalPrice}</Text>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                  </View>

                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedPlan === plan.id && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={24} color="#00FF94" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7C2B86', '#A16AE8']}
              style={styles.subscribeGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="gift" size={24} color="#FFD700" />
                  <Text style={styles.subscribeText}>
                    Claim FREE {plans.find(p => p.id === selectedPlan)?.name}
                  </Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE</Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Features Highlight */}
          <View style={styles.highlightSection}>
            <Text style={styles.highlightTitle}>Why Upgrade?</Text>
            <View style={styles.highlightItem}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>See Instagram Usernames</Text>
                <Text style={styles.highlightItemDesc}>View full Instagram profiles of other users</Text>
              </View>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="infinite" size={24} color="#00FF94" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>Unlimited Matches</Text>
                <Text style={styles.highlightItemDesc}>No daily limits on finding connections</Text>
              </View>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>Premium Badge</Text>
                <Text style={styles.highlightItemDesc}>Stand out with a premium profile badge</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  limitedOfferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  limitedOfferText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  offerPrice: {
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
  freePrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00FF94',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  offerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 111, 181, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  offerTimerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6FB5',
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  selectedPlan: {
    transform: [{ scale: 1.02 }],
  },
  planGradient: {
    padding: 24,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a0b2e',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planOriginalPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 40,
    fontWeight: '900',
    color: '#00FF94',
  },
  planPeriod: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  subscribeButton: {
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  freeBadge: {
    backgroundColor: '#00FF94',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1a0b2e',
    letterSpacing: 1,
  },
  highlightSection: {
    marginBottom: 40,
  },
  highlightTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
  },
  highlightText: {
    flex: 1,
  },
  highlightItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  highlightItemDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
});
