import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionModal from './SubscriptionModal';

export const MatchLimitWarning = ({ 
  visible, 
  onClose, 
  matchesUsed = 0, 
  limit = 3,
  onUpgrade 
}) => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { subscribeToPremium } = useSubscription();

  const remainingMatches = Math.max(0, limit - matchesUsed);

  const handleUpgrade = () => {
    setShowSubscriptionModal(true);
  };

  const handleWatchAd = () => {
    // In production, this would show a rewarded video ad
    Alert.alert(
      'Watch Ad',
      'Watch a short video to get 1 extra match for today!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Watch Ad', 
          onPress: () => {
            // Simulate watching ad and getting reward
            Alert.alert('Success!', 'You earned 1 extra match for today!');
            onClose();
          }
        }
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.gradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="heart-dislike" size={48} color="#FFFFFF" />
              </View>
              
              <Text style={styles.title}>Daily Match Limit Reached</Text>
              <Text style={styles.message}>
                You've used all {limit} of your daily matches. 
                {remainingMatches === 0 ? ' Come back tomorrow for more matches!' : ''}
              </Text>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{matchesUsed}</Text>
                  <Text style={styles.statLabel}>Used Today</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{remainingMatches}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgrade}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.upgradeGradient}
                  >
                    <Ionicons name="diamond" size={20} color="#FFFFFF" />
                    <Text style={styles.upgradeText}>Upgrade to Premium</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adButton}
                  onPress={handleWatchAd}
                >
                  <Ionicons name="play-circle" size={20} color="#7C2B86" />
                  <Text style={styles.adText}>Watch Ad for +1 Match</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Text style={styles.closeText}>Maybe Later</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          onClose();
        }}
        initialPlan="premium"
      />
    </>
  );
};

export const MatchLimitBanner = ({ 
  matchesUsed = 0, 
  limit = 3, 
  onUpgrade,
  style = {} 
}) => {
  const remainingMatches = Math.max(0, limit - matchesUsed);
  const isLimitReached = remainingMatches === 0;

  if (isLimitReached) {
    return (
      <View style={[styles.banner, styles.limitReachedBanner, style]}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E']}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <Ionicons name="warning" size={20} color="#FFFFFF" />
            <Text style={styles.bannerText}>
              Daily limit reached! Upgrade for unlimited matches.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={onUpgrade}
          >
            <Text style={styles.bannerButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.banner, style]}>
      <LinearGradient
        colors={['#7C2B86', '#A16AE8']}
        style={styles.bannerGradient}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="heart" size={20} color="#FFFFFF" />
          <Text style={styles.bannerText}>
            {remainingMatches} matches remaining today
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={onUpgrade}
        >
          <Text style={styles.bannerButtonText}>Unlimited</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

export const MatchCounter = ({ 
  matchesUsed = 0, 
  limit = 3, 
  isPremium = false,
  style = {} 
}) => {
  if (isPremium) {
    return (
      <View style={[styles.counter, styles.premiumCounter, style]}>
        <Ionicons name="infinite" size={16} color="#FFD700" />
        <Text style={styles.premiumCounterText}>Unlimited</Text>
      </View>
    );
  }

  const remainingMatches = Math.max(0, limit - matchesUsed);
  const isLow = remainingMatches <= 1;

  return (
    <View style={[
      styles.counter, 
      isLow && styles.lowCounter,
      style
    ]}>
      <Ionicons 
        name="heart" 
        size={16} 
        color={isLow ? "#FF6B6B" : "#7C2B86"} 
      />
      <Text style={[
        styles.counterText,
        isLow && styles.lowCounterText
      ]}>
        {remainingMatches}/{limit}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  upgradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  adText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C2B86',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  // Banner styles
  banner: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  limitReachedBanner: {
    // Additional styles for limit reached state
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  bannerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Counter styles
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 43, 134, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumCounter: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  lowCounter: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2B86',
  },
  premiumCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  lowCounterText: {
    color: '#FF6B6B',
  },
});

export default MatchLimitWarning;
