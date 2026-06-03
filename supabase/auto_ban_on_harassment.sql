-- Auto-ban on harassment reports.
--
-- When a content_report with reason = 'Harassment or abuse' is filed against a
-- user, immediately ban that user (set user_profiles.banned_at / ban_reason).
-- The banned user is then routed to the BannedScreen, where they can submit a
-- contact/appeal (which files a 'ban_appeal' content_report — see add_ban_appeal.sql).
--
-- Runs as a SECURITY DEFINER trigger so it can update the *reported* user's row
-- (RLS only lets a user edit their own profile, so this can't be done client-side).
--
-- Reason string MUST match RESTRICTING_REPORT_REASON in lib/contentReports.ts
-- ('Harassment or abuse').
--
-- Run in the Supabase SQL editor (project ref ndmekncybayacusocbrp).

create or replace function public.auto_ban_on_harassment_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reason = 'Harassment or abuse' and new.reported_user_id is not null then
    update public.user_profiles
       set banned_at  = coalesce(banned_at, now()),
           ban_reason = coalesce(ban_reason, 'Harassment or abuse')
     where user_id = new.reported_user_id
       and banned_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_ban_on_harassment on public.content_reports;
create trigger trg_auto_ban_on_harassment
  after insert on public.content_reports
  for each row
  execute function public.auto_ban_on_harassment_report();

comment on function public.auto_ban_on_harassment_report() is
  'Auto-bans the reported user when a harassment content_report is filed. Existing bans are left unchanged.';

-- One-time backfill: apply the ban to anyone who ALREADY has a non-dismissed
-- harassment report (the trigger above only fires on new inserts). Safe to
-- re-run — it only bans currently-unbanned users.
update public.user_profiles up
   set banned_at  = now(),
       ban_reason = 'Harassment or abuse'
 where up.banned_at is null
   and exists (
     select 1 from public.content_reports cr
      where cr.reported_user_id = up.user_id
        and cr.reason = 'Harassment or abuse'
        and cr.status in ('pending', 'reviewed', 'action_taken')
   );
