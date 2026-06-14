/**
 * next-intl routing config. Read by the next-intl middleware (see
 * `src/middleware.ts`) and by `next-intl/plugin` in `next.config.ts`.
 *
 * `localePrefix: 'always'` — every URL gets a `/<locale>/` prefix, including
 * the default English locale. This is the user's stated preference for
 * path-prefix routing; trades a slightly fatter URL for predictability.
 *
 * `localeDetection: true` — let next-intl handle the cookie + Accept-Language
 * detection (it manages its own `NEXT_LOCALE` cookie). Our middleware
 * layers `cf-ipcountry` on top for the geographic fallback.
 */
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./src/i18n/config";

export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
});
