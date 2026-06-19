import { NextResponse, type NextRequest } from "next/server";
import { isD1Configured } from "@/lib/d1/server";
import { countWaitlist } from "@/lib/d1/waitlist";
import { log } from "@/lib/log";

/**
 * GET /api/diag/d1
 *
 * Dev-only diagnostic endpoint. Returns:
 *   - whether the D1 binding is present
 *   - the waitlist row count (cheap COUNT(*) ping)
 *
 * The route is BLOCKED in production. It's the only place in the
 * codebase that talks to D1 with the intent of "tell me about the
 * connection" rather than "do real work" — and we never want it
 * reachable from the public internet.
 *
 * Access: GET /api/diag/d1 from your dev server only.
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

  const start = Date.now();
  const configured = isD1Configured();

  const config = {
    node_env: process.env.NODE_ENV ?? "(unset)",
    d1_configured: configured,
  };

  // Live ping: cheap COUNT(*) on waitlist. Catches:
  //   - binding not actually wired up (would error in getD1())
  //   - migrations not applied (table doesn't exist → SQLITE_ERROR)
  //   - local vs remote D1 mismatch
  let ping: { ok: boolean; count?: number; error?: string } = {
    ok: false,
    error: "binding missing",
  };
  if (configured) {
    try {
      const count = await countWaitlist();
      if (count < 0) {
        ping = { ok: false, error: "count query failed" };
      } else {
        ping = { ok: true, count };
      }
    } catch (e) {
      ping = { ok: false, error: e instanceof Error ? e.message : "unknown" };
      log.error("diag.d1", "ping threw", {
        err: ping.error,
        duration_ms: Date.now() - start,
      });
    }
  }

  log.info("diag.d1", "diagnostic", {
    configured,
    ping_ok: ping.ok,
    count: ping.count ?? null,
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
