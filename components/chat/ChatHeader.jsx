import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import VerifiedBadge from "@/components/VerifiedBadge";
import { styles } from "./chatConversationStyles";

// Header bar: back button, avatar (with reveal crossfade), name/subtitle,
// reveal/jam/search buttons. Purely presentational -- all state and
// navigation handlers are owned by the chat screen and passed in as props.
function ChatHeader({
  router,
  theme,
  isBlindDate,
  bothRevealed,
  otherUserProfile,
  paramOtherUserId,
  justRevealed,
  avatarUrl,
  revealAnim,
  conversationName,
  otherUserVerified,
  blindDateInfo,
  isOnline,
  onlineLabelOpacity,
  canRevealFromHeader,
  handleHeaderRevealPress,
  jamSession,
  conversationId,
  setJamExpanded,
  startJamSession,
  name,
  setSearchVisible,
}) {
  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: "transparent",
          backgroundColor: "transparent",
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.surface }]}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/secure/(tabs)/match');
          }
        }}
      >
        <Ionicons
          name="arrow-back-outline"
          size={20}
          color={theme.textPrimary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={{ position: 'relative' }}
        onPress={() => {
          // Allow profile view if not blind date OR if both revealed
          const canViewProfile = !isBlindDate || bothRevealed;
          const profileId = otherUserProfile?.id || paramOtherUserId;
          if (canViewProfile && profileId) {
            router.push(`/secure/user-profile/${profileId}`);
          }
        }}
        disabled={!paramOtherUserId && !otherUserProfile?.id}
      >
        {(() => {
          // Use revealed profile photo if available, otherwise use
          // avatarUrl -- which, for an ongoing (unrevealed) blind date,
          // is already a server-side-blurred image passed through from
          // the chat list's route params (see anonAvatar.service.ts /
          // chat-list.routes.ts), not the real photo blurred client-side
          // at render time. That used to need its own blurRadius +
          // BlurView-overlay treatment here, which rendered
          // inconsistently across platforms (an unclipped, wrong-shaped
          // box instead of an actual blurred circular photo). A
          // pre-blurred image just needs the same plain clipping every
          // other avatar in the app gets.
          const revealedAvatarUrl = otherUserProfile?.profile_photo_url;
          const displayAvatarUrl = bothRevealed && revealedAvatarUrl
            ? revealedAvatarUrl
            : avatarUrl;

          // Reveal moment: crossfade the old blurred/masked photo into
          // the real one instead of an instant hard swap. avatarUrl is
          // the original masked snapshot from route params, which stays
          // stable even after bothRevealed flips, so it's safe to use
          // as the "before" layer here.
          if (justRevealed && revealedAvatarUrl) {
            return (
              <View style={styles.headerAvatarCrossfadeContainer}>
                {avatarUrl && (
                  <ExpoImage
                    source={{ uri: avatarUrl }}
                    style={styles.headerAvatarCrossfadeImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                )}
                <Animated.View style={[styles.headerAvatarCrossfadeImage, { opacity: revealAnim }]}>
                  <ExpoImage
                    source={{ uri: revealedAvatarUrl }}
                    style={styles.headerAvatarCrossfadeImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </Animated.View>
              </View>
            );
          }

          if (displayAvatarUrl) {
            return (
              <View style={{ overflow: 'hidden', borderRadius: 12 }}>
                <ExpoImage
                  source={{ uri: displayAvatarUrl }}
                  style={styles.headerAvatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={100}
                />
              </View>
            );
          }
          return (
            <View style={[styles.headerAvatarFallback, { backgroundColor: theme.primary }]}>
              <Text style={styles.headerAvatarFallbackText}>
                {(bothRevealed && otherUserProfile?.first_name
                  ? otherUserProfile.first_name
                  : conversationName
                ).charAt(0).toUpperCase()}
              </Text>
            </View>
          );
        })()}
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <View style={styles.headerNameRow}>
          <Animated.Text
            style={[styles.headerTitle, { color: theme.textPrimary, opacity: revealAnim }]}
            numberOfLines={1}
          >
            {bothRevealed && otherUserProfile?.first_name
              ? `${otherUserProfile.first_name} ${otherUserProfile.last_name || ''}`.trim()
              : isBlindDate && otherUserProfile?.first_name
                ? `${otherUserProfile.first_name} ${otherUserProfile.last_name || ''}`.trim()
                : conversationName
            }
          </Animated.Text>
          {(otherUserVerified || (bothRevealed && otherUserProfile?.is_verified)) && (
            <VerifiedBadge size={18} style={{ marginLeft: 4 }} />
          )}
          {bothRevealed && (
            <View style={styles.friendBadge}>
              <Ionicons name="people" size={12} color="#4CAF50" />
              <Text style={styles.friendBadgeText}>Friends</Text>
            </View>
          )}
        </View>
        {isBlindDate && !bothRevealed && (blindDateInfo || otherUserProfile) ? (
          <Text
            style={[styles.headerSubtitle, { color: theme.primary }]}
            numberOfLines={1}
          >
            {[
              blindDateInfo?.matchReason ? `Looking for ${blindDateInfo.matchReason}` : (otherUserProfile?.needs ? `Looking for ${otherUserProfile.needs}` : null),
              blindDateInfo?.gender || otherUserProfile?.gender ? (blindDateInfo?.gender || otherUserProfile?.gender).charAt(0).toUpperCase() + (blindDateInfo?.gender || otherUserProfile?.gender).slice(1) : null,
              blindDateInfo?.age || otherUserProfile?.age ? `${blindDateInfo?.age || otherUserProfile?.age} yrs` : null,
            ].filter(Boolean).join(' • ')}
          </Text>
        ) : bothRevealed && otherUserProfile ? (
          <Text
            style={[styles.headerSubtitle, { color: '#4CAF50' }]}
            numberOfLines={1}
          >
            {[
              otherUserProfile.gender ? otherUserProfile.gender.charAt(0).toUpperCase() + otherUserProfile.gender.slice(1) : null,
              otherUserProfile.age ? `${otherUserProfile.age} yrs` : null,
              '• Tap to view profile'
            ].filter(Boolean).join(' ')}
          </Text>
        ) : isBlindDate ? (
          <Text
            style={[styles.headerSubtitle, { color: theme.primary }]}
            numberOfLines={1}
          >
            Blind Connect • Anonymous Chat
          </Text>
        ) : (
          <Animated.View
            style={{ flexDirection: "row", alignItems: "center", opacity: onlineLabelOpacity }}
          >
            {isOnline && (
              <View style={[styles.onlineStatusDotInline, { backgroundColor: theme.success }]} />
            )}
            <Text
              style={[
                styles.headerSubtitle,
                { color: isOnline ? theme.success : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </Animated.View>
        )}
      </View>

      {canRevealFromHeader && (
        <TouchableOpacity
          style={[styles.headerRevealButton, { backgroundColor: theme.surface }]}
          onPress={handleHeaderRevealPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="eye-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.headerRevealButton, { backgroundColor: theme.surface }]}
        onPress={() => {
          // jamSession is now tracked app-wide, so it may belong to a DIFFERENT chat
          // than the one currently open (e.g. the user is still listening elsewhere) —
          // only treat it as "this chat's session" (and just expand it) when its
          // chat_id actually matches; otherwise start a fresh one for this chat, which
          // deliberately takes over tracking (see startSession's comment).
          if (jamSession && jamSession.chat_id === conversationId) {
            setJamExpanded(true);
          } else {
            startJamSession(conversationId, paramOtherUserId, name);
          }
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="musical-notes-outline" size={20} color={theme.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.headerRevealButton, { backgroundColor: theme.surface }]}
        onPress={() => setSearchVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="search-outline" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(ChatHeader);
