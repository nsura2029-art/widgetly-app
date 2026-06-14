/**
 * Locale configuration for widgetly's i18n.
 *
 * Source of truth for:
 *   - The list of supported locales (24 total — en + 23 others)
 *   - Native + English display names for the language picker
 *   - Script direction (LTR vs RTL — only `ar` is RTL today)
 *   - The geographic fallback map (cf-ipcountry → locale)
 *   - Helpers for validating / normalizing locale codes
 *
 * All other i18n modules (middleware, request config, API route) import
 * from this file so the locale list stays in one place.
 */

export const DEFAULT_LOCALE = "en" as const;

export type LocaleCode =
  | "en" | "id" | "ms" | "da" | "de" | "es" | "fr" | "it"
  | "nl" | "no" | "pl" | "pt" | "sv" | "vi" | "tr" | "ru"
  | "uk" | "ar" | "hi" | "th" | "ko" | "ja" | "zh-CN" | "zh-TW";

export type LocaleDirection = "ltr" | "rtl";

export type LocaleMeta = {
  code: LocaleCode;
  /** Native endonym (e.g. "Español", "日本語"). */
  nativeName: string;
  /** English name for fallbacks / metadata. */
  englishName: string;
  dir: LocaleDirection;
  /** Short label for the picker chip (2-3 chars). */
  shortLabel: string;
};

export const LOCALES: readonly LocaleMeta[] = [
  { code: "en",    nativeName: "English",          englishName: "English",                 dir: "ltr", shortLabel: "EN" },
  { code: "id",    nativeName: "Bahasa Indonesia", englishName: "Indonesian",              dir: "ltr", shortLabel: "ID" },
  { code: "ms",    nativeName: "Bahasa Malaysia",  englishName: "Malay",                   dir: "ltr", shortLabel: "MS" },
  { code: "da",    nativeName: "Dansk",            englishName: "Danish",                  dir: "ltr", shortLabel: "DA" },
  { code: "de",    nativeName: "Deutsch",          englishName: "German",                  dir: "ltr", shortLabel: "DE" },
  { code: "es",    nativeName: "Español",          englishName: "Spanish",                 dir: "ltr", shortLabel: "ES" },
  { code: "fr",    nativeName: "Français",         englishName: "French",                  dir: "ltr", shortLabel: "FR" },
  { code: "it",    nativeName: "Italiano",         englishName: "Italian",                 dir: "ltr", shortLabel: "IT" },
  { code: "nl",    nativeName: "Nederlands",       englishName: "Dutch",                   dir: "ltr", shortLabel: "NL" },
  { code: "no",    nativeName: "Norsk (bokmål)",   englishName: "Norwegian Bokmål",        dir: "ltr", shortLabel: "NO" },
  { code: "pl",    nativeName: "Polski",           englishName: "Polish",                  dir: "ltr", shortLabel: "PL" },
  { code: "pt",    nativeName: "Português",        englishName: "Portuguese",              dir: "ltr", shortLabel: "PT" },
  { code: "sv",    nativeName: "Svenska",          englishName: "Swedish",                 dir: "ltr", shortLabel: "SV" },
  { code: "vi",    nativeName: "Tiếng Việt",       englishName: "Vietnamese",              dir: "ltr", shortLabel: "VI" },
  { code: "tr",    nativeName: "Türkçe",           englishName: "Turkish",                 dir: "ltr", shortLabel: "TR" },
  { code: "ru",    nativeName: "Русский",          englishName: "Russian",                 dir: "ltr", shortLabel: "RU" },
  { code: "uk",    nativeName: "Українська",       englishName: "Ukrainian",               dir: "ltr", shortLabel: "UK" },
  { code: "ar",    nativeName: "العربية",          englishName: "Arabic",                  dir: "rtl", shortLabel: "AR" },
  { code: "hi",    nativeName: "हिन्दी",            englishName: "Hindi",                   dir: "ltr", shortLabel: "HI" },
  { code: "th",    nativeName: "ภาษาไทย",           englishName: "Thai",                    dir: "ltr", shortLabel: "TH" },
  { code: "ko",    nativeName: "한국어",            englishName: "Korean",                  dir: "ltr", shortLabel: "KO" },
  { code: "ja",    nativeName: "日本語",            englishName: "Japanese",                dir: "ltr", shortLabel: "JA" },
  { code: "zh-CN", nativeName: "简体中文",         englishName: "Simplified Chinese",      dir: "ltr", shortLabel: "ZH" },
  { code: "zh-TW", nativeName: "繁體中文",         englishName: "Traditional Chinese",     dir: "ltr", shortLabel: "TW" },
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
 * Cloudflare `cf-ipcountry` → locale map. Conservative defaults; users in
 * non-mapped countries fall through to `en` (or the next-stronger signal:
 * `Accept-Language`).
 */
export const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  // Indonesian / Malay
  ID: "id", MY: "ms",
  // Nordic
  DK: "da", SE: "sv", NO: "no", FI: "no",
  // German
  DE: "de", AT: "de", CH: "de",
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es",
  CL: "es", VE: "es", UY: "es", PY: "es", BO: "es", EC: "es", CR: "es",
  // French
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
  // Italian
  IT: "it", SM: "it",
  // Dutch
  NL: "nl", SR: "nl",
  // Polish
  PL: "pl",
  // Portuguese
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  // Vietnamese
  VN: "vi",
  // Turkish
  TR: "tr", CY: "tr",
  // Cyrillic
  RU: "ru", BY: "ru", KZ: "ru",
  UA: "uk",
  // Arabic (conservative — Saudi, UAE, Egypt, Levant, Maghreb)
  SA: "ar", AE: "ar", EG: "ar", KW: "ar", OM: "ar", QA: "ar",
  BH: "ar", JO: "ar", LB: "ar", SY: "ar", IQ: "ar", YE: "ar",
  MA: "ar", TN: "ar", DZ: "ar", LY: "ar", SD: "ar",
  // Hindi
  IN: "hi", NP: "hi",
  // Thai
  TH: "th",
  // Korean
  KR: "ko", KP: "ko",
  // Japanese
  JP: "ja",
  // Chinese
  CN: "zh-CN", SG: "zh-CN", HK: "zh-TW", TW: "zh-TW", MO: "zh-TW",
};

/** Cookie names. Centralized so the middleware, API, and picker agree. */
export const COOKIE_LOCALE = "wly_locale";
export const COOKIE_ANON = "wly_anon";
