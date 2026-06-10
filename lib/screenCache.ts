/**
 * Tiny in-memory stale-while-revalidate cache for screen data.
 *
 * Screens fetch on every focus; without this, each tab switch shows a
 * spinner until the network round-trips complete. With it, the last
 * snapshot renders instantly and the fetch runs silently in the background.
 * Memory-only by design: cleared on app restart, so there is no staleness
 * across sessions and no serialization cost.
 */
const cache = new Map<string, unknown>();

export function getCachedScreenData<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCachedScreenData<T>(key: string, data: T): void {
  cache.set(key, data);
}

/** Drop all snapshots for a user (e.g. on sign-out). */
export function clearCachedScreenData(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
