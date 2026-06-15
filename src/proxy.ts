/**
 * Edge proxy: locale path-prefix routing + cookie persistence.
 *
 * Runs in the Cloudflare Worker (via @opennextjs/cloudflare), before the
 * request reaches the Next.js renderer. Responsibilities:
 *
 *   1. Run the next-intl middleware (preserved from the prior middleware.ts convention) -- next-intl still uses the term "middleware" internally, which:
 *      - 308-redirects unprefixed URLs (`/blog/...`) to the resolved
 *        locale prefix (`/en/blog/...`).
 *      - Validates the locale segment on prefixed URLs.
 *   2. After the next-intl pass, persist the resolved locale as the
 *      `wly_locale` cookie (365-day, Lax, Secure) so internal links stay
 *      consistent and the picker reflects the current language.
 *   3. Issue a `wly_anon` UUID cookie (2-year, HttpOnly) the first time a
 *      visitor arrives. The API route uses this as the KV key for
 *      per-user language preferences.
 *   4. Forward the resolved locale to the renderer via the
 *      `x-wly-locale` request header.
 *
 * Detection hierarchy (when no URL prefix is present):
 *   cookie  >  Accept-Language  >  cf-ipcountry  >  defaultLocale ("en")
 *
 * Why custom detection instead of next-intl's built-in:
 *   - We want to consult `cf-ipcountry` (Cloudflare edge data) which
 *     next-intl doesn't know about.
 *   - We want to set the `wly_anon` cookie in the same pass.
 */
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "../next-intl.config";
import {
  COOKIE_LOCALE,
  COOKIE_ANON,
  COUNTRY_TO_LOCALE,
  DEFAULT_LOCALE,
  isSupportedLocale,
  type LocaleCode,
} from "./i18n/config";

const intl = createIntlMiddleware(routing);

export const config = {
  // Match every path EXCEPT: API routes, Next internals, static files
  // (anything with a file extension).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

function resolveLocaleFromRequest(req: NextRequest): LocaleCode {
  // 1. URL prefix wins (already validated by next-intl middleware)
  const urlLocale = req.nextUrl.pathname.split("/")[1]?.toLowerCase();
  if (urlLocale && isSupportedLocale(urlLocale)) return urlLocale;

  // 2. Cookie
  const cookieLocale = req.cookies.get(COOKIE_LOCALE)?.value?.toLowerCase();
  if (cookieLocale && isSupportedLocale(cookieLocale)) return cookieLocale;

  // 3. Accept-Language — pick the first supported base language
  const accept = req.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    const base = tag.split("-")[0];
    if (base && isSupportedLocale(base)) return base;
  }

  // 4. Cloudflare geo (`cf` is a Cloudflare-specific property exposed on
  // the request object by the Workers runtime; not in the standard
  // NextRequest type, hence the cast.)
  const cf = (req as NextRequest & { cf?: { country?: string } }).cf;
  const country = cf?.country?.toUpperCase();
  if (country && COUNTRY_TO_LOCALE[country]) return COUNTRY_TO_LOCALE[country]!;

  // 5. Fallback
  return DEFAULT_LOCALE;
}

export function proxy(req: NextRequest) {
  // Run the next-intl middleware first. It may issue a 308 redirect
  // (we capture and return that as-is) or a pass-through NextResponse
  // for already-prefixed URLs.
  const response = intl(req);

  // The resolved locale is whatever the URL prefix says (if any) or what
  // the next-intl redirect would have used. We re-derive it here so we
  // can set cookies / headers on the response.
  const resolved = resolveLocaleFromRequest(req);

  // Persist the locale as a cookie (1 year, Lax, Secure)
  response.cookies.set(COOKIE_LOCALE, resolved, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: true,
  });

  // Anonymous identity for KV keying (2 years, HttpOnly)
  if (!req.cookies.get(COOKIE_ANON)) {
    response.cookies.set(COOKIE_ANON, crypto.randomUUID(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    });
  }

  // Forward to RSC for server components that want to read the locale
  // without going through next-intl's getLocale()
  response.headers.set("x-wly-locale", resolved);

  return response;
}
