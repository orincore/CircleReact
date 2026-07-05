import React, { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

// Wraps a message bubble's existing content with the "Room Chat" reference
// look: a near-black card for my messages / white-or-surface card for
// theirs in light mode, inverted in dark mode (white mine / dark surface
// theirs) so the sent bubble always reads as the bold, high-contrast one.
// Also applies the shared soft shadow and a mount-time entrance animation
// (fade + slide-up + scale). Purely a visual container — it does not
// re-implement any interaction logic (long-press, selection, reactions,
// media). Messages are keyed by stable id and rendered via `.map()`, so a
// new message mounts exactly one new instance of this component; existing
// bubbles never remount (and never replay the entrance animation) when
// unrelated state elsewhere in the screen changes.
export default function AnimatedMessageBubble({ isMine, isHighlighted, style, children }) {
  const { isDarkMode } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 8 },
      { scale: 0.94 + progress.value * 0.06 },
    ],
  }));

  // The highlighted state (scroll-to-message flash) has its own explicit
  // background/border coming through `style` — skip our background so that
  // override is actually visible instead of being painted over.
  if (isHighlighted) {
    return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
  }

  const backgroundColor = isMine
    ? (isDarkMode ? "#FFFFFF" : "#111111")
    : (isDarkMode ? "#1F1F1F" : "#FFFFFF");

  return (
    <Animated.View
      style={[
        style,
        isMine ? styles.mineShadow : styles.theirsShadow,
        { backgroundColor },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = {
  mineShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  theirsShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};
