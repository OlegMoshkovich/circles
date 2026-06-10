import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Server-side aggregates for note counts / latest activity, with a
 * client-side fallback so the app keeps working until
 * supabase/perf_activity_aggregates.sql has been applied.
 *
 * The fallback replicates the previous behavior (download the raw rows and
 * aggregate in JS); once the RPCs exist the payload shrinks to one row per
 * event/circle instead of one row per note.
 */

// PGRST202: function not found in the PostgREST schema cache.
// 42883: undefined_function (raw Postgres error).
function isMissingFunctionError(error: { code?: string } | null): boolean {
  return !!error && (error.code === "PGRST202" || error.code === "42883");
}

export type EventNoteStats = {
  /** Total notes per event (the user's own notes included). */
  noteCountMap: Record<string, number>;
  /** Timestamp (ms) of the latest note per event written by someone else. */
  latestOtherNoteMap: Record<string, number>;
};

let eventStatsRpcMissing = false;

export async function fetchEventNoteStats(
  eventIds: string[],
  excludeUserId?: string | null,
  client: SupabaseClient = supabase
): Promise<EventNoteStats> {
  const noteCountMap: Record<string, number> = {};
  const latestOtherNoteMap: Record<string, number> = {};
  if (eventIds.length === 0) return { noteCountMap, latestOtherNoteMap };

  if (!eventStatsRpcMissing) {
    const { data, error } = await client.rpc("event_note_stats", {
      p_event_ids: eventIds,
      p_exclude_user: excludeUserId ?? null,
    });
    if (!error && data) {
      for (const row of data as any[]) {
        noteCountMap[row.event_id] = Number(row.note_count) || 0;
        if (row.latest_other_note_at) {
          latestOtherNoteMap[row.event_id] = new Date(row.latest_other_note_at).getTime();
        }
      }
      return { noteCountMap, latestOtherNoteMap };
    }
    if (isMissingFunctionError(error)) eventStatsRpcMissing = true;
  }

  // Fallback: scan the raw note rows and aggregate client-side.
  const { data } = await client
    .from("event_notes")
    .select("event_id, created_at, user_id")
    .in("event_id", eventIds);
  for (const row of (data ?? []) as any[]) {
    noteCountMap[row.event_id] = (noteCountMap[row.event_id] ?? 0) + 1;
    if (excludeUserId && row.user_id === excludeUserId) continue;
    const t = new Date(row.created_at).getTime();
    if (!latestOtherNoteMap[row.event_id] || t > latestOtherNoteMap[row.event_id]) {
      latestOtherNoteMap[row.event_id] = t;
    }
  }
  return { noteCountMap, latestOtherNoteMap };
}

let circleActivityRpcMissing = false;

/** Latest activity timestamp (ms) per circle, excluding the user's own actions. */
export async function fetchCircleLatestActivity(
  excludeUserId?: string | null,
  client: SupabaseClient = supabase
): Promise<Record<string, number>> {
  const map: Record<string, number> = {};

  if (!circleActivityRpcMissing) {
    const { data, error } = await client.rpc("circle_latest_activity", {
      p_exclude_user: excludeUserId ?? null,
    });
    if (!error && data) {
      for (const row of data as any[]) {
        if (row.latest_activity_at) {
          map[row.circle_id] = new Date(row.latest_activity_at).getTime();
        }
      }
      return map;
    }
    if (isMissingFunctionError(error)) circleActivityRpcMissing = true;
  }

  // Fallback: bounded scans of recent notes/events aggregated client-side.
  const [notesRes, eventsRes] = await Promise.all([
    client
      .from("circle_notes")
      .select("circle_id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(500),
    client
      .from("events")
      .select("circle_id, created_at, created_by")
      .not("circle_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  for (const row of (notesRes.data ?? []) as any[]) {
    if (excludeUserId && row.user_id === excludeUserId) continue;
    const t = new Date(row.created_at).getTime();
    if (!map[row.circle_id] || t > map[row.circle_id]) map[row.circle_id] = t;
  }
  for (const row of (eventsRes.data ?? []) as any[]) {
    if (excludeUserId && row.created_by === excludeUserId) continue;
    const t = new Date(row.created_at).getTime();
    if (!map[row.circle_id] || t > map[row.circle_id]) map[row.circle_id] = t;
  }
  return map;
}
