-- UGC / App Store safety baseline (EULA acceptance, reports, blocks)
-- Run in Supabase SQL Editor after reviewing policies for your auth model.
--
-- Your app uses Clerk + Supabase with permissive RLS on some tables (see create_event_notes.sql).
-- Tighten policies when you move admin actions to a service role or Edge Function.

-- ─── 1) Terms / EULA acceptance (prove user agreed; store version string you ship in-app) ───

create table if not exists public.terms_acceptances (
  user_id        text primary key,
  terms_version  text not null,
  accepted_at    timestamptz not null default now(),
  eula_version   text,
  constraint terms_acceptances_version_nonempty check (length(trim(terms_version)) > 0)
);

create index if not exists terms_acceptances_accepted_at_idx
  on public.terms_acceptances (accepted_at desc);

alter table public.terms_acceptances enable row level security;

-- Apps using anon key from the client: mirror your existing pattern; restrict when you use JWT claims.
create policy "terms_acceptances_select_own"
  on public.terms_acceptances for select
  using (true);

create policy "terms_acceptances_insert"
  on public.terms_acceptances for insert
  with check (true);

create policy "terms_acceptances_update_own"
  on public.terms_acceptances for update
  using (true)
  with check (true);

comment on table public.terms_acceptances is
  'Store acceptance of Terms/EULA including zero-tolerance for objectionable content and abusive users. Bump terms_version when legal text changes.';

-- ─── 2) User blocks (hide abusive users from reporter''s experience; filter in app queries) ───

create table if not exists public.user_blocks (
  id               uuid primary key default gen_random_uuid(),
  blocker_user_id  text not null,
  blocked_user_id  text not null,
  created_at       timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_user_id <> blocked_user_id),
  constraint user_blocks_unique unique (blocker_user_id, blocked_user_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_user_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_user_id);

alter table public.user_blocks enable row level security;

create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (true);

create policy "user_blocks_insert"
  on public.user_blocks for insert
  with check (true);

create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (true);

comment on table public.user_blocks is
  'Blocker hides blocked user from their feeds in the client by excluding blocked_user_id authors. Optionally notify developer on insert via Database Webhook.';

-- ─── 3) Content reports (flag objectionable UGC + optional user report) ───

create table if not exists public.content_reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_user_id   text not null,
  target_type        text not null,
  target_id          text not null,
  reported_user_id   text,
  reason             text not null,
  details            text,
  status             text not null default 'pending',
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  admin_notes        text,
  constraint content_reports_target_type_chk check (
    target_type in (
      'event_note',
      'circle_note',
      'event',
      'circle',
      'user_profile',
      'other'
    )
  ),
  constraint content_reports_status_chk check (
    status in ('pending', 'reviewed', 'action_taken', 'dismissed')
  )
);

create index if not exists content_reports_pending_idx
  on public.content_reports (status, created_at desc);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

create policy "content_reports_insert"
  on public.content_reports for insert
  with check (true);

-- Prefer: only service role can read all reports. Until then, open read for dashboard exports (tighten in production).
create policy "content_reports_select"
  on public.content_reports for select
  using (true);

comment on table public.content_reports is
  'User-generated content flags. App Store: act within 24h — review pending rows, remove offending content, eject user if needed. Use Supabase Dashboard, Retool, or Edge Function + email alert on INSERT.';

-- ─── 4) Optional: simple server-side word filter (expand list; or replace with Edge Function) ───
-- Reject inserts containing obvious slurs / spam markers. Adjust list for your locale.

create or replace function public.reject_objectionable_note_content()
returns trigger
language plpgsql
as $$
declare
  -- Add lowercase substrings to block (keep short; prefer Edge Function + external API for real moderation).
  bad text[] := array[]::text[];
  needle text;
begin
  foreach needle in array bad
  loop
    if needle is not null and needle <> '' and position(needle in lower(coalesce(new.content, ''))) > 0 then
      raise exception 'Content violates community guidelines' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

-- Uncomment to enforce on circle notes:
-- drop trigger if exists trg_circle_notes_filter on public.circle_notes;
-- create trigger trg_circle_notes_filter
--   before insert or update of content on public.circle_notes
--   for each row execute function public.reject_objectionable_note_content();

-- Uncomment to enforce on event notes:
-- drop trigger if exists trg_event_notes_filter on public.event_notes;
-- create trigger trg_event_notes_filter
--   before insert or update of content on public.event_notes
--   for each row execute function public.reject_objectionable_note_content();

comment on function public.reject_objectionable_note_content() is
  'Example DB-level filter; maintain a real blocklist or call a moderation API from an Edge Function instead.';

-- Optional: receive email when a report is filed — deploy Edge Function + Database Webhook:
--   supabase/functions/content-report-email/index.ts
--   supabase/config.toml (verify_jwt = false for that function)
--   Resend (RESEND_API_KEY) + secrets REPORT_NOTIFY_EMAIL, REPORT_WEBHOOK_SECRET; webhook URL + header x-webhook-secret.
