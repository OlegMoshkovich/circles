-- Adds an optional external URL to events (e.g. ticketing page, livestream link,
-- or the organizer's event website). Shown on the event detail screen when set.

alter table public.events
  add column if not exists event_url text;
