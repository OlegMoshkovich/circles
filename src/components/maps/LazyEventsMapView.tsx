import React from "react";
import { StyleSheet, View } from "react-native";
import { Spinner } from "../loaders/Spinner";
import type { MapEvent } from "./EventsMapView";

const EventsMapViewInner = React.lazy(() =>
  import("./EventsMapView").then((m) => ({ default: m.EventsMapView }))
);

type Props = {
  events: MapEvent[];
  onEventPress: (event: MapEvent) => void;
};

export function LazyEventsMapView(props: Props) {
  return (
    <React.Suspense
      fallback={
        <View style={styles.fallback}>
          <Spinner size="large" />
        </View>
      }
    >
      <EventsMapViewInner {...props} />
    </React.Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
