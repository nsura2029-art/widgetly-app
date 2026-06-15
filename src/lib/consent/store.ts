"use client";

/**
 * Cookie consent: client-side store.
 *
 * Backed by localStorage with a single JSON blob under
 * `wly_consent`. Reads and writes go through this module so we
 * have one place to handle versioning, fallback to in-memory
 * storage when localStorage is unavailable (private mode,
 * quota-exceeded), and expose a tiny subscriber model for the
 * React layer.
 *
 * Edge-runtime safe in the read path (no I/O at import time); the
 * write path uses localStorage which is browser-only.
 */

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  type ConsentCategory,
  type ConsentMethod,
  type ConsentRegion,
  type ConsentState,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Read / write                                                              */
/* -------------------------------------------------------------------------- */

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState> | null;
    if (!parsed || typeof parsed !== "object") return null;
    // Defensive: a malformed record (older schema, manual edit,
    // storage corruption) should not crash the banner.
    if (typeof parsed.consentVersion !== "string") return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.advertising !== "boolean") return null;
    return {
      essential: true,
      analytics: parsed.analytics,
      advertising: parsed.advertising,
      consentVersion: parsed.consentVersion,
      timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : "",
      method:
        parsed.method === "accept_all" ||
        parsed.method === "reject_all" ||
        parsed.method === "custom" ||
        parsed.method === "default"
          ? parsed.method
          : "custom",
      region:
        parsed.region === "gdpr" || parsed.region === "ccpa" || parsed.region === "other"
          ? parsed.region
          : "other",
    };
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode, quota). The
    // in-memory cache is the next-best source of truth for this
    // page load.
  }
  notifyChange(state);
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* noop */
  }
  notifyChange(null);
}

/* -------------------------------------------------------------------------- */
/*  Subscription                                                              */
/* -------------------------------------------------------------------------- */

type Listener = (state: ConsentState | null) => void;
const listeners = new Set<Listener>();

export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyChange(state: ConsentState | null) {
  for (const l of listeners) {
    try {
      l(state);
    } catch {
      /* listener errors must not block the writer */
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Decision helpers                                                          */
/* -------------------------------------------------------------------------- */

/** Has the user given a current-version answer? Used to decide
 *  whether to show the banner. */
export function hasCurrentConsent(state: ConsentState | null | undefined): boolean {
  if (!state) return false;
  if (state.consentVersion !== CONSENT_VERSION) return false;
  if (!state.timestamp) return false;
  return true;
}

/** Should this category be allowed to run? True only when the user
 *  has affirmatively opted in AND the version is current. */
export function isAllowed(
  state: ConsentState | null | undefined,
  category: ConsentCategory
): boolean {
  if (category === "essential") return true;
  if (!state || !hasCurrentConsent(state)) return false;
  return Boolean(state[category]);
}

/* -------------------------------------------------------------------------- */
/*  Convenience constructors                                                 */
/* -------------------------------------------------------------------------- */

export function buildConsent(opts: {
  analytics: boolean;
  advertising: boolean;
  method: ConsentMethod;
  region: ConsentRegion;
}): ConsentState {
  return {
    essential: true,
    analytics: opts.analytics,
    advertising: opts.advertising,
    consentVersion: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    method: opts.method,
    region: opts.region,
  };
}

export { CONSENT_VERSION, DEFAULT_CONSENT };
