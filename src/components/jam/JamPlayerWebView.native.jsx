import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

/**
 * Native (iOS/Android) player, built on `react-native-youtube-iframe` rather than a
 * hand-rolled WebView + custom HTML page.
 *
 * The hand-rolled version (raw `react-native-webview` loading an inline HTML string that
 * injected the YouTube IFrame API via a <script> tag) failed silently on real iOS devices —
 * no ready event, no playback, nothing — because WKWebView's `loadHTMLString:baseURL:` does
 * not reliably let a same-page <script> tag fetch a cross-origin script even with `baseUrl`
 * set. react-native-youtube-iframe is a mature, actively maintained library (LonelyCpp,
 * 700+ GitHub stars) built specifically to work around this and similar iOS/Android WebView
 * quirks, so rather than keep patching a custom implementation blind, playback goes through it.
 *
 * Exposes the same {load, play, pause, seekTo} ref API as before, translated onto this
 * library's prop-driven model (`play` is a boolean prop here, not an imperative call).
 */
const JamPlayerWebView = forwardRef(function JamPlayerWebView(
  { onReady, onStateChange, onTimeUpdate, onError, style },
  ref
) {
  const playerRef = useRef(null);
  const [videoId, setVideoId] = useState('');
  const [playing, setPlaying] = useState(false);
  const pendingSeekMsRef = useRef(null);
  const pollRef = useRef(null);
  // The underlying library's own ref.seekTo() injects JS against the page's `player` variable
  // with no readiness check of its own (unlike play/pause, which it gates internally). Calling
  // it before the page's onReady has actually fired crashes with "player.seekTo is not a
  // function" — this tracks that so we never call it too early.
  const underlyingReadyRef = useRef(false);

  useImperativeHandle(ref, () => ({
    load: (id, positionMs = 0, shouldPlay = true) => {
      console.log('[jam-player-native] load()', { id, positionMs, shouldPlay });
      pendingSeekMsRef.current = positionMs || null;
      setVideoId(id);
      setPlaying(shouldPlay);
      // If it's the same videoId as before (e.g. re-cueing at a new position while still
      // paused), the videoId prop won't change, so onChangeState won't fire again to trigger
      // the pending-seek logic below — seek directly as a fallback for that case, but only
      // once the underlying player genuinely exists.
      if (positionMs && underlyingReadyRef.current) {
        playerRef.current.seekTo(positionMs / 1000, true);
        pendingSeekMsRef.current = null;
      }
    },
    play: () => { console.log('[jam-player-native] play()'); setPlaying(true); },
    pause: () => { console.log('[jam-player-native] pause()'); setPlaying(false); },
    seekTo: (positionMs) => {
      console.log('[jam-player-native] seekTo()', positionMs, 'underlyingReady=', underlyingReadyRef.current);
      if (!underlyingReadyRef.current) return;
      playerRef.current?.seekTo((positionMs || 0) / 1000, true);
    },
  }), []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleChangeState = useCallback((state) => {
    console.log('[jam-player-native] onChangeState', state);
    onStateChange?.(state);

    // A fresh video just finished loading (playing or cued-and-ready) — apply any position
    // we were asked to start at, since loadVideoById/cueVideoById always start at 0.
    if ((state === 'playing' || state === 'video cued') && pendingSeekMsRef.current) {
      playerRef.current?.seekTo(pendingSeekMsRef.current / 1000, true);
      pendingSeekMsRef.current = null;
    }

    if (state === 'playing') {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          playerRef.current?.getCurrentTime()
            .then((seconds) => onTimeUpdate?.(Math.round(seconds * 1000)))
            .catch(() => {});
        }, 1000);
      }
    } else {
      stopPolling();
    }
  }, [onStateChange, onTimeUpdate, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  // height/width are strictly numbers on this component (not "100%"-style strings), so the
  // actual pixel size has to come from measuring the wrapping View — defaults here match
  // JamSessionContext's current container size, just to avoid a zero-size flash before the
  // first onLayout fires.
  const [layoutSize, setLayoutSize] = useState({ width: 200, height: 113 });
  const handleLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    console.log('[jam-player-native] onLayout', { width, height });
    if (width > 0 && height > 0) setLayoutSize({ width, height });
  }, []);

  const handleReady = useCallback(() => {
    console.log('[jam-player-native] onReady fired');
    underlyingReadyRef.current = true;
    onReady?.();
  }, [onReady]);

  const handleError = useCallback((err) => {
    console.log('[jam-player-native] onError', err);
    onError?.(err);
  }, [onError]);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <YoutubePlayer
        ref={playerRef}
        height={layoutSize.height}
        width={layoutSize.width}
        videoId={videoId}
        play={playing}
        onReady={handleReady}
        onChangeState={handleChangeState}
        onError={handleError}
        // Same rationale as before: our own transport buttons are the only controls, so
        // there's one source of truth instead of reconciling YouTube's own UI.
        initialPlayerParams={{ controls: false, rel: false }}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});

export default JamPlayerWebView;
