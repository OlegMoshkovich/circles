import React from "react";
import { StyleSheet, View } from "react-native";
import { Spinner } from "../loaders/Spinner";
import type { MapCircle } from "./CirclesMapView";

const CirclesMapViewInner = React.lazy(() =>
  import("./CirclesMapView").then((m) => ({ default: m.CirclesMapView }))
);

type Props = {
  circles: MapCircle[];
  onCirclePress: (circle: MapCircle) => void;
  emptyMessage?: string;
  geocodeFailedMessage?: string;
  spreadOverlappingMarkers?: boolean;
};

export function LazyCirclesMapView(props: Props) {
  return (
    <React.Suspense
      fallback={
        <View style={styles.fallback}>
          <Spinner size="large" />
        </View>
      }
    >
      <CirclesMapViewInner {...props} />
    </React.Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
