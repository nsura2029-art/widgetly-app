/**
 * next-intl server-side config. Loads the message bundle for the current
 * request's locale and exposes `getLocale()` / `getTranslations()` to
 * server components and route handlers.
 *
 * This file is referenced by `next-intl/plugin` in `next.config.ts`.
 */
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isSupportedLocale, DEFAULT_LOCALE, type LocaleCode } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Next 16 / next-intl 4: requestLocale is a Promise<Locale | undefined>.
  const requested = await requestLocale;

  if (!requested || !isSupportedLocale(requested)) {
    // Defensive: the middleware should always send a valid locale, but
    // if a request slips through (e.g. a malformed internal redirect),
    // fall back to the default rather than 404 the whole page.
    return {
      locale: DEFAULT_LOCALE as LocaleCode,
      messages: (await import(`./messages/${DEFAULT_LOCALE}.json`)).default,
    };
  }

  let messages;
  try {
    messages = (await import(`./messages/${requested}.json`)).default;
  } catch (err) {
    // If a locale file is missing (shouldn't happen — we ship all 24),
    // fall back to the default English bundle rather than crash the build.
    console.error(
      `[i18n] missing messages for "${requested}", falling back to ${DEFAULT_LOCALE}`,
      err
    );
    messages = (await import(`./messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return {
    locale: requested,
    messages,
  };
});
