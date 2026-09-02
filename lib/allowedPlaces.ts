/** Circles and events we currently keep in the catalog. */
const KEEP_PLACE_NAMES = ["zurich", "zuerich", "zug", "baden", "san bernardino"] as const;
const WHOLE_WORD_PLACES = new Set(["zug", "baden"]);

function normalizePlaceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesKeptPlace(value: string | null | undefined): boolean {
  const text = normalizePlaceText(value ?? "");
  if (!text) return false;
  return KEEP_PLACE_NAMES.some((place) =>
    WHOLE_WORD_PLACES.has(place)
      ? new RegExp(`(^|[^a-z])${place}([^a-z]|$)`).test(text)
      : text.includes(place)
  );
}

function isCantonCircle(circle: {
  name?: string | null;
  category?: string | null;
}): boolean {
  if (normalizePlaceText(circle.category ?? "") === "canton") return true;
  return /^(canton of|kanton)\b/.test(normalizePlaceText(circle.name ?? ""));
}

export function isKeptCircle(circle: {
  name?: string | null;
  location?: string | null;
  category?: string | null;
}): boolean {
  if (isCantonCircle(circle)) return false;
  return matchesKeptPlace(circle.name) || matchesKeptPlace(circle.location);
}

export function isKeptEvent(event: {
  location?: string | null;
  circles?: { name?: string | null; category?: string | null } | null;
}): boolean {
  if (isCantonCircle({ name: event.circles?.name, category: event.circles?.category })) {
    return false;
  }
  return matchesKeptPlace(event.location) || matchesKeptPlace(event.circles?.name);
}
