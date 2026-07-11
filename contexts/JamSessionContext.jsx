import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Platform, View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useAuth } from './AuthContext';
import { useSocket } from '@/src/hooks/useSocket';
import { useJamPresence } from '@/src/hooks/useJamPresence';
import { jamApi } from '@/src/api/jam';
import JamPlayerWebView from '@/src/components/jam/JamPlayerWebView';
import JamSessionModal from '@/src/components/jam/JamSessionModal';

const JamSessionContext = createContext();

// How far the server's authoritative position may drift from what the local player
// reports before we force a seek to reconcile (avoids constant micro-seeking from
// normal network jitter, per-device clock differences, etc).
const DRIFT_TOLERANCE_MS = 1500;

// While playing, ask the server for its authoritative position at this interval so both
// ends keep reconciling instead of only correcting drift at play/pause/seek/track-change
// events (which, over a long track, can let the two sides quietly drift apart).
const SYNC_REQUEST_INTERVAL_MS = 5000;

// TEMPORARY DIAGNOSTIC — set true to shrink the persistent player to 1x1 and stop it
// docking into the mini-bar/expanded-screen slots, to test whether iOS actually still
// plays audio at a size far below the ~200x200 we've confirmed works. Revert to false
// (or delete this + its usage below) once the test is done either way.
const TEST_TINY_PLAYER = true;

