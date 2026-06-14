-- ⚠️  DESTRUCTIVE: deletes ALL rows from every app table.
-- Run in Supabase → SQL Editor. Does NOT delete Clerk users.
-- Use only on dev/staging, or when you want a full data reset.

begin;

delete from public.notifications;
delete from public.dismissed_items;
delete from public.event_rsvps;
delete from public.event_notes;
delete from public.circle_notes;
delete from public.circle_members;
delete from public.content_reports;
delete from public.user_blocks;
delete from public.terms_acceptances;
delete from public.events;
delete from public.circles;
delete from public.user_profiles;

commit;

-- Verify (should all be 0):
-- select
--   (select count(*) from notifications) as notifications,
--   (select count(*) from dismissed_items) as dismissed_items,
--   (select count(*) from event_rsvps) as event_rsvps,
--   (select count(*) from event_notes) as event_notes,
--   (select count(*) from circle_notes) as circle_notes,
--   (select count(*) from circle_members) as circle_members,
--   (select count(*) from content_reports) as content_reports,
--   (select count(*) from user_blocks) as user_blocks,
--   (select count(*) from terms_acceptances) as terms_acceptances,
--   (select count(*) from events) as events,
--   (select count(*) from circles) as circles,
--   (select count(*) from user_profiles) as user_profiles;
