-- Clerk-aware RLS for the events domain (applied to Valmia-app / ndmekncybayacusocbrp).
--
-- This app authenticates with Clerk and stores the Clerk user id as TEXT
-- (owner_id / created_by / user_id = "user_2abc..."). auth.uid() casts the JWT
-- `sub` to uuid, which is NULL for a Clerk sub, so identity must be read as the
-- raw text `sub` claim. circles / circle_members were already scoped this way;
-- this script tightens the still-permissive events / event_rsvps / event_notes.
--
-- SELECT stays public (read access unchanged). INSERT only checks that the row
-- is stamped with the requesting user as creator/owner -- it does NOT check
-- circle ownership, so creating events in *other people's* circles still works.
-- Owners can still delete an event's child rsvps/notes via the OR-owner branch,
-- which the client relies on when cascading an event delete.

-- ── Identity helper (Clerk user id as text) ──────────────────────────────────
create or replace function public.requesting_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub',
    auth.jwt() ->> 'sub'
  );
$$;

-- ── events ───────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

drop policy if exists "Anyone can create events" on public.events;
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert
  with check (created_by = public.requesting_user_id());

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update
  using (created_by = public.requesting_user_id())
  with check (created_by = public.requesting_user_id());
-- delete_own_events (created_by = sub) was already correct; left in place.

-- ── event_rsvps (owner may clear all rsvps when deleting their event) ─────────
alter table public.event_rsvps enable row level security;

drop policy if exists "Anyone can RSVP" on public.event_rsvps;
drop policy if exists "event_rsvps_insert" on public.event_rsvps;
create policy "event_rsvps_insert" on public.event_rsvps
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists "Anyone can update their RSVP" on public.event_rsvps;
drop policy if exists "event_rsvps_update" on public.event_rsvps;
create policy "event_rsvps_update" on public.event_rsvps
  for update
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

drop policy if exists "Anyone can remove their RSVP" on public.event_rsvps;
drop policy if exists "delete_own_event_rsvps" on public.event_rsvps;
drop policy if exists "event_rsvps_delete" on public.event_rsvps;
create policy "event_rsvps_delete" on public.event_rsvps
  for delete
  using (
    user_id = public.requesting_user_id()
    or exists (
      select 1 from public.events e
      where e.id = event_rsvps.event_id
        and e.created_by = public.requesting_user_id()
    )
  );

-- ── event_notes (owner may clear all notes when deleting their event) ─────────
alter table public.event_notes enable row level security;

drop policy if exists "event_notes_insert" on public.event_notes;
create policy "event_notes_insert" on public.event_notes
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists "event_notes_delete" on public.event_notes;
drop policy if exists "delete_own_event_notes" on public.event_notes;
create policy "event_notes_delete" on public.event_notes
  for delete
  using (
    user_id = public.requesting_user_id()
    or exists (
      select 1 from public.events e
      where e.id = event_notes.event_id
        and e.created_by = public.requesting_user_id()
    )
  );

-- ── Sanity check: confirm the JWT identity arrives (run via an authenticated
--    client request, not the SQL editor):
--    select public.requesting_user_id();   -- should return your "user_..." id, not null
