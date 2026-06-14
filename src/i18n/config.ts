/**
 * Locale configuration for widgetly's i18n.
 *
 * MVP scope (2025-Q3 launch): English (default), Spanish, French.
 *   21 other locales are wired in the messaging infra (the
 *   translation script, COUNTRY_TO_LOCALE, etc.) but NOT exposed to
 *   users yet. Re-adding a locale is a 3-line change here plus a
 *   new src/i18n/messages/<code>.json (just `cp en.json <code>.json`).
 *
 * Source of truth for:
 *   - The list of supported locales (3 total for MVP — en + es + fr)
 *   - Native + English display names for the language picker
 *   - Script direction (LTR vs RTL — none of the MVP locales is RTL)
 *   - The geographic fallback map (cf-ipcountry → locale)
 *   - Helpers for validating / normalizing locale codes
 *
 * All other i18n modules (proxy, request config, API route) import
 * from this file so the locale list stays in one place.
 */

export const DEFAULT_LOCALE = "en" as const;

export type LocaleCode = "en" | "es" | "fr";

export type LocaleDirection = "ltr" | "rtl";

export type LocaleMeta = {
  code: LocaleCode;
  /** Native endonym (e.g. "Español", "Français"). */
  nativeName: string;
  /** English name for fallbacks / metadata. */
  englishName: string;
  dir: LocaleDirection;
  /** Short label for the picker chip (2-3 chars). */
  shortLabel: string;
};

export const LOCALES: readonly LocaleMeta[] = [
  { code: "en", nativeName: "English",   englishName: "English", dir: "ltr", shortLabel: "EN" },
  { code: "es", nativeName: "Español",   englishName: "Spanish", dir: "ltr", shortLabel: "ES" },
  { code: "fr", nativeName: "Français",  englishName: "French",  dir: "ltr", shortLabel: "FR" },
];

export const SUPPORTED_LOCALES: readonly LocaleCode[] = LOCALES.map((l) => l.code);
export const RTL_LOCALES: readonly LocaleCode[] = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isSupportedLocale(code: string): code is LocaleCode {
  return LOCALE_SET.has(code);
}

export function getLocaleMeta(code: LocaleCode): LocaleMeta {
  // Defensive: fallback to en if an unknown code is passed (shouldn't happen
  // because we narrow via isSupportedLocale, but keeps callers safe).
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]!;
}

export function getDirection(code: LocaleCode): LocaleDirection {
  return getLocaleMeta(code).dir;
}

/**
 * Cloudflare `cf-ipcountry` → locale map. MVP scope: en/es/fr.
 * Users in non-mapped countries fall through to `en` (or the
 * next-stronger signal: `Accept-Language`).
 *
 * To add a locale post-MVP: add the country codes here AND add the
 * locale to the LOCALES array above AND add a messages JSON file.
 */
export const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  // Spanish (Spain + 12 Latin American countries)
  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es",
  CL: "es", VE: "es", UY: "es", PY: "es", BO: "es", EC: "es", CR: "es",
  // French (France + 3 neighbours)
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
};

/** Cookie names. Centralized so the middleware, API, and picker agree. */
export const COOKIE_LOCALE = "wly_locale";
export const COOKIE_ANON = "wly_anon";
