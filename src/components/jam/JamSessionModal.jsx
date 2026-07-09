import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, ActivityIndicator,
  BackHandler, Platform, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useJamSession } from '@/contexts/JamSessionContext';

const SEARCH_DEBOUNCE_MS = 450;

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function JamSessionModal({ otherUserId, otherUserName }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    session, queue, currentQueueItem, positionMs, isExpanded, setIsExpanded,
    searchResults, isSearching, search, addTrack, removeTrack,
    play, pause, seek, next, previous, endSession, error, clearError, isOtherPresent,
    needsAudioUnlock, unlockAudio, setPlayerSlot,
  } = useJamSession();

  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);
  const trackWidthRef = useRef(0);
  const videoSlotRef = useRef(null);

  // Non-null while the user has a finger down on the seek track — the fill/thumb/time
  // label all render from this instead of the real positionMs during a drag, since the
  // real position doesn't move until seek() actually lands; committed (and cleared) on
  // release rather than continuously, so a drag doesn't flood the socket with seek events.
  const [dragPositionMs, setDragPositionMs] = useState(null);
  const durationSecondsRef = useRef(0);
  durationSecondsRef.current = currentQueueItem?.duration_seconds || 0;
  const seekRef = useRef(seek);
  seekRef.current = seek;

  const ratioFromTouch = useCallback((e) => {
    const width = trackWidthRef.current;
    if (!width) return 0;
    return Math.min(1, Math.max(0, e.nativeEvent.locationX / width));
  }, []);

  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const duration = durationSecondsRef.current;
        if (!duration) return;
        setDragPositionMs(ratioFromTouch(e) * duration * 1000);
      },
      onPanResponderMove: (e) => {
        const duration = durationSecondsRef.current;
        if (!duration) return;
        setDragPositionMs(ratioFromTouch(e) * duration * 1000);
      },
      onPanResponderRelease: (e) => {
        const duration = durationSecondsRef.current;
        setDragPositionMs(null);
        if (!duration) return;
        // A tap-without-moving fires grant then release at effectively the same
        // location, so this also covers plain tap-to-seek — no separate handler needed.
        seekRef.current(Math.round(ratioFromTouch(e) * duration * 1000));
      },
      onPanResponderTerminate: () => setDragPositionMs(null),
    })
  ).current;

  // This screen is a plain in-tree overlay rather than a native <Modal>. A native modal
  // presents in its own layer ABOVE everything in the app, including the persistent jam
  // player that JamSessionContext keeps mounted — so the video could never appear inside
  // this screen, only float over the chat behind it. As a sibling overlay in the same view
  // tree, the persistent player can be positioned into the video slot below.
  useEffect(() => {
    if (Platform.OS !== 'android' || !isExpanded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsExpanded(false);
      return true;
    });
    return () => sub.remove();
  }, [isExpanded, setIsExpanded]);

  // Report the video slot's on-screen rect so JamSessionContext can dock the persistent
  // player into it while this screen is open; clear it again when leaving so the player
  // falls back to its floating mini tile (it must stay visible SOMEWHERE — iOS refuses
  // YouTube playback in hidden/off-screen players).
  const measureVideoSlot = useCallback(() => {
    videoSlotRef.current?.measureInWindow?.((x, y, width, height) => {
      if (!(width > 0 && height > 0)) return;
      setPlayerSlot((prev) =>
        prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height
          ? prev
          : { x, y, width, height }
      );
    });
  }, [setPlayerSlot]);

  // Cleanup-only (no nulling on expand): the slot's own onLayout may fire before or after
  // this effect, and nulling here on expand could clobber a rect it already reported.
  useEffect(() => {
    if (!isExpanded) return;
    return () => setPlayerSlot(null);
  }, [isExpanded, setPlayerSlot]);

  const otherPresent = otherUserId ? isOtherPresent(otherUserId) : true;

  // The slot's onLayout only re-fires when its size/position change relative to its own
  // parent — notice bars appearing above the now-playing section shift the slot on screen
  // without triggering it. Re-measure (post-layout) whenever one of those toggles.
  useEffect(() => {
    if (!isExpanded) return;
    const t = setTimeout(measureVideoSlot, 50);
    return () => clearTimeout(t);
  }, [isExpanded, needsAudioUnlock, otherPresent, error, measureVideoSlot]);

  const onChangeQuery = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), SEARCH_DEBOUNCE_MS);
  }, [search]);

  if (!session || !isExpanded) return null;

  const durationSeconds = currentQueueItem?.duration_seconds;
  const displayPositionMs = dragPositionMs ?? positionMs;
  const progress = durationSeconds ? Math.min(1, displayPositionMs / 1000 / durationSeconds) : 0;

  return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsExpanded(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Jam Session</Text>
          <TouchableOpacity onPress={endSession} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.endText, { color: theme.error }]}>End</Text>
          </TouchableOpacity>
        </View>

        {needsAudioUnlock && (
          <TouchableOpacity style={[styles.noticeBar, { backgroundColor: theme.primary + '22' }]} onPress={unlockAudio}>
            <Ionicons name="volume-mute-outline" size={16} color={theme.primary} />
            <Text style={[styles.noticeText, { color: theme.primary }]}>
              Tap to enable sound — browsers block audio until you interact with the page
            </Text>
          </TouchableOpacity>
        )}

        {!otherPresent && (
          <View style={[styles.noticeBar, { backgroundColor: theme.warning + '22' }]}>
            <Ionicons name="pause-circle-outline" size={16} color={theme.warning} />
            <Text style={[styles.noticeText, { color: theme.warning }]}>
              Paused — {otherUserName || 'the other listener'} isn't in the session right now
            </Text>
          </View>
        )}

        {error && (
          <TouchableOpacity style={[styles.noticeBar, { backgroundColor: theme.error + '22' }]} onPress={clearError}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.error} />
            <Text style={[styles.noticeText, { color: theme.error }]} numberOfLines={2}>{error}</Text>
          </TouchableOpacity>
        )}

        {/* Now playing */}
        <View style={styles.nowPlaying}>
          {/* The persistent player from JamSessionContext is docked over this slot (it can't
              be a child here — it must never unmount, or playback resets on every
              expand/collapse). The thumbnail shows through until the video renders. */}
          <View
            ref={videoSlotRef}
            onLayout={measureVideoSlot}
            style={[styles.videoSlot, { backgroundColor: theme.surfaceSecondary }]}
          >
            {currentQueueItem?.thumbnail_url ? (
              <Image source={{ uri: currentQueueItem.thumbnail_url }} style={styles.nowPlayingImage} />
            ) : (
              <Ionicons name="musical-notes" size={40} color={theme.primary} />
            )}
          </View>
          <Text numberOfLines={2} style={[styles.nowPlayingTitle, { color: theme.textPrimary }]}>
            {currentQueueItem?.title || 'Nothing queued yet'}
          </Text>
          {!!currentQueueItem?.channel_title && (
            <Text numberOfLines={1} style={[styles.nowPlayingChannel, { color: theme.textTertiary }]}>
              {currentQueueItem.channel_title}
            </Text>
          )}

          {!!durationSeconds && (
            <View style={styles.progressRow}>
              {/* Padded hit area taller than the visible track so the thumb is easy to grab
                  without needing hitSlop (PanResponder views don't support it like Pressable). */}
              <View
                onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
                style={styles.progressHitArea}
                {...seekPanResponder.panHandlers}
              >
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progress * 100}%` }]} />
                </View>
                <View
                  style={[
                    styles.progressThumb,
                    {
                      backgroundColor: theme.primary,
                      left: `${progress * 100}%`,
                      transform: [{ translateX: -8 }, { scale: dragPositionMs !== null ? 1.3 : 1 }],
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: theme.textMuted }]}>{formatDuration(displayPositionMs / 1000)}</Text>
                <Text style={[styles.progressLabel, { color: theme.textMuted }]}>{formatDuration(durationSeconds)}</Text>
              </View>
            </View>
          )}

          <View style={styles.transportRow}>
            <TouchableOpacity onPress={previous} style={styles.transportButton}>
              <Ionicons name="play-skip-back" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (session.is_playing ? pause() : play())}
              // Blocked (not just left to fail server-side and show an error after the
              // fact) whenever the other listener isn't here — pausing is always allowed.
              disabled={!session.is_playing && !otherPresent}
              style={[
                styles.playButton,
                { backgroundColor: theme.primary },
                !session.is_playing && !otherPresent && styles.playButtonDisabled,
              ]}
            >
              <Ionicons name={session.is_playing ? 'pause' : 'play'} size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.transportButton}>
              <Ionicons name="play-skip-forward" size={26} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search for a song"
            placeholderTextColor={theme.textPlaceholder}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {isSearching && <ActivityIndicator size="small" color={theme.primary} />}
        </View>

        {query.length >= 2 && searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.videoId}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => { addTrack(item); setQuery(''); }}
              >
                <Image source={{ uri: item.thumbnailUrl }} style={styles.resultThumb} />
                <View style={styles.resultInfo}>
                  <Text numberOfLines={1} style={[styles.resultTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[styles.resultChannel, { color: theme.textTertiary }]}>{item.channelTitle}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ListHeaderComponent={queue.length ? (
              <Text style={[styles.queueHeader, { color: theme.textTertiary }]}>Up next</Text>
            ) : null}
            ListEmptyComponent={(
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Search above to queue the first song
              </Text>
            )}
            renderItem={({ item }) => (
              <View style={[styles.resultRow, item.id === session.current_queue_item_id && { opacity: 0.5 }]}>
                <Image source={{ uri: item.thumbnail_url }} style={styles.resultThumb} />
                <View style={styles.resultInfo}>
                  <Text numberOfLines={1} style={[styles.resultTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[styles.resultChannel, { color: theme.textTertiary }]}>
                    {item.channel_title}{item.is_auto_recommended ? ' · Recommended' : ''}
                  </Text>
                </View>
                {item.id !== session.current_queue_item_id && (
                  <TouchableOpacity onPress={() => removeTrack(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={22} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  // The explicit full-bleed sizing/positioning lives on JamSessionContext's wrapping
  // `expandedScreen` View — this just fills that exact box.
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  endText: { fontSize: 15, fontWeight: '600' },
  noticeBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8, padding: 8, borderRadius: 8,
  },
  noticeText: { fontSize: 12, flex: 1 },
  nowPlaying: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  videoSlot: {
    width: '100%', aspectRatio: 16 / 9, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', marginBottom: 14,
  },
  nowPlayingImage: { width: '100%', height: '100%' },
  nowPlayingTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  nowPlayingChannel: { fontSize: 13, marginTop: 2 },
  progressRow: { width: '100%', marginTop: 14 },
  // Taller than the visible track so the thumb is easy to grab with a finger — PanResponder
  // views (unlike Pressable) don't support hitSlop, so the padded touch target has to be
  // real layout, not just an event-hit-testing expansion.
  progressHitArea: { width: '100%', paddingVertical: 12, justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: '50%',
    marginTop: -8,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel: { fontSize: 11 },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 18 },
  transportButton: { padding: 8 },
  playButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  playButtonDisabled: { opacity: 0.4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  list: { flex: 1, marginTop: 8 },
  queueHeader: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 6, textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', fontSize: 13, marginTop: 24 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  resultThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#0002' },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultChannel: { fontSize: 12, marginTop: 1 },
});
