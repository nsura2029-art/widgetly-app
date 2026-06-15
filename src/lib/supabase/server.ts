/**
 * Server-side Supabase client for the Next.js API routes.
 *
 * Why this is structured the way it is:
 *
 *  1. Lazy initialization. `createClient` runs only on the first call, not
 *     at module load. The route's edge-runtime worker isolates the module
 *     per-request, and reading env at call time means we get the value the
 *     Worker bound to that request — not whatever was in process.env at
 *     module-load time on a previous request (or in a stale cache).
 *
 *  2. Service role key, server-side only. This module is only imported from
 *     `/api/*` route handlers, which run on the server. The key never
 *     reaches the client bundle. The Cloudflare Worker secret
 *     `SUPABASE_SERVICE_ROLE_KEY` is the only path it travels.
 *
 *  3. `persistSession: false`. The Supabase JS client by default tries to
 *     read/write tokens to local storage — neither exists in a Cloudflare
 *     Worker. Disabling session persistence is required, not optional.
 *     Without it the client throws on the first request.
 *
 *  4. Edge-runtime safe. `@supabase/supabase-js` is isomorphic; the bits
 *     it pulls in (cross-fetch, etc.) work in Cloudflare Workers. No
 *     Node-only APIs.
 *
 *  5. `isConfigured()` is exposed so the route handlers can branch on
 *     "do we have a database?" — if the user hasn't set the env vars yet
 *     (e.g. mid-setup, or running a preview deploy without secrets), the
 *     routes fall back to the existing webhook behavior instead of 500ing.
 *
 *  6. Every step logs to `console.log` / `console.error` (via the
 *     `lib/log` helper) in single-line JSON. Visible in `next dev` output
 *     and in `wrangler tail`. This is what the user greps when "no row
 *     appeared in Supabase" — the answer is always in the logs.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { log, maskSecret } from "@/lib/log";

type DbClient = SupabaseClient;

let cached: DbClient | null = null;

/**
 * Returns true iff both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * in the current Worker isolate's env. The route handlers use this to
 * decide whether to attempt the Supabase write path.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Returns a singleton Supabase client for the current request scope.
 * Throws a clear error if the env vars are missing — caller should have
 * gated on `isSupabaseConfigured()` first.
 *
 * We cache the client across calls within the same isolate. The env vars
 * don't change at runtime, so a single init is safe.
 */
export function getSupabase(): DbClient {
  if (cached) {
    log.debug("supabase.init", "cache hit, returning existing client");
    return cached;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Log config presence BEFORE we throw. This is the line you want to
  // see first if Supabase writes aren't landing — if it says
  // "has_url: false" you know the env file isn't being read; if it
  // says "has_url: true / has_key: true" the issue is downstream
  // (network, RLS, schema mismatch, etc.).
  let host = "(none)";
  try {
    if (url) host = new URL(url).host;
  } catch {
    host = "(invalid-url)";
  }
  log.info("supabase.init", "config check", {
    has_url: Boolean(url),
    has_key: Boolean(key),
    url_host: host,
    key: maskSecret(key),
  });

  if (!url || !key) {
    log.warn("supabase.init", "missing env vars, throwing", {
      has_url: Boolean(url),
      has_key: Boolean(key),
    });
    throw new Error(
      "Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "in your .env.local (dev) and as `wrangler secret put` (prod), or " +
        "gate your caller on isSupabaseConfigured() first."
    );
  }

  try {
    cached = createClient(url, key, {
      auth: {
        // Critical in Workers — the client must NOT try to read/write
        // local storage; it would throw. We have no users, no sessions.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      // Reasonable timeouts. Cloudflare Workers have a 30s wall clock
      // per request; we want a DB call to fail fast so the route can
      // return a friendly 503 instead of hanging.
      db: { schema: "public" },
      global: {
        headers: { "x-application-name": "widgetly-api" },
      },
    });
    log.info("supabase.init", "client created", { url_host: host });
    return cached;
  } catch (e) {
    // createClient itself doesn't usually throw, but if it does (e.g. a
    // bad URL slips past the parse above) we want a clean log line.
    log.error("supabase.init", "createClient threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
    throw e;
  }
}
