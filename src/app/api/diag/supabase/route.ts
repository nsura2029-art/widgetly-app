import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import { log, maskSecret } from "@/lib/log";

/**
 * GET /api/diag/supabase
 *
 * Dev-only diagnostic endpoint. Returns:
 *   - whether SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   - the URL host (never the full URL — the project ref is sensitive)
 *   - the key prefix/suffix/length (never the secret itself)
 *   - whether the key shape parses as a JWT (sanity check)
 *   - the result of a live ping: a cheap head-count on `waitlist`.
 *     If this fails you'll see the exact Supabase error message in
 *     the response.
 *
 * The route is BLOCKED in production. It is the only place in the
 * codebase that talks to Supabase with the intent of "tell me about
 * the connection" rather than "do real work" — and we never want it
 * reachable from the public internet.
 *
 * Access: GET /api/diag/supabase from your dev server only.
 * Returns: 200 with the diagnostic object, OR 404 in production.
 */
export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: "Not found." } },
      { status: 404 }
    );
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const config = {
    node_env: process.env.NODE_ENV ?? "(unset)",
    supabase_configured: isSupabaseConfigured(),
    url: {
      present: Boolean(url),
      host: url ? safeHost(url) : null,
      is_https: url ? url.startsWith("https://") : false,
    },
    key: maskSecret(key),
  };

  // Decode the JWT payload (middle segment, base64url → JSON) to
  // surface `role: "service_role"` and `iss` — quick sanity that the
  // key the user pasted is actually a service_role JWT, not the anon
  // key (which looks the same shape but doesn't bypass RLS).
  const jwtInfo = key ? decodeJwt(key) : null;
  if (jwtInfo) {
    (config as Record<string, unknown>).jwt = jwtInfo;
  }

  // Live ping: round-trip to Supabase. Catches:
  //   - DNS / network errors
  //   - 401 if the key is wrong or revoked
  //   - 404 if the project URL is wrong
  //   - any RLS / permissions issue (with service role, only project
  //     outages / wrong keys block us)
  let ping: { ok: boolean; status?: number; error?: string; hint?: string } = {
    ok: false,
    error: "client not initialized",
  };
  if (isSupabaseConfigured()) {
    const start = Date.now();
    try {
      const supabase = getSupabase();
      // `from("waitlist").select("count", { count: "exact", head: true })`
      // is the cheapest possible round-trip — HEAD-style count, no rows
      // transferred. It will succeed if the key is valid and the
      // `public` schema is reachable, regardless of whether the
      // `waitlist` table actually exists yet.
      const { count, error } = await supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true });
      if (error) {
        ping = {
          ok: false,
          status: 400,
          error: error.message,
          hint: error.hint ?? error.code,
        };
        log.error("diag.supabase", "ping failed", {
          code: error.code,
          message: error.message,
          duration_ms: Date.now() - start,
        });
      } else {
        ping = { ok: true, status: 200 };
        log.info("diag.supabase", "ping ok", {
          count: count ?? 0,
          duration_ms: Date.now() - start,
        });
      }
    } catch (e) {
      ping = {
        ok: false,
        error: e instanceof Error ? e.message : "unknown",
      };
      log.error("diag.supabase", "ping threw", {
        err: e instanceof Error ? e.message : "unknown",
        duration_ms: Date.now() - start,
      });
    }
  }

  log.info("diag.supabase", "diagnostic", {
    configured: config.supabase_configured,
    url_host: config.url.host,
    jwt_role: jwtInfo?.role ?? null,
    ping_ok: ping.ok,
  });

  return NextResponse.json(
    {
      ok: true,
      config,
      ping,
      ts: new Date().toISOString(),
    },
    { status: 200 }
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

type JwtInfo = {
  role: string | null;
  ref: string | null;
  iat: string | null;
  exp: string | null;
  is_service_role: boolean;
};

function decodeJwt(token: string): JwtInfo | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    // base64url → base64 → JSON
    const padded = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const json = atob(padded);
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      role: typeof claims.role === "string" ? claims.role : null,
      ref: typeof claims.ref === "string" ? claims.ref : null,
      iat: claims.iat ? new Date(Number(claims.iat) * 1000).toISOString() : null,
      exp: claims.exp ? new Date(Number(claims.exp) * 1000).toISOString() : null,
      is_service_role: claims.role === "service_role",
    };
  } catch {
    return null;
  }
}
