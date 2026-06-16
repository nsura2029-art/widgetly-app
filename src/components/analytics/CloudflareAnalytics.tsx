/**
 * Cloudflare Web Analytics beacon. Privacy-respecting alternative to
 * Google Analytics — no cookies, no fingerprinting, no cross-site
 * tracking. Counts page views, visits, and basic engagement metrics
 * entirely on the Cloudflare edge.
 *
 * Configure the token in the Cloudflare dashboard:
 *   Account Home → Analytics → Web Analytics → Add site → copy the
 *   token (looks like a 32-char hex string)
 *
 * The token is a PUBLIC identifier (safe to inline in the script tag).
 * Set it as `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` in wrangler.toml [vars] or
 * via `wrangler secret put NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (secret is
 * not strictly necessary but is supported for the value if you want
 * to gate it). The script is omitted entirely when the token is empty
 * so the page stays clean for local dev.
 *
 * Renders nothing visible — it's a zero-size beacon.
 */
export function CloudflareAnalytics({ token }: { token: string | undefined }) {
  if (!token) return null;
  return (
    // `defer` lets the browser keep parsing the page without blocking
    // on the script. `data-cf-beacon` carries the token inline so the
    // beacon script auto-initializes without a separate init call.
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={`{"token": "${token}"}`}
    />
  );
}
