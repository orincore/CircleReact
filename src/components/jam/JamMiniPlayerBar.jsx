import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useJamSession } from '@/contexts/JamSessionContext';
import { unreadCountService } from '@/src/services/unreadCountService';

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
  const router = useRouter();
  const { theme } = useTheme();
  const {
    session, currentQueueItem, isExpanded, setIsExpanded, play, pause, next, isOtherPresent,
    needsAudioUnlock, unlockAudio, setPlayerSlot, activeChatOtherUserId, activeChatOtherUserName,
  } = useJamSession();

  const thumbRef = useRef(null);

  // Live unread count for the chat this jam session belongs to. A message from the other
  // participant while the user is off elsewhere (explore, match, chat list) -- not
  // interrupting their music, which is the whole point of this bar persisting across
  // screens -- would otherwise go unnoticed until they happened to open that chat later.
  const chatId = session?.chat_id ?? null;
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  useEffect(() => {
    if (!chatId) {
      setChatUnreadCount(0);
      return;
    }
    const unsubscribe = unreadCountService.subscribe(({ chatUnreadCounts }) => {
      setChatUnreadCount(chatUnreadCounts[chatId] || 0);
    });
    return unsubscribe;
  }, [chatId]);

  const openChat = useCallback((e) => {
    e.stopPropagation?.();
    if (!chatId) return;
    router.push({
      pathname: '/secure/chat-conversation',
      params: {
        id: chatId,
        name: activeChatOtherUserName || 'Chat',
        ...(activeChatOtherUserId ? { otherUserId: String(activeChatOtherUserId) } : {}),
      },
    });
  }, [router, chatId, activeChatOtherUserId, activeChatOtherUserName]);

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

      {chatUnreadCount > 0 && (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[styles.chatBadge, { backgroundColor: theme.primary }]}
          onPress={openChat}
        >
          <Ionicons name="chatbubble-ellipses" size={12} color="#fff" />
          <Text style={styles.chatBadgeText}>{chatUnreadCount > 9 ? '9+' : chatUnreadCount}</Text>
        </TouchableOpacity>
      )}

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
          // Blocked (not left to fail server-side) whenever the other listener isn't here,
          // or there's nothing queued to play at all -- pausing is always allowed.
          disabled={!session.is_playing && (!otherPresent || !currentQueueItem)}
          onPress={(e) => { e.stopPropagation?.(); session.is_playing ? pause() : play(); }}
        >
          <Ionicons
            name={session.is_playing ? 'pause' : 'play'}
            size={20}
            color={!session.is_playing && (!otherPresent || !currentQueueItem) ? theme.textMuted : theme.primary}
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
  chatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
