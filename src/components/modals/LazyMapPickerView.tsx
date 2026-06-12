import React from "react";
import { StyleSheet, View } from "react-native";
import { Spinner } from "../loaders/Spinner";

// Defers evaluation of LocationPickerModal (and its react-native-maps
// import) until the map is actually shown, keeping the heavy maps module
// off the startup/module-init path of every screen that embeds the event
// modals.
const MapPickerViewInner = React.lazy(() =>
  import("./LocationPickerModal").then((m) => ({ default: m.MapPickerView }))
);

type Props = {
  onBack: () => void;
  onConfirm: (address: string) => void;
};

export function LazyMapPickerView(props: Props) {
  return (
    <React.Suspense
      fallback={
        <View style={styles.fallback}>
          <Spinner size="large" />
        </View>
      }
    >
      <MapPickerViewInner {...props} />
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
