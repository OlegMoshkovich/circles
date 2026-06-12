// Event date/time helpers.
//
// Events store their schedule as free-text `date_label` + `time_label` (there is
// no normalized timestamp column), so determining whether an event is in the
// past means parsing those labels. This logic used to live inside EventsScreen;
// it now lives here so every surface that lists events (the Events tab, a
// circle's Events tab, ...) hides past events the same way.

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse an event's `date_label` + `time_label` into a millisecond timestamp,
 * or 0 when the labels can't be understood (callers treat 0 as "unknown" and
 * never hide such events).
 *
 * Handles the formats the app produces and tolerates user-entered ones:
 *   "Thu, Jun 4 2026", "Jun 4", "Mar29", "Tue, Mar 29", "31.03.2026", ...
 * with times like "10:00 AM", "9 PM", "14:30".
 */
export function parseEventDateTime(dateLabel: string, timeLabel: string): number {
  const now = new Date();

  const cleanedDate = dateLabel.trim().replace(/\s*[•·]\s*.*/, "");
  const cleanedTime = timeLabel.trim();

  let hour = 0;
  let minute = 0;
  const ampmMatch = cleanedTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    hour = parseInt(ampmMatch[1], 10);
    minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const ampm = (ampmMatch[3] ?? "").toUpperCase();
    if (ampm === "AM" && hour === 12) hour = 0;
    if (ampm === "PM" && hour < 12) hour += 12;
  }

  // "Mar 29" / "Tue, Mar 29" / "Jun 4 2026"
  const monthDayMatch = cleanedDate.match(/^(?:\w{3},\s*)?([A-Za-z]{3})\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
  // "Mar23" / "Mar23 2026" / "Tue, Mar23"
  const compactMonthDayMatch = cleanedDate.match(/^(?:\w{3},\s*)?([A-Za-z]{3})\s?(\d{1,2})(?:\s+(\d{2,4}))?$/);
  const monthDay = monthDayMatch ?? compactMonthDayMatch;
  if (monthDay) {
    const monthIdx = MONTHS[monthDay[1].toLowerCase()];
    const day = parseInt(monthDay[2], 10);
    if (monthIdx != null && !Number.isNaN(day)) {
      const rawYear = monthDay[3];
      const parsedYear = rawYear ? parseInt(rawYear, 10) : now.getFullYear();
      const year = rawYear ? (rawYear.length === 2 ? 2000 + parsedYear : parsedYear) : parsedYear;
      const eventDate = new Date(year, monthIdx, day, hour, minute, 0, 0);
      // No explicit year and the inferred date is far in the past -> it's almost
      // certainly next year's occurrence (e.g. "Jan 5" seen in December).
      if (!rawYear && eventDate.getTime() < now.getTime() - 180 * 24 * 60 * 60 * 1000) {
        eventDate.setFullYear(now.getFullYear() + 1);
      }
      return eventDate.getTime();
    }
  }

  // "31.3.26" / "31.03.2026"
  const numericMatch = cleanedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
    const yy = parseInt(numericMatch[3], 10);
    const year = numericMatch[3].length === 2 ? 2000 + yy : yy;
    const eventDate = new Date(year, month, day, hour, minute, 0, 0);
    if (!Number.isNaN(eventDate.getTime())) return eventDate.getTime();
  }

  const parsed = Date.parse(`${cleanedDate} ${cleanedTime}`.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

type EventLike = {
  date_label: string;
  time_label: string;
  duration_minutes?: number | null;
};

/**
 * Whether an event has already finished. An event counts as past once its end
 * (start + duration, or just start when there's no duration) is before now.
 * Events whose date can't be parsed are never considered past, so a bad label
 * never silently hides an event.
 */
export function isPastEvent(event: EventLike): boolean {
  const start = parseEventDateTime(event.date_label, event.time_label);
  if (!(start > 0)) return false;
  const end = start + (event.duration_minutes ?? 0) * 60 * 1000;
  return end < Date.now();
}
