import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { socialAccountsApi } from "@/src/api/social-accounts";
import { ProfilePictureService } from "@/src/services/profilePictureService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useFocusEffect } from "expo-router";
import { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Animated, Dimensions, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar, BackHandler } from "react-native";
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

  // Restrict hardware back on this summary screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Consume back press so user can't navigate back into signup flow
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  // Dynamic styles matching other signup screens
  const dynamicStyles = {
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowColor || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.headerLeft}>
              <Image 
                source={require('@/assets/logo/circle-logo.png')} 
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={[styles.appName, { color: theme.textPrimary }]}>Circle</Text>
            </View>
            <View style={[styles.stepIndicator, { backgroundColor: isDarkMode ? theme.surfaceSecondary : theme.border }]}>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>Complete</Text>
            </View>
          </Animated.View>

          {/* Welcome block */}
          <Animated.View 
            style={[
              styles.welcomeBlock, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={[styles.title, { color: theme.textPrimary }]}>Account created</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your Circle account has been created successfully. Please verify your email to start connecting with people.
            </Text>
          </Animated.View>

          {/* Success Card */}
          <Animated.View 
            style={[
              dynamicStyles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                alignItems: 'center',
              }
            ]}
          >
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Welcome to Circle</Text>
            <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
              {missingInfo.length > 0 ? 'Complete your profile below, then verify your email.' : 'Verify your email to start connecting with people.'}
            </Text>
          </Animated.View>

          {/* Profile Summary Card */}
          <Animated.View 
            style={[
              dynamicStyles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            {/* Profile Picture */}
            {data.profileImage && (
              <View style={styles.profileImageSection}>
                <View style={styles.profileImageContainer}>
                  <Image source={{ uri: data.profileImage }} style={styles.profileImage} />
                  <View style={[styles.profileImageOverlay, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            )}

            {/* Basic Info */}
            <View style={styles.infoSection}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personal Information</Text>
              
              <View style={styles.infoRow}>
                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Ionicons name="person" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Full Name</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.firstName} {displayData.lastName}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Ionicons name="mail" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Email</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Ionicons name="at" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Username</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>@{displayData.username}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoRowDouble}>
                <View style={[styles.infoItemHalf, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Ionicons name="calendar" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Age</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.age}</Text>
                  </View>
                </View>
                <View style={[styles.infoItemHalf, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Ionicons name="transgender" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Gender</Text>
                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{formatTitleCase(displayData.gender)}</Text>
                  </View>
                </View>
              </View>

              {displayData.phoneNumber && (
                <View style={styles.infoRow}>
                  <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Ionicons name="call" size={18} color={theme.primary} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Phone</Text>
                      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{displayData.countryCode} {displayData.phoneNumber}</Text>
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
                        ? 'rgba(255,255,255,0.05)'
                        : theme.surfaceSecondary,
                      borderColor: theme.border,
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
                          ? 'rgba(255,255,255,0.05)'
                          : theme.surfaceSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons name="logo-instagram" size={18} color="#E4405F" />
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
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Preferences</Text>
                
                {Array.isArray(displayData.interests) && displayData.interests.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={[styles.tagsLabel, { color: theme.textTertiary }]}>Interests</Text>
                    <View style={styles.tagsWrapper}>
                      {displayData.interests.map((interest, index) => (
                        <View key={index} style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(161, 106, 232, 0.2)' : 'rgba(161, 106, 232, 0.1)', borderColor: theme.primary }]}>
                          <Text style={[styles.tagText, { color: theme.primary }]}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {Array.isArray(displayData.needs) && displayData.needs.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={[styles.tagsLabel, { color: theme.textTertiary }]}>Looking For</Text>
                    <View style={styles.tagsWrapper}>
                      {displayData.needs.map((need, index) => (
                        <View key={index} style={[styles.tag, styles.needTag, { backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.1)', borderColor: '#EC4899' }]}>
                          <Text style={[styles.tagText, styles.needTagText, { color: '#EC4899' }]}>{need}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </Animated.View>

          {/* Verify Email Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }], marginTop: 8 }}>
            <TouchableOpacity 
              activeOpacity={0.85}
              style={styles.primaryButton}
              onPress={() => {
                Animated.sequence([
                  Animated.spring(buttonScale, {
                    toValue: 0.95,
                    useNativeDriver: true,
                  }),
                  Animated.spring(buttonScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                ]).start();
                router.replace({
                  pathname: '/auth/verify-email-post-signup',
                  params: {
                    email: data.email,
                    name: data.firstName,
                  }
                });
              }}
            >
              <Text style={styles.primaryButtonText}>Verify Email Address</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogo: { 
    width: 32, 
    height: 32,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepText: {
    fontSize: 13,
    fontWeight: "600",
  },
  
  welcomeBlock: { marginBottom: 20, gap: 8 },
  title: { 
    fontSize: 32, 
    fontWeight: "800",
    lineHeight: 38,
  },
  subtitle: { 
    fontSize: 16, 
    lineHeight: 22,
  },
  
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoRowDouble: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  infoItemHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    flex: 1,
    borderWidth: 1,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  needTag: {},
  needTagText: {},
  
  primaryButton: { 
    backgroundColor: "#A16AE8",
    borderRadius: 999, 
    paddingVertical: 18, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#A16AE8",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryButtonText: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
