import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export default function LandingPage({ onSignUp, onLogIn }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      console.log('Navigate to Sign Up');
    }
  };

  const handleLogIn = () => {
    if (onLogIn) {
      onLogIn();
    } else {
      console.log('Navigate to Log In');
    }
  };

  return (
    <LinearGradient
      colors={['#FF6FB5', '#A16AE8', '#5D5FEF']}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isLargeScreen && styles.scrollContentLarge,
        ]}
      >
        <View style={[styles.blurCircleLarge, isLargeScreen && styles.blurCircleLargeDesktop]} />
        <View style={[styles.blurCircleSmall, isLargeScreen && styles.blurCircleSmallDesktop]} />

        <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
          <View style={styles.header}>
            <View style={styles.circleLogo}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.appName}>Circle</Text>
            <Text style={styles.tagline}>Connections designed for your heart.</Text>
          </View>

          <View style={[styles.highlightCard, isLargeScreen && styles.highlightCardLarge]}>
            <Text style={[styles.heroTitle, isLargeScreen && styles.heroTitleLarge]}>
              Meet someone worth your time.
            </Text>
            <Text style={[styles.heroSubtitle, isLargeScreen && styles.heroSubtitleLarge]}>
              Curated matches, thoughtful conversations, and a community that values meaningful
              relationships.
            </Text>

            <View style={[styles.highlightsRow, isLargeScreen && styles.highlightsRowLarge]}>
              <View style={styles.highlightPill}>
                <Ionicons name="sparkles" size={18} color="#FFD6F2" />
                <Text style={styles.highlightText}>Smart Matches</Text>
              </View>
              <View style={styles.highlightPill}>
                <Ionicons name="shield-checkmark" size={18} color="#FFD6F2" />
                <Text style={styles.highlightText}>Verified Profiles</Text>
              </View>
              <View style={styles.highlightPill}>
                <Ionicons name="chatbubbles" size={18} color="#FFD6F2" />
                <Text style={styles.highlightText}>Warm Conversations</Text>
              </View>
            </View>
          </View>

          <View style={[styles.actions, isLargeScreen && styles.actionsLarge]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSignUp}
              style={styles.primaryButtonWrapper}
            >
              <LinearGradient
                colors={['#FFD6F2', '#FFC3E3']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Create My Circle</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.secondaryButton, isLargeScreen && styles.secondaryButtonLarge]}
              onPress={handleLogIn}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>By continuing you agree to our terms & privacy policy.</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContentLarge: {
    paddingVertical: 80,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 32,
  },
  contentLarge: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 40,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  circleLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 214, 242, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(31, 17, 71, 0.75)',
    lineHeight: 24,
  },
  highlightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 22,
    padding: 26,
    gap: 18,
    boxShadow: '0px 10px 20px rgba(18, 8, 43, 0.4)',
    elevation: 18,
  },
  highlightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(93, 95, 239, 0.15)',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1147',
  },
  actions: {
    gap: 14,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C2B86',
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.65)',
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 4,
  },
  blurCircleLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 214, 242, 0.32)',
    top: -80,
    right: -40,
  },
  blurCircleSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    bottom: 60,
    left: -60,
  },
  blurCircleLargeDesktop: {
    top: 40,
    right: '15%',
  },
  blurCircleSmallDesktop: {
    left: '12%',
    bottom: 120,
  },
});
