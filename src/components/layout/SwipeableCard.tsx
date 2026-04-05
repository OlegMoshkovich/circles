import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  PanResponder,
  Platform,
  UIManager,
} from "react-native";

type Props = {
  children: React.ReactNode;
  onDismiss?: () => void;
  onRestore?: () => void;
  disabled?: boolean;
};

const DISMISS_DISTANCE = 84;
const DISMISS_VELOCITY = 0.45;
const SCREEN_WIDTH = Dimensions.get("window").width;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function SwipeableCard({ children, onDismiss, onRestore, disabled }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    translateX.setValue(0);
    opacity.setValue(1);
  }, [children, opacity, translateX]);

  function finishSwipe(direction: "left" | "right") {
    const callback = direction === "left" ? onDismiss : onRestore;
    if (!callback) return;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === "left" ? -SCREEN_WIDTH : SCREEN_WIDTH,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      callback();
      translateX.setValue(0);
      opacity.setValue(1);
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        if (disabledRef.current) return false;
        if (Math.abs(g.dx) < 14) return false;
        if (Math.abs(g.dx) < Math.abs(g.dy) * 1.35) return false;
        if (g.dx < 0 && !onDismiss) return false;
        if (g.dx > 0 && !onRestore) return false;
        return true;
      },
      onPanResponderMove: (_, g) => {
        const nextX =
          g.dx < 0 && onDismiss
            ? Math.max(g.dx, -SCREEN_WIDTH)
            : g.dx > 0 && onRestore
              ? Math.min(g.dx, SCREEN_WIDTH)
              : 0;

        translateX.setValue(nextX);
        opacity.setValue(Math.max(0.2, 1 - Math.abs(nextX) / 220));
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_, g) => {
        const shouldDismissLeft =
          g.dx < -DISMISS_DISTANCE || (g.dx < -30 && g.vx <= -DISMISS_VELOCITY);
        const shouldDismissRight =
          g.dx > DISMISS_DISTANCE || (g.dx > 30 && g.vx >= DISMISS_VELOCITY);

        if (shouldDismissLeft && onDismiss) {
          finishSwipe("left");
          return;
        }

        if (shouldDismissRight && onRestore) {
          finishSwipe("right");
          return;
        }

        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            bounciness: 0,
          }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
            bounciness: 0,
          }),
        ]).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ transform: [{ translateX }], opacity }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
