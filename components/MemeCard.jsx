import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import CachedMediaImage from '@/src/components/CachedMediaImage';
import AnonymousAvatar from '@/components/AnonymousAvatar';
import JamPlayerWebView from '@/src/components/jam/JamPlayerWebView';

const CONTROLS_HIDE_DELAY_MS = 3000;

/**
 * expo-av was removed in SDK 56; useVideoPlayer is a hook, so each card that
 * shows a video needs its own component instance (mirrors ChatVideoPlayer.jsx).
 * Play/pause is driven purely by `isFocused` -- the parent feed screen decides
 * which single card is focused via onViewableItemsChanged, so only one video
 * plays at a time no matter how many video cards FlashList keeps mounted.
 *
 * `key={uri}` on VideoView (mirrors ChatVideoPlayer.jsx) forces a full remount
 * when FlashList recycles this cell for a different item -- without it the
 * native view can keep rendering the previous cell's stale video surface
 * (black frame) while the newly-bound player's audio plays underneath.
 *
 * VideoView is given explicit pixel `width`/`height` rather than
 * StyleSheet.absoluteFillObject. expo-video's native player layer/surface
 * needs a concrete non-zero frame to attach to; sizing purely via absolute
 * positioning (edges resolved against the parent) left the underlying
 * AVPlayerLayer/SurfaceView never binding to a real frame on some
 * platforms -- audio played (the player itself was decoding fine) but no
 * frame ever composited, hence a black box. Explicit numeric dimensions is
 * the same approach ChatVideoPlayer.jsx and CachedMediaImage already use
 * successfully in this app.
 */
