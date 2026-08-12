// Share links for events and circles.
//
// We use the valmia:// custom scheme so "Open in ValMia" launches the app when
// it is installed. HTTPS links (https://valmia.ch/event/:id) only open the app
// after the website hosts apple-app-site-association — that file is not on
// valmia.ch yet, so universal links currently fall through to the website.
//
// Recipients without the app should use APP_DOWNLOAD_URL (App Store).

export const APP_SCHEME = "valmia";
export const SHARE_BASE_URL = "https://valmia.ch";
/** App Store listing (opens in the user's local storefront). */
export const APP_DOWNLOAD_URL = "https://apps.apple.com/app/valmia/id6762593097";

export function eventShareUrl(id: string): string {
  return `${APP_SCHEME}://event/${id}`;
}

export function circleShareUrl(id: string): string {
  return `${APP_SCHEME}://circle/${id}`;
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
