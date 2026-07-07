import { useMemo, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Curated gradient pairs (no external image/network dependency) -- picked
// deterministically per seed so the same anonymous identity always renders
// the same "avatar" without ever depicting a real photo.
const GRADIENT_PALETTE = [
  ['#F58529', '#DD2A7B'],
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#22D3EE'],
  ['#F43F5E', '#FB923C'],
  ['#10B981', '#34D399'],
  ['#8B5CF6', '#EC4899'],
  ['#F59E0B', '#EF4444'],
  ['#06B6D4', '#3B82F6'],
];

// Blur level applied server-side by Picsum itself (1-10) -- deliberately
// avoids expo-blur's BlurView, which (combined with this avatar's
// `overflow:'hidden'` + `borderRadius`) previously clipped instead of
// blurring on-device. Baking the blur into the fetched image sidesteps that
// entirely, at the cost of needing network access for `usePlaceholderPhoto`.
const PLACEHOLDER_BLUR = 6;

function hashSeed(seed) {
  const str = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * An anonymous "profile picture" placeholder. Two modes:
 *
 * - Default: a fully-synthetic, deterministic gradient fill (same `seed`
 *   always producing the same colors) for identities that have no real photo
 *   to show, or where none should ever be shown (e.g. comment/share-modal
 *   fallbacks when the real user has no profile photo).
 * - `usePlaceholderPhoto`: a deterministic random placeholder photo (Lorem
 *   Picsum, seeded so the same `seed` always gets the same image) pre-blurred
 *   server-side, for admin-seeded meme posters -- there's no real source
 *   photo to protect here, but a plain color fill reads as too flat/obviously
 *   fake for a feed "creator" row, so a blurred stock photo is used instead.
 *   Falls back to the gradient on any load failure (offline, etc).
 *
 * Deliberately no icon/glyph on top of the gradient variant: a centered
 * "person" icon at small sizes (~30px) with reduced opacity visually read as
 * a flat-topped "cut off" shape once its faint head blended into the
 * background, rather than a full avatar -- a plain gradient fill can't be
 * misread that way. An earlier version also layered an `expo-blur` BlurView
 * on the gradient for a stylistic blurred look, but combined with this
 * container's `overflow: hidden` + `borderRadius` it clipped the avatar
 * instead of blurring it. Don't reintroduce either on the gradient path.
 */
export default function AnonymousAvatar({ seed, size = 32, shape = 'circle', style, usePlaceholderPhoto = false }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const radius = shape === 'square' ? Math.round(size * 0.28) : size / 2;

  if (usePlaceholderPhoto && !photoFailed) {
    const pixelSize = Math.max(Math.round(size * 3), 90);
    const uri = `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/${pixelSize}/${pixelSize}?blur=${PLACEHOLDER_BLUR}`;

    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius, backgroundColor: '#E5E5E5' }, style]}
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return <GradientAvatar seed={seed} size={size} radius={radius} style={style} />;
}

function GradientAvatar({ seed, size, radius, style }) {
  const colors = useMemo(() => {
    const hash = hashSeed(seed);
    return GRADIENT_PALETTE[hash % GRADIENT_PALETTE.length];
  }, [seed]);

  return (
    <View style={[{ width: size, height: size, borderRadius, overflow: 'hidden' }, style]}>
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
}
