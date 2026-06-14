import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { ScreenLayout } from "../src/components/layout/ScreenLayout";
import { Spinner } from "../src/components/loaders/Spinner";
import { ScreenHeaderCard } from "../src/components/layout/ScreenHeaderCard";
import { RootStackScreenProps } from "../types";
import { deleteAccount } from "../lib/deleteAccount";
import { useColors } from "../src/contexts/BackgroundContext";
import { spacing } from "../src/theme/spacing";
import { useLanguage } from "../src/i18n/LanguageContext";

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
  const { t } = useLanguage();

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
      // Deletes the user's Supabase data AND the Clerk user (server-side when
      // the delete-account function is deployed; client-side fallback otherwise).
      await deleteAccount({ user, getToken, signOut });
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
            <Text style={styles.headerTitle}>{t.screens.profile.deleteAccount}</Text>
          </View>
        </ScreenHeaderCard>
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>{t.screens.profile.permanentDeletion}</Text>
            <Text style={[styles.bodyText, { color: colors.textMuted }]}>
              {t.screens.profile.deleteScreenBody}
            </Text>

            {!confirming ? (
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: "rgba(255,107,107,0.15)", borderColor: "rgba(255,107,107,0.45)" }]}
                onPress={() => setConfirming(true)}
                disabled={submitting}
              >
                <Text style={[styles.dangerButtonText, { color: "#ff6b6b" }]}>{t.screens.profile.deleteButton}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={[styles.bodyText, { marginTop: 10, color: colors.textMuted }]}>
                  {t.screens.profile.typeBefore}<Text style={styles.inlineCode}>DELETE</Text>{t.screens.profile.typeAfter}
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
                    {submitting ? <Spinner size="small" color="#fff" /> : <Text style={styles.confirmButtonText}>{t.screens.profile.confirmDeletion}</Text>}
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
                    <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>{t.screens.common.cancel}</Text>
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

