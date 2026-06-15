/**
 * Cookie consent: shared types.
 *
 * The consent state is a small JSON object persisted in localStorage
 * under the key `wly_consent`. Three categories of cookies are
 * tracked. Essential is always true (and not user-controllable). The
 * other two default to false and require explicit opt-in.
 *
 * Bump `CONSENT_VERSION` whenever the categories, defaults, or the
 * semantics of an existing field change in a way that would make a
 * previously-given consent invalid. The store compares the persisted
 * `consentVersion` against this constant; mismatch forces a re-prompt.
 *
 * Region is captured at the moment consent is given (server-side
 * from cf-ipcountry, falling back to locale) so the audit trail
 * records where the user was when they made the choice.
 */

export type ConsentCategory = "essential" | "analytics" | "advertising";

export type ConsentMethod = "accept_all" | "reject_all" | "custom" | "default";

export type ConsentRegion = "gdpr" | "ccpa" | "other";

export type ConsentState = {
  /** Always true. The schema is shaped this way so future categories
   *  with the same always-on semantics can use the same type. */
  essential: true;
  analytics: boolean;
  advertising: boolean;
  /** Schema version of the consent record. Re-prompt when the
   *  store's CONSENT_VERSION differs from this. */
  consentVersion: string;
  /** ISO-8601 timestamp of when the user gave (or declined) consent. */
  timestamp: string;
  /** How the consent was arrived at. */
  method: ConsentMethod;
  /** Jurisdiction at the time of consent. Used for audit + debugging. */
  region: ConsentRegion;
};

/** Shape of the empty / not-yet-decided state. Equivalent to a fresh
 *  visitor who hasn't seen the banner yet. */
export const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  advertising: false,
  consentVersion: "",
  timestamp: "",
  method: "default",
  region: "other",
};

/** Current schema version. Bump on material change. */
export const CONSENT_VERSION = "1.0";

/** localStorage key. Namespaced with `wly_` to avoid collisions with
 *  any other widget the page might load. */
export const CONSENT_STORAGE_KEY = "wly_consent";

/** Categories that can be toggled by the user. (Essential is not
 *  in this list — it's always on.) */
export const USER_TOGGLEABLE: ReadonlyArray<Exclude<ConsentCategory, "essential">> = [
  "analytics",
  "advertising",
] as const;
