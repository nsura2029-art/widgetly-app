import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { regionFromCountry, regionFromLocale } from "@/lib/consent/region";
import { log } from "@/lib/log";
import { CONSENT_VERSION } from "@/lib/consent/types";

/**
 * GET /api/diag/consent
 *
 * Dev-only diagnostic for the cookie consent system. Returns:
 *  - the server-detected region (from cf-ipcountry, with locale fallback)
 *  - the current CONSENT_VERSION constant
 *  - the request's region headers (sanitized — never the raw IP)
 *
 * The endpoint is BLOCKED in production (returns 404), same as
 * /api/diag/supabase. Lives under /api/diag/ to avoid the
 * leading-underscore 'private folder' convention that Next.js
 * applies to /api/_diag/.
 */
export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: "Not found." } },
      { status: 404 }
    );
  }

  let country: string | null = null;
  let acceptLanguage: string | null = null;
  try {
    const h = await headers();
    country = h.get("cf-ipcountry");
    acceptLanguage = h.get("accept-language");
  } catch {
    // Outside a request context.
  }

  const fromCountry = regionFromCountry(country);
  const fromLocale = regionFromLocale(acceptLanguage);
  // Mirror the production logic in [locale]/layout.tsx: prefer
  // country code, fall back to locale.
  const region = fromCountry !== "other" ? fromCountry : fromLocale;

  log.info("diag.consent", "diagnostic", {
    country: country ?? null,
    accept_language: acceptLanguage?.slice(0, 60) ?? null,
    from_country: fromCountry,
    from_locale: fromLocale,
    resolved_region: region,
    consent_version: CONSENT_VERSION,
  });

  return NextResponse.json(
    {
      ok: true,
      config: {
        node_env: process.env.NODE_ENV ?? "(unset)",
        consent_version: CONSENT_VERSION,
        region_detection: {
          country_code: country,
          accept_language: acceptLanguage,
          from_country_code: fromCountry,
          from_locale: fromLocale,
          resolved: region,
        },
      },
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}
