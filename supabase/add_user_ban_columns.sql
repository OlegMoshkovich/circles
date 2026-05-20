-- Adds ban-state columns to user_profiles.
-- A non-null banned_at means the user is banned; the app routes them to a locked
-- profile screen with only sign-out available. Set via valmia /admin/moderation.

alter table public.user_profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create index if not exists user_profiles_banned_at_idx
  on public.user_profiles (banned_at)
  where banned_at is not null;
