"use client";

/**
 * Local-only "recently visited" history.
 *
 * Stores up to MAX_VISITS entries in localStorage under the key
 * `wly_history`. Each entry is a most-recent-first list of
 * `{ slug, name, iconKey, accent, visitedAt }` records.
 *
 * Important properties:
 *
 * 1. **Local only.** This data never leaves the user's device. It
 *    is intentionally NOT a tracking mechanism — we don't have a
 *    server endpoint, we don't sync, we don't aggregate. See
 *    docs/CONSENT.md ("Option A — Local-only") for the legal
 *    rationale.
 *
 * 2. **Edge-runtime safe in the read path.** Module-level code
 *    doesn't touch `localStorage`; it only does so inside
 *    functions that run on the client.
 *
 * 3. **Defensive against bad data.** `readHistory()` returns an
 *    empty array if the stored JSON is missing, malformed, or
 *    doesn't match the expected shape. No throw.
 *
 * 4. **Dedupe on write.** Recording the same slug twice in a row
 *    just moves it to the top of the list and updates the
 *    timestamp; it doesn't create a duplicate.
 *
 * 5. **Cross-tab live.** `recordVisit` dispatches a
 *    `wly:history` event on `window` and `subscribeHistory`
 *    listens for it, so opening a tool in one tab updates the
 *    "Recently visited" strip in another tab within the same
 *    browser.
 *
 * 6. **Storage graceful-fail.** If `localStorage` is unavailable
 *    (private mode, quota, disabled), all functions are no-ops.
 *    The UI degrades to "no history".
 *
 * The slug dimension is currently a category slug (`pdf`, `image`,
 * etc.). When individual tool routes ship (e.g.
 * `/tools/pdf/merge`), extend `HistoryItem` to include an
 * optional `toolSlug` and render accordingly.
 */

import { useEffect, useSyncExternalStore } from "react";
import { TOOLS_CATEGORIES, type ToolsCategory } from "./tools-categories";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Max number of items we remember. Bigger lists = more localStorage
 *  bytes, but 12 covers a normal browsing session. */
export const MAX_VISITS = 12;

/** Storage key, namespaced to avoid collisions. */
export const HISTORY_STORAGE_KEY = "wly_history";

/** Custom-event name used for cross-tab / cross-component
 *  notifications. */
export const HISTORY_EVENT = "wly:history";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type HistoryAccent = "primary" | "secondary" | "accent";

export type HistoryItem = {
  /** Category slug, e.g. "pdf". Stable identifier. */
  slug: string;
  /** Display name, snapshotted at record time so a future rename
   *  doesn't make old records unreadable. */
  name: string;
  /** Lucide icon name. Same caveat as `name`. */
  iconKey: string;
  /** Brand accent key. Same caveat. */
  accent: HistoryAccent;
  /** ms-since-epoch of the visit. */
  visitedAt: number;
};

/* -------------------------------------------------------------------------- */
/*  Storage layer (no React)                                                  */
/* -------------------------------------------------------------------------- */

function safeParse(raw: string | null): HistoryItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Coarse shape check; drop entries that don't have the
    // minimum required fields.
    return parsed.filter(
      (x): x is HistoryItem =>
        !!x &&
        typeof (x as HistoryItem).slug === "string" &&
        typeof (x as HistoryItem).name === "string" &&
        typeof (x as HistoryItem).iconKey === "string" &&
        typeof (x as HistoryItem).accent === "string" &&
        typeof (x as HistoryItem).visitedAt === "number"
    );
  } catch {
    return [];
  }
}

function safeWrite(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    // Notify other components / tabs in the same browser.
    window.dispatchEvent(new CustomEvent(HISTORY_EVENT, { detail: items }));
  } catch {
    // localStorage full, disabled, or private mode — degrade.
  }
}

