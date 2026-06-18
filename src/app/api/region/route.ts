import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { regionFromCountry, regionFromLocale } from "@/lib/consent/region";

/**
 * GET /api/region
 *
 * Returns the visitor's consent region, derived from Cloudflare's
 * `cf-ipcountry` header with locale fallback. Called client-side
 * by `<ConsentProvider>` to refine the static locale-based default
 * without forcing every page into dynamic rendering.
 *
 * This endpoint is intentionally lightweight and publicly readable
 * (no auth, no PII) so it can be called from any page. The response
 * is one of the four `ConsentRegion` values: "eu" | "us-ca" | "uk" | "other".
 *
 * Edge-cached for 1 hour via `Cache-Control: s-maxage=3600`. The
 * region doesn't change for the same visitor often enough to justify
 * uncached round-trips.
 *
 * Note: This endpoint requires `headers()`, so it is dynamic by
 * nature. But it's the ONLY dynamic route per page load (the rest
 * of the app is statically prerendered), so the cold-start cost is
 * paid once per edge node, not per request.
 */
export const runtime = "nodejs";

export async function GET() {
  let country: string | null = null;
  let acceptLanguage: string | null = null;
  try {
    const h = await headers();
    country = h.get("cf-ipcountry");
    acceptLanguage = h.get("accept-language");
  } catch {
    // Outside a request context (e.g., during build-time prerender).
  }

  const fromCountry = regionFromCountry(country);
  const fromLocale = regionFromLocale(acceptLanguage);
  const region = fromCountry !== "other" ? fromCountry : fromLocale;

  return NextResponse.json(
    { ok: true, region },
    {
      headers: {
        // Edge cache the result. Region is stable per visitor, so
        // a long max-age is safe. Stale-while-revalidate lets the
        // edge serve the cached response while refreshing in the
        // background.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
