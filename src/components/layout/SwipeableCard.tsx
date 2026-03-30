import React, { useRef } from "react";
import { Animated, PanResponder } from "react-native";

type Props = {
  children: React.ReactNode;
  onDismiss?: () => void;
  onRestore?: () => void;
};

export function SwipeableCard({ children, onDismiss, onRestore }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const height = useRef(new Animated.Value(0)).current;
  const cardHeight = useRef(0);

  const collapseAndCall = (cb?: () => void) => {
    Animated.timing(height, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => cb?.());
  };

  const collapse = () => collapseAndCall(onDismiss ?? onRestore);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < 15,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0 && onDismiss) {
          translateX.setValue(g.dx);
          opacity.setValue(Math.max(0, 1 + g.dx / 120));
        } else if (g.dx > 0 && onRestore) {
          translateX.setValue(g.dx);
          opacity.setValue(Math.max(0, 1 - g.dx / 120));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80 && onDismiss) {
          Animated.parallel([
            Animated.timing(translateX, { toValue: -500, duration: 180, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => collapse());
        } else if (g.dx > 80 && onRestore) {
          Animated.parallel([
            Animated.timing(translateX, { toValue: 500, duration: 180, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => collapse());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ height: cardHeight.current === 0 ? undefined : height, overflow: "hidden" }}
      onLayout={(e) => {
        if (cardHeight.current === 0) {
          cardHeight.current = e.nativeEvent.layout.height;
          height.setValue(e.nativeEvent.layout.height);
        }
      }}
    >
      <Animated.View
        style={{ transform: [{ translateX }], opacity }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
