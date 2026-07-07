import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import SignupScreenLayout from "@/components/signup/SignupScreenLayout";
import { SignupPrimaryButton } from "@/components/signup/SignupButton";
import { socialAccountsApi } from "@/src/api/social-accounts";
import { ProfilePictureService } from "@/src/services/profilePictureService";
import { calculateAge, formatDateOfBirth } from "@/src/utils/age";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter, useFocusEffect } from "expo-router";
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { BackHandler, Image, StyleSheet, Text, View } from "react-native";
import { SignupWizardContext } from "./_layout";

export default function SignupSummary() {
  const router = useRouter();
  const { data } = useContext(SignupWizardContext);
  const { updateProfile, token, user, refreshUser } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const formatTitleCase = useMemo(() => (s) => (s ? s.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') : s), []);

  const missingInfo = useMemo(() => {
    const missing = [];
    if (!data.about || data.about.trim().length < 10) missing.push('About Me');
    if (!data.instagramUsername || !data.instagramUsername.trim()) missing.push('Instagram');
    if (!Array.isArray(data.interests) || data.interests.length === 0) missing.push('Interests');
    if (!Array.isArray(data.needs) || data.needs.length === 0) missing.push('Looking For');
    if (!data.profileImage) missing.push('Profile Picture');
    return missing;
  }, [data]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [displayData, setDisplayData] = useState(data);

  const updateProfileInformation = async () => {
    if (!token || updateCompleted) return;
    setIsUpdating(true);

    try {
      if (data.profileImage) {
        try {
          const photoUrl = await ProfilePictureService.uploadProfilePicture(data.profileImage, token);
          await updateProfile({ profilePhotoUrl: photoUrl });
        } catch (photoError) {
          console.error('❌ Failed to upload profile picture:', photoError);
        }
      }

      if (data.about && data.about.trim()) {
        await updateProfile({ about: data.about.trim() });
      }

      if (data.instagramUsername && data.instagramUsername.trim()) {
        const cleanUsername = data.instagramUsername.trim().replace('@', '');
        await socialAccountsApi.verifyInstagram(cleanUsername, token);
      }

      await refreshUser();
      setUpdateCompleted(true);
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (token && user && !updateCompleted && !isUpdating) {
      const timer = setTimeout(() => { updateProfileInformation(); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [token, user, updateCompleted, isUpdating]);

  useEffect(() => {
    if (updateCompleted && user) {
      setDisplayData({ ...data, about: user.about || data.about, instagramLinked: true });
    }
  }, [updateCompleted, user, data]);

  // Restrict hardware back on this summary screen
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const InfoRow = ({ icon, label, value, half }) => (
    <View
      style={[
        styles.infoItem,
        half && styles.infoItemHalf,
        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.background, borderColor: theme.border },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.primary} />
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.textPrimary }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SignupScreenLayout
      title="Account created"
      subtitle="Your Circle account has been created successfully. Please verify your email to start connecting with people."
    >
      <View style={styles.successBlock}>
        <Ionicons name="checkmark-circle" size={56} color="#10B981" />
        <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Welcome to Circle</Text>
        <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
          {missingInfo.length > 0 ? 'Complete your profile below, then verify your email.' : 'Verify your email to start connecting with people.'}
        </Text>
      </View>

      {data.profileImage && (
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image source={{ uri: data.profileImage }} style={styles.profileImage} />
            <View style={[styles.profileImageOverlay, { backgroundColor: theme.primary }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Personal Information</Text>
      <View style={styles.infoRow}>
        <InfoRow icon="person" label="Full Name" value={`${displayData.firstName} ${displayData.lastName}`} />
      </View>
      <View style={styles.infoRow}>
        <InfoRow icon="mail" label="Email" value={displayData.email} />
      </View>
      <View style={styles.infoRow}>
        <InfoRow icon="at" label="Username" value={`@${displayData.username}`} />
      </View>
      <View style={styles.infoRowDouble}>
        <InfoRow
          half
          icon="calendar"
          label="Date of Birth"
          value={`${formatDateOfBirth(displayData.dateOfBirth)} (${calculateAge(displayData.dateOfBirth)})`}
        />
        <InfoRow half icon="transgender" label="Gender" value={formatTitleCase(displayData.gender)} />
      </View>
      {displayData.phoneNumber && (
        <View style={styles.infoRow}>
          <InfoRow icon="call" label="Phone" value={`${displayData.countryCode} ${displayData.phoneNumber}`} />
        </View>
      )}

      {displayData.about && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>About Me</Text>
          <View style={[styles.aboutCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.background, borderColor: theme.border }]}>
            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>{displayData.about}</Text>
          </View>
        </>
      )}

      {displayData.instagramUsername && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Social Media</Text>
          <View style={styles.infoRow}>
            <InfoRow icon="logo-instagram" label="Instagram" value={`@${displayData.instagramUsername}`} />
          </View>
        </>
      )}

      {((Array.isArray(displayData.interests) && displayData.interests.length > 0) ||
        (Array.isArray(displayData.needs) && displayData.needs.length > 0)) && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Preferences</Text>
          {Array.isArray(displayData.interests) && displayData.interests.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsLabel, { color: theme.textTertiary }]}>Interests</Text>
              <View style={styles.tagsWrapper}>
                {displayData.interests.map((interest, index) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)', borderColor: theme.primary },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: theme.primary }]}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {Array.isArray(displayData.needs) && displayData.needs.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsLabel, { color: theme.textTertiary }]}>Looking For</Text>
              <View style={styles.tagsWrapper}>
                {displayData.needs.map((need, index) => (
                  <View
                    key={index}
                    style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.1)', borderColor: '#EC4899' }]}
                  >
                    <Text style={[styles.tagText, { color: '#EC4899' }]}>{need}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <SignupPrimaryButton
        label="Verify Email Address"
        onPress={() => router.replace({
          pathname: '/auth/verify-email-post-signup',
          params: { email: data.email, name: data.firstName },
        })}
      />
    </SignupScreenLayout>
  );
}

const styles = StyleSheet.create({
  successBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: "Poppins",
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins",
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: "Poppins",
    marginBottom: 10,
    marginTop: 8,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoRowDouble: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  infoItemHalf: {
    flex: 1,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: "Poppins",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Poppins",
  },
  aboutCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: "Poppins",
    lineHeight: 20,
  },
  tagsSection: {
    marginBottom: 12,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: "Poppins",
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
    fontFamily: "Poppins",
  },
});
