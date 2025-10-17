package com.orincore.Circle;

import android.app.Activity;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.List;

/**
 * Google Play Billing Library v6+ Module for React Native
 * Handles in-app purchases and subscriptions
 */
public class BillingModule extends ReactContextBaseJavaModule implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private final ReactApplicationContext reactContext;

    public BillingModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeBillingClient();
    }

    @NonNull
    @Override
    public String getName() {
        return "BillingModule";
    }

    /**
     * Initialize the Billing Client with v6+ API
     */
    private void initializeBillingClient() {
        billingClient = BillingClient.newBuilder(reactContext)
                .setListener(this)
                .enablePendingPurchases() // Required for v6+
                .build();

        // Start connection
        connectToBillingService(null);
    }

    /**
     * Connect to Google Play Billing Service
     */
    @ReactMethod
    public void connectToBillingService(@Nullable Promise promise) {
        if (billingClient.isReady()) {
            if (promise != null) {
                promise.resolve("Already connected");
            }
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    // Billing client is ready
                    if (promise != null) {
                        promise.resolve("Connected successfully");
                    }
                } else {
                    if (promise != null) {
                        promise.reject("BILLING_ERROR", "Failed to connect: " + billingResult.getDebugMessage());
                    }
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Connection lost, retry
                if (promise != null) {
                    promise.reject("BILLING_DISCONNECTED", "Billing service disconnected");
                }
            }
        });
    }

    /**
     * Query available products/subscriptions
     */
    @ReactMethod
    public void queryProducts(Promise promise) {
        if (!billingClient.isReady()) {
            promise.reject("BILLING_NOT_READY", "Billing client not ready");
            return;
        }

        // Define product IDs (replace with your actual product IDs)
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        
        // Subscription products
        productList.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId("circle_monthly_subscription")
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );
        
        productList.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId("circle_yearly_subscription")
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(@NonNull BillingResult billingResult,
                                                  @NonNull List<ProductDetails> productDetailsList) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    WritableArray products = Arguments.createArray();
                    
                    for (ProductDetails productDetails : productDetailsList) {
                        WritableMap product = Arguments.createMap();
                        product.putString("productId", productDetails.getProductId());
                        product.putString("title", productDetails.getTitle());
                        product.putString("description", productDetails.getDescription());
                        
                        // Get subscription offer details
                        if (productDetails.getSubscriptionOfferDetails() != null && 
                            !productDetails.getSubscriptionOfferDetails().isEmpty()) {
                            ProductDetails.SubscriptionOfferDetails offerDetails = 
                                productDetails.getSubscriptionOfferDetails().get(0);
                            
                            if (offerDetails.getPricingPhases() != null && 
                                !offerDetails.getPricingPhases().getPricingPhaseList().isEmpty()) {
                                ProductDetails.PricingPhase pricingPhase = 
                                    offerDetails.getPricingPhases().getPricingPhaseList().get(0);
                                
                                product.putString("price", pricingPhase.getFormattedPrice());
                                product.putString("currency", pricingPhase.getPriceCurrencyCode());
                            }
                        }
                        
                        products.pushMap(product);
                    }
                    
                    promise.resolve(products);
                } else {
                    promise.reject("QUERY_ERROR", "Failed to query products: " + billingResult.getDebugMessage());
                }
            }
        });
    }

    /**
     * Purchase a product/subscription
     */
    @ReactMethod
    public void purchaseProduct(String productId, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity");
            return;
        }

        if (!billingClient.isReady()) {
            promise.reject("BILLING_NOT_READY", "Billing client not ready");
            return;
        }

        // First query the product details
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        );

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(@NonNull BillingResult billingResult,
                                                  @NonNull List<ProductDetails> productDetailsList) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && 
                    !productDetailsList.isEmpty()) {
                    
                    ProductDetails productDetails = productDetailsList.get(0);
                    
                    // Get the offer token
                    if (productDetails.getSubscriptionOfferDetails() != null && 
                        !productDetails.getSubscriptionOfferDetails().isEmpty()) {
                        
                        String offerToken = productDetails.getSubscriptionOfferDetails().get(0).getOfferToken();
                        
                        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                        productDetailsParamsList.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .setOfferToken(offerToken)
                                .build()
                        );

                        BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                                .setProductDetailsParamsList(productDetailsParamsList)
                                .build();

                        BillingResult result = billingClient.launchBillingFlow(activity, billingFlowParams);
                        
                        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                            promise.resolve("Purchase flow launched");
                        } else {
                            promise.reject("PURCHASE_ERROR", "Failed to launch purchase: " + result.getDebugMessage());
                        }
                    } else {
                        promise.reject("NO_OFFERS", "No subscription offers available");
                    }
                } else {
                    promise.reject("PRODUCT_NOT_FOUND", "Product not found");
                }
            }
        });
    }

    /**
     * Query existing purchases
     */
    @ReactMethod
    public void queryPurchases(Promise promise) {
        if (!billingClient.isReady()) {
            promise.reject("BILLING_NOT_READY", "Billing client not ready");
            return;
        }

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(params, (billingResult, purchasesList) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                WritableArray purchases = Arguments.createArray();
                
                for (Purchase purchase : purchasesList) {
                    WritableMap purchaseMap = Arguments.createMap();
                    purchaseMap.putString("orderId", purchase.getOrderId());
                    purchaseMap.putString("purchaseToken", purchase.getPurchaseToken());
                    purchaseMap.putBoolean("acknowledged", purchase.isAcknowledged());
                    
                    WritableArray products = Arguments.createArray();
                    for (String product : purchase.getProducts()) {
                        products.pushString(product);
                    }
                    purchaseMap.putArray("products", products);
                    
                    purchases.pushMap(purchaseMap);
                }
                
                promise.resolve(purchases);
            } else {
                promise.reject("QUERY_ERROR", "Failed to query purchases: " + billingResult.getDebugMessage());
            }
        });
    }

    /**
     * Handle purchase updates
     */
    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                // Handle successful purchase
                // You should acknowledge the purchase and grant entitlement
                handlePurchase(purchase);
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            // User canceled the purchase
        } else {
            // Handle other error codes
        }
    }

    /**
     * Handle individual purchase
     */
    private void handlePurchase(Purchase purchase) {
        // Verify purchase on your backend server
        // Then acknowledge the purchase
        // Grant entitlement to the user
    }

    /**
     * End billing client connection
     */
    @ReactMethod
    public void endConnection() {
        if (billingClient != null && billingClient.isReady()) {
            billingClient.endConnection();
        }
    }
}
