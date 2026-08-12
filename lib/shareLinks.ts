// Share links for events and circles.
//
// Use HTTPS URLs in shared text so messengers (WhatsApp, Telegram, etc.) make the
// link tappable. Custom schemes (valmia://) work in Notes/Mail but stay plain text
// in WhatsApp. With apple-app-site-association on valmia.ch, https links open the
// app when installed; otherwise the web page offers the App Store.
//
// On iOS, Share.share({ message, url }) makes WhatsApp append binary plist garbage
// after the text. Put the https link in message only — see shareMessage().

import { Share } from "react-native";

export const APP_SCHEME = "valmia";
export const SHARE_BASE_URL = "https://valmia.ch";
/** App Store listing (opens in the user's local storefront). */
export const APP_DOWNLOAD_URL = "https://apps.apple.com/app/valmia/id6762593097";

export function eventShareUrl(id: string): string {
  return `${SHARE_BASE_URL}/event/${id}`;
}

export function circleShareUrl(id: string): string {
  return `${SHARE_BASE_URL}/circle/${id}`;
}

export function eventDeepLink(id: string): string {
  return `${APP_SCHEME}://event/${id}`;
}

export function circleDeepLink(id: string): string {
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
    url,
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
    url,
  ];
  return { url, message: lines.filter((l) => l !== null).join("\n") };
}

/** Share text only — never pass `url` separately (breaks WhatsApp on iOS). */
export async function shareMessage(message: string, title?: string): Promise<void> {
  await Share.share(title ? { message, title } : { message });
}
