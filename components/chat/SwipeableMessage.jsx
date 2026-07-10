import React, { useCallback, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "./chatConversationStyles";

// Swipeable Message Wrapper for reply gesture using react-native-gesture-handler
// This prevents keyboard from closing during swipe. Tap/double-tap/long-press
// are handled here too (as Gesture.Tap/Gesture.LongPress raced against the
// pan) rather than via a wrapping core-RN Pressable -- a Pressable ancestor
// around a GestureDetector descendant is a known RNGH conflict: the native
// pan recognizer intercepts the touch stream before Pressable's JS long-press
// timer resolves, so onLongPress silently never fires (mostly on Android).
const SwipeableMessage = React.memo(function SwipeableMessage({ children, isMine, onSwipeReply, message, onPress, onLongPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);
  // Separate opacity per side: previously both used one direction-agnostic
  // value (based on Math.abs(translationX)), so swiping either way faded in
  // BOTH the left and right reply icons at once. Each side now only reacts
  // to swipes toward it.
  const leftIconOpacity = useRef(new Animated.Value(0)).current;
  const rightIconOpacity = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 60;
  const hasTriggeredReply = useRef(false);

  // Reset the trigger flag
  const resetTriggerFlag = useCallback(() => {
    hasTriggeredReply.current = false;
  }, []);

  // Wrapper function to safely call the reply callback
  const triggerReply = useCallback(() => {
    if (onSwipeReply && !hasTriggeredReply.current) {
      hasTriggeredReply.current = true;
      onSwipeReply(message);
    }
  }, [onSwipeReply, message]);

  // Reset animation to original position
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(leftIconOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(rightIconOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, leftIconOpacity, rightIconOpacity]);

  // Update animation values
  const updateAnimation = useCallback((translationXValue) => {
    const clampedX = Math.max(-SWIPE_THRESHOLD - 20, Math.min(SWIPE_THRESHOLD + 20, translationXValue));
    translateX.setValue(clampedX);
    const progress = Math.min(Math.abs(clampedX) / SWIPE_THRESHOLD, 1);
    // Dragging right (positive X) reveals the left indicator; dragging left
    // (negative X) reveals the right one — never both at once.
    leftIconOpacity.setValue(clampedX > 0 ? progress : 0);
    rightIconOpacity.setValue(clampedX < 0 ? progress : 0);
  }, [translateX, leftIconOpacity, rightIconOpacity]);

  // Handle gesture end with threshold check
  const handleGestureEnd = useCallback((translationXValue) => {
    if (Math.abs(translationXValue) >= SWIPE_THRESHOLD) {
      triggerReply();
    }
    resetPosition();
  }, [triggerReply, resetPosition]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only activate after 20px horizontal movement
    .failOffsetY([-15, 15]) // Fail if vertical movement exceeds 15px (allow more vertical tolerance)
    .minDistance(10) // Minimum distance before gesture activates
    .onStart(() => {
      'worklet';
      runOnJS(resetTriggerFlag)();
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(updateAnimation)(event.translationX);
    })
    .onEnd((event) => {
      'worklet';
      runOnJS(handleGestureEnd)(event.translationX);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(resetPosition)();
    });

  const setPressed = useCallback((val) => setIsPressed(val), []);

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onBegin(() => {
      'worklet';
      runOnJS(setPressed)(true);
    })
    .onEnd((_event, success) => {
      'worklet';
      if (success) runOnJS(onPress)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setPressed)(false);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onBegin(() => {
      'worklet';
      runOnJS(setPressed)(true);
    })
    .onStart(() => {
      'worklet';
      runOnJS(onLongPress)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setPressed)(false);
    });

  // Race: whichever gesture activates first (a drag, a quick tap, or a hold)
  // wins and cancels the others -- pan needs 10-20px movement to activate, so
  // a stationary press always resolves to tap/long-press instead.
  const composedGesture = Gesture.Race(panGesture, longPressGesture, tapGesture);

  // Every extra plain View/Animated.View wrapped around the bubble for the
  // swipe gesture was another auto-width column container Yoga had to
  // resolve, and each one was a chance for the "stretch to my own
  // not-yet-determined width" ambiguity that caused short text to measure
  // at an already-wrapped width (confirmed via on-screen debug
  // measurements). Fix: don't wrap the bubble in anything extra at all.
  // GestureDetector's one required child IS the bubble itself (transform
  // passed straight into its style), and the reply icons are now rendered
  // as siblings positioned against messageRow directly (which already has
  // position:'relative') instead of against a removed middle wrapper.
  return (
    <>
      <Animated.View
        style={[
          styles.replyIconContainer,
          styles.replyIconLeft,
          { opacity: leftIconOpacity },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <Ionicons name="arrow-undo" size={18} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.replyIconContainer,
          styles.replyIconRight,
          { opacity: rightIconOpacity },
        ]}
      >
        <View style={styles.replyIconCircle}>
          <Ionicons name="arrow-undo" size={18} color="#fff" />
        </View>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={{
            transform: [{ translateX }],
            alignSelf: isMine ? "flex-end" : "flex-start",
            alignItems: isMine ? "flex-end" : "flex-start",
            opacity: isPressed ? 0.8 : 1,
          }}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
});

export default SwipeableMessage;
