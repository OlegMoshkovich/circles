import { supabase } from "./supabase";
import { submitContentReport } from "./contentReports";

/**
 * User-to-user blocking (App Store Guideline 1.2).
 *
 * Blocking is per-viewer: the blocker stops seeing the blocked user's content.
 * Feeds enforce this by merging the blocker's blocked-user ids into the
 * "hidden authors" set (see `fetchHiddenAuthorIds`), so a blocked user's
 * circles, events and notes disappear from the blocker's feed instantly on the
 * next load. Blocking a user also files a report so the developer is notified
 * of the inappropriate content/behaviour (via the content-report email webhook).
 */

/** Block `blockedUserId` on behalf of `blockerUserId`. Idempotent. */
export async function blockUser(
  blockerUserId: string,
  blockedUserId: string,
  reportContext?: { reason?: string; details?: string | null }
): Promise<{ error: { message: string } | null }> {
  if (!blockerUserId || !blockedUserId || blockerUserId === blockedUserId) {
    return { error: { message: "Invalid block request." } };
  }

  const { error } = await supabase
    .from("user_blocks")
    .upsert(
      { blocker_user_id: blockerUserId, blocked_user_id: blockedUserId },
      { onConflict: "blocker_user_id,blocked_user_id" }
    );

  if (error) return { error: { message: error.message } };

  // Notify the developer so the report can be acted on within 24h. Best-effort:
  // a failure here must not make the block itself appear to fail.
  try {
    await submitContentReport({
      reporterUserId: blockerUserId,
      targetType: "user_profile",
      targetId: blockedUserId,
      reportedUserId: blockedUserId,
      reason: reportContext?.reason ?? "Blocked user",
      details: reportContext?.details ?? "User blocked from in-app profile.",
    });
  } catch {
    // ignore — the block succeeded, which is what matters to the user.
  }

  return { error: null };
}

/** Remove a block. */
export async function unblockUser(
  blockerUserId: string,
  blockedUserId: string
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", blockerUserId)
    .eq("blocked_user_id", blockedUserId);
  return { error: error ? { message: error.message } : null };
}

/** All user ids the given viewer has blocked. */
export async function fetchBlockedUserIds(blockerUserId: string): Promise<Set<string>> {
  if (!blockerUserId) return new Set();
  try {
    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_user_id")
      .eq("blocker_user_id", blockerUserId);
    if (error || !data) return new Set();
    return new Set((data as { blocked_user_id: string }[]).map((r) => r.blocked_user_id));
  } catch {
    return new Set();
  }
}

/** Whether `blockerUserId` currently blocks `blockedUserId`. */
export async function isUserBlocked(
  blockerUserId: string,
  blockedUserId: string
): Promise<boolean> {
  if (!blockerUserId || !blockedUserId) return false;
  try {
    const { data } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_user_id", blockerUserId)
      .eq("blocked_user_id", blockedUserId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
