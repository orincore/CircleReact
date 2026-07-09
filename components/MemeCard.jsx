import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Pressable, FlatList } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import CachedMediaImage from '@/src/components/CachedMediaImage';
import AnonymousAvatar from '@/components/AnonymousAvatar';

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
function VideoAsset({ uri, isFocused, height, width, onDoubleTapLike }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  useEffect(() => {
    if (!player) return;
    if (isFocused) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
      setControlsVisible(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }, [isFocused, player]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  const revealControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY_MS);
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

    // Delay revealing controls just long enough to find out whether a
    // second tap is coming -- otherwise the very first tap of a double-tap
    // would already have shown them before we know it's a double tap.
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      revealControls();
    }, 250);
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
      <Pressable style={[StyleSheet.absoluteFill, styles.videoTapLayer]} onPress={handleTap}>
        {controlsVisible ? (
          <View style={styles.videoControlsOverlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.videoControlButton} onPress={togglePlayPause} activeOpacity={0.7}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoControlButton} onPress={toggleMute} activeOpacity={0.7}>
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
      </Pressable>
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

export default function MemeCard({ item, isFocused, height, width, bottomInset = 0, onLike, onOpenComments, onShare }) {
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
        <VideoAsset key={videoAsset.s3_url} uri={videoAsset.s3_url} isFocused={isFocused} height={height} width={width} onDoubleTapLike={handleDoubleTapLike} />
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
      </View>

      <View style={[styles.actionsColumn, { bottom: actionsBottom }]} pointerEvents="box-none">
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
  actionsColumn: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 18,
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
