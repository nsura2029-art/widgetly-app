/**
 * Region detection for consent defaulting.
 *
 * On the server we read Cloudflare's `cf-ipcountry` header, which is
 * free and populated by the edge for every request. That gives us a
 * reliable 2-letter country code without an extra GeoIP dependency.
 *
 * On the client (e.g. when the banner re-renders after navigation
 * and the SSR header isn't available), we fall back to the locale —
 * not perfect (Spanish in Mexico isn't GDPR-protected, Spanish in
 * Spain is), but better than nothing and it keeps the banner's
 * default toggles sensible for the language the user is reading.
 *
 * GDPR region set is the EU-27 + EEA-3 (Iceland, Liechtenstein,
 * Norway) + UK. CCPA region is California; we also include Virginia,
 * Colorado, Connecticut, Utah, and Texas, which have similar but
 * slightly different opt-out regimes.
 */

import type { ConsentRegion } from "./types";

const EU = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
];

const EEA = ["IS", "LI", "NO"];

const UK = ["GB"];

// CCPA + the other US state privacy laws as of 2025. We treat the
// whole US as "ccpa" because most of these laws grant rights
// similar to CCPA's (right to know, delete, opt out of sale).
const US_PRIVACY_STATES = [
  "US-CA", // CCPA / CPRA
  "US-VA", // VCDPA
  "US-CO", // CPA
  "US-CT", // CTDPA
  "US-UT", // UCPA
  "US-TX", // TDPSA
  "US-OR", // OCPA
  "US-MT", // MCDPA
  "US-IA", // Iowa
  "US-IN", // Indiana
  "US-NJ", // New Jersey
  "US-NH", // New Hampshire
  "US-KY", // Kentucky
  "US-MN", // Minnesota
  "US-MD", // Maryland
  "US-RI", // Rhode Island
  "US-TN", // Tennessee
  "US-DE", // Delaware
];

const GDPR = new Set([...EU, ...EEA, ...UK]);
const CCPA = new Set(US_PRIVACY_STATES);

/**
 * Returns the consent region for a Cloudflare country code.
 * `cf-ipcountry` is a 2-letter ISO code for most countries, but
 * Cloudflare uses "XX" for unknown, "T1" for Tor, and "US-state"
 * (e.g. "US-CA") for US states. Accepts either form.
 */
export function regionFromCountry(country: string | null | undefined): ConsentRegion {
  if (!country) return "other";
  const c = country.toUpperCase();
  if (c === "XX" || c === "T1") return "other";
  if (CCPA.has(c)) return "ccpa";
  if (GDPR.has(c)) return "gdpr";
  return "other";
}

/**
 * Fallback when we don't have a country code: use the locale to
 * guess. Conservative — we only return "gdpr" for locales whose
 * primary region is unambiguously inside the EU/EEA/UK. Spanish
 * ("es") is excluded because the user could be in LATAM.
 */
export function regionFromLocale(locale: string | null | undefined): ConsentRegion {
  if (!locale) return "other";
  // Locale is usually "en-US" or "fr-FR"; base lang is "en", "fr", "de".
  // We map by base lang for known EU languages.
  const base = locale.toLowerCase().split(/[-_]/)[0] ?? "";
  // "en" is intentionally absent — too ambiguous (US, GB, AU, IN...).
  const EU_LANGS = new Set([
    "fr",
    "de",
    "it",
    "es",
    "pt",
    "nl",
    "pl",
    "cs",
    "sk",
    "hu",
    "ro",
    "bg",
    "el",
    "sv",
    "da",
    "fi",
    "et",
    "lv",
    "lt",
    "sl",
    "hr",
    "ga",
    "mt",
    "is",
    "no",
  ]);
  // Spanish ("es") is borderline — used in Spain (GDPR) and
  // Mexico/Argentina (not). We don't have a clean signal from the
  // base lang alone, so return "other" and let the country-code
  // path settle it for users in Spain.
  if (EU_LANGS.has(base) && base !== "es") return "gdpr";
  return "other";
}
