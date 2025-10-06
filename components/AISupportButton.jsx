import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import EnhancedAIChat from './EnhancedAIChat';

const AISupportButton = ({ 
  initialMessage = '', 
  style = {},
  size = 'medium',
  position = 'bottom-right' 
}) => {
  const [showChat, setShowChat] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));

  React.useEffect(() => {
    // Subtle pulsing animation to draw attention
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 48, height: 48, borderRadius: 24 };
      case 'large':
        return { width: 72, height: 72, borderRadius: 36 };
      default:
        return { width: 56, height: 56, borderRadius: 28 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom-left':
        return { ...baseStyles, bottom: 20, left: 20 };
      case 'bottom-center':
        return { ...baseStyles, bottom: 20, alignSelf: 'center' };
      case 'top-right':
        return { ...baseStyles, top: 60, right: 20 };
      case 'top-left':
        return { ...baseStyles, top: 60, left: 20 };
      default:
        return { ...baseStyles, bottom: 20, right: 20 };
    }
  };

  return (
    <>
      <Animated.View 
        style={[
          getPositionStyles(),
          { transform: [{ scale: pulseAnimation }] },
          style
        ]}
      >
        <TouchableOpacity
          style={[styles.button, getSizeStyles()]}
          onPress={() => setShowChat(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C2B86', '#5D5FEF']}
            style={[styles.gradient, getSizeStyles()]}
          >
            <Ionicons 
              name="chatbubble-ellipses" 
              size={getIconSize()} 
              color="#FFFFFF" 
            />
            
            {/* AI Sparkle indicator */}
            <Animated.View style={styles.sparkleIndicator}>
              <Ionicons name="sparkles" size={12} color="#FFD700" />
            </Animated.View>
          </LinearGradient>
          
          {/* Shadow */}
          <LinearGradient
            colors={['rgba(124, 43, 134, 0.3)', 'transparent']}
            style={[styles.shadow, getSizeStyles()]}
          />
        </TouchableOpacity>
      </Animated.View>

      <EnhancedAIChat
        visible={showChat}
        onClose={() => setShowChat(false)}
        initialMessage={initialMessage}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#7C2B86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    top: 4,
    opacity: 0.3,
  },
  sparkleIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
});

export default AISupportButton;
