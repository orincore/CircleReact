import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * App-wide loading spinner: a static faint ring with a single dot orbiting
 * it, replacing the platform-default ActivityIndicator (which looks
 * different per-OS and ignores the app's own theme color unless a color is
 * explicitly threaded through every call site).
 *
 * The ring is a perfect circle, so rotating the whole icon (ring + dot
 * together) via one Animated.View is visually identical to only rotating the
 * dot around a static ring -- no need to animate individual SVG elements or
 * rely on SMIL (<animateTransform>) support, which react-native-svg handles
 * inconsistently across platforms.
 */
export default function Loader({ size = 24, color, style }) {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const resolvedColor = color || theme.primary;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 750,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ rotate: spin }] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
          fill={resolvedColor}
          opacity={0.25}
        />
        <Circle cx="12" cy="2.5" r="1.5" fill={resolvedColor} />
      </Svg>
    </Animated.View>
  );
}
