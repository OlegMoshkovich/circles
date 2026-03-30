-- Run this in your Supabase SQL editor to enable circle notes

create table if not exists circle_notes (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references circles(id) on delete cascade,
  user_id     text not null,
  display_name text,
  content     text not null,
  created_at  timestamptz not null default now()
);

alter table circle_notes enable row level security;

-- Anyone can read notes for circles they can see
create policy "circle_notes_select" on circle_notes
  for select using (true);

-- Only circle members can insert notes
create policy "circle_notes_insert" on circle_notes
  for insert with check (
    exists (
      select 1 from circle_members
      where circle_members.circle_id = circle_notes.circle_id
        and circle_members.user_id   = circle_notes.user_id
        and circle_members.status    = 'active'
    )
  );

-- Authors can delete their own notes
create policy "circle_notes_delete" on circle_notes
  for delete using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
