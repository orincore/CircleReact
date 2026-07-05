import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/contexts/ThemeContext";

// Replaces the old "Uploading... 37%" text + a progress bar that snapped
// between discrete widths on every progress callback. The fill now glides
// smoothly toward each new value instead of jumping, and the icon has a
// gentle continuous pulse so there's always visible motion — no numbers,
// no "stepped" feel, matches a modern chat app's message-sending affordance.
export default function MediaSendingIndicator({ progress = 0, label = "Sending..." }) {
  const { theme, isDarkMode } = useTheme();
  const animatedProgress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
  }));

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#2D2D3A" : "#F3F4F6" }]}>
      <Animated.View style={iconStyle}>
        <Ionicons name="arrow-up-circle" size={18} color={theme.primary} />
      </Animated.View>
      <Text style={[styles.label, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: isDarkMode ? "#4B5563" : "#E5E7EB" }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  label: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    width: 60,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
