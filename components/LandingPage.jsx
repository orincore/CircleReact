import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Animated,
  Image,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';

export default function LandingPage({ onSignUp, onLogIn }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const mobileBottomPadding = !isLargeScreen && Platform.OS !== 'web' ? Math.max(insets.bottom, 16) + 80 : 0;
  const [scrollY, setScrollY] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Animation values
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

  const handleScroll = (event) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const scrollToSection = (sectionId) => {
    if (Platform.OS === 'web') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Pulse animation for hero icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  const features = [
    {
      icon: 'ban',
      title: 'No Swiping Required',
      description: 'Stop endless swiping! Our AI automatically finds and suggests your perfect matches based on deep compatibility analysis.',
      color: '#FF6FB5',
      gradient: ['#FF6FB5', '#FF8CC5'],
    },
    {
      icon: 'heart-circle',
      title: 'Smart AI Matching',
      description: 'Advanced AI algorithm analyzes interests, personality, and preferences to find truly compatible connections.',
      color: '#A16AE8',
      gradient: ['#A16AE8', '#B88EF0'],
    },
    {
      icon: 'navigate-circle',
      title: 'Location-Based Discovery',
      description: 'Find people nearby or explore connections worldwide. Your choice, your preferences.',
      color: '#5D5FEF',
      gradient: ['#5D5FEF', '#7D7FF5'],
    },
    {
      icon: 'chatbubble-ellipses',
      title: 'Real Connections',
      description: 'Instant messaging, voice & video calls. Build meaningful relationships through authentic conversations.',
      color: '#10B981',
      gradient: ['#10B981', '#34D399'],
    },
  ];

  // Auto-scroll carousel for mobile
  useEffect(() => {
    if (!isLargeScreen) {
      const interval = setInterval(() => {
        setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLargeScreen, features.length]);

  const testimonials = [
    {
      name: 'Sarah M.',
      text: 'Found my best friend and now we travel together! Circle changed my life.',
      avatar: '👩',
      rating: 5,
    },
    {
      name: 'James K.',
      text: 'The matching algorithm is incredible. Met my partner within a week!',
      avatar: '👨',
      rating: 5,
    },
    {
      name: 'Emma L.',
      text: 'Love the community features. Made so many genuine connections here.',
      avatar: '👱‍♀️',
      rating: 5,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Navigation Bar - Desktop Only */}
      {isLargeScreen && (
        <Animated.View 
          style={[
            styles.navbar,
            {
              backgroundColor: scrollY > 50 ? 'rgba(31, 17, 71, 0.98)' : 'rgba(31, 17, 71, 0.85)',
              borderBottomWidth: scrollY > 50 ? 1 : 0,
              borderBottomColor: 'rgba(255, 214, 242, 0.15)',
              backdropFilter: 'blur(20px)',
              boxShadow: scrollY > 50 ? '0 4px 30px rgba(124, 43, 134, 0.3)' : 'none',
            }
          ]}
        >
          <View style={[styles.navContent, styles.navContentLarge]}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoGlow}>
                  <Image 
                    source={require('@/assets/logo/circle-logo.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.logoTextContainer}>
                  <Text style={styles.logoName}>Circle</Text>
                  <Text style={styles.brandingText}>by ORINCORE</Text>
                </View>
              </View>
            </View>
            
            {/* Navigation Links */}
            <View style={styles.navLinks}>
              <TouchableOpacity 
                style={styles.navLink}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.location.href = '/features';
                  }
                }}
              >
                <Ionicons name="sparkles" size={16} color="#FFD6F2" style={styles.navLinkIcon} />
                <Text style={styles.navLinkText}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navLink} onPress={() => scrollToSection('how-it-works')}>
                <Ionicons name="rocket" size={16} color="#FFD6F2" style={styles.navLinkIcon} />
                <Text style={styles.navLinkText}>How It Works</Text>
              </TouchableOpacity>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.navActions}>
              <TouchableOpacity style={styles.navLoginBtn} onPress={onLogIn}>
                <Ionicons name="log-in-outline" size={18} color="#FFE8FF" />
                <Text style={styles.navLoginText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navSignupBtn} onPress={onSignUp}>
                <LinearGradient
                  colors={['#FF6FB5', '#A16AE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.navSignupGradient}
                >
                  <Ionicons name="person-add" size={18} color="#FFFFFF" />
                  <Text style={styles.navSignupText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, !isLargeScreen && { flexGrow: 1, paddingBottom: mobileBottomPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled
      >
        {/* Inauguration Banner - Desktop Only */}
        {isLargeScreen && (
          <View style={styles.inaugurationBanner}>
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.inaugurationGradient}
            >
              <View style={styles.inaugurationContent}>
                <Ionicons name="sparkles" size={24} color="#7C2B86" />
                <Text style={styles.inaugurationText}>
                  🎉 <Text style={styles.inaugurationBold}>Grand Launch!</Text> Circle is officially live today - Join the celebration and be among the first to find your perfect connections!
                </Text>
                <Ionicons name="sparkles" size={24} color="#7C2B86" />
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Hero Section */}
        <LinearGradient
          colors={isLargeScreen ? (isDarkMode ? ['#1F1147', '#7C2B86', '#5D5FEF'] : ['#7C2B86', '#A16AE8', '#5D5FEF']) : ['#1a0b2e', '#2d1b4e', '#1a0b2e']}
          locations={isLargeScreen ? [0, 0.5, 1] : [0, 0.5, 1]}
          style={[styles.heroSection, isLargeScreen && styles.heroSectionLarge]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View 
            style={[
              styles.heroContent,
              isLargeScreen && styles.heroContentLarge,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {isLargeScreen ? (
              <View style={styles.heroGrid}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroTitle}>
                    Where Meaningful{"\n"}
                    <Text style={styles.heroTitleAccent}>Connections Begin</Text>
                  </Text>
                  
                  <Text style={styles.heroSubtitle}>
                    Tired of endless swiping? Circle uses intelligent AI matching to find people who truly complement you — based on your personality, interests, and what you're looking for. No games, no gimmicks, just real connections.
                  </Text>
                  
                  <View style={styles.heroHighlights}>
                    <View style={styles.highlightItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.highlightText}>AI-Powered Matching</Text>
                    </View>
                    <View style={styles.highlightItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.highlightText}>No Swiping Required</Text>
                    </View>
                    <View style={styles.highlightItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.highlightText}>100% Free to Start</Text>
                    </View>
                  </View>
                  
                  {/* Stats removed for browser */}
                </View>
                
                <View style={styles.heroRight}>
                  <View style={styles.mockupContainer}>
                    <View style={styles.phoneWrapper}>
                      {/* Power Button */}
                      <View style={styles.powerButton} />
                      
                      {/* Volume Buttons */}
                      <View style={styles.volumeButtonUp} />
                      <View style={styles.volumeButtonDown} />
                      
                      <View style={styles.mockupPhone}>
                        <View style={styles.mockupScreen}>
                          <Image 
                            source={require('@/assets/images/screenshot.png')} 
                            style={styles.mockupScreenshot}
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <>
                {/* Mobile: Fixed Landing Page - Match Screen Theme */}
                <View style={styles.mobileFixedContainer}>
                  {/* Logo & Brand */}
                  <View style={styles.mobileHeader}>
                    <View style={styles.logoCircle}>
                      <Image 
                        source={require('@/assets/logo/circle-logo.png')} 
                        style={styles.mobileLogo}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.mobileAppName}>Circle</Text>
                    <Text style={styles.mobileTagline}>Find Your People</Text>
                  </View>

                  {/* Premium Features Grid */}
                  <View style={styles.premiumFeaturesGrid}>
                    <Text style={styles.featuresTitle}>Premium Features</Text>
                    
                    <View style={styles.featureRow}>
                      <View style={styles.premiumFeatureCard}>
                        <View style={[styles.featureIconBg, { backgroundColor: 'rgba(255, 111, 181, 0.15)' }]}>
                          <Ionicons name="search" size={20} color="#FF6FB5" />
                        </View>
                        <Text style={styles.premiumFeatureTitle}>Prompt Search</Text>
                        <Text style={styles.premiumFeatureDesc}>AI finds helpers based on your needs</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureCard}>
                        <View style={[styles.featureIconBg, { backgroundColor: 'rgba(161, 106, 232, 0.15)' }]}>
                          <Ionicons name="heart" size={20} color="#A16AE8" />
                        </View>
                        <Text style={styles.premiumFeatureTitle}>Smart Matching</Text>
                        <Text style={styles.premiumFeatureDesc}>AI-powered compatibility</Text>
                      </View>
                    </View>

                    <View style={styles.featureRow}>
                      
                      
                      
                    </View>

                    <View style={styles.featureRow}>
                      <View style={styles.premiumFeatureCard}>
                        <View style={[styles.featureIconBg, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                          <Ionicons name="eye-off" size={20} color="#FFD700" />
                        </View>
                        <Text style={styles.premiumFeatureTitle}>Invisible Mode</Text>
                        <Text style={styles.premiumFeatureDesc}>Browse without being seen</Text>
                      </View>
                      
                      <View style={styles.premiumFeatureCard}>
                        <View style={[styles.featureIconBg, { backgroundColor: 'rgba(255, 111, 181, 0.15)' }]}>
                          <Ionicons name="infinite" size={20} color="#FF6FB5" />
                        </View>
                        <Text style={styles.premiumFeatureTitle}>Unlimited</Text>
                        <Text style={styles.premiumFeatureDesc}>No daily match limits</Text>
                      </View>
                    </View>
                  </View>

                  {/* App Highlights */}
                  <View style={styles.highlightsRow}>
                    <View style={styles.highlightChip}>
                      <Ionicons name="ban" size={14} color="#10B981" />
                      <Text style={styles.highlightChipText}>No Swiping</Text>
                    </View>
                    <View style={styles.highlightChip}>
                      <Ionicons name="shield-checkmark" size={14} color="#A16AE8" />
                      <Text style={styles.highlightChipText}>100% Safe</Text>
                    </View>
                    <View style={styles.highlightChip}>
                      <Ionicons name="sparkles" size={14} color="#FFD700" />
                      <Text style={styles.highlightChipText}>AI Powered</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.heroCTA, isLargeScreen && styles.heroCTALarge]}>
              <TouchableOpacity
                style={[styles.primaryButton, isLargeScreen && styles.primaryButtonLarge]}
                onPress={onSignUp}
              >
                <Text style={styles.primaryButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color={isLargeScreen ? '#FFFFFF' : '#7C2B86'} />
              </TouchableOpacity>

              {/* Watch Demo button removed */}
            </View>
            
            {!isLargeScreen && (
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 12 }]}
                onPress={onLogIn}
              >
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>Log In</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Desktop Only: Features, Testimonials, CTA, Footer */}
        {isLargeScreen && (
          <>
            {/* Features Section */}
            <View style={[styles.section, styles.sectionLarge]}>
              <Text style={[styles.sectionTitle, styles.sectionTitleLarge]}>
                Why Choose Circle?
              </Text>
              <Text style={[styles.sectionSubtitle, styles.sectionSubtitleLarge]}>
                Everything you need to build meaningful connections
              </Text>
              
              <View style={[styles.featuresGrid, styles.featuresGridLarge]}>
                {features.map((feature, index) => (
                  <View key={index} style={[styles.featureCard, styles.featureCardLarge]}>
                    <LinearGradient
                      colors={feature.gradient}
                      style={styles.featureIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name={feature.icon} size={36} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* How It Works Section */}
            <View style={[styles.section, styles.sectionLarge]} nativeID="how-it-works">
              <Text style={[styles.sectionTitle, styles.sectionTitleLarge]}>
                How Circle Works
              </Text>
              <Text style={[styles.sectionSubtitle, styles.sectionSubtitleLarge]}>
                Simple steps to find your perfect connections
              </Text>
              
              <View style={[styles.stepsContainer, styles.stepsContainerLarge]}>
                <View style={[styles.stepCard, styles.stepCardLarge]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepTitle}>Create Your Profile</Text>
                  <Text style={styles.stepDescription}>
                    Sign up and tell us about yourself, your interests, and what you're looking for in connections.
                  </Text>
                </View>
                
                <View style={[styles.stepCard, styles.stepCardLarge]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepTitle}>Smart Matching</Text>
                  <Text style={styles.stepDescription}>
                    Our AI algorithm analyzes compatibility and suggests perfect matches based on your preferences.
                  </Text>
                </View>
                
                <View style={[styles.stepCard, styles.stepCardLarge]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepTitle}>Connect & Chat</Text>
                  <Text style={styles.stepDescription}>
                    Start conversations with your matches and build meaningful relationships through our secure chat.
                  </Text>
                </View>
              </View>
            </View>

            {/* CTA Section */}
            <View style={[styles.ctaSection, styles.ctaSectionLarge]}>
              <Text style={[styles.ctaTitle, styles.ctaTitleLarge]}>
                Ready to Find Your Circle?
              </Text>
              <Text style={[styles.ctaSubtitle, styles.ctaSubtitleLarge]}>
                Join thousands of people making real connections today
              </Text>
              <TouchableOpacity style={[styles.ctaButton, styles.ctaButtonLarge]} onPress={onSignUp}>
                <Text style={styles.ctaButtonText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={[styles.footer, styles.footerLarge]}>
              <View style={styles.footerContent}>
                <View style={styles.footerLogo}>
                  <Image 
                    source={require('@/assets/logo/circle-logo.png')} 
                    style={styles.footerLogoImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.logoName}>Circle</Text>
                </View>
                <Text style={styles.footerTagline}>Building connections that matter</Text>
              </View>
              
              <View style={styles.footerLinks}>
                <View style={styles.footerColumn}>
                  <Text style={styles.footerColumnTitle}>Product</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/features';
                      }
                    }}
                  >
                    <Text style={styles.footerLink}>Features</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => scrollToSection('how-it-works')}>
                    <Text style={styles.footerLink}>How It Works</Text>
                  </TouchableOpacity>
                  <TouchableOpacity><Text style={styles.footerLink}>Pricing</Text></TouchableOpacity>
                </View>
                <View style={styles.footerColumn}>
                  <Text style={styles.footerColumnTitle}>Company</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://orincore.com/about')}>
                    <Text style={styles.footerLink}>About</Text>
                  </TouchableOpacity>
                  <TouchableOpacity><Text style={styles.footerLink}>Blog</Text></TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/careers';
                      }
                    }}
                  >
                    <Text style={styles.footerLink}>Careers</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.footerColumn}>
                  <Text style={styles.footerColumnTitle}>Legal</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/privacy';
                      }
                    }}
                  >
                    <Text style={styles.footerLink}>Privacy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/terms';
                      }
                    }}
                  >
                    <Text style={styles.footerLink}>Terms</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = '/contact';
                      }
                    }}
                  >
                    <Text style={styles.footerLink}>Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.footerBottom}>
                <View>
                  <Text style={styles.footerCopyright}>© 2025 Circle. All rights reserved.</Text>
                  <Text style={styles.footerBranding}>An App by ORINCORE Technologies</Text>
                  <Text style={styles.footerVersion}>Version {Constants.expoConfig?.version || '1.0.1'}</Text>
                </View>
                <View style={styles.footerSocials}>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open('https://x.com/orincore_tweet', '_blank');
                      }
                    }}
                  >
                    <Ionicons name="logo-twitter" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open('https://instagram.com/ig_orincore', '_blank');
                      }
                    }}
                  >
                    <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.socialIcon}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open('https://www.facebook.com/orincore', '_blank');
                      }
                    }}
                  >
                    <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
  
  // Inauguration Banner
  inaugurationBanner: {
    width: '100%',
    overflow: 'hidden',
  },
  inaugurationGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  inaugurationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  inaugurationText: {
    fontSize: 15,
    color: '#7C2B86',
    textAlign: 'center',
    fontWeight: '600',
  },
  inaugurationBold: {
    fontWeight: '800',
    fontSize: 16,
  },
  launchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  launchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
  },
  
  // Navigation
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: 20,
    paddingHorizontal: 40,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.3s ease',
    }),
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navContentLarge: {
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoGlow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 111, 181, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  brandingText: {
    fontSize: 10,
    color: 'rgba(255, 214, 242, 0.7)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 111, 181, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.1)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  navLinkIcon: {
    opacity: 0.8,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFE8FF',
    letterSpacing: 0.3,
  },
  navActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  navLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 214, 242, 0.25)',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  navLoginText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFE8FF',
    letterSpacing: 0.3,
  },
  navSignupBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  navSignupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  navSignupText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  hamburger: {
    padding: 8,
  },
  
  // Mobile Menu
  mobileMenu: {
    position: 'absolute',
    top: 72,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(124, 43, 134, 0.98)',
    borderRadius: 16,
    padding: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  mobileMenuItem: {
    paddingVertical: 12,
  },
  mobileMenuText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  mobileMenuBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mobileMenuBtnPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  mobileMenuBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileMenuBtnTextPrimary: {
    color: '#7C2B86',
  },
  
  // ScrollView
  scrollView: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
    flex: 1,
    justifyContent: 'center',
  },
  heroSectionLarge: {
    paddingHorizontal: 60,
    paddingTop: 100,
    paddingBottom: 80,
    minHeight: '100vh',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroContentLarge: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 60,
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    flex: 1,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 64,
    marginBottom: 24,
  },
  heroTitleAccent: {
    color: '#FFD6F2',
  },
  heroTitleMobile: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 42,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 28,
    marginBottom: 24,
  },
  heroHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroSubtitleMobile: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 40,
  },
  stat: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFD6F2',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40, // Add gap between header and phone
  },
  phoneWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 320, // Wider than phone to accommodate buttons
    height: 580, // Slightly taller than phone
  },
  mockupPhone: {
    width: 280,
    height: 560,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  mockupScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupScreenshot: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  // Phone Buttons - Positioned to match real phone layout
  powerButton: {
    position: 'absolute',
    right: 14, // Position relative to phoneWrapper center (320/2 - 280/2 - 6 = 14)
    top: 140, // Moved down to middle section of phone
    width: 4,
    height: 50,
    backgroundColor: 'rgba(180, 180, 180, 0.95)',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 1, height: 1 },
    elevation: 6,
    zIndex: 10,
  },
  volumeButtonUp: {
    position: 'absolute',
    left: 14, // Position relative to phoneWrapper center
    top: 120, // Moved down for more realistic positioning
    width: 4,
    height: 35,
    backgroundColor: 'rgba(180, 180, 180, 0.95)',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: -1, height: 1 },
    elevation: 6,
    zIndex: 10,
  },
  volumeButtonDown: {
    position: 'absolute',
    left: 14, // Position relative to phoneWrapper center
    top: 165, // Moved down, below volume up
    width: 4,
    height: 35,
    backgroundColor: 'rgba(180, 180, 180, 0.95)',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: -1, height: 1 },
    elevation: 6,
    zIndex: 10,
  },
  heroCTA: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 32,
  },
  heroCTALarge: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 0,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryButtonLarge: {
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7C2B86',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  loginLinkBold: {
    fontWeight: '700',
    color: '#FFD6F2',
  },
  
  // Mobile Fixed Layout Styles - Match Screen Theme
  mobileFixedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  
  // Mobile Header with Logo
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 111, 181, 0.4)',
    marginBottom: 12,
    shadowColor: '#FF6FB5',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  mobileLogo: {
    width: 50,
    height: 50,
  },
  mobileAppName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(255, 111, 181, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  mobileTagline: {
    fontSize: 14,
    color: 'rgba(255, 214, 242, 0.9)',
    fontWeight: '600',
    marginTop: 4,
  },

  // Premium Features Grid
  premiumFeaturesGrid: {
    width: '100%',
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD6F2',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  premiumFeatureCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  premiumFeatureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  premiumFeatureDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Highlights Row
  highlightsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  highlightChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Legacy styles kept for compatibility
  featureCardMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  featureContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    zIndex: 1,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 90,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD6F2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  
  // Sections
  section: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
  },
  sectionLarge: {
    paddingHorizontal: 60,
    paddingVertical: 100,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitleLarge: {
    fontSize: 42,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
    marginBottom: 48,
  },
  sectionSubtitleLarge: {
    fontSize: 18,
    marginBottom: 64,
  },
  
  // Features
  featuresGrid: {
    gap: 24,
  },
  featuresGridLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  featureCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  featureCardLarge: {
    width: '48%',
    minWidth: 280,
  },
  featureIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 15,
    color: 'rgba(31, 17, 71, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Testimonials
  testimonialsSection: {
    backgroundColor: '#F9FAFB',
  },
  testimonialsGrid: {
    gap: 20,
  },
  testimonialsGridLarge: {
    flexDirection: 'row',
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  testimonialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  testimonialCardLarge: {
    flex: 1,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  testimonialAvatar: {
    fontSize: 40,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 4,
  },
  testimonialRating: {
    flexDirection: 'row',
    gap: 2,
  },
  testimonialText: {
    fontSize: 15,
    color: 'rgba(31, 17, 71, 0.8)',
    lineHeight: 22,
  },
  
  // CTA Section
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
  },
  ctaSectionLarge: {
    paddingVertical: 100,
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaTitleLarge: {
    fontSize: 42,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
  },
  ctaSubtitleLarge: {
    fontSize: 18,
    marginBottom: 40,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 999,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaButtonLarge: {
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#7C2B86',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#1F1147',
  },
  footerLarge: {
    paddingHorizontal: 60,
    paddingVertical: 60,
  },
  footerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  footerLogoImage: {
    width: 32,
    height: 32,
  },
  footerTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    maxWidth: 800,
    marginHorizontal: 'auto',
    width: '100%',
    marginBottom: 40,
  },
  footerColumn: {
    gap: 12,
  },
  footerColumnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerCopyright: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerBranding: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    fontWeight: '500',
  },
  footerSocials: {
    flexDirection: 'row',
    gap: 16,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
  },
  
  // How It Works Section
  stepsContainer: {
    gap: 24,
    marginTop: 32,
  },
  stepsContainerLarge: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 48,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  stepCardLarge: {
    flex: 1,
    padding: 32,
  },
  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepNumberText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
});
