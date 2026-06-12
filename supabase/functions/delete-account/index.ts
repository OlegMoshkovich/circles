/**
 * Permanently delete the calling user's account in BOTH systems:
 *   1. all of their data in Supabase (via the service role, bypassing RLS), and
 *   2. their Clerk user (via the Clerk Backend API).
 *
 * Doing this server-side makes deletion reliable and atomic-ish: it does not
 * depend on the Clerk "allow users to delete their account" client setting, and
 * a Supabase RLS quirk can't leave the account half-deleted (data gone but the
 * Clerk login still alive, or vice-versa).
 *
 * The caller is identified from their Clerk "supabase" JWT (sent as the
 * Authorization bearer token), which Clerk signs with the Supabase JWT secret --
 * so a user can only ever delete themselves.
 *
 * Setup (Supabase Dashboard + CLI):
 * 1. Deploy: `supabase functions deploy delete-account`
 * 2. Set secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *    - CLERK_SECRET_KEY      (Clerk Dashboard → API Keys → Secret key, sk_...)
 *    - SUPABASE_JWT_SECRET   (Supabase → Project Settings → API → JWT Secret;
 *                             the same value pasted into Clerk's Supabase JWT template)
 *    SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 * 3. config.toml already sets `verify_jwt = false` for this function so the
 *    gateway forwards the Clerk token unmodified; we verify it ourselves below.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Verify a Clerk-issued (Supabase template) HS256 JWT and return its `sub`. */
async function verifyAndGetSub(token: string, secret: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`),
  );
  if (!valid) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp) return null;
  return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET")?.trim();
  const clerkSecret = Deno.env.get("CLERK_SECRET_KEY")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!jwtSecret || !clerkSecret || !supabaseUrl || !serviceKey) {
    return json(
      { error: "Function is not configured. Set CLERK_SECRET_KEY and SUPABASE_JWT_SECRET." },
      503,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json({ error: "missing bearer token" }, 401);

  const userId = await verifyAndGetSub(token, jwtSecret);
  if (!userId) return json({ error: "invalid or expired token" }, 401);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ---- 1. Delete all of the user's Supabase data -----------------------------
  try {
    const { data: ownedCircles, error: ownedCirclesError } = await db
      .from("circles").select("id").eq("owner_id", userId);
    if (ownedCirclesError) throw ownedCirclesError;
    const ownedCircleIds = (ownedCircles ?? []).map((c: { id: string }) => c.id);

    const { data: createdEvents, error: createdEventsError } = await db
      .from("events").select("id").eq("created_by", userId);
    if (createdEventsError) throw createdEventsError;

    let ownedCircleEventIds: string[] = [];
    if (ownedCircleIds.length > 0) {
      const { data, error } = await db.from("events").select("id").in("circle_id", ownedCircleIds);
      if (error) throw error;
      ownedCircleEventIds = (data ?? []).map((e: { id: string }) => e.id);
    }
    const allEventIds = Array.from(
      new Set([...(createdEvents ?? []).map((e: { id: string }) => e.id), ...ownedCircleEventIds]),
    );

    // deno-lint-ignore no-explicit-any
    const run = async (q: any) => {
      const { error } = await q;
      if (error) throw error;
    };

    await run(db.from("notifications").delete().eq("user_id", userId));
    await run(db.from("dismissed_items").delete().eq("user_id", userId));
    await run(db.from("event_rsvps").delete().eq("user_id", userId));
    await run(db.from("event_notes").delete().eq("user_id", userId));
    await run(db.from("circle_notes").delete().eq("user_id", userId));
    await run(db.from("circle_members").delete().eq("user_id", userId));
    await run(db.from("user_profiles").delete().eq("user_id", userId));

    if (allEventIds.length > 0) {
      await run(db.from("dismissed_items").delete().eq("item_type", "event").in("item_id", allEventIds));
      await run(db.from("event_rsvps").delete().in("event_id", allEventIds));
      await run(db.from("event_notes").delete().in("event_id", allEventIds));
      await run(db.from("events").delete().in("id", allEventIds));
    }
    if (ownedCircleIds.length > 0) {
      await run(db.from("dismissed_items").delete().eq("item_type", "circle").in("item_id", ownedCircleIds));
      await run(db.from("circle_notes").delete().in("circle_id", ownedCircleIds));
      await run(db.from("circle_members").delete().in("circle_id", ownedCircleIds));
      await run(db.from("circles").delete().in("id", ownedCircleIds));
    }
  } catch (e) {
    console.error("delete-account: supabase deletion failed", e);
    return json({ error: "supabase_delete_failed", detail: String((e as Error)?.message ?? e) }, 500);
  }

  // ---- 2. Delete the Clerk user ---------------------------------------------
  // Done last so a data-deletion failure never orphans the login. Clerk returns
  // 404 if the user is already gone, which we treat as success (idempotent).
  const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${clerkSecret}` },
  });
  if (!clerkRes.ok && clerkRes.status !== 404) {
    const detail = await clerkRes.text().catch(() => "");
    console.error("delete-account: clerk deletion failed", clerkRes.status, detail);
    return json({ error: "clerk_delete_failed", status: clerkRes.status, detail }, 502);
  }

  return json({ ok: true });
});
