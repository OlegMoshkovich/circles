import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useColors } from "./BackgroundContext";
import {
  ContentReportTargetType,
  REPORT_REASONS,
  submitContentReport,
} from "../../lib/contentReports";

export type ReportRequest = {
  reporterUserId: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  /**
   * Called after a successful report. `restrict` is true only for harassment
   * (access is restricted / the content is hidden); for spam/offensive the
   * content stays visible, so callers should NOT remove it from their UI.
   */
  onReported?: (targetId: string, info: { restrict: boolean; reason: string }) => void;
};

const ReportContext = React.createContext<{ report: (req: ReportRequest) => void }>({
  report: () => {},
});

export function useReport() {
  return React.useContext(ReportContext);
}

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<ReportRequest | null>(null);
  const report = React.useCallback((req: ReportRequest) => setRequest(req), []);

  return (
    <ReportContext.Provider value={{ report }}>
      {children}
      <ReportContentModal request={request} onClose={() => setRequest(null)} />
    </ReportContext.Provider>
  );
}

function ReportContentModal({
  request,
  onClose,
}: {
  request: ReportRequest | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [reason, setReason] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Reset whenever a new report is opened.
  React.useEffect(() => {
    if (request) {
      setReason(null);
      setComment("");
      setSubmitting(false);
    }
  }, [request]);

  const selected = REPORT_REASONS.find((r) => r.value === reason);
  const commentRequired = !!selected?.commentRequired;
  const canSubmit = !!reason && (!commentRequired || comment.trim().length > 0) && !submitting;

  async function handleSubmit() {
    if (!request || !reason || !selected || !canSubmit) return;
    setSubmitting(true);
    const { onReported, ...fields } = request;
    const { error } = await submitContentReport({
      ...fields,
      reason,
      details: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert("Could not send report", error.message);
      return;
    }
    const restrict = selected.restricts;
    onClose();
    onReported?.(request.targetId, { restrict, reason });
    Alert.alert(
      "Thanks",
      restrict
        ? "We received your report. This content is now hidden while our team reviews it."
        : "We received your report. Our team will review it."
    );
  }

  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Report content</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Why are you reporting this?</Text>

          {REPORT_REASONS.map((r) => {
            const active = reason === r.value;
            return (
              <TouchableOpacity
                key={r.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setReason(r.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{r.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={colors.background} /> : null}
              </TouchableOpacity>
            );
          })}

          {reason ? (
            <View style={styles.commentBlock}>
              <Text style={styles.commentLabel}>
                {commentRequired ? "Describe what happened (required)" : "Add a comment (optional)"}
              </Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder={
                  commentRequired
                    ? "Tell us what happened so our team can review it"
                    : "Anything else we should know?"
                }
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submit, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{submitting ? "Sending…" : "Submit report"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    card: {
      // Use the opaque screen background (colors.card is translucent in the
      // glass/onboarding themes) so content underneath isn't visible through it.
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 20,
      fontFamily: "CormorantGaramond_300Light",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 16,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.badgeBg,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginBottom: 10,
    },
    optionActive: {
      backgroundColor: colors.text,
    },
    optionText: {
      fontSize: 15,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    optionTextActive: {
      color: colors.background,
    },
    commentBlock: {
      marginTop: 6,
      marginBottom: 4,
    },
    commentLabel: {
      fontSize: 12,
      fontFamily: "Lora_400Regular",
      color: colors.textMuted,
      marginBottom: 6,
    },
    commentInput: {
      backgroundColor: colors.badgeBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      minHeight: 90,
      fontSize: 14,
      fontFamily: "Lora_400Regular",
      color: colors.text,
    },
    submit: {
      backgroundColor: colors.text,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 14,
    },
    submitDisabled: {
      opacity: 0.45,
    },
    submitText: {
      fontSize: 15,
      fontFamily: "Lora_400Regular",
      fontWeight: "600",
      color: colors.background,
    },
  });
}
