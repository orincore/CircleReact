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
      pointerEvents="box-none"
      style={[
        styles.wrap,
        Platform.OS === "web" ? styles.wrapWeb : null,
        { 
          transform: [{ translateY: slide }], 
          opacity,
          // Force the toast to be above everything
          zIndex: 999999,
          elevation: 999999
        },
      ]}
    >
      <SafeAreaView style={styles.safe}>
        <View 
          style={[
            styles.toast, 
            { 
              backgroundColor: bg,
              // Additional styling to ensure visibility
              zIndex: 999999,
              elevation: 999999
            }
          ]} 
          pointerEvents="none"
        >
          <Text style={styles.text}>{text}</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    alignItems: "center", 
    zIndex: 999999, // Even higher z-index
    elevation: 999999, // Even higher elevation for Android
    pointerEvents: "box-none" // Allow touches to pass through to elements below
  },
  wrapWeb: { position: "fixed", zIndex: 999999, top: 0 },
  safe: { width: "100%", alignItems: "center", pointerEvents: "box-none" },
  toast: { 
    marginTop: 60, // Increased top margin to ensure it's visible above modals
    borderRadius: 16, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    shadowColor: "#000", 
    shadowOpacity: 0.3, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 8 },
    elevation: 999, // Very high elevation for Android
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    // Add backdrop blur effect for better visibility
    backgroundColor: "rgba(0, 0, 0, 0.9)" // Fallback background
  },
  text: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 15,
    textAlign: "center"
  },
});
