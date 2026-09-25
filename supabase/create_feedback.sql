-- User feedback submitted from the Places screen.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedback_message_not_blank check (char_length(btrim(message)) > 0),
  constraint feedback_message_length check (char_length(message) <= 4000)
);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select
  using (user_id = public.requesting_user_id());

grant select, insert on public.feedback to anon, authenticated;
