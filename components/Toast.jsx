import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function Toast({ visible, text, type = "info" }) {
  const slide = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.linear, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: -80, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.linear, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slide, opacity]);

  const bg = type === "success" ? "rgba(16,185,129,0.95)" : type === "error" ? "rgba(239,68,68,0.95)" : "rgba(124,43,134,0.95)";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        Platform.OS === "web" ? styles.wrapWeb : null,
        { transform: [{ translateY: slide }], opacity },
      ]}
    >
      <SafeAreaView style={styles.safe}>
        <View style={[styles.toast, { backgroundColor: bg }]}>
          <Text style={styles.text}>{text}</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 1000 },
  wrapWeb: { position: "fixed" },
  safe: { width: "100%", alignItems: "center" },
  toast: { marginTop: 14, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  text: { color: "#fff", fontWeight: "700" },
});
