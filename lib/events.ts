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
 *   "Thu, Jun 4 2026", "Jun 4", "Mar29", "Tue, Mar 29", "26 Aug 2026",
 *   "31.03.2026", ...
 * with times like "10:00 AM", "9 PM", "14:30", or words like "Evening".
 */
const NAMED_HOURS: Record<string, number> = {
  morning: 9,
  midday: 12,
  noon: 12,
  afternoon: 15,
  evening: 18,
  night: 21,
};

function resolveYear(rawYear: string | undefined, now: Date): { year: number; hadYear: boolean } {
  if (!rawYear) return { year: now.getFullYear(), hadYear: false };
  const parsedYear = parseInt(rawYear, 10);
  return {
    year: rawYear.length === 2 ? 2000 + parsedYear : parsedYear,
    hadYear: true,
  };
}

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
  } else {
    const namedHour = NAMED_HOURS[cleanedTime.toLowerCase()];
    if (namedHour != null) hour = namedHour;
  }

  function finish(year: number, monthIdx: number, day: number, hadYear: boolean): number {
    const eventDate = new Date(year, monthIdx, day, hour, minute, 0, 0);
    if (Number.isNaN(eventDate.getTime())) return 0;
    // No explicit year and the inferred date is far in the past -> it's almost
    // certainly next year's occurrence (e.g. "Jan 5" seen in December).
    if (!hadYear && eventDate.getTime() < now.getTime() - 180 * 24 * 60 * 60 * 1000) {
      eventDate.setFullYear(now.getFullYear() + 1);
    }
    return eventDate.getTime();
  }

  // "26 Aug 2026" / "5 Sep 2026" / "26. Aug 2026" (imported / European labels)
  const dayMonthMatch = cleanedDate.match(
    /^(?:\w{3},\s*)?(\d{1,2})\.?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{2,4}))?$/
  );
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthIdx = MONTHS[dayMonthMatch[2].slice(0, 3).toLowerCase()];
    if (monthIdx != null && !Number.isNaN(day)) {
      const { year, hadYear } = resolveYear(dayMonthMatch[3], now);
      return finish(year, monthIdx, day, hadYear);
    }
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
      const { year, hadYear } = resolveYear(monthDay[3], now);
      return finish(year, monthIdx, day, hadYear);
    }
  }

  // "31.3.26" / "31.03.2026"
  const numericMatch = cleanedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
    const { year } = resolveYear(numericMatch[3], now);
    const eventDate = new Date(year, month, day, hour, minute, 0, 0);
    if (!Number.isNaN(eventDate.getTime())) return eventDate.getTime();
  }

  const parsed = Date.parse(cleanedTime ? `${cleanedDate} ${cleanedTime}` : cleanedDate);
  if (!Number.isNaN(parsed)) return parsed;
  // Named times like "Evening" make Date.parse fail — retry date only.
  const dateOnly = Date.parse(cleanedDate);
  return Number.isNaN(dateOnly) ? 0 : dateOnly;
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
