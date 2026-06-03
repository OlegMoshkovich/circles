import { useAuth, useUser } from "@clerk/clerk-expo";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

type Props = {
  reason: string | null;
  bannedAt: string | null;
};

export default function BannedScreen({ reason, bannedAt }: Props) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = React.useState(user?.primaryEmailAddress?.emailAddress ?? "");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmitAppeal() {
    if (submitting) return;
    if (!message.trim()) {
      setError("Please add a message.");
      return;
    }
    if (!user) {
      setError("You must be signed in to contact support.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const details = [email.trim() ? `Contact: ${email.trim()}` : null, message.trim()]
        .filter(Boolean)
        .join("\n\n");

      // Lands in the moderation dashboard's report queue (content_reports).
      const { error: reportError } = await supabase.from("content_reports").insert({
        reporter_user_id: user.id,
        target_type: "user_profile",
        target_id: user.id,
        reported_user_id: user.id,
        reason: "ban_appeal",
        details,
      });
      if (reportError) throw reportError;

      // Best-effort: also stamp the appeal onto the user's record. Requires the
      // add_ban_appeal.sql migration; if those columns don't exist yet the error
      // is ignored so the appeal still succeeds.
      await supabase
        .from("user_profiles")
        .update({
          appeal_message: message.trim(),
          appeal_contact: email.trim() || null,
          appeal_submitted_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
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
          You can no longer access events, circles, or messages. If you believe this is a mistake, contact our
          moderation team below.
        </Text>

        <View style={styles.divider} />

        {submitted ? (
          <View style={styles.appealDone}>
            <Text style={styles.appealDoneTitle}>Message sent</Text>
            <Text style={styles.appealDoneText}>
              Thanks — your message has been sent to our moderation team. We'll review it and follow up if needed.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionLabel}>Contact support</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email for us to reach you"
              placeholderTextColor="#8a8780"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us why you think this is a mistake…"
              placeholderTextColor="#8a8780"
              multiline
              textAlignVertical="top"
              editable={!submitting}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              onPress={handleSubmitAppeal}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                styles.appealButton,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Send message</Text>
              )}
            </Pressable>
          </View>
        )}

        <Pressable onPress={onSignOut} style={({ pressed }) => [styles.button, styles.signOutButton, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  input: {
    backgroundColor: "#f7f5ee",
    borderWidth: 1,
    borderColor: "#c8c4b4",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2c2b28",
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 110,
  },
  errorText: {
    color: "#7a1a1a",
    fontSize: 13,
    marginBottom: 12,
  },
  appealDone: {
    backgroundColor: "#e7e3d6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  appealDoneTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2c2b28",
    marginBottom: 6,
  },
  appealDoneText: {
    fontSize: 13,
    color: "#4a4845",
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#2c2b28",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  appealButton: {
    marginTop: 4,
  },
  signOutButton: {
    marginTop: 32,
    backgroundColor: "#6b6760",
  },
  buttonDisabled: {
    opacity: 0.6,
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
