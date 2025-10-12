import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_BASE_URL } from '@/src/api/config';

export const PaymentForm = ({ 
  planType = 'premium', 
  token,
  onSuccess, 
  onError,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123',
    name: 'Test User'
  });
  const [paypalEmail, setPaypalEmail] = useState('test@example.com');

  const planDetails = {
    premium: {
      name: 'Premium',
      originalPrice: '$9.99',
      price: '$0',
      features: ['Unlimited matches', 'See Instagram usernames', 'Ad-free experience']
    },
    premium_plus: {
      name: 'Premium Plus',
      originalPrice: '$19.99',
      price: '$0',
      features: ['Everything in Premium', 'See who liked you', 'Profile boost']
    }
  };

  const currentPlan = planDetails[planType] || planDetails.premium;

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        throw new Error('Not authenticated - token not provided');
      }

      // Try real backend API first, fallback to demo mode if server issues
      const isDemoMode = false; // Set to true to force demo mode
      
      if (isDemoMode) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (Platform.OS === 'web') {
          window.alert(`Demo Payment Successful!\n\nWelcome to ${currentPlan.name}! This is a demo - no actual payment was processed.`);
          onSuccess?.({ 
            success: true, 
            plan: planType,
            demo: true 
          });
        } else {
          Alert.alert(
            'Demo Payment Successful!',
            `Welcome to ${currentPlan.name}! This is a demo - no actual payment was processed.`,
            [{ 
              text: 'OK', 
              onPress: () => onSuccess?.({ 
                success: true, 
                plan: planType,
                demo: true 
              }) 
            }]
          );
        }
        return;
      }

      // Prepare payment method data
      let paymentMethodData;
      
      switch (paymentMethod) {
        case 'card':
          paymentMethodData = {
            id: 'pm_test_card',
            type: 'card',
            last4: cardDetails.number.slice(-4),
            brand: 'visa',
            exp_month: parseInt(cardDetails.expiry.split('/')[0]),
            exp_year: parseInt('20' + cardDetails.expiry.split('/')[1])
          };
          break;
        case 'paypal':
          paymentMethodData = {
            id: 'pm_test_paypal',
            type: 'paypal',
            email: paypalEmail
          };
          break;
        case 'apple_pay':
          paymentMethodData = {
            id: 'pm_test_apple_pay',
            type: 'apple_pay',
            last4: '1234',
            brand: 'visa'
          };
          break;
        case 'google_pay':
          paymentMethodData = {
            id: 'pm_test_google_pay',
            type: 'google_pay',
            last4: '5678',
            brand: 'mastercard'
          };
          break;
        default:
          paymentMethodData = {
            id: 'pm_test_card',
            type: 'card',
            last4: '4242',
            brand: 'visa'
          };
      }

      // Process subscription payment
      const endpoint = `${API_BASE_URL}/api/payment/subscribe`;
      console.log('Attempting payment with:', {
        planType,
        paymentMethodData,
        endpoint,
        apiBaseUrl: API_BASE_URL
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_type: planType,
          payment_method: paymentMethodData
        })
      });

      console.log('Payment response status:', response.status);
      console.log('Payment response headers:', response.headers);
      
      let data;
      try {
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        if (responseText) {
          data = JSON.parse(responseText);
          console.log('Payment response data:', data);
        } else {
          throw new Error('Empty response from server');
        }
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        console.error('Response was not valid JSON');
        throw new Error(`Invalid response from payment server: ${response.status}`);
      }

      if (response.ok && data.success) {
        if (Platform.OS === 'web') {
          window.alert(`Payment Successful!\n\nWelcome to ${currentPlan.name}! Your subscription is now active.`);
          onSuccess?.(data);
        } else {
          Alert.alert(
            'Payment Successful!',
            `Welcome to ${currentPlan.name}! Your subscription is now active.`,
            [{ text: 'OK', onPress: () => onSuccess?.(data) }]
          );
        }
      } else {
        // Handle specific error cases
        if (response.status === 409 && data?.code === 'DUPLICATE_SUBSCRIPTION') {
          throw new Error(data.error || 'You already have an active subscription.');
        } else if (response.status === 500) {
          throw new Error('Payment server is currently unavailable. Please try again later.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log out and log back in.');
        } else if (response.status === 404) {
          throw new Error('Payment service not found. Please contact support.');
        } else {
          throw new Error(data?.error || data?.message || `Payment failed (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = error.message || 'Something went wrong. Please try again.';
      
      // Handle network errors
      if (error.message && error.message.includes('Network request failed')) {
        errorMessage = `Cannot connect to payment server at ${API_BASE_URL}. Please check if the backend server is running.`;
      } else if (error.message && error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      }
      
      if (Platform.OS === 'web') {
        window.alert(`Payment Failed\n\n${errorMessage}`);
        onError?.(error);
      } else {
        Alert.alert(
          'Payment Failed',
          errorMessage,
          [{ text: 'OK', onPress: () => onError?.(error) }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestScenario = async (scenario) => {
    try {
      setLoading(true);
      
      if (!token) {
        throw new Error('Not authenticated - token not provided');
      }

      const response = await fetch(`${API_BASE_URL}/api/payment/simulate-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scenario })
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Test Payment\n\nScenario: ${scenario}\nStatus: ${data.payment_intent.status}`);
        } else {
          Alert.alert(
            'Test Payment',
            `Scenario: ${scenario}\nStatus: ${data.payment_intent.status}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(`Test Error\n\n${error.message}`);
      } else {
        Alert.alert('Test Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDemoMode = false; // Set to true for demo mode

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Demo Mode Banner - only show in demo mode */}
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.demoText}>
            Demo Mode: No actual payment will be processed
          </Text>
        </View>
      )}

      {/* Limited Offer Banner */}
      <View style={styles.offerBanner}>
        <Ionicons name="gift" size={24} color="#FFD700" />
        <View style={styles.offerBannerContent}>
          <Text style={styles.offerBannerTitle}>🎉 LIMITED TIME OFFER</Text>
          <Text style={styles.offerBannerText}>Get premium for FREE - No payment required!</Text>
        </View>
      </View>

      {/* Plan Summary */}
      <View style={styles.planSummary}>
        <LinearGradient
          colors={['#7C2B86', '#A16AE8']}
          style={styles.planGradient}
        >
          <Text style={styles.planName}>{currentPlan.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPriceText}>{currentPlan.originalPrice}</Text>
            <Text style={styles.planPrice}>{currentPlan.price}</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          </View>
          <View style={styles.planFeatures}>
            {currentPlan.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Payment Method Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        <View style={styles.paymentMethods}>
          {[
            { id: 'card', name: 'Credit Card', icon: 'card' },
            { id: 'paypal', name: 'PayPal', icon: 'logo-paypal' },
            { id: 'apple_pay', name: 'Apple Pay', icon: 'logo-apple' },
            { id: 'google_pay', name: 'Google Pay', icon: 'logo-google' }
          ].map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodButton,
                paymentMethod === method.id && styles.selectedPaymentMethod
              ]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Ionicons 
                name={method.icon} 
                size={24} 
                color={paymentMethod === method.id ? '#7C2B86' : '#666'} 
              />
              <Text style={[
                styles.paymentMethodText,
                paymentMethod === method.id && styles.selectedPaymentMethodText
              ]}>
                {method.name}
              </Text>
              {paymentMethod === method.id && (
                <Ionicons name="checkmark-circle" size={20} color="#7C2B86" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Payment Details */}
      {paymentMethod === 'card' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardDetails.number}
              onChangeText={(text) => setCardDetails({...cardDetails, number: text})}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Expiry</Text>
              <TextInput
                style={styles.input}
                value={cardDetails.expiry}
                onChangeText={(text) => setCardDetails({...cardDetails, expiry: text})}
                placeholder="MM/YY"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>CVC</Text>
              <TextInput
                style={styles.input}
                value={cardDetails.cvc}
                onChangeText={(text) => setCardDetails({...cardDetails, cvc: text})}
                placeholder="123"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              value={cardDetails.name}
              onChangeText={(text) => setCardDetails({...cardDetails, name: text})}
              placeholder="John Doe"
            />
          </View>
        </View>
      )}

      {paymentMethod === 'paypal' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PayPal Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PayPal Email</Text>
            <TextInput
              style={styles.input}
              value={paypalEmail}
              onChangeText={setPaypalEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
            />
          </View>
        </View>
      )}

      {/* Test Scenarios (Development Only) */}
      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Scenarios</Text>
          <View style={styles.testButtons}>
            {[
              { scenario: 'success', label: 'Success', color: '#4CAF50' },
              { scenario: 'decline', label: 'Decline', color: '#FF6B6B' },
              { scenario: 'insufficient_funds', label: 'Insufficient Funds', color: '#FF9800' },
              { scenario: 'network_error', label: 'Network Error', color: '#9C27B0' }
            ].map((test) => (
              <TouchableOpacity
                key={test.scenario}
                style={[styles.testButton, { backgroundColor: test.color }]}
                onPress={() => handleTestScenario(test.scenario)}
                disabled={loading}
              >
                <Text style={styles.testButtonText}>{test.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C2B86', '#A16AE8']}
            style={styles.payButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="gift" size={20} color="#FFD700" />
                <Text style={styles.payButtonText}>
                  Claim FREE Premium
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
        <Text style={styles.securityText}>
          Your payment information is secure and encrypted
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 12,
  },
  offerBannerContent: {
    flex: 1,
  },
  offerBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    marginBottom: 4,
  },
  offerBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  planSummary: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  planGradient: {
    padding: 20,
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  originalPriceText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'line-through',
  },
  planPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00FF94',
  },
  freeBadge: {
    backgroundColor: '#00FF94',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a0b2e',
    letterSpacing: 1,
  },
  planFeatures: {
    gap: 8,
    alignItems: 'flex-start',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#7C2B86',
    backgroundColor: 'rgba(124, 43, 134, 0.05)',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  selectedPaymentMethodText: {
    color: '#7C2B86',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  payButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    gap: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    flex: 1,
  },
});

export default PaymentForm;
