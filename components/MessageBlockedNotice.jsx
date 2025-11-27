import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Component shown when a message is blocked for containing personal info
 * Used in blind date anonymous chat
 */
const MessageBlockedNotice = ({
  visible,
  reason,
  detectedTypes = [],
  onDismiss,
  onLearnMore,
}) => {
  const { theme } = useTheme();
  
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };
  
  if (!visible) return null;
  
  // Map detected types to friendly names
  const typeLabels = {
    phone_number: 'Phone Number',
    email: 'Email Address',
    instagram: 'Instagram Handle',
    snapchat: 'Snapchat Username',
    whatsapp: 'WhatsApp Number',
    facebook: 'Facebook Profile',
    twitter: 'Twitter Handle',
    social_media: 'Social Media',
    full_name: 'Full Name',
    address: 'Address',
    workplace: 'Workplace',
    school: 'School/University',
    username: 'Username',
    location_specific: 'Specific Location',
    other_identifier: 'Personal Identifier',
  };
  
  const detectedLabels = detectedTypes.map(type => typeLabels[type] || type);
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: theme.warning + '15',
          borderColor: theme.warning + '30',
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.warning + '20' }]}>
          <Ionicons name="shield" size={24} color={theme.warning} />
        </View>
        
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Message Not Sent
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Your message contains personal information that can't be shared during anonymous chat.
          </Text>
          
          {detectedLabels.length > 0 && (
            <View style={styles.detectedTypes}>
              <Text style={[styles.detectedLabel, { color: theme.textSecondary }]}>
                Detected:
              </Text>
              <View style={styles.typesList}>
                {detectedLabels.map((label, index) => (
                  <View 
                    key={index}
                    style={[styles.typeChip, { backgroundColor: theme.warning + '20' }]}
                  >
                    <Text style={[styles.typeText, { color: theme.warning }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            💡 Tip: Remove personal details and try again. You can share this info after you both reveal your identities.
          </Text>
        </View>
        
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      
      {onLearnMore && (
        <TouchableOpacity 
          onPress={onLearnMore}
          style={[styles.learnMoreButton, { borderTopColor: theme.warning + '20' }]}
        >
          <Text style={[styles.learnMoreText, { color: theme.warning }]}>
            Learn more about anonymous chat
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.warning} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  detectedTypes: {
    marginTop: 10,
  },
  detectedLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  typesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MessageBlockedNotice;

