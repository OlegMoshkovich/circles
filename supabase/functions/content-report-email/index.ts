/**
 * Email you when a row is inserted into `content_reports`.
 *
 * Setup (Supabase Dashboard + CLI):
 * 1. Create a Resend API key: https://resend.com/api-keys
 * 2. Deploy: `supabase functions deploy content-report-email`
 * 3. Set secrets (Dashboard → Edge Functions → Secrets, or CLI):
 *    - RESEND_API_KEY
 *    - REPORT_NOTIFY_EMAIL   (your inbox)
 *    - REPORT_WEBHOOK_SECRET (random long string; must match webhook header below)
 *    - REPORT_EMAIL_FROM      (optional; default `Circles Reports <onboarding@resend.dev>`)
 * 4. Database → Webhooks → Create:
 *    - Table: public.content_reports, Events: INSERT
 *    - URL: https://<PROJECT_REF>.supabase.co/functions/v1/content-report-email
 *    - HTTP Headers: `x-webhook-secret` = same value as REPORT_WEBHOOK_SECRET
 *    - (Optional) add `Content-Type: application/json` if empty body issues
 *
 * Resend: with the default `onboarding@resend.dev` sender you can only email the
 * address on your Resend account until you verify a domain.
 */

const WEBHOOK_HEADER = "x-webhook-secret";

function formatReportEmail(record: Record<string, unknown>): { subject: string; text: string } {
  const lines = [
    `New content report`,
    ``,
    `id: ${String(record.id ?? "")}`,
    `created_at: ${String(record.created_at ?? "")}`,
    `reporter_user_id: ${String(record.reporter_user_id ?? "")}`,
    `target_type: ${String(record.target_type ?? "")}`,
    `target_id: ${String(record.target_id ?? "")}`,
    `reported_user_id: ${String(record.reported_user_id ?? "")}`,
    `reason: ${String(record.reason ?? "")}`,
    `details: ${String(record.details ?? "")}`,
    `status: ${String(record.status ?? "")}`,
  ];
  const target = String(record.target_type ?? "content");
  return {
    subject: `[Circles] Report: ${target}`,
    text: lines.join("\n"),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("REPORT_WEBHOOK_SECRET")?.trim();
  if (!expectedSecret) {
    return new Response(
      JSON.stringify({ error: "REPORT_WEBHOOK_SECRET is not configured on this function" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const provided = req.headers.get(WEBHOOK_HEADER)?.trim();
  if (provided !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const to = Deno.env.get("REPORT_NOTIFY_EMAIL")?.trim();
  const from =
    Deno.env.get("REPORT_EMAIL_FROM")?.trim() ||
    "Circles Reports <onboarding@resend.dev>";

  if (!resendKey || !to) {
    return new Response(
      JSON.stringify({
        error: "RESEND_API_KEY and REPORT_NOTIFY_EMAIL must be set on this function",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Supabase Database Webhook payload
  const payload = body as {
    type?: string;
    table?: string;
    record?: Record<string, unknown>;
  };

  const record = payload?.record;
  if (!record || typeof record.reporter_user_id !== "string") {
    return new Response(JSON.stringify({ error: "expected content_reports row in payload.record" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (payload.table != null && payload.table !== "content_reports") {
    return new Response(JSON.stringify({ error: "wrong table" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { subject, text } = formatReportEmail(record);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  const resBody = await res.text();
  if (!res.ok) {
    console.error("Resend error", res.status, resBody);
    return new Response(JSON.stringify({ error: "resend_failed", detail: resBody }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
