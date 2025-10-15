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
        // Store order_id for verification after return
        window.sessionStorage.setItem('pending_order_id', order_id);
        
        // Load Cashfree SDK from CDN and open checkout
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => {
          const cashfree = window.Cashfree({
            mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
          });
          
          cashfree.checkout({
            paymentSessionId: payment_session_id,
            redirectTarget: '_self'
          });
        };
        document.head.appendChild(script);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']}
          style={styles.backgroundGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6FB5" />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Subscription Status */}
          {currentSubscription?.is_subscribed && (
            <View style={styles.statusCard}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Active Subscription</Text>
                <Text style={styles.statusText}>
                  {currentSubscription.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                </Text>
                <Text style={styles.statusExpiry}>
                  Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="diamond" size={48} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Upgrade to Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock premium features and enhance your experience
            </Text>
          </View>

          {/* Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isCurrentPlan = currentSubscription?.is_subscribed && 
                                    currentSubscription?.plan === plan.duration;
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                  disabled={isCurrentPlan}
                >
                  <LinearGradient
                    colors={plan.popular ? ['#FF6FB5', '#A16AE8'] : ['#7C2B86', '#5D5FEF']}
                    style={styles.planGradient}
                  >
                    {plan.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>MOST POPULAR</Text>
                      </View>
                    )}
                    
                    {plan.savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{plan.savings}</Text>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <View style={styles.priceContainer}>
                        <Text style={styles.currency}>₹</Text>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                        <Text style={styles.planPeriod}>/{plan.duration === 'monthly' ? 'month' : 'year'}</Text>
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

                    {selectedPlan === plan.id && !isCurrentPlan && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color="#00FF94" />
                      </View>
                    )}

                    {isCurrentPlan && (
                      <View style={styles.currentPlanBadge}>
                        <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subscribe Button */}
          {!currentSubscription?.is_subscribed && (
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(selectedPlan)}
              disabled={processing}
            >
              <LinearGradient
                colors={['#7C2B86', '#A16AE8']}
                style={styles.subscribeGradient}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="card" size={24} color="#FFFFFF" />
                    <Text style={styles.subscribeText}>
                      Subscribe Now
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Features Highlight */}
          <View style={styles.highlightSection}>
            <Text style={styles.highlightTitle}>Why Upgrade?</Text>
            <View style={styles.highlightItem}>
              <Ionicons name="infinite" size={24} color="#00FF94" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>Unlimited Matches</Text>
                <Text style={styles.highlightItemDesc}>No daily limits on finding connections</Text>
              </View>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="eye-off" size={24} color="#FFD700" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>Ad-Free Experience</Text>
                <Text style={styles.highlightItemDesc}>Enjoy the app without any advertisements</Text>
              </View>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="headset" size={24} color="#FF6FB5" />
              <View style={styles.highlightText}>
                <Text style={styles.highlightItemTitle}>Priority Support</Text>
                <Text style={styles.highlightItemDesc}>Get help faster with priority customer support</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
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
  savingsBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planPeriod: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
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
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  currentPlanBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  currentPlanText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
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
    gap: 12,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
