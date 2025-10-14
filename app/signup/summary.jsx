import { useAuth } from "@/contexts/AuthContext";
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
  const formatTitleCase = useMemo(() => (s) => (s ? s.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') : s), []);
  
  
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
    <LinearGradient colors={['#1F1147', '#7C2B86']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Summary</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Success Card */}
            <View style={styles.successCard}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Account Created Successfully! 🎉</Text>
              <Text style={styles.successSubtitle}>
                Your Circle account has been created. Please verify your email to start connecting with people.
              </Text>
            </View>

            {/* Profile Summary Card */}
            <View style={styles.profileCard}>

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
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="person" size={20} color="#7C2B86" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{displayData.firstName} {displayData.lastName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="mail" size={20} color="#7C2B86" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{displayData.email}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons name="at" size={20} color="#7C2B86" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Username</Text>
                      <Text style={styles.infoValue}>@{displayData.username}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRowDouble}>
                  <View style={styles.infoItemHalf}>
                    <Ionicons name="calendar" size={20} color="#7C2B86" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Age</Text>
                      <Text style={styles.infoValue}>{displayData.age}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItemHalf}>
                    <Ionicons name="transgender" size={20} color="#7C2B86" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Gender</Text>
                      <Text style={styles.infoValue}>{formatTitleCase(displayData.gender)}</Text>
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
                  <Text style={styles.sectionTitle}>About Me</Text>
                  <View style={styles.aboutCard}>
                    <Text style={styles.aboutText}>{displayData.about}</Text>
                  </View>
                </View>
              )}

              {/* Social Media */}
              {displayData.instagramUsername && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Social Media</Text>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                      <View style={styles.infoText}>
                        <Text style={styles.infoLabel}>Instagram</Text>
                        <Text style={styles.infoValue}>@{displayData.instagramUsername}</Text>
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
              style={styles.cta} 
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
              <Text style={styles.ctaText}>Verify Email Address 📧</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
    borderRadius: 16, 
    paddingVertical: 18, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 10,
    marginTop: 8,
    shadowColor: '#7C2B86',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5 
  },
});
