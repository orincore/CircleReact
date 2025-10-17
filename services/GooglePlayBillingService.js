import { NativeModules, Platform } from 'react-native';

const { BillingModule } = NativeModules;

/**
 * Google Play Billing Service for React Native
 * Wrapper around native BillingModule
 */
class GooglePlayBillingService {
  /**
   * Initialize and connect to Google Play Billing
   */
  static async initialize() {
    if (Platform.OS !== 'android') {
      console.warn('Google Play Billing is only available on Android');
      return false;
    }

    if (!BillingModule) {
      console.error('BillingModule not found. Make sure it is properly linked.');
      return false;
    }

    try {
      const result = await BillingModule.connectToBillingService();
      console.log('✅ Billing Service Connected:', result);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to billing service:', error);
      return false;
    }
  }

  /**
   * Get available subscription products
   * @returns {Promise<Array>} List of available products
   */
  static async getSubscriptionProducts() {
    if (Platform.OS !== 'android' || !BillingModule) {
      return [];
    }

    try {
      const products = await BillingModule.queryProducts();
      console.log('📦 Available Products:', products);
      return products;
    } catch (error) {
      console.error('❌ Failed to query products:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription
   * @param {string} productId - Product ID (e.g., 'circle_monthly_subscription')
   * @returns {Promise<boolean>} Success status
   */
  static async purchaseSubscription(productId) {
    if (Platform.OS !== 'android' || !BillingModule) {
      console.warn('Billing not available');
      return false;
    }

    try {
      const result = await BillingModule.purchaseProduct(productId);
      console.log('✅ Purchase initiated:', result);
      return true;
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Get user's active purchases
   * @returns {Promise<Array>} List of active purchases
   */
  static async getUserPurchases() {
    if (Platform.OS !== 'android' || !BillingModule) {
      return [];
    }

    try {
      const purchases = await BillingModule.queryPurchases();
      console.log('🛒 User Purchases:', purchases);
      return purchases;
    } catch (error) {
      console.error('❌ Failed to query purchases:', error);
      return [];
    }
  }

  /**
   * Check if user has active subscription
   * @param {string} productId - Product ID to check
   * @returns {Promise<boolean>} True if user has active subscription
   */
  static async hasActiveSubscription(productId) {
    try {
      const purchases = await this.getUserPurchases();
      return purchases.some(purchase => 
        purchase.products.includes(productId) && 
        purchase.acknowledged
      );
    } catch (error) {
      console.error('❌ Failed to check subscription:', error);
      return false;
    }
  }

  /**
   * Check if user has any premium subscription
   * @returns {Promise<boolean>} True if user is premium
   */
  static async isPremiumUser() {
    try {
      const purchases = await this.getUserPurchases();
      return purchases.length > 0 && purchases.some(p => p.acknowledged);
    } catch (error) {
      console.error('❌ Failed to check premium status:', error);
      return false;
    }
  }

  /**
   * End billing connection (cleanup)
   */
  static async disconnect() {
    if (Platform.OS !== 'android' || !BillingModule) {
      return;
    }

    try {
      await BillingModule.endConnection();
      console.log('🔌 Billing Service Disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    }
  }
}

export default GooglePlayBillingService;

// Product IDs (must match Google Play Console)
export const SUBSCRIPTION_PRODUCTS = {
  MONTHLY: 'circle_monthly_subscription',
  YEARLY: 'circle_yearly_subscription',
};

// Helper function to format price
export const formatPrice = (price, currency = 'INR') => {
  if (!price) return '';
  return `${currency === 'INR' ? '₹' : currency} ${price}`;
};
