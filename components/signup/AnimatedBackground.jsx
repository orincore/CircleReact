import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AnimatedBackground({ children }) {
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate blobs in a loop
    const animation1 = Animated.loop(
      Animated.sequence([
        Animated.timing(blob1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(blob1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    const animation2 = Animated.loop(
      Animated.sequence([
        Animated.timing(blob2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(blob2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    const animation3 = Animated.loop(
      Animated.sequence([
        Animated.timing(blob3, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(blob3, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    );

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  const blob1TranslateY = blob1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  const blob2TranslateX = blob2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const blob3Scale = blob3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <LinearGradient
      colors={["#FF6FB5", "#A16AE8", "#5D5FEF"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Animated blobs */}
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          {
            transform: [{ translateY: blob1TranslateY }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          {
            transform: [{ translateX: blob2TranslateX }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob3,
          {
            transform: [{ scale: blob3Scale }],
          },
        ]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  blob1: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(255, 214, 242, 0.4)',
    top: -100,
    right: -80,
  },
  blob2: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(161, 106, 232, 0.3)',
    top: '40%',
    left: -60,
  },
  blob3: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(93, 95, 239, 0.3)',
    bottom: 100,
    right: 40,
  },
});
