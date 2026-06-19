/**
 * Edge middleware: locale path-prefix routing + cookie persistence.
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
import { NextRequest } from "next/server";
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

export function middleware(req: NextRequest) {
  // Run the next-intl middleware first. It may issue a 308 redirect
  // (we capture and return that as-is) or a pass-through NextResponse
  // for already-prefixed URLs.
  const response = intl(req);

  // The resolved locale is whatever the URL prefix says (if any) or what
  // the next-intl redirect would have used. We re-derive it here so we
  // can set cookies / headers on the response.
  const resolved = resolveLocaleFromRequest(req);

  // ---------------------------------------------------------------
  // Cookie setting — kept minimal so Cloudflare's edge cache works.
  //
  // The Cloudflare Cache Rule (see docs/operations/cloudflare-optimization.md)
  // bypasses cache by default for responses with Set-Cookie headers. If
  // we set cookies on every response, the cache rule never fires — every
  // HTML request hits the Worker.
  //
  // Fix: only set each cookie when the user doesn't already have it
  // (or has a different value). Returning users skip Set-Cookie entirely,
  // so their responses become cacheable.
  //
  // First-visit responses still have Set-Cookie (intentional — that's
  // when we need to establish the cookie). The Worker renders them once,
  // Cloudflare caches the rendered response, and subsequent visits from
  // any user get the cached version (without re-setting the cookie).
  // ---------------------------------------------------------------

  // `wly_locale` — only set if missing or different. Returning users
  // with the correct cookie get a no-Set-Cookie response.
  const existingLocale = req.cookies.get(COOKIE_LOCALE)?.value?.toLowerCase();
  if (existingLocale !== resolved) {
    response.cookies.set(COOKIE_LOCALE, resolved, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: true,
    });
  }

  // `wly_anon` — only set on first visit (already correct pattern).
  const existingAnon = req.cookies.get(COOKIE_ANON);
  if (!existingAnon) {
    response.cookies.set(COOKIE_ANON, crypto.randomUUID(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
      sameSite: "lax",
      secure: true,
      httpOnly: true,
    });
  }

  // `NEXT_LOCALE` — set by next-intl internally. Strip it from the
  // response if the user already has the same value, so the response
  // becomes cacheable. If the value differs (locale change), keep the
  // Set-Cookie so the user's preference is updated.
  const existingNextLocale = req.cookies.get("NEXT_LOCALE")?.value?.toLowerCase();
  if (existingNextLocale === resolved) {
    response.cookies.delete("NEXT_LOCALE");
  }

  // Returning user with all the right cookies? Strip ALL Set-Cookie
  // headers from the response so Cloudflare's edge cache can engage.
  // `response.cookies.delete()` above only marks NEXT_LOCALE for
  // expiration — it still emits a Set-Cookie header. We need to drop
  // the entire Set-Cookie header for the response to be cacheable.
  if (existingLocale === resolved && existingNextLocale === resolved && existingAnon) {
    // `Headers.delete('set-cookie')` removes every Set-Cookie header.
    response.headers.delete("set-cookie");
  }

  // Forward to RSC for server components that want to read the locale
  // without going through next-intl's getLocale()
  response.headers.set("x-wly-locale", resolved);

  return response;
}
