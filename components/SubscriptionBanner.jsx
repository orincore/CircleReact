import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export const SubscriptionBanner = ({ 
  isPremium = false, 
  plan = 'free', 
  onUpgradePress,
  style = {} 
}) => {
  if (isPremium && plan !== 'free') {
    // Premium Banner
    return (
      <View style={[styles.bannerContainer, style]}>
        <LinearGradient
          colors={plan === 'premium_plus' ? ['#FFD700', '#FFA500', '#FF8C00'] : ['#7C2B86', '#A16AE8', '#C084FC']}
          style={styles.premiumBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Glow effect */}
          <View style={[styles.glowEffect, { 
            backgroundColor: plan === 'premium_plus' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(124, 43, 134, 0.2)' 
          }]} />
          
          {/* Content */}
          <View style={styles.bannerContent}>
            <View style={styles.leftContent}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name="diamond" 
                  size={24} 
                  color="#FFFFFF" 
                  style={styles.icon}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.premiumTitle}>
                  {plan === 'premium_plus' ? 'PREMIUM+' : 'PREMIUM'} MEMBER
                </Text>
                <Text style={styles.premiumSubtitle}>
                  Enjoy unlimited features & priority support
                </Text>
              </View>
            </View>
            
            <View style={styles.rightContent}>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          </View>
          
          {/* Shine effect */}
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)', 'transparent']}
            style={styles.shineEffect}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </LinearGradient>
      </View>
    );
  } else {
    // Free Banner
    return (
      <TouchableOpacity 
        style={[styles.bannerContainer, style]} 
        onPress={onUpgradePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']}
          style={styles.freeBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Content */}
          <View style={styles.bannerContent}>
            <View style={styles.leftContent}>
              <View style={[styles.iconContainer, styles.freeIconContainer]}>
                <Ionicons 
                  name="person-outline" 
                  size={24} 
                  color="#64748B" 
                  style={styles.icon}
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.freeTitle}>FREE MEMBER</Text>
                <Text style={styles.freeSubtitle}>
                  Limited features • 3 matches per day
                </Text>
              </View>
            </View>
            
            <View style={styles.rightContent}>
              <View style={styles.upgradeButton}>
                <Ionicons name="arrow-up-circle" size={16} color="#7C2B86" />
                <Text style={styles.upgradeText}>Upgrade</Text>
              </View>
            </View>
          </View>
          
          {/* Border */}
          <View style={styles.freeBorder} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  
  // Premium Banner Styles
  premiumBanner: {
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    opacity: 0.6,
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  
  // Free Banner Styles
  freeBanner: {
    padding: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  freeBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#7C2B86',
    opacity: 0.3,
  },
  
  // Common Content Styles
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  
  // Icon Styles
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  freeIconContainer: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Text Styles
  textContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  premiumSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  freeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
  },
  freeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Status Badge (Premium)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Upgrade Button (Free)
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.3)',
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
});

export default SubscriptionBanner;