function readRaw(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParse(window.localStorage.getItem(HISTORY_STORAGE_KEY));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Snapshot cache                                                            */
/* -------------------------------------------------------------------------- */

/**
 * React's `useSyncExternalStore` requires `getSnapshot` to return
 * the *same reference* between calls when the underlying data
 * hasn't changed. Without a cache, every call to `getSnapshot`
 * parses `localStorage` and returns a fresh array, which React
 * interprets as a constant change → infinite re-render loop.
 *
 * The cache is keyed by the raw localStorage string. When the
 * string changes (write in this tab, or `storage` event from
 * another tab), the cache is invalidated and the next call
 * reparses.
 */

let snapshotCache: HistoryItem[] | null = null;
let snapshotCacheKey: string | undefined = undefined;
const SENTINEL = "__wly_history_sentinel__";

function getCachedSnapshot(): HistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return EMPTY_HISTORY;
  }
  const key = raw ?? SENTINEL;
  if (key === snapshotCacheKey && snapshotCache) {
    return snapshotCache;
  }
  snapshotCacheKey = key;
  snapshotCache = safeParse(raw);
  return snapshotCache;
}

function invalidateSnapshotCache(): void {
  snapshotCacheKey = undefined;
  snapshotCache = null;
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Append a category visit. If the same slug is already in the list,
 * it moves to the front and the timestamp updates (no duplicates).
 * List is capped at MAX_VISITS.
 */
export function recordCategoryVisit(slug: ToolsCategory["slug"]): void {
  if (typeof window === "undefined") return;
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return; // unknown slug; refuse to write garbage

  const now = Date.now();
  const existing = readRaw();
  const next: HistoryItem[] = [
    {
      slug: cat.slug,
      name: cat.name,
      iconKey: cat.icon,
      accent: cat.accent,
      visitedAt: now,
    },
    ...existing.filter((i) => i.slug !== slug),
  ].slice(0, MAX_VISITS);

  safeWrite(next);
}

/**
 * Read the current history list. Returns `[]` outside the browser
 * (SSR, edge runtime, test setup).
 */
export function readHistory(): HistoryItem[] {
  return readRaw();
}

/**
 * Clear the entire history. Notifies subscribers.
 */
export function clearHistory(): void {
  safeWrite([]);
  invalidateSnapshotCache();
}

/**
 * Remove a single entry by slug.
 */
export function removeFromHistory(slug: string): void {
  const next = readRaw().filter((i) => i.slug !== slug);
  safeWrite(next);
  invalidateSnapshotCache();
}

/* -------------------------------------------------------------------------- */
/*  React integration                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Low-level: subscribe to history changes. Used internally by
 * `useHistory()` and exposed in case non-React code wants to react.
 *
 * Returns an unsubscribe function.
 */
export function subscribeHistory(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => {
    invalidateSnapshotCache();
    listener();
  };
  window.addEventListener(HISTORY_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HISTORY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * React hook: returns the live history list. The list updates
 * whenever `recordCategoryVisit`, `clearHistory`, or another tab's
 * `storage` event fires.
 *
 * Returns `[]` during SSR / pre-hydration.
 */
export function useHistory(): HistoryItem[] {
  const subscribe = (cb: () => void) => subscribeHistory(cb);
  const getSnapshot = () => getCachedSnapshot();
  const getServerSnapshot = () => EMPTY_HISTORY;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const EMPTY_HISTORY: HistoryItem[] = Object.freeze([]) as unknown as HistoryItem[];

/**
 * Imperative side effect: call `recordCategoryVisit(slug)` exactly
 * once when the component mounts. Use as a child of any server
 * component that lives at `/tools/[category]/page.tsx`.
 *
 * Example:
 *   <RecordCategoryVisit slug="pdf" />
 */
export function RecordCategoryVisit({ slug }: { slug: ToolsCategory["slug"] }) {
  useEffect(() => {
    recordCategoryVisit(slug);
  }, [slug]);
  return null;
}
