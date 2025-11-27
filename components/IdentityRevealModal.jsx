import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { blindDatingApi } from '@/src/api/blindDating';
import { SvgUri } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Modal for revealing identity in blind date
 * Shows before/after comparison and confirmation
 */
const IdentityRevealModal = ({
  visible,
  onClose,
  matchId,
  otherUser,
  hasRevealedSelf,
  otherHasRevealed,
  onRevealSuccess,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { token, user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [revealedProfile, setRevealedProfile] = useState(null);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset state
      setRevealed(false);
      setRevealedProfile(null);
      
      // Entrance animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.8);
      flipAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);
  
  const handleReveal = async () => {
    try {
      setLoading(true);
      
      const result = await blindDatingApi.requestReveal(matchId, token);
      
      if (result.success) {
        if (result.bothRevealed) {
          // Both revealed - show the reveal animation
          setRevealed(true);
          
          // Fetch the revealed profile
          const matchData = await blindDatingApi.getMatch(matchId, token);
          setRevealedProfile(matchData.otherUser);
          
          // Play reveal animation
          Animated.sequence([
            Animated.timing(flipAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(confettiAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
          
          setTimeout(() => {
            onRevealSuccess?.(matchData.otherUser);
          }, 1500);
        } else {
          // Only this user revealed - waiting for other
          onClose?.();
          // The parent component will update the UI
          onRevealSuccess?.(null, false);
        }
      }
    } catch (error) {
      console.error('Error revealing identity:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={90} tint={isDarkMode ? 'dark' : 'light'} style={styles.blurContainer}>
        <Animated.View 
          style={[
            styles.modalContent,
            { 
              backgroundColor: theme.surface,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          
          {!revealed ? (
            // Pre-reveal state
            <>
              <LinearGradient
                colors={[theme.primary + '20', theme.decorative1 + '10']}
                style={styles.headerGradient}
              >
                <Ionicons name="eye" size={48} color={theme.primary} />
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  Reveal Identity
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {otherHasRevealed 
                    ? 'Your match is ready to reveal! Reveal yours to see their profile.'
                    : 'Once you reveal, your match will see your real profile.'}
                </Text>
              </LinearGradient>
              
              {/* Current anonymous view */}
              <View style={styles.profilePreview}>
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                  Currently showing:
                </Text>
                <View style={styles.anonymousCard}>
                  <View style={[styles.anonymousAvatar, { backgroundColor: theme.primary + '20' }]}>
                    {otherUser?.anonymous_avatar ? (
                      <SvgUri
                        width={60}
                        height={60}
                        uri={otherUser.anonymous_avatar}
                      />
                    ) : (
                      <Ionicons name="person" size={36} color={theme.primary} />
                    )}
                  </View>
                  <View style={styles.anonymousInfo}>
                    <Text style={[styles.anonymousName, { color: theme.textPrimary }]}>
                      {otherUser?.first_name || '???'}
                    </Text>
                    <Text style={[styles.anonymousDetail, { color: theme.textSecondary }]}>
                      {otherUser?.age ? `${otherUser.age} years old` : 'Age hidden'}
                    </Text>
                    <View style={styles.hiddenBadge}>
                      <Ionicons name="eye-off" size={12} color={theme.warning} />
                      <Text style={[styles.hiddenText, { color: theme.warning }]}>
                        Identity Hidden
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* What will be revealed */}
              <View style={[styles.infoBox, { backgroundColor: theme.background }]}>
                <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>
                  After reveal, they will see:
                </Text>
                <View style={styles.infoList}>
                  <InfoItem icon="person" text="Your real name" theme={theme} />
                  <InfoItem icon="camera" text="Your profile photo" theme={theme} />
                  <InfoItem icon="at" text="Your username" theme={theme} />
                  <InfoItem icon="location" text="Your full location" theme={theme} />
                </View>
              </View>
              
              {/* Status indicator */}
              {otherHasRevealed && (
                <View style={[styles.statusBanner, { backgroundColor: theme.success + '15' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  <Text style={[styles.statusText, { color: theme.success }]}>
                    Your match has already revealed their identity!
                  </Text>
                </View>
              )}
              
              {hasRevealedSelf && !otherHasRevealed && (
                <View style={[styles.statusBanner, { backgroundColor: theme.warning + '15' }]}>
                  <Ionicons name="time" size={20} color={theme.warning} />
                  <Text style={[styles.statusText, { color: theme.warning }]}>
                    You've revealed! Waiting for your match...
                  </Text>
                </View>
              )}
              
              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  onPress={onClose}
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                    Not Yet
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleReveal}
                  disabled={loading || hasRevealedSelf}
                  style={[
                    styles.revealButton,
                    (loading || hasRevealedSelf) && styles.buttonDisabled
                  ]}
                >
                  <LinearGradient
                    colors={[theme.primary, theme.decorative1]}
                    style={styles.revealGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="eye" size={20} color="white" />
                        <Text style={styles.revealText}>
                          {hasRevealedSelf ? 'Already Revealed' : 'Reveal My Identity'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Post-reveal state - celebration!
            <>
              <View style={styles.celebrationContainer}>
                {/* Confetti animation placeholder */}
                <Animated.View style={[styles.confetti, { opacity: confettiAnim }]}>
                  <Text style={styles.confettiEmoji}>🎉 ✨ 💫 🎊</Text>
                </Animated.View>
                
                <Text style={[styles.celebrationTitle, { color: theme.primary }]}>
                  Identity Revealed!
                </Text>
                
                {/* Flip card animation */}
                <View style={styles.flipContainer}>
                  {/* Front (anonymous) */}
                  <Animated.View 
                    style={[
                      styles.flipCard,
                      { transform: [{ rotateY: frontRotate }] }
                    ]}
                  >
                    <View style={[styles.anonymousAvatar, styles.largeAvatar, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="person" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.flipName, { color: theme.textPrimary }]}>
                      {otherUser?.first_name || '???'}
                    </Text>
                  </Animated.View>
                  
                  {/* Back (revealed) */}
                  <Animated.View 
                    style={[
                      styles.flipCard,
                      styles.flipCardBack,
                      { transform: [{ rotateY: backRotate }] }
                    ]}
                  >
                    {revealedProfile?.profile_photo_url ? (
                      <Image 
                        source={{ uri: revealedProfile.profile_photo_url }}
                        style={styles.revealedPhoto}
                      />
                    ) : (
                      <View style={[styles.anonymousAvatar, styles.largeAvatar, { backgroundColor: theme.success + '20' }]}>
                        <Ionicons name="person" size={48} color={theme.success} />
                      </View>
                    )}
                    <Text style={[styles.flipName, { color: theme.textPrimary }]}>
                      {revealedProfile?.first_name} {revealedProfile?.last_name}
                    </Text>
                    <Text style={[styles.flipUsername, { color: theme.textSecondary }]}>
                      @{revealedProfile?.username}
                    </Text>
                  </Animated.View>
                </View>
                
                <Text style={[styles.celebrationSubtext, { color: theme.textSecondary }]}>
                  You can now see each other's full profiles and chat without restrictions!
                </Text>
                
                <TouchableOpacity 
                  onPress={() => {
                    onClose?.();
                    onRevealSuccess?.(revealedProfile);
                  }}
                  style={styles.continueButton}
                >
                  <LinearGradient
                    colors={[theme.success, '#4CAF50']}
                    style={styles.continueGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.continueText}>Continue Chatting</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

// Info item component
const InfoItem = ({ icon, text, theme }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={16} color={theme.primary} />
    <Text style={[styles.infoText, { color: theme.textSecondary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  profilePreview: {
    padding: 20,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  anonymousCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  anonymousAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  anonymousInfo: {
    flex: 1,
  },
  anonymousName: {
    fontSize: 18,
    fontWeight: '600',
  },
  anonymousDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  hiddenText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  revealButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  revealGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  revealText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  celebrationContainer: {
    padding: 30,
    alignItems: 'center',
  },
  confetti: {
    marginBottom: 20,
  },
  confettiEmoji: {
    fontSize: 32,
    letterSpacing: 8,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
  },
  flipContainer: {
    width: 150,
    height: 180,
    marginBottom: 30,
  },
  flipCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  flipCardBack: {
    position: 'absolute',
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  revealedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  flipName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  flipUsername: {
    fontSize: 14,
    marginTop: 4,
  },
  celebrationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  continueButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  continueText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default IdentityRevealModal;

