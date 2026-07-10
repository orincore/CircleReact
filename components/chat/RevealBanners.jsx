import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Loader from "@/components/Loader";
import { styles } from "./chatConversationStyles";

// The four small conditional banners shown below the header: the transient
// "identity revealed" toast, the meme-connect reveal banner, the blind-date
// reveal-status banner, and the both-revealed success banner. Grouped into
// one component since they're small, mutually related, and always rendered
// in this same sequence.
function RevealBanners({
  justRevealed,
  theme,
  revealToastAnim,
  otherUserProfile,
  paramOtherUserId,
  router,
  isMemeConnect,
  memeConnectBothRevealed,
  memeConnectRequest,
  memeConnectSelfRevealed,
  handleMemeConnectReveal,
  revealingMemeConnect,
  isBlindDate,
  bothRevealed,
  hasRevealedSelf,
  otherHasRevealed,
  handleRevealProfile,
  isRevealSubmitting,
}) {
  return (
    <>
      {/* Transient "revealed" toast -- replaces the old blocking
          Alert.alert that fired the instant both sides revealed. Fades in
          with the header crossfade, sits for a couple seconds, fades out;
          tapping it jumps straight to the now-visible profile. */}
      {justRevealed && (
        <Animated.View
          style={[
            styles.revealToast,
            { backgroundColor: theme.primary, opacity: revealToastAnim, transform: [{ translateY: revealToastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.revealToastContent}
            activeOpacity={0.85}
            onPress={() => {
              const profileId = otherUserProfile?.id || paramOtherUserId;
              if (profileId) router.push(`/secure/user-profile/${profileId}`);
            }}
          >
            <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.revealToastText}>Identity revealed! Tap to view profile</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Anonymous meme-connect reveal banner -- separate from Blind Dating's
          reveal system above; lighter weight (no message filtering, no
          auto-unblur), just a status line + reveal button. */}
      {isMemeConnect && !memeConnectBothRevealed && memeConnectRequest && (
        <View style={[styles.revealStatusBanner, { backgroundColor: theme.primary }]}>
          <Ionicons name="eye-off-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.revealStatusText}>
            {memeConnectSelfRevealed
              ? 'You revealed your identity. Waiting for them...'
              : 'Anonymous connection. Reveal to see each other\'s identity.'}
          </Text>
          {!memeConnectSelfRevealed && (
            <TouchableOpacity
              onPress={handleMemeConnectReveal}
              disabled={revealingMemeConnect}
              style={styles.revealStatusButton}
            >
              <Text style={styles.revealStatusButtonText}>
                {revealingMemeConnect ? '...' : 'Reveal'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Blind Connect Reveal Status Banner */}
      {isBlindDate && !bothRevealed && (hasRevealedSelf || otherHasRevealed) && (
        <View style={[
          styles.revealStatusBanner,
          {
            backgroundColor: hasRevealedSelf && otherHasRevealed
              ? '#4CAF50'
              : otherHasRevealed
                ? theme.primary
                : '#FF9800'
          }
        ]}>
          <Ionicons
            name={hasRevealedSelf ? "eye" : "eye-outline"}
            size={16}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.revealStatusText}>
            {hasRevealedSelf && !otherHasRevealed
              ? "✨ You revealed your identity. Waiting for them..."
              : !hasRevealedSelf && otherHasRevealed
                ? "🎭 They revealed their identity! Tap to reveal yours"
                : "🎉 Both revealed!"
            }
          </Text>
          {!hasRevealedSelf && otherHasRevealed && (
            <TouchableOpacity
              style={styles.revealStatusButton}
              onPress={handleRevealProfile}
              disabled={isRevealSubmitting}
            >
              {isRevealSubmitting ? (
                <Loader size={16} color="#fff" />
              ) : (
                <Text style={styles.revealStatusButtonText}>Reveal</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Both Revealed Success Banner */}
      {isBlindDate && bothRevealed && (
        <View style={[styles.revealStatusBanner, { backgroundColor: '#4CAF50' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.revealStatusText}>
            🎉 Profiles revealed! You can now see each other's full profiles.
          </Text>
        </View>
      )}
    </>
  );
}

export default React.memo(RevealBanners);
