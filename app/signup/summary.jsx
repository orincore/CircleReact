import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { socialAccountsApi } from "@/src/api/social-accounts";
import { ProfilePictureService } from "@/src/services/profilePictureService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignupWizardContext } from "./_layout";

export default function SignupSummary() {
  const router = useRouter();
  const { data } = useContext(SignupWizardContext);
  const { updateProfile, token, user, refreshUser } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const formatTitleCase = useMemo(() => (s) => (s ? s.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') : s), []);
  
  // Check for missing information
  const missingInfo = useMemo(() => {
    const missing = [];
    if (!data.about || data.about.trim().length < 10) missing.push({ field: 'About Me', icon: 'document-text', message: 'Tell us about yourself (at least 10 characters)' });
    if (!data.instagramUsername || !data.instagramUsername.trim()) missing.push({ field: 'Instagram', icon: 'logo-instagram', message: 'Connect your Instagram account' });
    if (!Array.isArray(data.interests) || data.interests.length === 0) missing.push({ field: 'Interests', icon: 'heart', message: 'Select at least one interest' });
    if (!Array.isArray(data.needs) || data.needs.length === 0) missing.push({ field: 'Looking For', icon: 'search', message: 'Tell us what you\'re looking for' });
    if (!data.profileImage) missing.push({ field: 'Profile Picture', icon: 'camera', message: 'Upload a profile picture' });
    return missing;
  }, [data]);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [displayData, setDisplayData] = useState(data);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Update profile with about, Instagram, and profile picture
  const updateProfileInformation = async () => {
    if (!token || updateCompleted) return;
    
    setIsUpdating(true);
    //console.log('🔄 Updating profile with complete information...');
    
    try {
      // 1. Upload profile picture to S3 (if provided)
      if (data.profileImage) {
        try {
          setUploadingPhoto(true);
          //console.log('📸 Uploading profile picture to S3...');
          const photoUrl = await ProfilePictureService.uploadProfilePicture(
            data.profileImage,
            token
          );
          //console.log('✅ Profile picture uploaded:', photoUrl);
          
          // Update local state to show uploaded photo
          setUploadedPhotoUrl(photoUrl);
          
          // Update profile with photo URL
          await updateProfile({ profilePhotoUrl: photoUrl });
          setUploadingPhoto(false);
        } catch (photoError) {
          console.error('❌ Failed to upload profile picture:', photoError);
          setUploadingPhoto(false);
          // Continue with other updates even if photo upload fails
        }
      }

      // 2. Update profile with about information
      if (data.about && data.about.trim()) {
        //console.log('📝 Updating about field:', data.about);
        await updateProfile({
          about: data.about.trim()
        });
      }

      // 3. Link Instagram account
      if (data.instagramUsername && data.instagramUsername.trim()) {
        //console.log('📸 Linking Instagram account:', data.instagramUsername);
        
        const cleanUsername = data.instagramUsername.trim().replace('@', '');
        await socialAccountsApi.verifyInstagram(cleanUsername, token);
      }

      // 4. Refresh user data to get updated information
      //console.log('🔄 Refreshing user data...');
      await refreshUser();
      
      setUpdateCompleted(true);
      //console.log('✅ Profile update completed successfully');
      
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      // Don't show error to user, just log it
    } finally {
      setIsUpdating(false);
    }
  };

  // Run profile update when component mounts
  useEffect(() => {
    if (token && user && !updateCompleted && !isUpdating) {
      // Small delay to ensure user is fully loaded
      const timer = setTimeout(() => {
        updateProfileInformation();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [token, user, updateCompleted, isUpdating]);

  // Update display data when user data changes
  useEffect(() => {
    if (updateCompleted && user) {
      setDisplayData({
        ...data,
        about: user.about || data.about,
        // Add Instagram info if available
        instagramLinked: true
      });
    }
  }, [updateCompleted, user, data]);

  // Sparkle float + opacity animation
  const sparkleFloat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleFloat, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sparkleFloat, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [sparkleFloat]);
  const sparkleTranslate = sparkleFloat.interpolate({ inputRange: [0,1], outputRange: [0, -6] });
  const sparkleOpacity = sparkleFloat.interpolate({ inputRange: [0,1], outputRange: [0.6, 1] });

  // Shimmer over the check badge
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [shimmer]);
  const shimmerTranslate = shimmer.interpolate({ inputRange: [0,1], outputRange: [-40, 40] });

  // Confetti burst on mount
  const { width } = Dimensions.get('window');
  const [confetti] = useState(() => Array.from({ length: 18 }, (_, i) => ({
    key: `c${i}`,
    left: Math.floor(Math.random() * Math.max(220, Math.min(width - 48, 320))),
    delay: Math.floor(Math.random() * 350),
    color: ["#FFD6F2", "#E9E6FF", "#FFF6FB", "#D1C9FF"][i % 4],
    size: 6 + Math.floor(Math.random() * 8),
  })));
  const confettiAnim = useRef(confetti.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const animations = confettiAnim.map((val, idx) => (
      Animated.timing(val, { toValue: 1, duration: 1200 + Math.floor(Math.random()*500), delay: confetti[idx].delay, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ));
    Animated.stagger(60, animations).start();
  }, [confettiAnim, confetti]);

  return (
    <LinearGradient colors={isDarkMode ? ['#1F1147', '#7C2B86'] : [theme.background, theme.backgroundSecondary]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Account Summary</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Success Card */}
            <View style={[styles.successCard, { backgroundColor: theme.surface }]}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              </View>
              <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Account Created Successfully! 🎉</Text>
              <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                Your Circle account has been created. {missingInfo.length > 0 ? 'Complete your profile below, then verify your email.' : 'Please verify your email to start connecting with people.'}
              </Text>
            </View>

            {/* Profile Summary Card */}
            <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>

              {/* Profile Picture */}
              {data.profileImage && (
                <View style={styles.profileImageSection}>
                  <View style={styles.profileImageContainer}>
                    <Image source={{ uri: data.profileImage }} style={styles.profileImage} />
                    <View style={styles.profileImageOverlay}>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              )}

              {/* Basic Info */}
              <View style={styles.infoSection}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personal Information</Text>
                
                <View style={styles.infoRow}>
                  <View style={[styles.infoItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="person" size={20} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Full Name</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.firstName} {displayData.lastName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.infoItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="mail" size={20} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Email</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.email}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.infoItem, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="at" size={20} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Username</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>@{displayData.username}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRowDouble}>
                  <View style={[styles.infoItemHalf, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="calendar" size={20} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Age</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.age}</Text>
                    </View>
                  </View>
                  <View style={[styles.infoItemHalf, { backgroundColor: theme.surfaceSecondary }]}>
                    <Ionicons name="transgender" size={20} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Gender</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{formatTitleCase(displayData.gender)}</Text>
                    </View>
                  </View>
                </View>

                {displayData.phoneNumber && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons name="call" size={20} color="#7C2B86" />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{displayData.countryCode} {displayData.phoneNumber}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* About Section */}
              {displayData.about && (
                <View style={styles.infoSection}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>About Me</Text>
                  <View
                    style={[
                      styles.aboutCard,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(255,255,255,0.06)'
                          : theme.surfaceSecondary,
                        borderColor: isDarkMode
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.04)',
                      },
                    ]}
                  >
                    <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
                      {displayData.about}
                    </Text>
                  </View>
                </View>
              )}

              {/* Social Media */}
              {displayData.instagramUsername && (
                <View style={styles.infoSection}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Social Media</Text>
                  <View style={styles.infoRow}>
                    <View
                      style={[
                        styles.infoItem,
                        {
                          backgroundColor: isDarkMode
                            ? 'rgba(255,255,255,0.06)'
                            : theme.surfaceSecondary,
                        },
                      ]}
                    >
                      <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                      <View style={styles.infoText}>
                        <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Instagram</Text>
                        <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
                          @{displayData.instagramUsername}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Interests & Needs */}
              {(Array.isArray(displayData.interests) && displayData.interests.length > 0) || (Array.isArray(displayData.needs) && displayData.needs.length > 0) ? (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Preferences</Text>
                  
                  {Array.isArray(displayData.interests) && displayData.interests.length > 0 && (
                    <View style={styles.tagsContainer}>
                      <Text style={styles.tagsLabel}>Interests</Text>
                      <View style={styles.tagsWrapper}>
                        {displayData.interests.map((interest, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {Array.isArray(displayData.needs) && displayData.needs.length > 0 && (
                    <View style={styles.tagsContainer}>
                      <Text style={styles.tagsLabel}>Looking For</Text>
                      <View style={styles.tagsWrapper}>
                        {displayData.needs.map((need, index) => (
                          <View key={index} style={[styles.tag, styles.needTag]}>
                            <Text style={[styles.tagText, styles.needTagText]}>{need}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : null}
            </View>

            <TouchableOpacity 
              style={[
                styles.cta,
                {
                  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                  borderColor: isDarkMode ? '#FFFFFF' : '#7C2B86',
                },
              ]}
              onPress={() => {
                // Navigate directly to email verification
                //console.log('📧 Redirecting to email verification...');
                router.replace({
                  pathname: '/auth/verify-email-post-signup',
                  params: {
                    email: data.email,
                    name: data.firstName,
                  }
                });
              }}
            >
              <Text
                style={[
                  styles.ctaText,
                  { color: isDarkMode ? '#FFFFFF' : '#000000' },
                ]}
              >
                Verify Email Address 📧
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={isDarkMode ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F1147',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FF9800',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 16,
    lineHeight: 20,
  },
  missingList: {
    gap: 12,
    marginBottom: 16,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  missingText: {
    flex: 1,
  },
  missingField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2,
  },
  missingMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C2B86',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1147',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoRowDouble: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  infoItemHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flex: 0.48,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1147',
  },
  aboutCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tagsContainer: {
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976D2',
  },
  needTag: {
    backgroundColor: '#FCE4EC',
  },
  needTagText: {
    color: '#C2185B',
  },
  cta: { 
    backgroundColor: '#7C2B86',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#FFD54F',
    shadowColor: '#FFD54F',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ctaText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5 
  },
});
