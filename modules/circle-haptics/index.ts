import { requireOptionalNativeModule } from "expo-modules-core";

// `requireOptionalNativeModule` returns null when the native module isn't part
// of the build (e.g. Android, web, or before a fresh `pod install` + rebuild)
// instead of throwing — so JS can cleanly fall back to expo-haptics.
const CircleHaptics = requireOptionalNativeModule<{
  isSupported(): boolean;
  start(): void;
  updateScratch(intensity: number, sharpness: number, speed: number): void;
  stop(): void;
  triggerSnap(intensity: number, sharpness: number): void;
}>("CircleHaptics");

/** True when the native Core Haptics module is linked into this build. */
export const available = CircleHaptics != null;

let supportedCache: boolean | null = null;

/**
 * Whether the device's Taptic Engine supports Core Haptics. Cached after the
 * first call. False off-iOS or when the module isn't linked.
 */
export function isSupported(): boolean {
  if (!CircleHaptics) return false;
  if (supportedCache == null) {
    try {
      supportedCache = CircleHaptics.isSupported();
    } catch {
      supportedCache = false;
    }
  }
  return supportedCache;
}

/**
 * Create + start the haptic engine and a muted continuous player. Call on drag
 * begin to pre-warm the Taptic Engine so the first scratch is never dropped.
 */
export function start(): void {
  try {
    CircleHaptics?.start();
  } catch {}
}

/**
 * Live-update the running granular scratch texture.
 * @param intensity 0..1 overall strength of the grain stream.
 * @param sharpness -1..1 offset; higher = grittier/sharper grain.
 * @param speed playback rate (0.1..2.0); higher = denser/faster grains.
 */
export function updateScratch(intensity: number, sharpness: number, speed = 1): void {
  try {
    CircleHaptics?.updateScratch(intensity, sharpness, speed);
  } catch {}
}

/** Mute + stop the continuous scratch. Call on drag end. */
export function stop(): void {
  try {
    CircleHaptics?.stop();
  } catch {}
}

/** Fire a firm transient "snap" when the refresh actually triggers. */
export function triggerSnap(intensity = 1, sharpness = 0.7): void {
  try {
    CircleHaptics?.triggerSnap(intensity, sharpness);
  } catch {}
}
