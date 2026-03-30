-- Run this in your Supabase SQL editor to enable event notes

create table if not exists event_notes (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  user_id      text not null,
  display_name text,
  content      text not null,
  created_at   timestamptz not null default now()
);

alter table event_notes enable row level security;

create policy "event_notes_select" on event_notes
  for select using (true);

-- App uses Clerk auth (not Supabase Auth), auth.uid() is null — allow all inserts/deletes
create policy "event_notes_insert" on event_notes
  for insert with check (true);

create policy "event_notes_delete" on event_notes
  for delete using (true);