// Mounted once at the app root (app/secure/_layout.jsx) rather than per chat screen, so a
// jam session's audio and mini-player bar survive navigating anywhere else in the app —
// browsing other chats, tabs, memes, etc — the same way Spotify's mini player does. Which
// specific chat's session this instance is tracking is now internal state (activeChat,
// below) rather than a fixed prop, since the provider itself no longer remounts per chat.
export const JamSessionProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socket = useSocket();
  const myUserId = user?.id;
  // Explicit screen bounds rather than relying purely on ancestor flex resolution — this
  // provider can be nested arbitrarily deep depending on the host screen's own layout, and
  // the expanded jam screen (JamSessionModal, rendered here rather than by the host screen
  // so it's guaranteed to sit at this provider's own top level) must always be a true
  // full-bleed layer regardless of that.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Which chat's jam session this (now-global) provider is tracking. Chat screens report
  // themselves via setActiveChat on mount; see that function for why opening a DIFFERENT
  // chat doesn't tear down an already-ongoing session elsewhere.
  const [activeChat, setActiveChatState] = useState(null); // { chatId, otherUserId, otherUserName }
  const chatId = activeChat?.chatId ?? null;

  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [presence, setPresence] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  // Window rect the persistent player should currently dock into: JamSessionModal reports
  // its big video slot while expanded, JamMiniPlayerBar reports its small thumbnail slot
  // while collapsed — only one of the two is ever mounted at a time, so they share this one
  // slot without conflict. Null only very briefly (before either has measured), in which
  // case the player falls back to a small floating corner tile.
  const [playerSlot, setPlayerSlot] = useState(null);
  // The slot rect is measured in window coordinates, but the player is positioned relative
  // to this provider's root view — which may not start at the window origin (navigation
  // headers etc). Measuring the root's own window position lets us convert exactly.
  const rootRef = useRef(null);
  const [rootOrigin, setRootOrigin] = useState({ x: 0, y: 0 });
  const handleRootLayout = useCallback(() => {
    rootRef.current?.measureInWindow?.((x, y) => {
      setRootOrigin((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
    });
  }, []);

  const playerRef = useRef(null);
  const positionMsRef = useRef(0);
  // Timestamp of the last real onTimeUpdate report from the player. positionMsRef only moves
  // once the player is genuinely in a 'playing' state and reporting time — comparing it against
  // the server's ever-advancing computed position BEFORE that happens (e.g. while still
  // buffering/loading) always looks "drifted" and forces a seek, which restarts the loading
  // cycle and can prevent the player from ever settling into 'playing' at all. Drift correction
  // only applies once we have a reading fresh enough to trust.
  const lastTimeUpdateAtRef = useRef(0);
  const sessionRef = useRef(null);
  sessionRef.current = session;
  // Mirrors positionMsRef into state at the player's own ~1Hz report rate, so progress-bar
  // UI can re-render without the ref itself (read on every frame by drift-correction logic)
  // forcing a re-render on every tick.
  const [displayPositionMs, setDisplayPositionMs] = useState(0);

  // Called by chat-conversation.jsx on mount/param-change to say "the user is now looking
  // at this chat". Deliberately does NOT just overwrite activeChat unconditionally: since
  // this provider is global and persists across navigation, blindly adopting whatever chat
  // the user happens to be viewing would tear down an ALREADY-ongoing session's tracking
  // (audio, presence, mini bar) the instant they open a different conversation to read
  // messages — exactly the app-wide persistence this refactor exists to provide. Only
  // switches if there's no live session, or the live session already belongs to this chat.
  const setActiveChat = useCallback(({ chatId: newChatId, otherUserId: newOtherUserId, otherUserName: newOtherUserName }) => {
    setActiveChatState((prev) => {
      const live = sessionRef.current && sessionRef.current.status !== 'ended';
      if (live && prev && prev.chatId !== newChatId) return prev;
      if (prev && prev.chatId === newChatId && prev.otherUserId === newOtherUserId && prev.otherUserName === newOtherUserName) return prev;
      return { chatId: newChatId, otherUserId: newOtherUserId, otherUserName: newOtherUserName };
    });
  }, []);

  // Browsers block a media element from starting audible playback unless the call is made
  // (near enough) synchronously within a real user gesture on that page. Native has no such
  // restriction (JamPlayerWebView.native.jsx sets mediaPlaybackRequiresUserAction={false}),
  // so this only ever matters on web. Any local click handler below (play/seek/next/etc.)
  // marks this true immediately, since the click itself is the qualifying gesture; playback
  // state arriving async over the socket (from the *other* participant's action) can't rely
  // on that, so it's deferred behind a "tap to enable sound" prompt until a gesture happens.
  const audioUnlockedRef = useRef(Platform.OS !== 'web');
  const pendingSyncRef = useRef(null);

  const currentQueueItem = queue.find((q) => q.id === session?.current_queue_item_id) || null;

  const applyPlayerSync = useCallback(({ videoId, positionMs, isPlaying } = {}) => {
    console.log('[jam-context] applyPlayerSync', { videoId, positionMs, isPlaying, hasPlayerRef: !!playerRef.current });
    const wantsPlay = isPlaying === true;
    const isLocked = Platform.OS === 'web' && !audioUnlockedRef.current;
    // Only actually load-and-play (vs. load-and-cue-paused) if we both want it playing and
    // are allowed to start audible playback right now — avoids a brief flash of audio from
    // loadVideoById's auto-play before a follow-up pause() lands.
    const shouldPlayNow = wantsPlay && !isLocked;

    // Loading/seeking/cueing never needs a user gesture — only actually starting audible
    // playback does. So this always applies immediately; only the "and now play" part below
    // is ever deferred behind the audio-unlock prompt.
    if (videoId) playerRef.current?.load(videoId, positionMs ?? 0, shouldPlayNow);
    else if (typeof positionMs === 'number') playerRef.current?.seekTo(positionMs);

    if (!wantsPlay) {
      playerRef.current?.pause();
      return;
    }
    if (isLocked) {
      pendingSyncRef.current = { videoId, positionMs, isPlaying };
      setNeedsAudioUnlock(true);
      return;
    }
    playerRef.current?.play();
  }, []);

  const unlockAudio = useCallback(() => {
    audioUnlockedRef.current = true;
    setNeedsAudioUnlock(false);
    const pending = pendingSyncRef.current;
    pendingSyncRef.current = null;
    if (pending) {
      applyPlayerSync(pending);
    } else {
      playerRef.current?.play();
    }
  }, [applyPlayerSync]);

  const refresh = useCallback(async () => {
    if (!chatId || !token) return;
    try {
      const data = await jamApi.getActiveSession(chatId, token);
      setSession(data.session);
      setQueue(data.queue || []);
      // Presence is normally pushed live via the room-scoped `jam:presence` broadcast, which
      // is only reachable while this socket is actually a member of the chat room — a state
      // that's silently lost on every reconnect until chat:join is re-emitted (see
      // chat-conversation.jsx). Backfilling from the REST payload here means a stale "isn't
      // in the session" display self-heals on the next refresh() regardless of whether the
      // room broadcast itself was ever received.
      if (data.presence) setPresence((prev) => ({ ...prev, ...data.presence }));
    } catch (err) {
      console.error('Failed to load jam session:', err);
    }
  }, [chatId, token]);

  useEffect(() => { refresh(); }, [refresh]);

  // A reconnect (network blip, app foregrounding, etc) means this socket silently dropped
  // out of every room it was in — chat-conversation.jsx re-joins the chat room on 'connect',
  // but there's an unavoidable gap between the transport coming back and that rejoin landing
  // server-side. Pull authoritative state directly (session/queue/presence via REST, playback
  // position/isPlaying via a direct — not room-scoped — socket reply) rather than waiting on
  // the next room broadcast or the next periodic tick, so a reconnect never leaves this
  // client stale for the full sync interval.
  useEffect(() => {
    if (!socket) return;
    const onReconnect = () => {
      refresh();
      if (sessionRef.current?.id) socket.emit('jam:sync:request', { sessionId: sessionRef.current.id });
    };
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [socket, refresh]);

  useJamPresence(session ? socket : null, session?.id, () => positionMsRef.current);

  // useJamPresence only re-asserts presence on mount/AppState-change/heartbeat/reconnect —
  // there can be a real gap between those and the moment a user actually opens the full jam
  // screen. Sending an explicit confirmation right when they do (the clearest possible
  // signal of "I'm here") closes that gap, rather than waiting on the next passive trigger.
  useEffect(() => {
    if (!isExpanded || !socket || !session?.id) return;
    socket.emit('jam:active', { sessionId: session.id });
  }, [isExpanded, socket, session?.id]);

  // Server-side presence-loss auto-pause (jamHandler.ts) already stops playback for both
  // participants, but that's a round trip away. Mirroring the check locally means THIS
  // device pauses its own audio the instant its own locally-known presence map says the
  // other person is gone, with no network dependency — each participant's client enforces
  // this independently, which is what makes it "instant on both ends" rather than
  // "instant on whichever end the broadcast reaches first".
  useEffect(() => {
    if (!session || session.status === 'ended') return;
    const memberIds = Object.keys(presence);
    // Nothing to check yet (presence map not populated) — don't treat that as "absent".
    if (memberIds.length === 0) return;
    const otherIds = memberIds.filter((id) => id !== myUserId);
    const bothPresent = otherIds.length === 0 || otherIds.every((id) => presence[id]);
    if (!bothPresent && session.is_playing) {
      playerRef.current?.pause();
      setSession((prev) => prev && { ...prev, is_playing: false, paused_for_presence: true });
    }
  }, [presence, session, myUserId]);

  // --- Socket event wiring ---
  useEffect(() => {
    if (!socket) return;

    const belongsToThisSession = (sessionId) => sessionRef.current && sessionRef.current.id === sessionId;

    const onStarted = ({ session: s, queue: q }) => {
      if (s.chat_id !== chatId) return;
      setSession(s);
      setQueue(q || []);
    };

    const onEnded = ({ sessionId }) => {
      if (!belongsToThisSession(sessionId)) return;
      setSession(null);
      setQueue([]);
      setIsExpanded(false);
      playerRef.current?.pause();
    };

    const onQueueUpdated = ({ sessionId, queue: q }) => {
      if (!belongsToThisSession(sessionId)) return;
      setQueue(q || []);
    };

    const onPresence = ({ sessionId, userId, isPresent }) => {
      console.log('[jam-context] jam:presence', { userId, isPresent, isMe: userId === myUserId });
      if (!belongsToThisSession(sessionId)) return;
      setPresence((prev) => ({ ...prev, [userId]: isPresent }));
    };

    const onPaused = ({ sessionId, reason, positionMs }) => {
      console.log('[jam-context] jam:playback:paused from server', { reason, positionMs });
      if (!belongsToThisSession(sessionId)) return;
      setSession((prev) => prev && { ...prev, is_playing: false, paused_for_presence: reason === 'presence', playback_position_ms: positionMs });
      applyPlayerSync({ isPlaying: false, positionMs });
    };

    const onPlaybackState = ({ sessionId, isPlaying, positionMs, currentQueueItemId, serverTime, reason }) => {
      if (!belongsToThisSession(sessionId)) return;
      // `positionMs` is a snapshot from the moment the server broadcast it (serverTime) --
      // by the time this event is processed here, playback (if running) has already moved
      // past that snapshot by however long the round trip + event loop took. Landing a seek
      // exactly on the stale value left the receiving side consistently a beat behind the
      // sender, which is exactly the "not precise" sync users noticed. Compensate by adding
      // the elapsed wall-clock time back in whenever playback is actually running.
      const elapsedSinceServer = typeof serverTime === 'number' ? Math.max(0, Date.now() - serverTime) : 0;
      const adjustedPositionMs = isPlaying ? positionMs + elapsedSinceServer : positionMs;

      setSession((prev) => prev && { ...prev, is_playing: isPlaying, playback_position_ms: adjustedPositionMs, current_queue_item_id: currentQueueItemId, paused_for_presence: false });

      // An explicit seek (reason: 'seek') is a deliberate, exact repositioning the other
      // participant must mirror immediately -- it must always hard-seek. The drift-tolerance
      // check below exists only to stop the periodic background reconciliation
      // (jam:sync:request, reason: 'sync') from causing constant micro-seeking on ordinary
      // network jitter; applying that same leniency to a real seek used to silently drop any
      // scrub smaller than DRIFT_TOLERANCE_MS (1.5s) on the other device entirely.
      if (reason === 'seek') {
        applyPlayerSync({ positionMs: adjustedPositionMs, isPlaying });
        return;
      }

      // Without a fresh local reading, we don't actually know where the player really is (it
      // may still be buffering/loading) — force-seeking on a guess here is what was causing
      // the player to be interrupted before it ever reached 'playing'. Only apply a
      // drift-correcting seek once we have a recent, real position to compare against;
      // pausing at the reported position is always safe regardless (pause doesn't restart
      // a buffering cycle the way an active-playback seek does).
      const hasFreshLocalReading = Date.now() - lastTimeUpdateAtRef.current < 4000;
      const drifted = hasFreshLocalReading && Math.abs(positionMsRef.current - adjustedPositionMs) > DRIFT_TOLERANCE_MS;
      applyPlayerSync({ positionMs: drifted || !isPlaying ? adjustedPositionMs : undefined, isPlaying });
    };

    const onTrackChanged = ({ sessionId, queueItem, positionMs }) => {
      if (!belongsToThisSession(sessionId)) return;
      setSession((prev) => prev && { ...prev, current_queue_item_id: queueItem?.id ?? null, playback_position_ms: positionMs ?? 0, is_playing: !!queueItem });
      positionMsRef.current = positionMs ?? 0;
      // loadVideoById (used under the hood here) starts playback itself, so isPlaying isn't
      // passed — this path already covers the "play" side of things once unlocked.
      applyPlayerSync({ videoId: queueItem?.youtube_video_id, positionMs: positionMs ?? 0, isPlaying: queueItem ? true : false });
      // Track statuses (queued/playing/played) changed server-side — cheaper to refetch
      // the small per-session queue than to reconstruct the transition locally.
      refresh();
    };

    const onError = ({ code, message }) => {
      console.log('[jam-context] jam:error from server', { code, message });
      setError(message || code || 'Jam session error');
    };

    socket.on('jam:session:started', onStarted);
    socket.on('jam:session:ended', onEnded);
    socket.on('jam:queue:updated', onQueueUpdated);
    socket.on('jam:presence', onPresence);
    socket.on('jam:playback:paused', onPaused);
    socket.on('jam:playback:state', onPlaybackState);
    socket.on('jam:playback:track_changed', onTrackChanged);
    socket.on('jam:error', onError);

    return () => {
      socket.off('jam:session:started', onStarted);
      socket.off('jam:session:ended', onEnded);
      socket.off('jam:queue:updated', onQueueUpdated);
      socket.off('jam:presence', onPresence);
      socket.off('jam:playback:paused', onPaused);
      socket.off('jam:playback:state', onPlaybackState);
      socket.off('jam:playback:track_changed', onTrackChanged);
      socket.off('jam:error', onError);
    };
  }, [socket, chatId, refresh]);

  // Keep both ends reconciled continuously, not just at play/pause/seek/track-change moments
  // — otherwise the two sides can quietly drift apart over a long track, or a missed room
  // broadcast (see the reconnect comment above) can leave one side stuck showing stale
  // playback/presence indefinitely.
  //
  // Deliberately NOT gated on session.is_playing: that flag is itself derived only from
  // room broadcasts, so if THIS client missed the very broadcast that would've told it
  // playback stopped (or resumed), it's exactly the client whose local is_playing is wrong
  // — gating the reconciliation loop on the belief it exists to correct would mean a client
  // stuck believing "not playing" never polls again to discover it's wrong, staying
  // desynced until the chat screen is closed and reopened.
  useEffect(() => {
    if (!socket || !session?.id) return;
    const interval = setInterval(() => {
      socket.emit('jam:sync:request', { sessionId: session.id });
      refresh(); // also self-heals presence display, not just playback position
    }, SYNC_REQUEST_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [socket, session?.id, refresh]);

  // Accepts an explicit target chat rather than always using activeChat: a user can be
  // VIEWING a chat that isn't the one this (now-global) provider is currently tracking —
  // e.g. someone else's session is already live elsewhere, or they simply haven't opened
  // this specific chat's jam UI before. Starting one here is a deliberate action, so it
  // force-adopts tracking for this chat regardless of the "adopt unless live elsewhere"
  // guard setActiveChat normally applies for passive screen-viewing.
  const startSession = useCallback(async (targetChatId, targetOtherUserId, targetOtherUserName) => {
    const chatIdToUse = targetChatId ?? chatId;
    if (!chatIdToUse || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await jamApi.startSession(chatIdToUse, token);
      setActiveChatState({ chatId: chatIdToUse, otherUserId: targetOtherUserId ?? null, otherUserName: targetOtherUserName ?? null });
      setSession(data.session);
      setQueue(data.queue || []);
      setIsExpanded(true);
    } catch (err) {
      setError(err?.message || 'Failed to start jam session');
    } finally {
      setIsLoading(false);
    }
  }, [chatId, token]);

  const endSession = useCallback(async () => {
    if (!session) return;
    const sessionId = session.id;
    // Optimistic: the server only broadcasts 'jam:session:ended' to the
    // OTHER chat member (see notifyOtherMember in jam.routes.ts), never
    // back to the person who just tapped "end" -- their own client used to
    // just sit on the stale session until the next 5s periodic refresh()
    // tick happened to notice it was gone, which read as "the close button
    // takes a while." Clear local state immediately instead of waiting on
    // any round trip.
    setSession(null);
    setQueue([]);
    setIsExpanded(false);
    playerRef.current?.pause();
    try {
      await jamApi.endSession(sessionId, token);
    } catch (err) {
      console.error('Failed to end jam session:', err);
      setError(err?.message || 'Failed to end jam session');
    }
  }, [session, token]);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await jamApi.search(query, token);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Jam search failed:', err);
      setError(err?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [token]);

  const addTrack = useCallback(async (track) => {
    if (!session) return;
    try {
      const data = await jamApi.addToQueue(session.id, {
        videoId: track.videoId,
        title: track.title,
        channelTitle: track.channelTitle,
        thumbnailUrl: track.thumbnailUrl,
        durationSeconds: track.durationSeconds,
      }, token);
      // Apply immediately from the response rather than waiting on the jam:queue:updated
      // broadcast — keeps the adder's own UI responsive even if the round-trip is slow.
      if (data?.queue) setQueue(data.queue);
      if (data?.session) setSession(data.session);
      if (data?.becameCurrent) {
        // The queue was empty, so this track just became "now playing" server-side. Loading
        // it here (still inside the click's async chain, not from a separate socket push) is
        // what makes autoplay-with-sound actually work on web — see applyPlayerSync's comment.
        audioUnlockedRef.current = true;
        setNeedsAudioUnlock(false);
        positionMsRef.current = 0;
        playerRef.current?.load(track.videoId, 0, true);
      }
    } catch (err) {
      setError(err?.message || 'Failed to add track');
    }
  }, [session, token]);

  const removeTrack = useCallback(async (queueItemId) => {
    if (!session) return;
    try {
      const data = await jamApi.removeFromQueue(session.id, queueItemId, token);
      if (data?.queue) setQueue(data.queue);
    } catch (err) {
      setError(err?.message || 'Failed to remove track');
    }
  }, [session, token]);

  // --- Playlists: user-owned, reusable across sessions -- unlike the session's own
  // queue, these are never cleared when a session ends (see jam_playlists' migration
  // comment and playlist.repo.ts). ---
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const refreshPlaylists = useCallback(async () => {
    if (!token || !session?.chat_id) return;
    setIsLoadingPlaylists(true);
    try {
      const data = await jamApi.getPlaylists(session.chat_id, token);
      setPlaylists(data.playlists || []);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, [token, session?.chat_id]);

  const createPlaylist = useCallback(async (name) => {
    if (!token || !session?.chat_id || !name?.trim()) return null;
    try {
      const data = await jamApi.createPlaylist(session.chat_id, name.trim(), token);
      setPlaylists((prev) => [{ ...data.playlist, track_count: 0 }, ...prev]);
      return data.playlist;
    } catch (err) {
      setError(err?.message || 'Failed to create playlist');
      return null;
    }
  }, [token, session?.chat_id]);

  const deletePlaylist = useCallback(async (playlistId) => {
    if (!token) return;
    try {
      await jamApi.deletePlaylist(playlistId, token);
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (err) {
      setError(err?.message || 'Failed to delete playlist');
    }
  }, [token]);

  const getPlaylistDetail = useCallback(async (playlistId) => {
    if (!token) return null;
    try {
      return await jamApi.getPlaylist(playlistId, token);
    } catch (err) {
      setError(err?.message || 'Failed to load playlist');
      return null;
    }
  }, [token]);

  const addTrackToPlaylist = useCallback(async (playlistId, track) => {
    if (!token) return false;
    try {
      await jamApi.addPlaylistTrack(playlistId, {
        videoId: track.videoId,
        title: track.title,
        channelTitle: track.channelTitle,
        thumbnailUrl: track.thumbnailUrl,
        durationSeconds: track.durationSeconds,
      }, token);
      // Bump the local track count so the playlist list reflects it without a refetch.
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, track_count: (p.track_count || 0) + 1 } : p)));
      return true;
    } catch (err) {
      setError(err?.message || 'Failed to add track to playlist');
      return false;
    }
  }, [token]);

  const removeTrackFromPlaylist = useCallback(async (playlistId, trackId) => {
    if (!token) return;
    try {
      await jamApi.removePlaylistTrack(playlistId, trackId, token);
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, track_count: Math.max(0, (p.track_count || 1) - 1) } : p)));
    } catch (err) {
      setError(err?.message || 'Failed to remove track');
    }
  }, [token]);

  // Rewrites the whole track order -- either participant can reorder a shared playlist,
  // mirroring the mutual-editing model of the rest of this feature. Returns the
  // server-confirmed track list (with recomputed positions) so the caller can sync its
  // local optimistic reorder to the authoritative order.
  const reorderTracksInPlaylist = useCallback(async (playlistId, trackIds) => {
    if (!token) return null;
    try {
      const data = await jamApi.reorderPlaylistTracks(playlistId, trackIds, token);
      return data.tracks || null;
    } catch (err) {
      setError(err?.message || 'Failed to reorder playlist');
      return null;
    }
  }, [token]);

  // Loads a saved playlist's tracks into the CURRENT live session's queue, in order or
  // shuffled. Mirrors addTrack's own becameCurrent handling for the case where the queue
  // was empty and the first loaded track starts playing immediately.
  const loadPlaylistIntoSession = useCallback(async (playlistId, mode) => {
    if (!session || !token) return;
    try {
      const data = await jamApi.loadPlaylistIntoSession(session.id, playlistId, mode, token);
      if (data?.queue) setQueue(data.queue);
      if (data?.session) setSession(data.session);
      if (data?.becameCurrent) {
        const first = (data.queue || []).find((q) => q.id === data.session?.current_queue_item_id);
        if (first?.youtube_video_id) {
          audioUnlockedRef.current = true;
          setNeedsAudioUnlock(false);
          positionMsRef.current = 0;
          playerRef.current?.load(first.youtube_video_id, 0, true);
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load playlist');
    }
  }, [session, token]);

  const play = useCallback(() => {
    console.log('[jam-context] play() called', { hasSession: !!session, hasSocket: !!socket, hasPlayerRef: !!playerRef.current, currentQueueItem });
    if (!session || !socket) return;
    audioUnlockedRef.current = true;
    setNeedsAudioUnlock(false);
    // On web only: this call must be synchronous with the click to count as the user
    // gesture that authorizes audible playback (see applyPlayerSync's comment) — the
    // gesture requirement doesn't exist on native (mediaPlaybackRequiresUserAction: false
    // in JamPlayerWebView.native.jsx), so skip it there. This used to run unconditionally,
    // which meant the initiating device started playing instantly while the OTHER device
    // waited out a full network round trip for the jam:play broadcast — a very audible ~1s
    // gap between the two. Since this device is itself a member of the socket room, it
    // receives its own jam:playback:state broadcast back (jamHandler.ts's io.to(room).emit
    // includes the sender) and starts from that same event — so on native, both devices
    // now start together, off the same broadcast, rather than one starting early.
    if (Platform.OS === 'web') playerRef.current?.play();
    socket.emit('jam:play', { sessionId: session.id });
  }, [session, socket, currentQueueItem]);

  const pause = useCallback(() => {
    if (!session || !socket) return;
    playerRef.current?.pause();
    socket.emit('jam:pause', { sessionId: session.id, positionMs: positionMsRef.current });
  }, [session, socket]);

  const seek = useCallback((positionMs) => {
    if (!session || !socket) return;
    audioUnlockedRef.current = true;
    setNeedsAudioUnlock(false);
    positionMsRef.current = positionMs;
    setDisplayPositionMs(positionMs);
    playerRef.current?.seekTo(positionMs);
    socket.emit('jam:seek', { sessionId: session.id, positionMs });
  }, [session, socket]);

  const next = useCallback(() => {
    if (!session || !socket) return;
    audioUnlockedRef.current = true;
    setNeedsAudioUnlock(false);
    socket.emit('jam:next', { sessionId: session.id });
  }, [session, socket]);

  const previous = useCallback(() => {
    if (!session || !socket) return;
    audioUnlockedRef.current = true;
    setNeedsAudioUnlock(false);
    socket.emit('jam:previous', { sessionId: session.id });
  }, [session, socket]);

  const handlePlayerTimeUpdate = useCallback((ms) => {
    positionMsRef.current = ms;
    lastTimeUpdateAtRef.current = Date.now();
    setDisplayPositionMs(ms);
  }, []);

  const handleTrackEnded = useCallback(() => {
    if (!session || !socket) return;
    socket.emit('jam:track:ended', { sessionId: session.id, queueItemId: session.current_queue_item_id });
  }, [session, socket]);

  const value = {
    session,
    queue,
    currentQueueItem,
    positionMs: displayPositionMs,
    presence,
    isOtherPresent: (otherUserId) => !!presence[otherUserId],
    isExpanded,
    setIsExpanded,
    isLoading,
    error,
    clearError: () => setError(null),
    searchResults,
    isSearching,
    search,
    startSession,
    endSession,
    addTrack,
    removeTrack,
    play,
    pause,
    seek,
    next,
    previous,
    myUserId,
    needsAudioUnlock,
    unlockAudio,
    setPlayerSlot,
    setActiveChat,
    activeChatOtherUserId: activeChat?.otherUserId ?? null,
    activeChatOtherUserName: activeChat?.otherUserName ?? null,
    playlists,
    isLoadingPlaylists,
    refreshPlaylists,
    createPlaylist,
    deletePlaylist,
    getPlaylistDetail,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTracksInPlaylist,
    loadPlaylistIntoSession,
  };

  return (
    <JamSessionContext.Provider value={value}>
      <View ref={rootRef} onLayout={handleRootLayout} collapsable={false} style={styles.root}>
      {children}
      {isExpanded && session && session.status !== 'ended' && (
        // Rendered here (at the provider's own top level) rather than by the host chat
        // screen — the host screen nests it several SafeAreaView/KeyboardAvoidingView
        // layers deep, any one of which can constrain an absolutely-positioned descendant
        // to less than the full screen. This guarantees a true full-bleed layer, sized
        // explicitly from the window rather than trusting ancestor flex resolution, so it
        // behaves like a real full-screen "screen" rather than an in-place modal.
        <View style={[styles.expandedScreen, { width: windowWidth, height: windowHeight }]}>
          <JamSessionModal otherUserId={activeChat?.otherUserId} otherUserName={activeChat?.otherUserName} />
        </View>
      )}
      {session && session.status !== 'ended' && (
        // Mounted persistently (rather than only while expanded) so the player and its
        // playback state survive collapsing the full jam screen back to the mini bar.
        //
        // This MUST be genuinely visible and on-screen. YouTube's embed policy requires a
        // visible player (min 200x200 viewport per the iframe API terms), and hidden /
        // off-screen "audio only" playback is exactly what YouTube blocks in embeds
        // (background playback is a YouTube Premium feature). On iOS, WKWebView + the
        // player's own checks refuse to start playback for a hidden/off-screen player —
        // the observable symptom is playVideo() looping unstarted → buffering → unstarted
        // with no error event. Desktop browsers are more lenient, which is why the web
        // build played fine while the iOS device never did.
        //
        // Placement: docks into JamSessionModal's big video slot while expanded, or
        // JamMiniPlayerBar's small thumbnail slot while collapsed (see playerSlot above) —
        // either way it's genuinely part of the visible UI, never a bare floating overlay
        // over the chat screen. Only falls back to the small corner tile below for the
        // brief window before either side has measured.
        <View
          pointerEvents={playerSlot && !TEST_TINY_PLAYER ? 'none' : 'box-none'}
          style={[
            styles.playerContainer,
            TEST_TINY_PLAYER && styles.playerContainerTiny,
            playerSlot && !TEST_TINY_PLAYER && {
              left: playerSlot.x - rootOrigin.x,
              top: playerSlot.y - rootOrigin.y,
              width: playerSlot.width,
              height: playerSlot.height,
              right: undefined,
              bottom: undefined,
            },
          ]}
        >
          <JamPlayerWebView
            ref={playerRef}
            onReady={() => {
              console.log('[jam-context] player wrapper onReady', { hasSession: !!session, hasCurrentQueueItem: !!currentQueueItem, sessionIsPlaying: session?.is_playing });
              // Player was (re)created — e.g. first mount, or a fresh mount after reopening
              // the chat mid-session. Hydrate it to wherever the session actually is right
              // now rather than defaulting to position 0/paused.
              if (session && currentQueueItem) {
                applyPlayerSync({
                  videoId: currentQueueItem.youtube_video_id,
                  positionMs: session.playback_position_ms,
                  isPlaying: session.is_playing,
                });
              }
            }}
            onTimeUpdate={handlePlayerTimeUpdate}
            onStateChange={(state) => { if (state === 'ended') handleTrackEnded(); }}
          />
          {(!playerSlot || TEST_TINY_PLAYER) && (
            // Tapping the floating tile opens the full jam screen (the tile has no
            // controls of its own — the WebView beneath has controls disabled).
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsExpanded(true)} />
          )}
        </View>
      )}
      </View>
    </JamSessionContext.Provider>
  );
};

export const useJamSession = () => {
  const context = useContext(JamSessionContext);
  if (!context) {
    throw new Error('useJamSession must be used within a JamSessionProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  expandedScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9000,
    elevation: 20,
  },
  playerContainer: {
    position: 'absolute',
    bottom: 120,
    right: 12,
    width: 200,
    height: 113, // 16:9 to match the player page's own aspect-ratio layout
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#000',
  },
  // TEST_TINY_PLAYER diagnostic size — see the constant above.
  playerContainerTiny: {
    width: 1,
    height: 1,
    bottom: 40,
    right: 2,
    borderRadius: 0,
    shadowOpacity: 0,
  },
});
