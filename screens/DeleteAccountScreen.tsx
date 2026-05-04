import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { RootStackScreenProps } from "../types";
import { supabase, getAuthClient } from "../lib/supabase";
import { useColors } from "../src/contexts/BackgroundContext";
import { spacing } from "../src/theme/spacing";

function getErrorMessage(e: unknown) {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const anyErr = e as any;
  return anyErr?.message || anyErr?.errors?.[0]?.longMessage || "Something went wrong";
}

export default function DeleteAccountScreen({ navigation }: RootStackScreenProps<"DeleteAccount">) {
  const { user } = useUser();
  const { getToken, signOut } = useAuth();
  const colors = useColors();

  const [confirming, setConfirming] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!user) return;
    setError(null);
    if (typed.trim().toUpperCase() !== "DELETE") {
      setError('Please type "DELETE" to confirm.');
      return;
    }

    setSubmitting(true);
    try {
      const userId = user.id;

      // Use an authenticated Supabase client so RLS allows us to delete user-owned data.
      let client = supabase;
      try {
        const token = await getToken({ template: "supabase" });
        if (token) client = getAuthClient(token);
      } catch (_) {}

      const runDelete = async (query: any) => {
        const { error } = await query;
        if (error) throw error;
      };

      const { data: ownedCircles, error: ownedCirclesError } = await client
        .from("circles")
        .select("id")
        .eq("owner_id", userId);
      if (ownedCirclesError) throw ownedCirclesError;
      const ownedCircleIds = (ownedCircles ?? []).map((c: any) => c.id);

      const { data: createdEvents, error: createdEventsError } = await client
        .from("events")
        .select("id")
        .eq("created_by", userId);
      if (createdEventsError) throw createdEventsError;

      let ownedCircleEventIds: string[] = [];
      if (ownedCircleIds.length > 0) {
        const { data, error } = await client
          .from("events")
          .select("id")
          .in("circle_id", ownedCircleIds);
        if (error) throw error;
        ownedCircleEventIds = (data ?? []).map((e: any) => e.id);
      }

      const allEventIds = Array.from(
        new Set([...(createdEvents ?? []).map((e: any) => e.id), ...ownedCircleEventIds])
      );

      await runDelete(client.from("notifications").delete().eq("user_id", userId));
      await runDelete(client.from("dismissed_items").delete().eq("user_id", userId));
      await runDelete(client.from("event_rsvps").delete().eq("user_id", userId));
      await runDelete(client.from("event_notes").delete().eq("user_id", userId));
      await runDelete(client.from("circle_notes").delete().eq("user_id", userId));
      await runDelete(client.from("circle_members").delete().eq("user_id", userId));
      await runDelete(client.from("user_profiles").delete().eq("user_id", userId));

      if (allEventIds.length > 0) {
        await runDelete(client.from("dismissed_items").delete().eq("item_type", "event").in("item_id", allEventIds));
        await runDelete(client.from("event_rsvps").delete().in("event_id", allEventIds));
        await runDelete(client.from("event_notes").delete().in("event_id", allEventIds));
        await runDelete(client.from("events").delete().in("id", allEventIds));
      }

      if (ownedCircleIds.length > 0) {
        await runDelete(client.from("dismissed_items").delete().eq("item_type", "circle").in("item_id", ownedCircleIds));
        await runDelete(client.from("circle_notes").delete().in("circle_id", ownedCircleIds));
        await runDelete(client.from("circle_members").delete().in("circle_id", ownedCircleIds));
        await runDelete(client.from("circles").delete().in("id", ownedCircleIds));
      }

      // Permanently delete the Clerk user (this is the required “account deletion” flow).
      await user.delete();

      // Ensure the app returns to the signed-out experience.
      try {
        await signOut();
      } catch (_) {}

      // Auth flow will switch to the signed-out stack automatically.
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenLayout
      backgroundColor={colors.background}
      header={
        <ScreenHeaderCard style={{ marginTop: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.text} />
            <Text style={styles.headerTitle}>Delete account</Text>
          </View>
        </ScreenHeaderCard>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Permanent deletion</Text>
            <Text style={[styles.bodyText, { color: colors.textMuted }]}>
              This will permanently delete your account and your data stored by ValMia. This action cannot be undone.
            </Text>

            {!confirming ? (
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.45)" }]}
                onPress={() => setConfirming(true)}
                disabled={submitting}
              >
                <Text style={[styles.dangerButtonText, { color: "#ff6b6b" }]}>Delete Account</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={[styles.bodyText, { marginTop: 10, color: colors.textMuted }]}>
                  Type <Text style={styles.inlineCode}>DELETE</Text> to confirm.
                </Text>

                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder="DELETE"
                  placeholderTextColor="rgba(239,237,225,0.45)"
                  style={[styles.input, { borderColor: colors.divider, color: colors.text }]}
                  autoCapitalize="characters"
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.confirmButton, { opacity: submitting ? 0.7 : 1 }]}
                    onPress={handleDelete}
                    disabled={submitting}
                  >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm deletion</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.cardBorder }]}
                    onPress={() => {
                      setConfirming(false);
                      setTyped("");
                      setError(null);
                    }}
                    disabled={submitting}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.pageHorizontal,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.cardPadding,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  dangerButton: {
    marginTop: 18,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  inlineCode: {
    fontWeight: "800",
    color: "#ff6b6b",
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    marginTop: 10,
    color: "#ff6b6b",
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ff6b6b",
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontWeight: "700",
  },
});

