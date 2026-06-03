-- Ban-appeal contact form (BannedScreen) — stores the user's appeal on their
-- profile record, in addition to filing a row in content_reports so it appears
-- in the moderation dashboard's report queue.
--
-- Run in the Supabase SQL editor (project ref ndmekncybayacusocbrp).
--
-- NOTE: The contact form ALSO inserts into public.content_reports
-- (reason = 'ban_appeal', target_type/target_id/reported_user_id = the banned
-- user). That table already exists with an open INSERT policy, so the report
-- queue works even before this migration is applied. These columns add the same
-- info onto the user's own record for convenience in the dashboard.

alter table public.user_profiles
  add column if not exists appeal_message      text,
  add column if not exists appeal_contact      text,
  add column if not exists appeal_submitted_at timestamptz;

create index if not exists user_profiles_appeal_submitted_idx
  on public.user_profiles (appeal_submitted_at desc)
  where appeal_submitted_at is not null;

comment on column public.user_profiles.appeal_message is
  'Latest ban-appeal message submitted by the user from the banned screen.';
comment on column public.user_profiles.appeal_contact is
  'Optional contact email the user provided with their ban appeal.';
comment on column public.user_profiles.appeal_submitted_at is
  'When the user last submitted a ban appeal (null = never).';
