import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import PaymentForm from '@/components/PaymentForm';

export default function SubscriptionPage() {
  const router = useRouter();
  const { token, user, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { subscribeToPremium, fetchSubscription } = useSubscription();

  // Check authentication
  React.useEffect(() => {
    if (!token || !user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to access subscription features.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  }, [token, user, router]);

  const plans = [
    {
      id: 'premium',
      name: 'Premium',
      price: '$9.99',
      period: '/month',
      popular: true,
      features: [
        'Unlimited matches',
        'See Instagram usernames',
        'Ad-free experience',
        'Premium badge',
        'Priority support',
        'Advanced filters'
      ],
      gradient: ['#7C2B86', '#A16AE8']
    },
    {
      id: 'premium_plus',
      name: 'Premium Plus',
      price: '$19.99',
      period: '/month',
      features: [
        'Everything in Premium',
        'See who liked you',
        'Boost your profile',
        'Super likes',
        'Read receipts',
        'Incognito mode'
      ],
      gradient: ['#FF6B6B', '#FF8E53']
    }
  ];

  const handleSubscribe = async () => {
    if (!token || !user) {
      Alert.alert('Error', 'Please log in to subscribe.');
      return;
    }

    if (showPaymentForm) {
      setShowPaymentForm(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Starting subscription process for plan:', selectedPlan);
      console.log('User authenticated:', !!token, !!user);
      
      const result = await subscribeToPremium(selectedPlan, token);
      console.log('Subscription result:', result);
      
      if (result && result.success) {
        Alert.alert(
          'Success!',
          'Your subscription has been activated. You now have access to premium features!',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchSubscription();
                router.back();
              }
            }
          ]
        );
      } else {
        console.log('Subscription not successful, showing payment form');
        setShowPaymentForm(true);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      
      // Handle specific authentication errors
      if (error.message && error.message.includes('Not authenticated')) {
        Alert.alert(
          'Authentication Error', 
          'Please log out and log back in, then try again.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to process subscription. Please try again.');
      }
    } finally {
      setLoading(false);
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
            <View style={styles.heroIcon}>
              <Ionicons name="diamond" size={48} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Unlock Premium Features</Text>
            <Text style={styles.heroSubtitle}>
              Get access to Instagram usernames, unlimited matches, and more!
            </Text>
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
                  <Ionicons name="diamond" size={20} color="#FFD700" />
                  <Text style={styles.subscribeText}>
                    Subscribe to {plans.find(p => p.id === selectedPlan)?.name}
                  </Text>
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
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
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
