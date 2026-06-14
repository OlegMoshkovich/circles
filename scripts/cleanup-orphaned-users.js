#!/usr/bin/env node
/**
 * Remove Supabase rows for Clerk users that no longer exist.
 *
 * Use when accounts were deleted in the Clerk Dashboard but their data was
 * left behind in Supabase (ghost profiles, invite list duplicates, etc.).
 *
 * Requires (env or .env in project root):
 *   CLERK_SECRET_KEY
 *   SUPABASE_URL  (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/cleanup-orphaned-users.js              # dry-run (default)
 *   node scripts/cleanup-orphaned-users.js --execute    # actually delete
 *   node scripts/cleanup-orphaned-users.js --user-ids user_abc,user_def
 *   node scripts/cleanup-orphaned-users.js --display-name "by ValMia"
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// ─── env ───────────────────────────────────────────────────────────────────

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY?.trim();
const SUPABASE_URL = (
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
)?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const args = process.argv.slice(2);
const EXECUTE = args.includes("--execute");

function readFlag(name) {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  return undefined;
}

const userIdsArg = readFlag("--user-ids");
const displayNameArg = readFlag("--display-name");

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(`Usage: node scripts/cleanup-orphaned-users.js [--execute] [--user-ids=id1,id2] [--display-name="Name"]`);
  process.exit(msg ? 1 : 0);
}

if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  usage(
    "Set CLERK_SECRET_KEY, SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL), and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── Clerk: all live user ids ───────────────────────────────────────────────

async function fetchAllClerkUserIds() {
  const ids = new Set();
  const limit = 500;
  let offset = 0;

  for (;;) {
    const url = `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Clerk API ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    const batch = Array.isArray(body) ? body : body.data ?? [];
    for (const u of batch) {
      if (u?.id) ids.add(u.id);
    }
    if (batch.length < limit) break;
    offset += limit;
  }

  return ids;
}

// ─── Supabase: collect every referenced user id ─────────────────────────────

async function distinctColumn(table, column) {
  const { data, error } = await db.from(table).select(column);
  if (error) {
    if (error.code === "42P01") return []; // table missing
    throw new Error(`${table}.${column}: ${error.message}`);
  }
  const out = new Set();
  for (const row of data ?? []) {
    const v = row[column];
    if (typeof v === "string" && v.startsWith("user_")) out.add(v);
  }
  return [...out];
}

async function collectSupabaseUserIds() {
  const tables = [
    ["user_profiles", "user_id"],
    ["circle_members", "user_id"],
    ["notifications", "user_id"],
    ["dismissed_items", "user_id"],
    ["event_rsvps", "user_id"],
    ["event_notes", "user_id"],
    ["circle_notes", "user_id"],
    ["circles", "owner_id"],
    ["events", "created_by"],
    ["terms_acceptances", "user_id"],
    ["user_blocks", "blocker_user_id"],
    ["user_blocks", "blocked_user_id"],
    ["content_reports", "reporter_user_id"],
    ["content_reports", "reported_user_id"],
  ];

  const ids = new Set();
  for (const [table, column] of tables) {
    for (const id of await distinctColumn(table, column)) ids.add(id);
  }

  // Circle invite notifications may reference invitee in JSON
  const { data: inviteNotifs, error: notifErr } = await db
    .from("notifications")
    .select("data")
    .eq("type", "circle_invitation");
  if (!notifErr) {
    for (const n of inviteNotifs ?? []) {
      const invitee = n.data?.invitee_id;
      if (typeof invitee === "string" && invitee.startsWith("user_")) ids.add(invitee);
    }
  }

  return ids;
}

async function userIdsByDisplayName(name) {
  const { data, error } = await db
    .from("user_profiles")
    .select("user_id, display_name")
    .ilike("display_name", name.trim());
  if (error) throw new Error(`user_profiles lookup: ${error.message}`);
  return (data ?? []).map((r) => r.user_id).filter(Boolean);
}

// ─── Delete one user (same order as delete-account edge function) ───────────

async function deleteUserData(userId) {
  const run = async (label, query) => {
    const { error, count } = await query;
    if (error) throw new Error(`${label}: ${error.message}`);
    if (count) log.push(`${label}: ${count}`);
  };

  const log = [];

  const { data: ownedCircles, error: ocErr } = await db
    .from("circles")
    .select("id")
    .eq("owner_id", userId);
  if (ocErr) throw ocErr;
  const ownedCircleIds = (ownedCircles ?? []).map((c) => c.id);

  const { data: createdEvents, error: ceErr } = await db
    .from("events")
    .select("id")
    .eq("created_by", userId);
  if (ceErr) throw ceErr;

  let ownedCircleEventIds = [];
  if (ownedCircleIds.length > 0) {
    const { data, error } = await db.from("events").select("id").in("circle_id", ownedCircleIds);
    if (error) throw error;
    ownedCircleEventIds = (data ?? []).map((e) => e.id);
  }

  const allEventIds = [
    ...new Set([
      ...(createdEvents ?? []).map((e) => e.id),
      ...ownedCircleEventIds,
    ]),
  ];

  await run(
    "notifications (user_id)",
    db.from("notifications").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "notifications (invitee in data)",
    db
      .from("notifications")
      .delete({ count: "exact" })
      .eq("type", "circle_invitation")
      .filter("data->>invitee_id", "eq", userId)
  );
  await run(
    "dismissed_items",
    db.from("dismissed_items").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "event_rsvps",
    db.from("event_rsvps").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "event_notes",
    db.from("event_notes").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "circle_notes",
    db.from("circle_notes").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "circle_members",
    db.from("circle_members").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "terms_acceptances",
    db.from("terms_acceptances").delete({ count: "exact" }).eq("user_id", userId)
  );
  await run(
    "user_blocks (blocker)",
    db.from("user_blocks").delete({ count: "exact" }).eq("blocker_user_id", userId)
  );
  await run(
    "user_blocks (blocked)",
    db.from("user_blocks").delete({ count: "exact" }).eq("blocked_user_id", userId)
  );
  await run(
    "content_reports (reporter)",
    db.from("content_reports").delete({ count: "exact" }).eq("reporter_user_id", userId)
  );
  await run(
    "content_reports (reported)",
    db.from("content_reports").delete({ count: "exact" }).eq("reported_user_id", userId)
  );
  await run(
    "user_profiles",
    db.from("user_profiles").delete({ count: "exact" }).eq("user_id", userId)
  );

  if (allEventIds.length > 0) {
    await run(
      "dismissed_items (owned events)",
      db
        .from("dismissed_items")
        .delete({ count: "exact" })
        .eq("item_type", "event")
        .in("item_id", allEventIds)
    );
    await run(
      "event_rsvps (owned events)",
      db.from("event_rsvps").delete({ count: "exact" }).in("event_id", allEventIds)
    );
    await run(
      "event_notes (owned events)",
      db.from("event_notes").delete({ count: "exact" }).in("event_id", allEventIds)
    );
    await run(
      "events",
      db.from("events").delete({ count: "exact" }).in("id", allEventIds)
    );
  }

  if (ownedCircleIds.length > 0) {
    await run(
      "dismissed_items (owned circles)",
      db
        .from("dismissed_items")
        .delete({ count: "exact" })
        .eq("item_type", "circle")
        .in("item_id", ownedCircleIds)
    );
    await run(
      "circle_notes (owned circles)",
      db.from("circle_notes").delete({ count: "exact" }).in("circle_id", ownedCircleIds)
    );
    await run(
      "circle_members (owned circles)",
      db.from("circle_members").delete({ count: "exact" }).in("circle_id", ownedCircleIds)
    );
    await run(
      "circles",
      db.from("circles").delete({ count: "exact" }).in("id", ownedCircleIds)
    );
  }

  return log;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(EXECUTE ? "Mode: EXECUTE (destructive)\n" : "Mode: dry-run (pass --execute to delete)\n");

  let targetIds;

  if (userIdsArg) {
    targetIds = userIdsArg.split(",").map((s) => s.trim()).filter(Boolean);
    console.log(`Targeting ${targetIds.length} user id(s) from --user-ids\n`);
  } else if (displayNameArg) {
    targetIds = await userIdsByDisplayName(displayNameArg);
    console.log(`Found ${targetIds.length} profile(s) matching display name "${displayNameArg}"\n`);
  } else {
    console.log("Fetching Clerk users…");
    const clerkIds = await fetchAllClerkUserIds();
    console.log(`  ${clerkIds.size} live Clerk account(s)`);

    console.log("Scanning Supabase for user references…");
    const supabaseIds = await collectSupabaseUserIds();
    console.log(`  ${supabaseIds.size} distinct user id(s) in Supabase\n`);

    targetIds = [...supabaseIds].filter((id) => !clerkIds.has(id));
    console.log(`Orphaned (in Supabase, not in Clerk): ${targetIds.length}\n`);
  }

  if (targetIds.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  // Show profile names when available
  const { data: profiles } = await db
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", targetIds);
  const nameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p.display_name ?? "(no name)"])
  );

  for (const id of targetIds) {
    console.log(`• ${id}  ${nameById[id] ?? "(no profile row)"}`);
  }
  console.log();

  if (!EXECUTE) {
    console.log("Dry-run complete. Re-run with --execute to delete the rows above.");
    return;
  }

  for (const userId of targetIds) {
    console.log(`Deleting ${userId}…`);
    try {
      const lines = await deleteUserData(userId);
      const summary = lines.filter(Boolean);
      if (summary.length) console.log("  " + summary.join("\n  "));
      else console.log("  (no matching rows)");
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
      process.exitCode = 1;
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
