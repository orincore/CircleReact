import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View, Animated, Easing, Dimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SignupWizardContext } from "./_layout";
import { useAuth } from "@/contexts/AuthContext";
import { socialAccountsApi } from "@/src/api/social-accounts";

export default function SignupSummary() {
  const router = useRouter();
  const { data } = useContext(SignupWizardContext);
  const { updateProfile, token, user, refreshUser } = useAuth();
  const formatTitleCase = useMemo(() => (s) => (s ? s.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') : s), []);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [displayData, setDisplayData] = useState(data);

  // Update profile with about and Instagram information
  const updateProfileInformation = async () => {
    if (!token || !data.about || !data.instagramUsername || updateCompleted) return;
    
    setIsUpdating(true);
    console.log('🔄 Updating profile with about and Instagram information...');
    
    try {
      // 1. Update profile with about information
      if (data.about && data.about.trim()) {
        console.log('📝 Updating about field:', data.about);
        await updateProfile({
          about: data.about.trim()
        });
      }

      // 2. Link Instagram account
      if (data.instagramUsername && data.instagramUsername.trim()) {
        console.log('📸 Linking Instagram account:', data.instagramUsername);
        
        const cleanUsername = data.instagramUsername.trim().replace('@', '');
        await socialAccountsApi.verifyInstagram(cleanUsername, token);
      }

      // 3. Refresh user data to get updated information
      console.log('🔄 Refreshing user data...');
      await refreshUser();
      
      setUpdateCompleted(true);
      console.log('✅ Profile update completed successfully');
      
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
    <LinearGradient colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]} locations={[0, 0.55, 1]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Decorative sparkles (animated) */}
          <Animated.View style={[styles.sparkle, styles.sparkleTL, { transform: [{ translateY: sparkleTranslate }], opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={28} color="#FFE8FF" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkleTR, { transform: [{ translateY: Animated.multiply(sparkleTranslate, -1) }], opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={20} color="#FFD6F2" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkleBL, { transform: [{ translateY: sparkleTranslate }], opacity: sparkleOpacity }]}>
            <Ionicons name="sparkles" size={24} color="#E9E6FF" />
          </Animated.View>

          {/* Confetti particles */}
          {confetti.map((c, idx) => {
            const t = confettiAnim[idx];
            const translateY = t.interpolate({ inputRange: [0,1], outputRange: [-30, 200] });
            const rotate = t.interpolate({ inputRange: [0,1], outputRange: ['0deg', `${Math.random()*360}deg`] });
            const opacity = t.interpolate({ inputRange: [0,0.2,1], outputRange: [0, 1, 0] });
            return (
              <Animated.View key={c.key} style={[styles.confetti, { left: c.left, width: c.size, height: c.size, backgroundColor: c.color, transform: [{ translateY }, { rotate }] , opacity }]} />
            );
          })}

          <View style={styles.card}>
            <View style={styles.celebrateRow}>
              <Ionicons name="sparkles" size={18} color="#7C2B86" />
              <Text style={styles.celebrateText}>Welcome to Circle</Text>
              <Ionicons name="sparkles" size={18} color="#7C2B86" />
            </View>

            <View style={styles.checkWrap}>
              <LinearGradient colors={["#FFD6F2", "#E9E6FF"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.checkCircleOuter}>
                <View style={styles.checkCircleInner}>
                  {/* Shimmer overlay */}
                  <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}>
                    <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0)"]} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, borderRadius: 16 }} />
                  </Animated.View>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.title}>Hurray! Your Circle account is created</Text>
            <Text style={styles.subtitle}>
              {isUpdating ? 'Setting up your profile...' : 'Here\'s what we\'ve got for you:'}
            </Text>

            <View style={styles.summaryRow}><Text style={styles.label}>Name</Text><Text style={styles.value}>{displayData.firstName} {displayData.lastName}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.label}>Gender</Text><Text style={styles.value}>{formatTitleCase(displayData.gender)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.label}>Age</Text><Text style={styles.value}>{displayData.age}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.label}>Username</Text><Text style={styles.value}>{displayData.username}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.label}>Email</Text><Text style={styles.value}>{displayData.email}</Text></View>
            {displayData.phoneNumber ? (
              <View style={styles.summaryRow}><Text style={styles.label}>Phone</Text><Text style={styles.value}>{displayData.countryCode} {displayData.phoneNumber}</Text></View>
            ) : null}
            
            {/* About section with loading state */}
            {displayData.about ? (
              <View style={styles.summaryBlock}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>About</Text>
                  {isUpdating && <Ionicons name="sync" size={12} color="#7C2B86" />}
                </View>
                <Text style={styles.value}>{displayData.about}</Text>
              </View>
            ) : null}
            
            {/* Instagram section with status */}
            {displayData.instagramUsername ? (
              <View style={styles.summaryBlock}>
                <View style={styles.labelRow}>
                  <Ionicons name="logo-instagram" size={14} color="#E4405F" />
                  <Text style={styles.label}>Instagram</Text>
                  {isUpdating ? (
                    <Ionicons name="sync" size={12} color="#7C2B86" />
                  ) : updateCompleted ? (
                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  ) : null}
                </View>
                <Text style={styles.value}>@{displayData.instagramUsername}</Text>
              </View>
            ) : null}
            {Array.isArray(displayData.interests) && displayData.interests.length > 0 ? (
              <View style={styles.summaryBlock}><Text style={styles.label}>Interests</Text><Text style={styles.value}>{displayData.interests.join(', ')}</Text></View>
            ) : null}
            {Array.isArray(displayData.needs) && displayData.needs.length > 0 ? (
              <View style={styles.summaryBlock}><Text style={styles.label}>Needs</Text><Text style={styles.value}>{displayData.needs.join(', ')}</Text></View>
            ) : null}

            <TouchableOpacity style={styles.cta} onPress={() => router.replace("/secure/match") }>
              <Ionicons name="sparkles" size={18} color="#7C2B86" />
              <Text style={styles.ctaText}>All set</Text>
              <Ionicons name="arrow-forward" size={18} color="#7C2B86" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 28, padding: 24, width: '100%', gap: 12, boxShadow: '0px 22px 52px rgba(18, 8, 43, 0.35)', borderWidth: 1, borderColor: 'rgba(233,230,255,0.6)' },
  celebrateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  celebrateText: { fontSize: 12, fontWeight: '800', color: '#7C2B86', textTransform: 'uppercase', letterSpacing: 1.2 },
  checkWrap: { alignItems: 'center', marginBottom: 6 },
  checkCircleOuter: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  checkCircleInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF6FB', alignItems: 'center', justifyContent: 'center', shadowColor: '#7C2B86', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  title: { fontSize: 22, fontWeight: '800', color: '#1F1147', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(31,17,71,0.62)', textAlign: 'center', marginBottom: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryBlock: { gap: 6, paddingTop: 6 },
  label: { fontSize: 13, color: '#58468B' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 14, color: '#1F1147', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  cta: { marginTop: 12, backgroundColor: '#FFD6F2', borderRadius: 999, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(255,214,242,0.8)' },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#7C2B86' },
  sparkle: { position: 'absolute', opacity: 0.5 },
  sparkleTL: { top: 48, left: 28 },
  sparkleTR: { top: 94, right: 32 },
  sparkleBL: { bottom: 72, left: 40 },
});
