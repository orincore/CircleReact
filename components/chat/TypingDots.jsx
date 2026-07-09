import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const DOT_STAGGER_MS = 120;

function BouncingDot({ delayMs, color, size, bounceHeight, duration }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-bounceHeight, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delayMs]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        dotStyle,
      ]}
    />
  );
}

/**
 * The staggered bouncing-dots trio used to indicate "typing" -- extracted
 * out of TypingIndicator.jsx (the chat screen's full bubble+avatar version)
 * so the exact same animation can also be dropped into compact contexts
 * like a chat-list row, keeping the "someone is typing" visual identical
 * everywhere it appears instead of a plain static dot in one place and an
 * animated one in another.
 */
export default function TypingDots({ color = "#8E8E93", size = 6, bounceHeight = 4, duration = 300, style }) {
  return (
    <View style={[styles.row, style]}>
      <BouncingDot delayMs={0} color={color} size={size} bounceHeight={bounceHeight} duration={duration} />
      <BouncingDot delayMs={DOT_STAGGER_MS} color={color} size={size} bounceHeight={bounceHeight} duration={duration} />
      <BouncingDot delayMs={DOT_STAGGER_MS * 2} color={color} size={size} bounceHeight={bounceHeight} duration={duration} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    marginHorizontal: 2,
  },
});
