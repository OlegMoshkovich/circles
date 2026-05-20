import { useAuth, useUser } from "@clerk/clerk-expo";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  reason: string | null;
  bannedAt: string | null;
};

export default function BannedScreen({ reason, bannedAt }: Props) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const onSignOut = () => {
    Alert.alert("Sign out", "Sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            console.warn("sign out failed", e);
          }
        },
      },
    ]);
  };

  const displayName =
    user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "Your account";

  const dateLine = bannedAt
    ? `Banned ${new Date(bannedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "Banned";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>Banned</Text>
      </View>

      <Text style={styles.heading}>{displayName}</Text>

      <Text style={styles.subheading}>Your account has been banned</Text>

      <Text style={styles.dateLine}>{dateLine}</Text>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Reason</Text>
      <Text style={styles.reason}>
        {reason ?? "Your account has been removed from ValMia following moderator review."}
      </Text>

      <Text style={styles.body}>
        You can no longer access events, circles, or messages. If you believe this is a mistake, contact support.
      </Text>

      <Pressable onPress={onSignOut} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#efede1",
  },
  content: {
    paddingHorizontal: 24,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  badge: {
    backgroundColor: "#7a1a1a",
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  heading: {
    fontSize: 28,
    color: "#2c2b28",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 18,
    color: "#2c2b28",
    marginBottom: 4,
  },
  dateLine: {
    fontSize: 13,
    color: "#4a4845",
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#c8c4b4",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#4a4845",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 8,
  },
  reason: {
    fontSize: 15,
    color: "#2c2b28",
    lineHeight: 22,
    marginBottom: 24,
  },
  body: {
    fontSize: 13,
    color: "#4a4845",
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#2c2b28",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
