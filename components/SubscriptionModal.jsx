import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import PaymentForm from './PaymentForm';

export const SubscriptionModal = ({ visible, onClose, initialPlan = 'premium' }) => {
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { subscribeToPremium, fetchSubscription } = useSubscription();
  const { token } = useAuth();

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
      gradient: ['#FFD700', '#FFA500']
    }
  ];

  const handleSubscribe = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      // Refresh subscription data
      await fetchSubscription();
      onClose();
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      onClose();
    }
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    setShowPaymentForm(false);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1F1147', '#7C2B86']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <Ionicons name="diamond" size={48} color="#FFD700" />
            <Text style={styles.title}>Unlock Premium Features</Text>
            <Text style={styles.subtitle}>
              Get unlimited matches, see Instagram usernames, and enjoy an ad-free experience
            </Text>
          </View>

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
                  colors={selectedPlan === plan.id ? plan.gradient : ['#FFFFFF', '#FFFFFF']}
                  style={styles.planGradient}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planTitleContainer}>
                      <Text style={[
                        styles.planName,
                        selectedPlan === plan.id && styles.selectedPlanText
                      ]}>
                        {plan.name}
                      </Text>
                      {plan.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>POPULAR</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={[
                        styles.price,
                        selectedPlan === plan.id && styles.selectedPlanText
                      ]}>
                        {plan.price}
                      </Text>
                      <Text style={[
                        styles.period,
                        selectedPlan === plan.id && styles.selectedPlanText
                      ]}>
                        {plan.period}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <Ionicons 
                          name="checkmark-circle" 
                          size={16} 
                          color={selectedPlan === plan.id ? "#FFFFFF" : "#4CAF50"} 
                        />
                        <Text style={[
                          styles.featureText,
                          selectedPlan === plan.id && styles.selectedFeatureText
                        ]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {selectedPlan === plan.id && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="radio-button-on" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Why Choose Premium?</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="infinite" size={24} color="#FFD700" />
                <Text style={styles.benefitText}>Unlimited daily matches</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="logo-instagram" size={24} color="#FFD700" />
                <Text style={styles.benefitText}>See Instagram usernames</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="ban" size={24} color="#FFD700" />
                <Text style={styles.benefitText}>No ads interruption</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="diamond" size={24} color="#FFD700" />
                <Text style={styles.benefitText}>Premium badge on profile</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {!showPaymentForm ? (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleSubscribe}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.subscribeGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.subscribeText}>
                      Subscribe to {plans.find(p => p.id === selectedPlan)?.name}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <Text style={styles.disclaimer}>
              Cancel anytime. No commitment required.
            </Text>
          </View>
        ) : (
          <PaymentForm
            planType={selectedPlan}
            token={token}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        )}
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 32,
  },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlan: {
    borderColor: '#FFD700',
  },
  planGradient: {
    padding: 20,
    position: 'relative',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  selectedPlanText: {
    color: '#FFFFFF',
  },
  popularBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  popularText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1147',
  },
  period: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectedFeatureText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  benefitText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  subscribeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default SubscriptionModal;
