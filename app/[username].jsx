import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const APP_SCHEME = 'circle';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.orincore.Circle';
const APP_STORE_URL = 'https://apps.apple.com/app/circle/id123456789'; // Update with actual App Store ID

export default function PublicProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams();
  const [showAppBanner, setShowAppBanner] = useState(false);

  const cleanUsername = useMemo(() => {
    const raw = Array.isArray(username) ? username[0] : username;
    return (raw || '').toString().trim().replace(/^@/, '');
  }, [username]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // Check if we should show the "Open in App" banner on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Show banner on mobile web browsers
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setShowAppBanner(isMobile);
    }
  }, []);

  const handleOpenInApp = async () => {
    const deepLink = `${APP_SCHEME}://${cleanUsername}`;
    
    if (Platform.OS === 'web') {
      // Try to open the app via deep link
      // If it fails, redirect to app store
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // Create a hidden iframe to try opening the app
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      
      // Set a timeout to redirect to store if app doesn't open
      setTimeout(() => {
        document.body.removeChild(iframe);
        if (isAndroid) {
          window.location.href = PLAY_STORE_URL;
        } else if (isIOS) {
          window.location.href = APP_STORE_URL;
        }
      }, 2500);
    } else {
      // On native, try to open the deep link
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
        }
      } catch (e) {
        console.log('Could not open deep link:', e);
      }
    }
  };

  const handleGetApp = () => {
    if (Platform.OS === 'web') {
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        window.location.href = PLAY_STORE_URL;
      } else {
        window.location.href = APP_STORE_URL;
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!cleanUsername) {
        setError('Missing username');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const apiBase = process.env.EXPO_PUBLIC_API_URL || 'https://api.circle.orincore.com';
        const res = await fetch(`${apiBase}/api/public/profile/${encodeURIComponent(cleanUsername)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error || 'Profile not found');
          setProfile(null);
          return;
        }

        setProfile(data);
      } catch (e) {
        setError('Failed to load profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [cleanUsername]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C2B86" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-circle-outline" size={60} color="rgba(255,255,255,0.7)" />
        <Text style={styles.loadingText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0D0524', '#1F1147', '#7C2B86']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>@{profile.username}</Text>
          <View style={styles.headerIconButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.card}>
          <View style={styles.profileTopRow}>
            <Image
              source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/96' }}
              style={styles.avatar}
            />
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.meta}>
                {(profile.age || 'N/A')} • {(profile.gender || 'N/A')}
              </Text>
              {profile.verification_status === 'verified' && (
                <View style={styles.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              )}
            </View>
          </View>

          {!!profile.about && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.paragraph}>{profile.about}</Text>
            </View>
          )}

          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.chipsRow}>
                {profile.interests.map((x, idx) => (
                  <View key={`${x}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{String(x)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {Array.isArray(profile.needs) && profile.needs.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Needs</Text>
              <View style={styles.chipsRow}>
                {profile.needs.map((x, idx) => (
                  <View key={`${x}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{String(x)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footerHint}>
            <Text style={styles.footerHintText}>
              {Platform.OS === 'web'
                ? 'Open this profile in the Circle app for full features.'
                : 'Log in to Circle to connect with this profile.'}
            </Text>
            
            {Platform.OS === 'web' && showAppBanner && (
              <View style={styles.appButtonsRow}>
                <TouchableOpacity style={styles.openAppButton} onPress={handleOpenInApp}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.openAppButtonText}>Open in App</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.getAppButton} onPress={handleGetApp}>
                  <Ionicons name="download-outline" size={18} color="#7C2B86" />
                  <Text style={styles.getAppButtonText}>Get the App</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B061C',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 18,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 18,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  paragraph: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  footerHint: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  footerHintText: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 12,
    fontWeight: '600',
  },
  appButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  openAppButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#7C2B86',
  },
  openAppButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  getAppButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 43, 134, 0.5)',
  },
  getAppButtonText: {
    color: '#7C2B86',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B061C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  }
});
