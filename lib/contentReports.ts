import { Alert, ActionSheetIOS, Platform } from "react-native";
import { supabase } from "./supabase";

export type ContentReportTargetType =
  | "event_note"
  | "circle_note"
  | "event"
  | "circle"
  | "user_profile"
  | "other";

export type SubmitContentReportParams = {
  reporterUserId: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  reason: string;
  details?: string | null;
};

/** Reports in these states hide content for others until dismissed by a moderator. */
const HIDE_UNTIL_DISMISSED_REPORT_STATUSES = ["pending", "reviewed", "action_taken"] as const;

/**
 * Note ids that have at least one non-dismissed moderation report (hide from feeds).
 */
export async function fetchReportedHiddenNoteIds(
  targetType: "event_note" | "circle_note",
  noteIds: string[]
): Promise<Set<string>> {
  if (noteIds.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from("content_reports")
      .select("target_id")
      .eq("target_type", targetType)
      .in("target_id", noteIds)
      .in("status", [...HIDE_UNTIL_DISMISSED_REPORT_STATUSES]);
    if (error || !data) return new Set();
    return new Set((data as { target_id: string }[]).map((r) => r.target_id));
  } catch {
    return new Set();
  }
}

/**
 * Event or circle ids with an active moderation report (hide from discovery lists / feeds).
 */
export async function fetchReportedHiddenContentIds(
  targetType: "event" | "circle",
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from("content_reports")
      .select("target_id")
      .eq("target_type", targetType)
      .in("target_id", ids)
      .in("status", [...HIDE_UNTIL_DISMISSED_REPORT_STATUSES]);
    if (error || !data) return new Set();
    return new Set((data as { target_id: string }[]).map((r) => r.target_id));
  } catch {
    return new Set();
  }
}

export async function submitContentReport(
  params: SubmitContentReportParams
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from("content_reports").insert({
    reporter_user_id: params.reporterUserId,
    target_type: params.targetType,
    target_id: params.targetId,
    reported_user_id: params.reportedUserId ?? null,
    reason: params.reason,
    details: params.details ?? null,
    status: "pending",
  });
  return { error: error ? { message: error.message } : null };
}

/**
 * Ask for a reason, then insert into `content_reports`.
 * iOS: action sheet. Android: stacked alerts (max 3 buttons per dialog).
 */
export function promptReportContent(params: {
  reporterUserId: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  /** Called after a successful insert so the UI can hide the note immediately. */
  onReported?: (targetId: string) => void;
}): void {
  const finish = async (reason: string) => {
    const { onReported, ...reportFields } = params;
    const { error } = await submitContentReport({ ...reportFields, reason });
    if (error) {
      Alert.alert("Could not send report", error.message);
      return;
    }
    onReported?.(params.targetId);
    const thanksBody = (() => {
      switch (params.targetType) {
        case "event_note":
        case "circle_note":
          return "We received your report. This note is hidden while we review it.";
        case "event":
          return "We received your report. This event will be hidden until the issue is resolved.";
        case "circle":
          return "We received your report. This circle will be hidden until the issue is resolved.";
        default:
          return "We received your report. We will review it.";
      }
    })();
    Alert.alert("Thanks", thanksBody);
  };

  const granularReasons = [
    "Spam or scam",
    "Harassment or abuse",
    "Offensive or inappropriate",
    "Other",
  ] as const;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Report content",
        message: "Why are you reporting this?",
        options: ["Cancel", ...granularReasons],
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) return;
        const reason = granularReasons[buttonIndex - 1];
        if (reason) void finish(reason);
      }
    );
    return;
  }

  Alert.alert("Report content", "Why are you reporting this?", [
    { text: "Cancel", style: "cancel" },
    { text: "Spam or scam", onPress: () => void finish("Spam or scam") },
    {
      text: "More…",
      onPress: () =>
        Alert.alert("Report content", "Choose a category", [
          { text: "Cancel", style: "cancel" },
          { text: "Harassment or abuse", onPress: () => void finish("Harassment or abuse") },
          {
            text: "Offensive, inappropriate, or other",
            onPress: () => void finish("Offensive, inappropriate, or other"),
          },
        ]),
    },
  ]);
}

