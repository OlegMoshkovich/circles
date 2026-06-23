/**
 * Send an Expo push notification when a row is inserted into `notifications`.
 *
 * Every in-app notification (circle/event invite, join request, approval, ...)
 * already inserts a `notifications` row. This function mirrors that row to the
 * recipient's devices so it also appears on the lock screen / tray when the app
 * is closed.
 *
 * Setup (Supabase Dashboard + CLI):
 * 1. Apply the device_tokens migration: supabase/add_device_tokens.sql
 * 2. Deploy: `supabase functions deploy send-push`
 * 3. Set secrets (Dashboard → Edge Functions → Secrets, or CLI):
 *    - PUSH_WEBHOOK_SECRET   (random long string; must match the webhook header below)
 *    - EXPO_ACCESS_TOKEN     (optional; only if you enabled Expo "enhanced push security")
 *    (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
 * 4. Database → Webhooks → Create:
 *    - Table: public.notifications, Events: INSERT
 *    - URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-push
 *    - HTTP Headers: `x-webhook-secret` = same value as PUSH_WEBHOOK_SECRET
 *
 * Note: Expo push is delivered via APNs/FCM, so it only reaches real builds
 * (TestFlight / production / dev build) on physical devices — not Expo Go or
 * simulators.
 */

const WEBHOOK_HEADER = "x-webhook-secret";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type NotificationRow = {
  id?: string;
  user_id?: string;
  type?: string;
  title?: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

type ExpoMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound: "default";
};

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const expectedSecret = Deno.env.get("PUSH_WEBHOOK_SECRET")?.trim();
  if (!expectedSecret) {
    return json(503, { error: "PUSH_WEBHOOK_SECRET is not configured on this function" });
  }
  if (req.headers.get(WEBHOOK_HEADER)?.trim() !== expectedSecret) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json(503, { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }

  const payload = body as { table?: string; record?: NotificationRow };
  if (payload.table != null && payload.table !== "notifications") {
    return json(400, { error: "wrong table" });
  }
  const record = payload?.record;
  const userId = record?.user_id;
  if (!record || typeof userId !== "string") {
    return json(400, { error: "expected notifications row in payload.record" });
  }

  // Look up the recipient's device tokens (service role bypasses RLS).
  const rest = `${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${encodeURIComponent(
    userId
  )}&select=expo_push_token`;
  const tokensRes = await fetch(rest, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!tokensRes.ok) {
    const detail = await tokensRes.text();
    console.error("device_tokens fetch failed", tokensRes.status, detail);
    return json(502, { error: "token_lookup_failed", detail });
  }
  const rows = (await tokensRes.json()) as { expo_push_token: string }[];
  const tokens = rows.map((r) => r.expo_push_token).filter(Boolean);
  if (tokens.length === 0) return json(200, { ok: true, sent: 0, reason: "no_tokens" });

  const messages: ExpoMessage[] = tokens.map((to) => ({
    to,
    title: record.title ?? "ValMia",
    body: record.body ?? undefined,
    data: { ...(record.data ?? {}), type: record.type ?? null, notification_id: record.id ?? null },
    sound: "default",
  }));

  const expoHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN")?.trim();
  if (expoToken) expoHeaders.Authorization = `Bearer ${expoToken}`;

  const pushRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: expoHeaders,
    body: JSON.stringify(messages),
  });
  const pushBody = await pushRes.text();
  if (!pushRes.ok) {
    console.error("expo push failed", pushRes.status, pushBody);
    return json(502, { error: "expo_push_failed", detail: pushBody });
  }

  // Prune tokens Expo reports as no longer registered (uninstall / new device).
  try {
    const tickets = (JSON.parse(pushBody)?.data ?? []) as {
      status?: string;
      details?: { error?: string };
    }[];
    const dead = tickets
      .map((t, i) => ({ t, token: tokens[i] }))
      .filter(({ t }) => t?.status === "error" && t?.details?.error === "DeviceNotRegistered")
      .map(({ token }) => token);
    if (dead.length > 0) {
      const inList = dead.map((t) => `"${t}"`).join(",");
      await fetch(
        `${supabaseUrl}/rest/v1/device_tokens?expo_push_token=in.(${encodeURIComponent(inList)})`,
        {
          method: "DELETE",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        }
      );
    }
  } catch (e) {
    console.error("token prune skipped", String(e));
  }

  return json(200, { ok: true, sent: messages.length });
});
