// Canonical share links + messages for events and circles.
//
// These are HTTPS "universal links". When the ValMia app is installed AND the
// valmia.ch domain is verified for deep linking (see the infra checklist below),
// tapping one opens the app directly on the matching screen. When the app is not
// installed, the same URL opens the website, which should offer the app download.
//
// INFRA REQUIRED for the "opens in the app" behaviour (cannot be done in app code):
//   • iOS  — host https://valmia.ch/.well-known/apple-app-site-association listing
//            the app's <TeamID>.<bundleId> with paths ["/event/*", "/circle/*"].
//   • Android — host https://valmia.ch/.well-known/assetlinks.json with the app's
//            package name + signing SHA-256.
//   • A web page at /event/:id, /circle/:id and /app that shows the content and
//            links to the App Store / Play Store when the app isn't installed.

export const SHARE_BASE_URL = "https://valmia.ch";
/** "Get the app" landing page. Point this at your store links / smart banner. */
export const APP_DOWNLOAD_URL = "https://valmia.ch/app";

export function eventShareUrl(id: string): string {
  return `${SHARE_BASE_URL}/event/${id}`;
}

export function circleShareUrl(id: string): string {
  return `${SHARE_BASE_URL}/circle/${id}`;
}

type EventShareInput = {
  id: string;
  title: string;
  dateLabel?: string | null;
  timeLabel?: string | null;
  location?: string | null;
  circleName?: string | null;
  description?: string | null;
  /** Localized "Circles" label (t.nav.circles). */
  circlesLabel: string;
};

export function buildEventShareMessage(e: EventShareInput): { url: string; message: string } {
  const url = eventShareUrl(e.id);
  const dateTime = [e.dateLabel, e.timeLabel].filter(Boolean).join(" · ");
  const lines: (string | null)[] = [
    e.title,
    dateTime || null,
    e.location || null,
    e.circleName ? `${e.circlesLabel}: ${e.circleName}` : null,
    e.description?.trim() ? e.description.trim() : null,
    "",
    `Open in ValMia: ${url}`,
    `Don't have the app yet? Get ValMia: ${APP_DOWNLOAD_URL}`,
  ];
  return { url, message: lines.filter((l) => l !== null).join("\n") };
}

type CircleShareInput = {
  id: string;
  name: string;
  description?: string | null;
};

export function buildCircleShareMessage(c: CircleShareInput): { url: string; message: string } {
  const url = circleShareUrl(c.id);
  const lines: (string | null)[] = [
    c.name,
    c.description?.trim() ? c.description.trim() : null,
    "",
    `Open in ValMia: ${url}`,
    `Don't have the app yet? Get ValMia: ${APP_DOWNLOAD_URL}`,
  ];
  return { url, message: lines.filter((l) => l !== null).join("\n") };
}
