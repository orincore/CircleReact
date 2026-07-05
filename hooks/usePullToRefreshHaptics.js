import { useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as CircleHaptics from "../modules/circle-haptics";

const IS_IOS = Platform.OS === "ios";

// Use the native Core Haptics module when it's linked AND the device supports
// Core Haptics; otherwise fall back to the expo-haptics discrete ratchet below.
const USE_NATIVE = IS_IOS && CircleHaptics.available && CircleHaptics.isSupported();

// ---------------------------------------------------------------------------
// Native (Core Haptics) scratch tuning
// ---------------------------------------------------------------------------

// Pull (px) that maps to max pull depth, used to add a little grit the deeper
// you pull. Most of the feel comes from motion, not depth.
const PULL_FOR_FULL = 110;

// Pull velocity (px/ms) that maps to maximum scratch speed/intensity. A scratch
// is friction: it's felt as the finger *moves*, so velocity is the main driver.
const VELOCITY_FOR_FULL = 1.5;

// Intensity floor while the finger is moving at all, so even a slow careful pull
// feels like scratching paper rather than nothing. Motion adds the rest on top.
// (When the finger stops, the native side decays this to silence on its own.)
const INTENSITY_FLOOR = 0.5;
const INTENSITY_FROM_MOTION = 0.5;

// Sharpness (grittiness) rises a touch with pull depth. Offset on the grain's
// already-crisp base sharpness.
const SHARPNESS_BASE = 0.0;
const SHARPNESS_PER_DEPTH = 0.35;

// Playback rate (grain density) range. Faster pull -> denser, faster grains.
const SPEED_MIN = 0.7;
const SPEED_PER_MOTION = 1.3;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------
// Fallback (expo-haptics) discrete-ratchet tuning — used when Core Haptics is
// unavailable (older device, or before a fresh pod install + rebuild).
// ---------------------------------------------------------------------------

const FIRST_TICK_DISTANCE = 2;
const TICK_DISTANCE = 9;
const MIN_TICK_INTERVAL_MS = 28;
const SCRATCH_STYLE = Haptics.ImpactFeedbackStyle.Heavy;
const TRIGGER_STYLE = Haptics.ImpactFeedbackStyle.Heavy;

/**
 * Adds an iOS "scratch"/grind haptic while the user drags a pull-to-refresh
 * gesture, plus a firm confirmation when the refresh fires.
 *
 * On devices with Core Haptics (via the local `circle-haptics` native module)
 * this plays a looping *granular texture* — a dense stream of irregular
 * transients, like dragging a finger across paper — whose intensity, grain
 * density (playback rate) and grittiness (sharpness) are streamed live from
 * finger velocity and pull depth. It's friction: stronger/grittier the faster
 * you pull, and silent the moment the finger stops (native decay). The engine
 * is pre-warmed on drag begin so the first grain never drops, even after the
 * Taptic Engine has gone idle.
 *
 * Where Core Haptics isn't available it falls back to the previous expo-haptics
 * discrete ratchet (distance + interval gated `Heavy` impacts).
 *
 * Either way, feedback is emitted only while the user is *actively dragging*
 * (tracked via begin/end-drag) and overscrolling at the top, so momentum
 * bounces never trigger stray haptics.
 *
 * Wire ALL of the returned handlers (`onScroll` with `scrollEventThrottle={16}`,
 * `onScrollBeginDrag`, `onScrollEndDrag`) onto the scroll container and pass the
 * returned `onRefresh` to the RefreshControl. No-ops off iOS.
 *
 * @param {() => any} onRefresh the screen's existing refresh handler
 */
export function usePullToRefreshHaptics(onRefresh) {
  const draggingRef = useRef(false);

  // Native path state.
  const lastPullRef = useRef(0);
  const lastTimeRef = useRef(0);
  const scratchingRef = useRef(false);

  // Fallback path state.
  const firstTickDoneRef = useRef(false);
  const lastTickPullRef = useRef(0);
  const lastTickTimeRef = useRef(0);

  const onScrollBeginDrag = useCallback(() => {
    if (!IS_IOS) return;
    draggingRef.current = true;
    if (USE_NATIVE) {
      // Pre-warm the Taptic Engine + continuous player (muted) so the first
      // scratch fires with no cold-start latency.
      CircleHaptics.start();
      lastPullRef.current = 0;
      lastTimeRef.current = Date.now();
      scratchingRef.current = false;
    } else {
      firstTickDoneRef.current = false;
      lastTickPullRef.current = 0;
    }
  }, []);

  const onScrollEndDrag = useCallback(() => {
    // Finger lifted — any remaining overscroll/bounce is momentum, not a pull.
    draggingRef.current = false;
    if (USE_NATIVE && scratchingRef.current) {
      CircleHaptics.stop();
      scratchingRef.current = false;
    }
  }, []);

  const onScrollNative = useCallback((event) => {
    if (!draggingRef.current) return;
    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    const now = Date.now();

    if (y >= 0) {
      // Not overscrolling — mute, but keep the player ready for re-entry.
      if (scratchingRef.current) {
        CircleHaptics.updateScratch(0, 0, SPEED_MIN);
        scratchingRef.current = false;
      }
      lastPullRef.current = 0;
      lastTimeRef.current = now;
      return;
    }

    const pull = -y;
    const dt = Math.max(now - lastTimeRef.current, 1);
    const velocity = Math.abs(pull - lastPullRef.current) / dt; // px/ms
    lastPullRef.current = pull;
    lastTimeRef.current = now;

    const depth = clamp(pull / PULL_FOR_FULL, 0, 1);
    const motion = clamp(velocity / VELOCITY_FOR_FULL, 0, 1);
    // Movement = grain. The native decay silences it when the finger stops, so
    // a held-still finger doesn't keep buzzing.
    const intensity = clamp(INTENSITY_FLOOR + INTENSITY_FROM_MOTION * motion, 0, 1);
    const sharpness = clamp(SHARPNESS_BASE + SHARPNESS_PER_DEPTH * depth, -1, 1);
    const speed = SPEED_MIN + SPEED_PER_MOTION * motion;

    CircleHaptics.updateScratch(intensity, sharpness, speed);
    scratchingRef.current = true;
  }, []);

  const onScrollFallback = useCallback((event) => {
    if (!draggingRef.current) return;
    const y = event?.nativeEvent?.contentOffset?.y ?? 0;

    if (y >= 0) {
      // Not overscrolling — re-arm so re-entering the pull fires from the start.
      firstTickDoneRef.current = false;
      lastTickPullRef.current = 0;
      return;
    }

    const pull = -y;
    const now = Date.now();

    if (!firstTickDoneRef.current) {
      // First feedback of the pull: fire ASAP, no rate limit.
      if (pull >= FIRST_TICK_DISTANCE) {
        firstTickDoneRef.current = true;
        lastTickPullRef.current = pull;
        lastTickTimeRef.current = now;
        Haptics.impactAsync(SCRATCH_STYLE).catch(() => {});
      }
      return;
    }

    // Subsequent ratchet taps: tied to distance, capped to the engine's rate.
    if (
      pull - lastTickPullRef.current >= TICK_DISTANCE &&
      now - lastTickTimeRef.current >= MIN_TICK_INTERVAL_MS
    ) {
      lastTickPullRef.current = pull;
      lastTickTimeRef.current = now;
      Haptics.impactAsync(SCRATCH_STYLE).catch(() => {});
    }
  }, []);

  const onScroll = USE_NATIVE ? onScrollNative : onScrollFallback;

  const onRefreshWithHaptics = useCallback(
    (...args) => {
      if (USE_NATIVE) {
        CircleHaptics.triggerSnap(1, 0.7);
      } else if (IS_IOS) {
        Haptics.impactAsync(TRIGGER_STYLE).catch(() => {});
      }
      return onRefresh?.(...args);
    },
    [onRefresh]
  );

  return { onScroll, onScrollBeginDrag, onScrollEndDrag, onRefresh: onRefreshWithHaptics };
}
