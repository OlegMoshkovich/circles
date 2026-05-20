import React from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccountUnderReview } from "../hooks/useAccountUnderReview";

export default function AccountReviewBanner() {
  const { underReview } = useAccountUnderReview();
  const insets = useSafeAreaInsets();

  if (!underReview) return null;

  const topPad = insets.top || (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad + 8 }]} accessibilityRole="alert">
      <Text style={styles.title}>Your account is under review</Text>
      <Text style={styles.body}>
        A report about your account is being reviewed. You can keep using the app while moderators look into it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#7a4a1a",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 2,
  },
  body: {
    color: "#fceedd",
    fontSize: 12,
    lineHeight: 16,
  },
});
