/**
 * Server-side D1 client for the Next.js API routes.
 *
 * Why this is structured the way it is:
 *
 *  1. Lazy initialization. D1's binding is exposed on globalThis by
 *     the OpenNext adapter; we read it on first call, not at module
 *     load. The route's worker isolate is per-request, and reading the
 *     binding at call time avoids any module-load timing weirdness
 *     across isolates.
 *
 *  2. No env vars to check. With Supabase we had to gate on
 *     `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. D1 has neither —
 *     the binding IS the credential. `isD1Configured()` becomes a
 *     binding-presence check.
 *
 *  3. No service-role key. RLS doesn't apply because D1 is only
 *     reachable from the Worker via the binding; there's no public
 *     surface to lock down. (D1 has no RLS concept anyway.)
 *
 *  4. `isConfigured()` is exposed so the route handlers can branch
 *     on "do we have a database?" — keeps the fallback-to-webhook
 *     behavior identical to the Supabase version, so flipping
 *     persistence layers doesn't change the route shape.
 *
 *  5. Every step logs to `console.log` / `console.error` (via the
 *     `lib/log` helper) in single-line JSON. Visible in `next dev`
 *     output and in `wrangler tail`.
 */

// Minimal D1 type surface — covers everything we use. Avoids pulling
// in @cloudflare/workers-types as a devDep just for one type. If we
// start using D1-specific features (sessions, time-travel, etc.) we
// can switch to the official types.
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

// OpenNext exposes Cloudflare bindings (env, cf, ctx) on the worker
// isolate via this private symbol. Production worker.js sets it from
// the `fetch(request, env, ctx)` handler; in `next dev` it's set by
// `initOpenNextCloudflareForDev()` (already called in next.config.ts).
//
// We deliberately don't use `globalThis.DB` directly — Cloudflare's
// `env` object isn't hung off globalThis; OpenNext exposes it via
// this symbol so the bindings reach usercode without us needing to
// thread them through the Next.js request lifecycle.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { log } from "@/lib/log";

/**
 * Returns true iff the D1 binding (`DB`) is present on the current
 * isolate. D1 is configured at deploy time via wrangler.toml
 * `[[d1_databases]]`; there's no runtime toggle.
 *
 * Locally, `wrangler dev` (and our `pnpm preview`) wires up a local
 * D1 via Miniflare. In CI we use `--remote` to point at the deployed
 * D1 for migration application.
 */
/**
 * Returns true iff the D1 binding (`DB`) is present on the current
 * isolate. D1 is configured at deploy time via wrangler.toml
 * `[[d1_databases]]`; there's no runtime toggle.
 *
 * Locally, `wrangler dev` (and our `pnpm preview`) wires up a local
 * D1 via Miniflare. In CI we use `--remote` to point at the deployed
 * D1 for migration application.
 */
export function isD1Configured(): boolean {
  try {
    const { env } = getCloudflareContext();
    return Boolean((env as { DB?: D1Database })?.DB);
  } catch {
    return false;
  }
}

/**
 * Returns the D1 binding for the current isolate. Throws if the
 * binding isn't present — caller should gate on `isD1Configured()`
 * first.
 */
export function getD1(): D1Database {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database })?.DB;
  if (!db) {
    log.warn("d1.init", "binding missing", {
      hint: "OpenNext sets globalThis[Symbol.for('__cloudflare-context__')].env from the worker fetch handler; the DB binding lives there",
    });
    throw new Error(
      "D1 binding missing. Configure [[d1_databases]] in wrangler.toml " +
        "and run `pnpm exec wrangler d1 create widgetly` + `pnpm db:migrate:remote`."
    );
  }
  return db;
}
