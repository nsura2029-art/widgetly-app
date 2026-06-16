/**
 * /api/locale — persist the user's explicit language preference.
 *
 * POST  { locale: "es" }  →  200, sets wly_locale cookie, writes to KV
 * DELETE                   →  200, resets to default, clears KV record
 *
 * Edge runtime so we can write to Cloudflare KV directly (the binding
 * is exposed as `globalThis.LOCALE_KV` at runtime by OpenNext).
 *
 * The cookie is the source of truth for the render path; the KV write
 * is a durability layer so the preference can be linked to a future
 * user account (Phase 3) or queried for analytics.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_LOCALE,
  COOKIE_ANON,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type LocaleCode,
} from "@/i18n/config";

// Must be `edge` to access the Cloudflare KV binding at runtime.
// The OpenNext adapter for Cloudflare injects the binding into
// `globalThis` so we can read it from the route handler.
export const runtime = "edge";

interface KVNamespace {
  put(k: string, v: string, opts?: { expirationTtl?: number }): Promise<void>;
  get(k: string): Promise<string | null>;
  delete(k: string): Promise<void>;
}

function getKV(): KVNamespace | null {
  // The binding is registered as `LOCALE_KV` in wrangler.toml. At runtime
  // on Cloudflare it's available on globalThis via the OpenNext adapter.
  return (globalThis as { LOCALE_KV?: KVNamespace }).LOCALE_KV ?? null;
}

function setLocaleCookie(res: NextResponse, locale: LocaleCode) {
  res.cookies.set(COOKIE_LOCALE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: true,
  });
}

function setAnonCookie(res: NextResponse, anonId: string) {
  res.cookies.set(COOKIE_ANON, anonId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const requested = body.locale?.toLowerCase();

  if (!requested || !isSupportedLocale(requested)) {
    return NextResponse.json(
      {
        error: "Unsupported locale",
        supported: SUPPORTED_LOCALES,
      },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const existingAnon = cookieStore.get(COOKIE_ANON)?.value;
  const anonId = existingAnon ?? crypto.randomUUID();
  const isNewAnon = !existingAnon;

  // Best-effort KV write. Cookie is what the render path actually uses.
  const kv = getKV();
  if (kv) {
    try {
      await kv.put(`locale:${anonId}`, requested, {
        expirationTtl: 60 * 60 * 24 * 365,
      });
    } catch (err) {
      // Don't fail the request if KV is down — the cookie is what matters
      // for the current session, and a future GET /api/locale can resync.
      console.error("[api/locale] KV put failed", err);
    }
  }

  const res = NextResponse.json({ ok: true, locale: requested });
  setLocaleCookie(res, requested);
  if (isNewAnon) setAnonCookie(res, anonId);
  return res;
}

export async function DELETE() {
  const cookieStore = await cookies();
  const anonId = cookieStore.get(COOKIE_ANON)?.value;

  if (anonId) {
    const kv = getKV();
    if (kv) {
      try {
        await kv.delete(`locale:${anonId}`);
      } catch (err) {
        console.error("[api/locale] KV delete failed", err);
      }
    }
  }

  const res = NextResponse.json({ ok: true, locale: DEFAULT_LOCALE });
  setLocaleCookie(res, DEFAULT_LOCALE);
  return res;
}

export async function GET() {
  // Useful for client components / debugging
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE_LOCALE)?.value;
  const anonId = cookieStore.get(COOKIE_ANON)?.value;

  let kvLocale: string | null = null;
  if (anonId) {
    const kv = getKV();
    if (kv) {
      try {
        kvLocale = await kv.get(`locale:${anonId}`);
      } catch (err) {
        console.error("[api/locale] KV get failed", err);
      }
    }
  }

  return NextResponse.json({
    cookie: cookieLocale ?? null,
    kv: kvLocale,
    resolved:
      (cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : null) ?? DEFAULT_LOCALE,
  });
}
