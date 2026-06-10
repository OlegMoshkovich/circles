-- Performance: aggregate note counts and "latest activity" on the server.
-- Run this in your Supabase SQL editor.
--
-- Before these functions existed, the app downloaded every note row (and up
-- to 500 circle_notes + 500 events rows) on each feed refresh just to count
-- and find max(created_at) client-side. These RPCs return the aggregates
-- directly. The client (lib/activityStats.ts) falls back to the old scans
-- automatically if the functions are missing, so this can be applied any time.

-- Per-event note stats: total note count plus the most recent note that was
-- NOT written by p_exclude_user (drives the "new activity" indicator).
create or replace function event_note_stats(
  p_event_ids uuid[],
  p_exclude_user text default null
)
returns table (
  event_id uuid,
  note_count bigint,
  latest_other_note_at timestamptz
)
language sql
stable
as $$
  select
    n.event_id,
    count(*)::bigint as note_count,
    max(n.created_at) filter (
      where p_exclude_user is null or n.user_id is distinct from p_exclude_user
    ) as latest_other_note_at
  from event_notes n
  where n.event_id = any(p_event_ids)
  group by n.event_id;
$$;

-- Latest activity (note or event creation) per circle, excluding the
-- caller's own actions. Rows with no actor (events.created_by is null)
-- count as activity, matching the previous client-side behavior.
create or replace function circle_latest_activity(
  p_exclude_user text default null
)
returns table (
  circle_id uuid,
  latest_activity_at timestamptz
)
language sql
stable
as $$
  select t.circle_id, max(t.created_at) as latest_activity_at
  from (
    select cn.circle_id, cn.created_at, cn.user_id as actor
    from circle_notes cn
    union all
    select e.circle_id, e.created_at, e.created_by as actor
    from events e
    where e.circle_id is not null
  ) t
  where p_exclude_user is null or t.actor is distinct from p_exclude_user
  group by t.circle_id;
$$;

grant execute on function event_note_stats(uuid[], text) to anon, authenticated;
grant execute on function circle_latest_activity(text) to anon, authenticated;
