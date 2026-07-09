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

// expo-router requires a platform-extensionless fallback file whenever
// `.native.jsx` / `.web.jsx` siblings exist (see index.native.jsx / index.web.jsx
// for the real iOS/Android and web implementations). This file is never
// actually reached on ios/android/web -- all three are covered by the more
// specific files -- so it deliberately avoids importing react-native-iap
// (which has no web binding) and just mirrors the read-only parts of the web
// screen as a safe universal fallback.

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
  const { subscription, isPremium } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);

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

  const renderPlanCard = (plan) => {
    const isPopular = plan.plan_id === 'yearly';
    const isCurrentPlan = isPremium && subscription?.subscription?.plan_id === plan.plan_id;

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

        {isCurrentPlan && (
          <View style={styles.currentPlanButton}>
            <Text style={styles.currentPlanText}>Current Plan</Text>
          </View>
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
});
