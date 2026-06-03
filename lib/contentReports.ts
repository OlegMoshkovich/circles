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

/**
 * Report reasons offered to users. Only "Harassment or abuse" restricts access
 * (hides the reported content/author pending review); spam/offensive reports are
 * logged as a warning for moderators but do NOT hide content. A comment is
 * mandatory for harassment and optional otherwise.
 */
export const RESTRICTING_REPORT_REASON = "Harassment or abuse";

export const REPORT_REASONS: {
  value: string;
  label: string;
  restricts: boolean;
  commentRequired: boolean;
}[] = [
  { value: "Spam or scam", label: "Spam or scam", restricts: false, commentRequired: false },
  { value: "Harassment or abuse", label: "Harassment or abuse", restricts: true, commentRequired: true },
  { value: "Offensive or inappropriate", label: "Offensive or inappropriate", restricts: false, commentRequired: false },
];

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
      .eq("reason", RESTRICTING_REPORT_REASON)
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
      .eq("reason", RESTRICTING_REPORT_REASON)
      .in("target_id", ids)
      .in("status", [...HIDE_UNTIL_DISMISSED_REPORT_STATUSES]);
    if (error || !data) return new Set();
    return new Set((data as { target_id: string }[]).map((r) => r.target_id));
  } catch {
    return new Set();
  }
}

/**
 * User ids that should be hidden as content authors — banned users OR users with any
 * non-dismissed report against them. Used to filter out events/circles authored by them.
 */
export async function fetchHiddenAuthorIds(authorIds: string[]): Promise<Set<string>> {
  const hidden = new Set<string>();
  if (authorIds.length === 0) return hidden;

  const unique = Array.from(new Set(authorIds.filter(Boolean)));
  if (unique.length === 0) return hidden;

  try {
    const [reportedRes, bannedRes] = await Promise.all([
      supabase
        .from("content_reports")
        .select("reported_user_id")
        .eq("reason", RESTRICTING_REPORT_REASON)
        .in("reported_user_id", unique)
        .in("status", [...HIDE_UNTIL_DISMISSED_REPORT_STATUSES]),
      supabase
        .from("user_profiles")
        .select("user_id")
        .in("user_id", unique)
        .not("banned_at", "is", null),
    ]);

    (reportedRes.data as { reported_user_id: string | null }[] | null)?.forEach((r) => {
      if (r.reported_user_id) hidden.add(r.reported_user_id);
    });
    (bannedRes.data as { user_id: string }[] | null)?.forEach((r) => hidden.add(r.user_id));
  } catch {
    // Fail open — return whatever we've gathered so far (likely empty).
  }
  return hidden;
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

