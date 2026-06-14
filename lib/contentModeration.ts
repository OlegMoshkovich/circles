/**
 * Lightweight client-side content moderation (App Store Guideline 1.2).
 *
 * This is a first-pass filter that blocks the most obvious objectionable
 * content (slurs / hate terms) before it is ever posted, giving immediate
 * feedback to the author. It is intentionally conservative to avoid false
 * positives. The authoritative filter is the matching server-side trigger in
 * `supabase/ugc_safety_compliance.sql`, which also rejects this content at the
 * database level so it cannot be bypassed by a modified client. For richer
 * moderation, route note inserts through an Edge Function backed by a real
 * moderation API and expand both lists together.
 */

// Lowercase substrings to reject. Matched on a normalized form of the text
// (lowercased, punctuation/spacing collapsed) so simple obfuscation is caught.
// Keep this in sync with the `bad` array in ugc_safety_compliance.sql.
const BLOCKED_TERMS: string[] = [
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
  "wetback",
  "tranny",
  "cunt",
];

/** Collapse leetspeak/spacing so "n i g g e r" / "n1gger" still match. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s._\-*]+/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/@/g, "a")
    .replace(/\$/g, "s");
}

/** True when the text contains an objectionable term we refuse to post. */
export function containsObjectionableContent(text: string): boolean {
  if (!text) return false;
  const normalized = normalize(text);
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
}

export const OBJECTIONABLE_CONTENT_MESSAGE =
  "Your message appears to contain language that violates our community guidelines. Please revise it before posting.";