function VideoAsset({ uri, isFocused, height, width, onDoubleTapLike, mutedByDefault = false }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    // A meme with attached music replaces the clip's own audio entirely --
    // muted at construction, not toggled after, so there's never a brief
    // flash of the original audio before the music player catches up.
    p.muted = mutedByDefault;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(mutedByDefault);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [speedingUp, setSpeedingUp] = useState(false);
  const hideTimerRef = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);
  // Tracked in a ref as well so onPressOut (which also fires after a normal
  // tap) can tell whether a hold-to-speed-up was actually in progress.
  const speedingUpRef = useRef(false);
  // handleTap's single-tap branch is itself deferred by a timer (below), so
  // it needs the CURRENT visibility at the moment that timer fires, not
  // whatever `controlsVisible` closed over back when the tap started.
  const controlsVisibleRef = useRef(false);
  // The user's actual mute preference (toggled via the speaker button),
  // independent of the focus-driven muting below -- so losing focus and
  // regaining it restores what the user chose, not always "unmuted".
  const userMutedRef = useRef(mutedByDefault);

  useEffect(() => {
    if (!player) return;
    if (isFocused) {
      // Restore the real mute preference. Unlike play()/pause() (below),
      // expo-video's `muted` setter is synchronous on the native side, so
      // this can't lag behind and briefly leave a card silent after it's
      // focused.
      player.muted = userMutedRef.current;
      player.play();
      setIsPlaying(true);
    } else {
      // Mute synchronously the instant this card loses focus. On Android,
      // expo-video dispatches play()/pause() as coroutines queued onto the
      // native main-thread's Dispatchers.Main queue rather than executing
      // them synchronously -- the same queue FlashList's own scroll/layout
      // work competes on. During fast/sustained scrolling that queue can
      // back up, so a card's pause() can land noticeably after the next
      // card's play(), leaving both audible at once (this is what produced
      // "multiple memes' audio playing and accumulating while scrolling").
      // `muted`, unlike play/pause, is a synchronous property set on the
      // native side, so setting it here is the one command guaranteed to
      // land immediately and silence the outgoing card regardless of how
      // backed up the async play/pause queue is. pause() is still called
      // too, to actually stop decoding/free resources, just not relied on
      // for the audible cutoff.
      player.muted = true;
      player.pause();
      setIsPlaying(false);
      setControlsVisible(false);
      controlsVisibleRef.current = false;
      // A card can scroll away mid-hold (finger still down) -- make sure the
      // 2x rate never sticks on a now-unfocused card.
      speedingUpRef.current = false;
      setSpeedingUp(false);
      try { player.playbackRate = 1.0; } catch {}
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    // Belt-and-suspenders for the same async-native-queue issue: if this
    // instance unmounts (e.g. FlashList recycles its cell for another item)
    // while still marked focused, mute it synchronously right away rather
    // than waiting on the also-async native release() to actually silence
    // the outgoing player.
    return () => {
      try { player.muted = true; } catch {}
    };
  }, [isFocused, player]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const revealControls = () => {
    setControlsVisible(true);
    controlsVisibleRef.current = true;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      controlsVisibleRef.current = false;
    }, CONTROLS_HIDE_DELAY_MS);
  };

  const hideControls = () => {
    setControlsVisible(false);
    controlsVisibleRef.current = false;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    revealControls();
  };

  const toggleMute = () => {
    if (!player) return;
    player.muted = !player.muted;
    setIsMuted(player.muted);
    userMutedRef.current = player.muted;
    revealControls();
  };

  const handleTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 250;
    lastTapRef.current = now;

    if (isDoubleTap) {
      // A double tap should only burst-like -- not also flash the
      // play/pause & mute controls. The first tap's own timer (below) is
      // still pending at this point, so cancel it before it can fire.
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      if (onDoubleTapLike) onDoubleTapLike();
      return;
    }

    // Delay resolving the single tap just long enough to find out whether a
    // second tap is coming -- otherwise the very first tap of a double-tap
    // would already have toggled controls before we know it's a double tap.
    // Toggle, not always-reveal: tapping while controls are already showing
    // dismisses them instead of just resetting the auto-hide timer.
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      if (controlsVisibleRef.current) {
        hideControls();
      } else {
        revealControls();
      }
    }, 250);
  };

  // TikTok/Reels-style press-and-hold anywhere on the video to fast-forward
  // at 2x, released back to 1x. A long press fires instead of onPress, so it
  // never collides with the tap (play/pause) or double-tap (like) gestures;
  // a swipe to scroll the feed moves the finger enough to cancel the press
  // (firing onPressOut), so the rate resets when the user scrolls away.
  const startSpeedUp = () => {
    if (!player) return;
    speedingUpRef.current = true;
    setSpeedingUp(true);
    try { player.playbackRate = 2.0; } catch {}
    // Cancel the pending single-tap control reveal so a hold doesn't also
    // flash the play/pause overlay.
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  };

  const endSpeedUp = () => {
    if (!speedingUpRef.current) return;
    speedingUpRef.current = false;
    setSpeedingUp(false);
    if (player) {
      try { player.playbackRate = 1.0; } catch {}
    }
  };

  return (
    <View style={{ width, height }}>
      <VideoView
        key={uri}
        player={player}
        style={{ width, height }}
        contentFit="contain"
        nativeControls={false}
        surfaceType="textureView"
      />
      {/* A sibling layer stacked on top of the video, not a wrapper around it.
          On Android, VideoView's native surface (TextureView) composites on
          its own hardware layer that can draw over sibling RN views
          regardless of JSX/z-index order -- if this Pressable instead wrapped
          the VideoView as its child, the play/pause and mute buttons would
          render (and often fail to receive touches) underneath the video
          surface, invisible. Stacking it as a separate top-level sibling
          with explicit elevation guarantees it composites above the video on
          Android; iOS composites normally either way. */}
      <Pressable
        style={[StyleSheet.absoluteFill, styles.videoTapLayer]}
        onPress={handleTap}
        onLongPress={startSpeedUp}
        onPressOut={endSpeedUp}
        delayLongPress={220}
      >
        {controlsVisible ? (
          <View style={styles.videoControlsOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.videoControlButton} onPress={togglePlayPause} activeOpacity={0.7}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#FFFFFF" />
            </TouchableOpacity>
            {/* When music replaces the clip's own audio (mutedByDefault), the
                video track has nothing meaningful to mute/unmute -- omit the
                control entirely rather than leave a button that does nothing
                audible. */}
            {!mutedByDefault ? (
              <TouchableOpacity style={styles.videoControlButton} onPress={toggleMute} activeOpacity={0.7}>
                <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </Pressable>
      {speedingUp ? (
        <View style={styles.speedPill} pointerEvents="none">
          <Ionicons name="play-forward" size={14} color="#FFFFFF" />
          <Text style={styles.speedPillText}>2x</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Renders a meme's attached YouTube track as audio -- no visible video
 * chrome, just JamPlayerWebView (the same component jam-session uses)
 * sized small-but-nonzero (its own player needs a real layout frame to
 * bind, see its comments) and hidden behind the card's actual content.
 *
 * Play/pause is driven purely by `isFocused`, same one-signal pattern as
 * VideoAsset -- deliberately NOT wired to the video's own manual
 * play/pause tap controls (see VideoAsset below), so a manual pause only
 * ever pauses the visual, not the music; scrolling away is what stops it.
 *
 * Loops just the trimmed segment [start_seconds, start_seconds+trim_seconds)
 * via onTimeUpdate (polled every ~1s by JamPlayerWebView) -- the YouTube
 * iframe API has no built-in clip-range loop, so this seeks back to the
 * start once playback passes the trim window's end.
 */
function MemeMusicPlayer({ music, isFocused }) {
  const playerRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isFocused) {
      playerRef.current?.pause();
      return;
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      playerRef.current?.load(music.youtube_video_id, music.start_seconds * 1000, true);
    } else {
      playerRef.current?.play();
    }
  }, [isFocused, music.youtube_video_id, music.start_seconds]);

  const handleTimeUpdate = useCallback((positionMs) => {
    const endMs = (music.start_seconds + music.trim_seconds) * 1000;
    if (positionMs >= endMs) {
      playerRef.current?.seekTo(music.start_seconds * 1000);
    }
  }, [music.start_seconds, music.trim_seconds]);

  return (
    <View style={styles.hiddenMusicPlayer} pointerEvents="none">
      <JamPlayerWebView ref={playerRef} onTimeUpdate={handleTimeUpdate} />
    </View>
  );
}

function CarouselAssets({ assets, height, width, dotsBottom, onDoubleTapLike }) {
  const [index, setIndex] = useState(0);
  const lastTapRef = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 250 && onDoubleTapLike) {
      onDoubleTapLike();
    }
    lastTapRef.current = now;
  };

  return (
    <View style={{ width, height }}>
      <FlatList
        data={assets}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(a) => a.id}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <CachedMediaImage
            messageId={item.id}
            mediaUrl={item.s3_url}
            style={{ width, height }}
            resizeMode="contain"
            showSaveButton={false}
            onPress={handleTap}
          />
        )}
      />
      {assets.length > 1 ? (
        <View style={[styles.dotsRow, { bottom: dotsBottom }]} pointerEvents="none">
          {assets.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function MemeCard({ item, isFocused, height, width, bottomInset = 0, onLike, onOpenComments, onShare, onCompose }) {
  const videoAsset = item.assets.find(a => a.asset_type === 'video');
  const imageAssets = item.assets.filter(a => a.asset_type === 'image');
  const contentBottom = bottomInset + 24;
  // The action column sits well above the caption/nav-bar line -- Instagram
  // Reels-style layout with the icons riding higher on the right edge rather
  // than hugging the very bottom of the card.
  const actionsBottom = contentBottom + 70;

  const lastTapRef = useRef(0);
  const heartScale = useRef(new Animated.Value(0.5)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const playLikeBurst = useCallback(() => {
    heartScale.stopAnimation();
    heartOpacity.stopAnimation();
    heartScale.setValue(0.5);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.15, friction: 4, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [heartScale, heartOpacity]);

  // Instagram-style: a double tap only ever *likes*, it never unlikes an
  // already-liked meme -- unliking stays a deliberate single tap on the
  // heart button.
  const handleDoubleTapLike = useCallback(() => {
    playLikeBurst();
    if (!item.liked_by_me && onLike) onLike();
  }, [item.liked_by_me, onLike, playLikeBurst]);

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      handleDoubleTapLike();
    }
    lastTapRef.current = now;
  };

  return (
    <View style={[styles.card, { height, width }]}>
      {item.post_type === 'video' && videoAsset ? (
        // Keyed on the video's own URI, not just item.id: FlashList recycles
        // cells (reuses component instances) rather than unmounting them on
        // scroll, so without this VideoAsset would stay the *same* mounted
        // instance across different feed items -- its useVideoPlayer(uri)
        // call would then just receive a new uri on an existing hook call,
        // which makes expo-video replace the source on the same underlying
        // native player rather than construct a fresh one. That's a known
        // upstream expo-video/ExoPlayer bug on Android: reusing a player
        // instance for a new source renders a black screen even though the
        // audio plays and playback state is otherwise correct. Keying here
        // forces React to fully unmount the old VideoAsset (destroying its
        // player) and mount a brand new one -- a fresh useVideoPlayer call,
        // fresh native player -- whenever the video changes.
        <VideoAsset key={videoAsset.s3_url} uri={videoAsset.s3_url} isFocused={isFocused} height={height} width={width} onDoubleTapLike={handleDoubleTapLike} mutedByDefault={!!item.music} />
      ) : item.post_type === 'carousel' ? (
        <CarouselAssets assets={imageAssets} height={height} width={width} dotsBottom={contentBottom + 110} onDoubleTapLike={handleDoubleTapLike} />
      ) : imageAssets[0] ? (
        <CachedMediaImage
          messageId={imageAssets[0].id}
          mediaUrl={imageAssets[0].s3_url}
          style={{ width, height }}
          resizeMode="contain"
          showSaveButton={false}
          onPress={handleImageTap}
        />
      ) : null}

      {item.music ? (
        // Keyed on the track id for the same reason VideoAsset is keyed on its
        // uri above: FlashList recycles this cell for a different feed item
        // without unmounting it, and MemeMusicPlayer's hasLoadedRef otherwise
        // makes it "resume" (play()) whatever track the previous item loaded
        // instead of loading the new one -- a stale/wrong track kept playing
        // audio underneath the new (muted) video.
        <MemeMusicPlayer key={item.music.youtube_video_id} music={item.music} isFocused={isFocused} />
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.likeBurst,
          { opacity: heartOpacity, transform: [{ scale: heartScale }] },
        ]}
      >
        <Ionicons name="heart" size={100} color="#FF3040" style={styles.likeBurstIcon} />
      </Animated.View>

      <View style={[styles.captionWrap, { bottom: contentBottom }]} pointerEvents="none">
        {item.poster_alias ? (
          <View style={styles.posterRow}>
            <AnonymousAvatar seed={item.poster_alias} size={30} shape="square" usePlaceholderPhoto />
            <Text style={styles.posterAlias}>{item.poster_alias}</Text>
          </View>
        ) : null}
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
        ) : null}
        {item.music ? (
          <View style={styles.musicChip}>
            <Ionicons name="musical-notes" size={12} color="#FFFFFF" />
            <Text style={styles.musicChipText} numberOfLines={1}>
              {item.music.title}{item.music.channel_title ? ` · ${item.music.channel_title}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.actionsColumn, { bottom: actionsBottom }]} pointerEvents="box-none">
        {onCompose ? (
          // Rendered per-card (not as a screen-level overlay in memes/index.jsx)
          // specifically so it scrolls/transitions with the feed exactly like
          // Like/Comment/Share do, instead of sitting fixed on screen while
          // the card underneath it moves.
          <TouchableOpacity style={styles.actionButton} onPress={onCompose} activeOpacity={0.7}>
            <View style={styles.iconShadow}>
              <Feather name="plus" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.actionButton} onPress={onLike} activeOpacity={0.7}>
          <View style={styles.iconShadow}>
            {item.liked_by_me ? (
              <Ionicons name="heart" size={32} color="#FF3040" />
            ) : (
              <Feather name="heart" size={30} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.actionLabel}>{item.like_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onOpenComments} activeOpacity={0.7}>
          <View style={styles.iconShadow}>
            <Feather name="message-circle" size={29} color="#FFFFFF" />
          </View>
          <Text style={styles.actionLabel}>{item.comment_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare} activeOpacity={0.7}>
          <View style={styles.iconShadow}>
            <Feather name="send" size={27} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionWrap: {
    position: 'absolute',
    left: 16,
    right: 90,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  posterAlias: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  musicChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  // JamPlayerWebView needs a real, nonzero layout frame to bind its
  // underlying native player to (same constraint VideoView has) -- can't be
  // 0x0. Small + absolutely positioned + opacity 0 keeps it functionally
  // invisible without violating that.
  hiddenMusicPlayer: {
    position: 'absolute',
    width: 4,
    height: 4,
    opacity: 0,
  },
  actionsColumn: {
    position: 'absolute',
    right: 12,
    // Fixed width so all 4 buttons (compose/Like/Comment/Share) center on the
    // same vertical line regardless of which icon glyph is widest -- without
    // it this box shrink-wraps to its widest child, so the column's
    // horizontal center (and thus every button's center) shifts card to card.
    width: 52,
    alignItems: 'center',
    gap: 18,
    // Must outrank videoTapLayer's elevation/zIndex (10) below, or on
    // Android the video's full-bleed tap-catching Pressable composites (and
    // hit-tests) above these buttons, silently swallowing taps meant for
    // like/comment/share whenever the card is showing a video.
    elevation: 15,
    zIndex: 15,
  },
  actionButton: {
    alignItems: 'center',
  },
  // RN renders a vector icon as a Text glyph sized tightly to the icon
  // itself, with no extra room around it for a shadow to spread into -- a
  // larger textShadowRadius (previously 6) overflows that tight box and gets
  // hard-clipped at its edge instead of fading out, which looked like a
  // sharp-cornered halo rather than a soft glow. Kept small enough to stay
  // inside the glyph's own bounds so it actually renders as a soft blur.
  // RN's `textShadow*` on an icon glyph was either hard-clipped to the
  // glyph's own tight bounding box (large radius) or read as a thickened
  // outline/stroke (small radius) -- neither is a soft shadow. A native
  // View-level shadow (iOS: true CALayer shadow derived from the wrapped
  // content's actual rendered silhouette, not a bounding box) gives a real
  // soft, diffuse blur that follows the icon's shape. iOS-only by nature of
  // these style props; Android silently ignores them (no shadow there,
  // same as before this).
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 3.5,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  // Explicit elevation is what actually gets this to composite above the
  // video's native surface on Android -- see the comment where this is used.
  videoTapLayer: {
    elevation: 10,
    zIndex: 10,
  },
  videoControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  videoControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // "2x" pill shown top-center while a hold-to-fast-forward is active.
  speedPill: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 20,
    elevation: 20,
  },
  speedPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  likeBurst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    zIndex: 20,
  },
  likeBurstIcon: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
