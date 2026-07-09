import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useJamSession } from '@/contexts/JamSessionContext';

/**
 * "Now playing" bar for an active jam session. Reads from the app-wide JamSessionContext
 * (mounted once at app/secure/_layout.jsx) so the same session/audio keeps going no matter
 * which screen this renders on, but is placed INLINE by each screen individually rather
 * than floating globally — different screens want it in different specific spots:
 * chat-conversation (above the composer), the chat list (replacing the daily Blind Connect
 * banner while a session is live), explore (below the header) and match (below the Harmony
 * card). Renders nothing if there's no active session, so it's safe to drop into any of
 * those screens unconditionally.
 */
export default function JamMiniPlayerBar({ style }) {
  const { theme } = useTheme();
  const {
    session, currentQueueItem, isExpanded, setIsExpanded, play, pause, next, isOtherPresent,
    needsAudioUnlock, unlockAudio, setPlayerSlot, activeChatOtherUserId, activeChatOtherUserName,
  } = useJamSession();

  const thumbRef = useRef(null);

  // Reports this bar's thumbnail rect as the dock target for the persistent player while
  // collapsed. Currently inert in practice — the player runs at a fixed 1x1px (confirmed to
  // keep iOS audio alive at that size; see JamSessionContext's TEST_TINY_PLAYER) rather than
  // docking into this thumbnail — but left in place/harmless in case that ever reverts.
  const measureThumbSlot = useCallback(() => {
    if (isExpanded) return;
    thumbRef.current?.measureInWindow?.((x, y, width, height) => {
      if (width > 0 && height > 0) setPlayerSlot({ x, y, width, height });
    });
  }, [isExpanded, setPlayerSlot]);

  useEffect(() => {
    if (isExpanded) return;
    measureThumbSlot();
  }, [isExpanded, measureThumbSlot]);

  if (!session || session.status === 'ended' || isExpanded) return null;

  const otherPresent = activeChatOtherUserId ? isOtherPresent(activeChatOtherUserId) : true;
  const showNotListening = !otherPresent;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { if (needsAudioUnlock) unlockAudio(); setIsExpanded(true); }}
      style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
    >
      <View
        ref={thumbRef}
        onLayout={measureThumbSlot}
        style={[styles.thumb, { backgroundColor: theme.backgroundSecondary }]}
      >
        {currentQueueItem?.thumbnail_url ? (
          <Image source={{ uri: currentQueueItem.thumbnail_url }} style={styles.thumbImage} />
        ) : (
          <Ionicons name="musical-notes" size={18} color={theme.primary} />
        )}
      </View>

      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>
          {currentQueueItem?.title || 'Jam session started'}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: showNotListening ? theme.warning : (needsAudioUnlock ? theme.primary : theme.textTertiary) }]}>
          {needsAudioUnlock ? 'Tap to enable sound' : showNotListening ? `${activeChatOtherUserName || 'They'} isn't listening` : (currentQueueItem?.channel_title || 'Listening together')}
        </Text>
      </View>

      {needsAudioUnlock ? (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.controlButton}
          onPress={(e) => { e.stopPropagation?.(); unlockAudio(); }}
        >
          <Ionicons name="volume-mute-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.controlButton}
          // Blocked (not left to fail server-side) whenever the other listener isn't here —
          // pausing is always allowed.
          disabled={!session.is_playing && !otherPresent}
          onPress={(e) => { e.stopPropagation?.(); session.is_playing ? pause() : play(); }}
        >
          <Ionicons
            name={session.is_playing ? 'pause' : 'play'}
            size={20}
            color={!session.is_playing && !otherPresent ? theme.textMuted : theme.primary}
          />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.controlButton}
        onPress={(e) => { e.stopPropagation?.(); next(); }}
      >
        <Ionicons name="play-skip-forward" size={20} color={theme.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  thumb: {
    // Sized generously enough to look intentional as a "now playing" thumbnail — no longer
    // load-bearing for audio (the real player runs at a fixed 1x1px; see
    // JamSessionContext's TEST_TINY_PLAYER), just a static/decorative artwork tile now.
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  controlButton: {
    padding: 6,
  },
});
