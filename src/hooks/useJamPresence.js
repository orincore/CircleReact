import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

// Re-assert presence on this cadence regardless of state changes. The server tracks presence
// on socket.data, which is wiped on every reconnect (network blip, tab throttling, etc) — a
// pure "emit only on change" approach means a client that already sent jam:active once has no
// way to notice the server silently forgot, so the OTHER participant's client would report
// "isn't in the session" even though this device never left. The connect-listener below covers
// most such cases immediately; this heartbeat is a self-healing fallback for on the remainder.
const HEARTBEAT_MS = 20000;

/**
 * Emits jam:active/jam:inactive to gate playback on "is this person actually here".
 *
 * On native, this tracks AppState (foreground/background) — backgrounding the app is
 * treated as "left the session" since the YouTube IFrame player can't produce audio in
 * the background (see JamPlayerWebView.native.jsx).
 *
 * On web, AppState maps to document visibility (tab focus), and switching browser tabs
 * does NOT stop audio playback the way backgrounding a mobile app does — the tab keeps
 * playing sound in the background just like any other music site. So on web this only
 * emits active-on-mount / inactive-on-unmount, not on every tab switch.
 *
 * getPositionMs is read lazily (a function, not a value) so the emitted "last known
 * position" on going inactive is fresh even though this effect doesn't re-run on every tick.
 */
export function useJamPresence(socket, sessionId, getPositionMs) {
  const isForegroundRef = useRef(true);

  useEffect(() => {
    if (!socket || !sessionId) return;

    const emitCurrentState = () => {
      try {
        if (isForegroundRef.current) {
          socket.emit('jam:active', { sessionId });
        } else {
          socket.emit('jam:inactive', { sessionId, positionMs: getPositionMs?.() });
        }
      } catch {}
    };

    isForegroundRef.current = true;
    emitCurrentState();

    let appStateSubscription;
    if (Platform.OS !== 'web') {
      appStateSubscription = AppState.addEventListener('change', (nextState) => {
        // iOS AppState has three values, not two: 'active', 'inactive', and 'background'.
        // 'inactive' is a brief transient state during ordinary foreground interaction —
        // system dialogs, permission prompts, even some button-press animations — not the
        // user actually leaving. Treating it as "left" was auto-pausing playback moments
        // after pressing play. Only 'background' (genuinely backgrounded/screen off) counts.
        isForegroundRef.current = nextState !== 'background';
        emitCurrentState();
      });
    }

    // Unconditionally re-send on every (re)connect — don't rely on a "did this already
    // change" check, since the server's presence state for the PREVIOUS connection is gone.
    socket.on('connect', emitCurrentState);
    const heartbeat = setInterval(emitCurrentState, HEARTBEAT_MS);

    return () => {
      appStateSubscription?.remove();
      socket.off('connect', emitCurrentState);
      clearInterval(heartbeat);
      isForegroundRef.current = false;
      emitCurrentState();
    };
  }, [socket, sessionId]);
}
