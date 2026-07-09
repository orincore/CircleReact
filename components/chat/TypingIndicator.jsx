import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import TypingDots from "./TypingDots";

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
        <ExpoImage source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]} />
      )}
      <View
        style={[
          styles.bubble,
          { backgroundColor: theme.surface, shadowColor: theme.shadowColor },
        ]}
      >
        <TypingDots color={theme.textMuted} />
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
});
