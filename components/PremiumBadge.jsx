import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

export const PremiumBadge = ({ 
  size = 'small', 
  style = {}, 
  showText = true,
  plan = 'premium' 
}) => {
  const sizes = {
    small: {
      container: { width: 60, height: 20 },
      text: { fontSize: 10 },
      icon: 14
    },
    medium: {
      container: { width: 80, height: 24 },
      text: { fontSize: 12 },
      icon: 16
    },
    large: {
      container: { width: 100, height: 30 },
      text: { fontSize: 14 },
      icon: 18
    }
  };

  const currentSize = sizes[size] || sizes.small;

  const getGradientColors = () => {
    switch (plan) {
      case 'premium_plus':
        return ['#FFD700', '#FFA500']; // Gold gradient
      case 'premium':
        return ['#7C2B86', '#A16AE8']; // Purple gradient
      default:
        return ['#7C2B86', '#A16AE8'];
    }
  };

  const getBadgeText = () => {
    switch (plan) {
      case 'premium_plus':
        return 'PREMIUM+';
      case 'premium':
        return 'PREMIUM';
      default:
        return 'PREMIUM';
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={[
        styles.badge,
        currentSize.container,
        style
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        <Ionicons 
          name="diamond" 
          size={currentSize.icon} 
          color="#FFFFFF" 
          style={styles.icon}
        />
        {showText && (
          <Text style={[styles.text, currentSize.text]}>
            {getBadgeText()}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

export const PremiumIcon = ({ size = 16, color = '#7C2B86', style = {} }) => (
  <View style={[styles.iconContainer, style]}>
    <Ionicons name="diamond" size={size} color={color} />
  </View>
);

export const PremiumLabel = ({ 
  plan = 'premium', 
  style = {},
  textStyle = {} 
}) => {
  const getLabel = () => {
    switch (plan) {
      case 'premium_plus':
        return 'Premium+';
      case 'premium':
        return 'Premium';
      default:
        return 'Premium';
    }
  };

  const getColor = () => {
    switch (plan) {
      case 'premium_plus':
        return '#FFD700';
      case 'premium':
        return '#7C2B86';
      default:
        return '#7C2B86';
    }
  };

  return (
    <View style={[styles.labelContainer, style]}>
      <PremiumIcon size={14} color={getColor()} />
      <Text style={[styles.labelText, { color: getColor() }, textStyle]}>
        {getLabel()}
      </Text>
    </View>
  );
};

// Enhanced Profile badge with premium look
export const ProfilePremiumBadge = ({ plan = 'premium', size = 'medium', style = {} }) => {
  const getGradientColors = () => {
    switch (plan) {
      case 'premium_plus':
        return ['#FFD700', '#FFA500', '#FF8C00']; // Gold to orange gradient
      case 'premium':
        return ['#7C2B86', '#A16AE8', '#C084FC']; // Purple gradient
      default:
        return ['#7C2B86', '#A16AE8', '#C084FC'];
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 8, paddingVertical: 3 },
          text: { fontSize: 9 },
          icon: 10
        };
      case 'large':
        return {
          container: { paddingHorizontal: 14, paddingVertical: 6 },
          text: { fontSize: 12 },
          icon: 16
        };
      default: // medium
        return {
          container: { paddingHorizontal: 10, paddingVertical: 4 },
          text: { fontSize: 10 },
          icon: 12
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.premiumBadgeContainer, style]}>
      {/* Glow effect background */}
      <View style={[styles.glowEffect, { 
        backgroundColor: plan === 'premium_plus' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(124, 43, 134, 0.3)' 
      }]} />
      
      <LinearGradient
        colors={getGradientColors()}
        style={[styles.premiumBadgeGradient, sizeStyles.container]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Inner glow */}
        <View style={styles.innerGlow}>
          <View style={styles.badgeContent}>
            <Ionicons 
              name="diamond" 
              size={sizeStyles.icon} 
              color="#FFFFFF" 
              style={styles.diamondIcon}
            />
            <Text style={[styles.premiumBadgeText, sizeStyles.text]}>
              {plan === 'premium_plus' ? 'PREMIUM+' : 'PREMIUM'}
            </Text>
          </View>
        </View>
        
        {/* Shine effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)', 'transparent']}
          style={styles.shineEffect}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </LinearGradient>
    </View>
  );
};

// Chat badge that appears next to usernames in chat
export const ChatPremiumBadge = ({ plan = 'premium', style = {} }) => (
  <View style={[styles.chatBadge, style]}>
    <Ionicons 
      name="diamond" 
      size={12} 
      color={plan === 'premium_plus' ? '#FFD700' : '#7C2B86'} 
    />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 2,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Enhanced premium badge styles
  premiumBadgeContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    opacity: 0.6,
  },
  premiumBadgeGradient: {
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 2,
  },
  diamondIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  // Legacy styles for backward compatibility
  profileBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatBadge: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PremiumBadge;
