import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';

// react-native-webview has no web implementation at all — rendering it on web either throws
// or silently fails, and was swallowing touch events in the rest of the screen. On web we're
// already inside a real browser page, so there's no need for a WebView/postMessage bridge:
// this loads the YouTube IFrame API directly into the page and drives a YT.Player in-place.

let iframeApiPromise = null;

function loadIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  });
  return iframeApiPromise;
}

let instanceCounter = 0;

/**
 * Web counterpart to JamPlayerWebView.native.jsx — same {load, play, pause, seekTo} ref API,
 * but driving a YT.Player directly instead of bridging through a WebView (which doesn't exist
 * on web at all).
 */
const JamPlayerWebView = forwardRef(function JamPlayerWebView(
  { onReady, onStateChange, onTimeUpdate, onError, style },
  ref
) {
  const elementIdRef = useRef(`jam-yt-player-${++instanceCounter}`);
  const playerRef = useRef(null);
  const pendingLoadRef = useRef(null); // {videoId, positionMs, shouldPlay}
  const readyRef = useRef(false);
  const pollRef = useRef(null);

  // loadVideoById always auto-plays, regardless of what we actually want — cueVideoById loads
  // the same video paused/cued. Using the right one matters: hydrating an already-paused
  // session with loadVideoById would cause a brief flash of audio before pauseVideo() lands.
  const loadOrCue = useCallback((videoId, positionMs, shouldPlay) => {
    const player = playerRef.current;
    const seconds = (positionMs || 0) / 1000;
    if (shouldPlay) player.loadVideoById(videoId, seconds);
    else player.cueVideoById(videoId, seconds);
    player.setPlaybackQuality('tiny');
  }, []);

  useImperativeHandle(ref, () => ({
    load: (id, positionMs = 0, shouldPlay = true) => {
      if (!readyRef.current || !playerRef.current) {
        pendingLoadRef.current = { videoId: id, positionMs, shouldPlay };
        return;
      }
      loadOrCue(id, positionMs, shouldPlay);
    },
    play: () => { if (readyRef.current) playerRef.current?.playVideo(); },
    pause: () => { if (readyRef.current) playerRef.current?.pauseVideo(); },
    seekTo: (positionMs) => { if (readyRef.current) playerRef.current?.seekTo((positionMs || 0) / 1000, true); },
  }), [loadOrCue]);

  useEffect(() => {
    let cancelled = false;

    loadIframeApi().then((YT) => {
      if (cancelled || !YT) return;
      playerRef.current = new YT.Player(elementIdRef.current, {
        height: '100%',
        width: '100%',
        // Same rationale as the native player: our own transport buttons are the only
        // controls, so there's one source of truth instead of reconciling YouTube's own UI.
        playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, disablekb: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            // Deliberately doesn't auto-load anything here — the caller's onReady handler
            // (JamSessionContext) explicitly calls ref.load() with the correct video,
            // position, and play/paused state.
            onReady?.();
            const pending = pendingLoadRef.current;
            if (pending) {
              loadOrCue(pending.videoId, pending.positionMs, pending.shouldPlay);
              pendingLoadRef.current = null;
            }
            pollRef.current = setInterval(() => {
              const p = playerRef.current;
              if (p && p.getPlayerState && p.getPlayerState() === 1) {
                onTimeUpdate?.(Math.round(p.getCurrentTime() * 1000));
              }
            }, 1000);
          },
          onStateChange: (e) => {
            const stateMap = { '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
            onStateChange?.(stateMap[e.data] ?? String(e.data));
          },
          onError: (e) => onError?.(e.data),
        },
      });
    });

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[{ width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }, style]}>
      <div id={elementIdRef.current} style={{ width: '100%', height: '100%' }} />
    </View>
  );
});

export default JamPlayerWebView;
