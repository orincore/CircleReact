import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeaturesPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    {
      icon: 'ban',
      title: 'No Swiping Required',
      description: 'Tired of endless swiping? Our intelligent AI does the work for you, automatically finding and suggesting perfect matches based on deep compatibility analysis.',
      color: '#FF6FB5',
      gradient: ['#FF6FB5', '#FF8CC5'],
      benefits: ['Save time', 'Reduce fatigue', 'Better matches'],
    },
    {
      icon: 'sparkles',
      title: 'AI-Powered Smart Matching',
      description: 'Advanced machine learning algorithms analyze your interests, personality traits, location preferences, and behavior patterns to find truly compatible connections.',
      color: '#A16AE8',
      gradient: ['#A16AE8', '#B88EF0'],
      benefits: ['Deep compatibility', 'Personalized results', 'Continuous learning'],
    },
    {
      icon: 'location',
      title: 'Location-Based Discovery',
      description: 'Find people nearby or explore connections worldwide. Flexible distance settings let you control your search radius from local to international.',
      color: '#5D5FEF',
      gradient: ['#5D5FEF', '#7D7FF5'],
      benefits: ['Nearby matches', 'Global reach', 'Custom radius'],
    },
    {
      icon: 'chatbubbles',
      title: 'Real-Time Communication',
      description: 'Connect instantly with secure messaging, crystal-clear voice calls, and high-quality video chats. Share photos, videos, and moments seamlessly.',
      color: '#10B981',
      gradient: ['#10B981', '#34D399'],
      benefits: ['Instant messaging', 'Voice & video calls', 'Media sharing'],
    },
    {
      icon: 'heart',
      title: 'Interest-Based Matching',
      description: 'Select from hundreds of interests across multiple categories. Our system finds people who share your passions, hobbies, and lifestyle preferences.',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#FBBF24'],
      benefits: ['500+ interests', 'Multiple categories', 'Shared passions'],
    },
    {
      icon: 'shield-checkmark',
      title: 'Verified & Safe',
      description: 'Profile verification, 24/7 moderation, and advanced privacy controls ensure a safe, authentic experience. Report and block features keep you protected.',
      color: '#EF4444',
      gradient: ['#EF4444', '#F87171'],
      benefits: ['Verified profiles', '24/7 moderation', 'Privacy controls'],
    },
    {
      icon: 'eye-off',
      title: 'Invisible Mode',
      description: 'Need privacy? Enable invisible mode to browse profiles without being seen. Perfect for when you want to explore discreetly.',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#A78BFA'],
      benefits: ['Browse privately', 'Control visibility', 'Flexible privacy'],
    },
    {
      icon: 'notifications',
      title: 'Smart Notifications',
      description: 'Get notified about new matches, messages, and profile visits. Customize notification preferences to stay informed without being overwhelmed.',
      color: '#EC4899',
      gradient: ['#EC4899', '#F472B6'],
      benefits: ['Real-time alerts', 'Customizable', 'Never miss a match'],
    },
    {
      icon: 'map',
      title: 'Interactive Map View',
      description: 'Visualize nearby users on an interactive map. See who\'s around you in real-time and discover connections in your area.',
      color: '#06B6D4',
      gradient: ['#06B6D4', '#22D3EE'],
      benefits: ['Visual discovery', 'Real-time updates', 'Area exploration'],
    },
    {
      icon: 'star',
      title: 'Premium Features',
      description: 'Upgrade to unlock unlimited matches, advanced filters, priority support, read receipts, and exclusive features designed for serious connections.',
      color: '#FFD700',
      gradient: ['#FFD700', '#FFA500'],
      benefits: ['Unlimited matches', 'Advanced filters', 'Priority support'],
    },
    {
      icon: 'people',
      title: 'Friendship & Dating',
      description: 'Looking for friends, romance, or both? Customize your preferences to find exactly what you\'re looking for. One app, multiple connection types.',
      color: '#7C2B86',
      gradient: ['#7C2B86', '#A16AE8'],
      benefits: ['Dual purpose', 'Flexible goals', 'Diverse community'],
    },
    {
      icon: 'analytics',
      title: 'Match Score Analytics',
      description: 'See detailed compatibility scores and insights for each match. Understand why you\'re compatible and what you have in common.',
      color: '#3B82F6',
      gradient: ['#3B82F6', '#60A5FA'],
      benefits: ['Compatibility scores', 'Detailed insights', 'Common interests'],
    },
  ];

  return (
    <LinearGradient
      colors={['#1F1147', '#2D1B69', '#1F1147']}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFE8FF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <Animated.View 
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8']}
                style={styles.heroIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="sparkles" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            <Text style={styles.heroTitle}>
              Powerful Features for{'\n'}
              <Text style={styles.heroTitleAccent}>Meaningful Connections</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              Discover all the innovative features that make Circle the smartest way to find friends and love without endless swiping.
            </Text>
          </Animated.View>

          {/* Features Grid */}
          <View style={[styles.featuresContainer, isLargeScreen && styles.featuresContainerLarge]}>
            {features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  isLargeScreen && styles.featureCardLarge,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 30],
                        outputRange: [0, 30 + (index * 5)],
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={feature.gradient}
                  style={styles.featureIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={feature.icon} size={32} color="#FFFFFF" />
                </LinearGradient>

                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                  
                  <View style={styles.benefitsList}>
                    {feature.benefits.map((benefit, idx) => (
                      <View key={idx} style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={16} color={feature.color} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>Ready to Experience Circle?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of people finding meaningful connections today
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => router.push('/signup')}
            >
              <LinearGradient
                colors={['#FF6FB5', '#A16AE8']}
                style={styles.ctaButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.ctaButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 Circle. All rights reserved.
            </Text>
            <Text style={styles.footerBranding}>
              An App by ORINCORE Technologies
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.2)',
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 24,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  heroTitleAccent: {
    color: '#FFD6F2',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 600,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  featuresContainerLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  featureCardLarge: {
    width: 'calc(50% - 10px)',
    minWidth: 400,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 22,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 40,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  footerBranding: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
