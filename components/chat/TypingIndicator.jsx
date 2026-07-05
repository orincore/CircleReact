import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

const BOUNCE_HEIGHT = 4;
const BOUNCE_DURATION = 300;
const DOT_STAGGER_MS = 120;

function BouncingDot({ delayMs, color }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-BOUNCE_HEIGHT, { duration: BOUNCE_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: BOUNCE_DURATION, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delayMs]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />;
}

// Bubble-shaped typing indicator with a staggered bouncing-dots animation.
// Purely presentational: the parent owns `typingUsers` state / socket wiring
// and just passes whether it should currently be shown.
export default function TypingIndicator({ visible, avatarUrl }) {
  const { theme } = useTheme();
  const [shouldRender, setShouldRender] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(
        0,
        { duration: 180, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setShouldRender)(false);
        }
      );
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  if (!shouldRender) return null;

  return (
    <Animated.View style={[styles.row, containerStyle]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]} />
      )}
      <View
        style={[
          styles.bubble,
          { backgroundColor: theme.surface, shadowColor: theme.shadowColor },
        ]}
      >
        <BouncingDot delayMs={0} color={theme.textMuted} />
        <BouncingDot delayMs={DOT_STAGGER_MS} color={theme.textMuted} />
        <BouncingDot delayMs={DOT_STAGGER_MS * 2} color={theme.textMuted} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  avatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});
