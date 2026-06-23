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
drop policy if exists "terms_acceptances_select_own" on public.terms_acceptances;
create policy "terms_acceptances_select_own"
  on public.terms_acceptances for select
  using (true);

drop policy if exists "terms_acceptances_insert" on public.terms_acceptances;
create policy "terms_acceptances_insert"
  on public.terms_acceptances for insert
  with check (true);

drop policy if exists "terms_acceptances_update_own" on public.terms_acceptances;
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

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (true);

drop policy if exists "user_blocks_insert" on public.user_blocks;
create policy "user_blocks_insert"
  on public.user_blocks for insert
  with check (true);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
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

drop policy if exists "content_reports_insert" on public.content_reports;
create policy "content_reports_insert"
  on public.content_reports for insert
  with check (true);

-- Prefer: only service role can read all reports. Until then, open read for dashboard exports (tighten in production).
drop policy if exists "content_reports_select" on public.content_reports;
create policy "content_reports_select"
  on public.content_reports for select
  using (true);

comment on table public.content_reports is
  'User-generated content flags. App Store: act within 24h — review pending rows, remove offending content, eject user if needed. Use Supabase Dashboard, Retool, or Edge Function + email alert on INSERT.';

-- ─── 4) Server-side word filter on ALL user-generated text (defence in depth) ───
-- Rejects inserts/updates containing obvious slurs so they cannot be saved even
-- by a modified client that skips the in-app check. This covers note BODIES as
-- well as event/circle TITLES & descriptions and profile bios — every free-text
-- field a user controls. Expand the blocklist for your locale, or replace with an
-- Edge Function backed by a real moderation API for production-grade coverage.

-- Shared predicate: true when `input` contains a blocked term after normalization
-- (lowercased, spacing/punctuation stripped, common leetspeak folded). Keep the
-- blocklist in sync with BLOCKED_TERMS in lib/contentModeration.ts.
create or replace function public.contains_objectionable(input text)
returns boolean
language plpgsql
immutable
as $$
declare
  bad text[] := array[
    'nigger', 'nigga', 'faggot', 'retard', 'kike',
    'spic', 'chink', 'wetback', 'tranny', 'cunt'
  ];
  needle text;
  normalized text;
begin
  if input is null or input = '' then
    return false;
  end if;
  normalized := lower(input);
  normalized := regexp_replace(normalized, '[[:space:]._\-*]+', '', 'g');
  normalized := translate(normalized, '01345@$', 'oieasas');

  foreach needle in array bad
  loop
    if needle is not null and needle <> '' and position(needle in normalized) > 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- Trigger: reject when any of the supplied text columns is objectionable. Each
-- per-table function below names the columns relevant to that table.
create or replace function public.reject_objectionable_note_content()
returns trigger language plpgsql as $$
begin
  if public.contains_objectionable(new.content) then
    raise exception 'Content violates community guidelines' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.reject_objectionable_event()
returns trigger language plpgsql as $$
begin
  if public.contains_objectionable(new.title)
     or public.contains_objectionable(new.description) then
    raise exception 'Content violates community guidelines' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.reject_objectionable_circle()
returns trigger language plpgsql as $$
begin
  if public.contains_objectionable(new.name)
     or public.contains_objectionable(new.description)
     or public.contains_objectionable(new.category) then
    raise exception 'Content violates community guidelines' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.reject_objectionable_profile()
returns trigger language plpgsql as $$
begin
  if public.contains_objectionable(new.display_name)
     or public.contains_objectionable(new.bio) then
    raise exception 'Content violates community guidelines' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Enforce on circle notes:
drop trigger if exists trg_circle_notes_filter on public.circle_notes;
create trigger trg_circle_notes_filter
  before insert or update of content on public.circle_notes
  for each row execute function public.reject_objectionable_note_content();

-- Enforce on event notes:
drop trigger if exists trg_event_notes_filter on public.event_notes;
create trigger trg_event_notes_filter
  before insert or update of content on public.event_notes
  for each row execute function public.reject_objectionable_note_content();

-- Enforce on event titles/descriptions:
drop trigger if exists trg_events_filter on public.events;
create trigger trg_events_filter
  before insert or update of title, description on public.events
  for each row execute function public.reject_objectionable_event();

-- Enforce on circle names/descriptions:
drop trigger if exists trg_circles_filter on public.circles;
create trigger trg_circles_filter
  before insert or update of name, description, category on public.circles
  for each row execute function public.reject_objectionable_circle();

-- Enforce on profile display names / bios:
drop trigger if exists trg_user_profiles_filter on public.user_profiles;
create trigger trg_user_profiles_filter
  before insert or update of display_name, bio on public.user_profiles
  for each row execute function public.reject_objectionable_profile();

comment on function public.contains_objectionable(text) is
  'DB-level blocklist filter shared by all UGC triggers. Keep in sync with lib/contentModeration.ts; replace with a moderation API via Edge Function for production-grade coverage.';

-- Optional: receive email when a report is filed — deploy Edge Function + Database Webhook:
--   supabase/functions/content-report-email/index.ts
--   supabase/config.toml (verify_jwt = false for that function)
--   Resend (RESEND_API_KEY) + secrets REPORT_NOTIFY_EMAIL, REPORT_WEBHOOK_SECRET; webhook URL + header x-webhook-secret.
