-- Stores Expo push tokens per device so the send-push edge function can deliver
-- remote notifications to a user's devices. A user may have several (phone +
-- tablet, reinstall, etc.), so the unique key is the token itself, and we upsert
-- on it — re-registering simply re-points the token at the current user.
--
-- Clerk auth: user_id holds the Clerk user id as TEXT (e.g. "user_2abc..."), so
-- RLS is scoped via public.requesting_user_id() (defined in fix_clerk_insert_rls.sql),
-- NOT auth.uid(). Tokens are sensitive, so SELECT is restricted to the owner — the
-- edge function reads them with the service-role key, which bypasses RLS.

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  expo_push_token text not null unique,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own" on public.device_tokens
  for select
  using (user_id = public.requesting_user_id());

drop policy if exists "device_tokens_insert_own" on public.device_tokens;
create policy "device_tokens_insert_own" on public.device_tokens
  for insert
  with check (user_id = public.requesting_user_id());

drop policy if exists "device_tokens_update_own" on public.device_tokens;
create policy "device_tokens_update_own" on public.device_tokens
  for update
  using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

drop policy if exists "device_tokens_delete_own" on public.device_tokens;
create policy "device_tokens_delete_own" on public.device_tokens
  for delete
  using (user_id = public.requesting_user_id());
