import { supabase, getAuthClient } from "./supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type DeleteAccountDeps = {
  /** The Clerk user (needs `id` and `delete()` for the fallback path). */
  user: { id: string; delete: () => Promise<unknown> };
  getToken: (opts: { template: string }) => Promise<string | null>;
  signOut: () => Promise<unknown>;
};

/**
 * Permanently delete the signed-in user's account in BOTH Supabase and Clerk.
 *
 * Primary path: a server-side `delete-account` Edge Function does both with the
 * service role + Clerk Backend API, so deletion is reliable and can't half-fail.
 * Fallback path (only if that function isn't deployed yet -> 404): the previous
 * client-side flow -- delete the user's Supabase rows under RLS, then call
 * Clerk's `user.delete()`. Any other server error is surfaced, not silently
 * downgraded, so a real failure is never mistaken for success.
 */
export async function deleteAccount({ user, getToken, signOut }: DeleteAccountDeps): Promise<void> {
  const token = await getToken({ template: "supabase" });
  if (!token) throw new Error("You must be signed in to delete your account.");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
  });

  if (res.ok) {
    await safeSignOut(signOut);
    return;
  }

  if (res.status !== 404) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Account deletion failed (${res.status}). ${detail}`.trim());
  }

  // Edge Function not deployed yet -> fall back to the client-side flow so
  // deletion still works. (Once deployed, this branch is never taken.)
  await clientSideDelete(token, user.id);
  await user.delete();
  await safeSignOut(signOut);
}

async function safeSignOut(signOut: () => Promise<unknown>) {
  try {
    await signOut();
  } catch {
    // Account is already gone; the app will switch to the signed-out stack.
  }
}

/** Delete every row owned by the user, under their RLS identity. */
async function clientSideDelete(token: string, userId: string) {
  const client = token ? getAuthClient(token) : supabase;
  const run = async (query: any) => {
    const { error } = await query;
    if (error) throw error;
  };

  const { data: ownedCircles, error: ownedCirclesError } = await client
    .from("circles").select("id").eq("owner_id", userId);
  if (ownedCirclesError) throw ownedCirclesError;
  const ownedCircleIds = (ownedCircles ?? []).map((c: any) => c.id);

  const { data: createdEvents, error: createdEventsError } = await client
    .from("events").select("id").eq("created_by", userId);
  if (createdEventsError) throw createdEventsError;

  let ownedCircleEventIds: string[] = [];
  if (ownedCircleIds.length > 0) {
    const { data, error } = await client.from("events").select("id").in("circle_id", ownedCircleIds);
    if (error) throw error;
    ownedCircleEventIds = (data ?? []).map((e: any) => e.id);
  }
  const allEventIds = Array.from(
    new Set([...(createdEvents ?? []).map((e: any) => e.id), ...ownedCircleEventIds]),
  );

  await run(client.from("notifications").delete().eq("user_id", userId));
  await run(client.from("dismissed_items").delete().eq("user_id", userId));
  await run(client.from("event_rsvps").delete().eq("user_id", userId));
  await run(client.from("event_notes").delete().eq("user_id", userId));
  await run(client.from("circle_notes").delete().eq("user_id", userId));
  await run(client.from("circle_members").delete().eq("user_id", userId));
  await run(client.from("user_profiles").delete().eq("user_id", userId));

  if (allEventIds.length > 0) {
    await run(client.from("dismissed_items").delete().eq("item_type", "event").in("item_id", allEventIds));
    await run(client.from("event_rsvps").delete().in("event_id", allEventIds));
    await run(client.from("event_notes").delete().in("event_id", allEventIds));
    await run(client.from("events").delete().in("id", allEventIds));
  }
  if (ownedCircleIds.length > 0) {
    await run(client.from("dismissed_items").delete().eq("item_type", "circle").in("item_id", ownedCircleIds));
    await run(client.from("circle_notes").delete().in("circle_id", ownedCircleIds));
    await run(client.from("circle_members").delete().in("circle_id", ownedCircleIds));
    await run(client.from("circles").delete().in("id", ownedCircleIds));
  }
}
