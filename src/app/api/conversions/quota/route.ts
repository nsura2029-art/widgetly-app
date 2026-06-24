/**
 * GET /api/conversions/quota
 *
 * Returns the current quota state for the calling actor. No side
 * effects — safe to call from any page that wants to show a
 * "X pages remaining today" indicator.
 *
 * Actor resolution:
 *   - If signed in (Clerk), actor is `registered`, keyed by userId.
 *   - Otherwise, actor is `anonymous`, keyed by the `wly_anon`
 *     cookie the middleware sets on first visit.
 *
 * Response shape:
 *   {
 *     ok: true,
 *     actorType: "anonymous" | "registered",
 *     limit: number,         // daily page limit
 *     used: number,          // pages used in current UTC day
 *     remaining: number,     // max(0, limit - used)
 *     resetAt: ISO timestamp // next UTC midnight
 *   }
 */
import { type NextRequest } from "next/server";
import { jsonOk, jsonError, withErrorHandling } from "@/lib/api/responses";
import { getUser } from "@/lib/auth/server";
import { getQuotaState, resolveQuotaActor } from "@/lib/quota/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    // Pass `req` so Clerk's getAuth() can read the session cookie
    // directly. See src/lib/auth/server.ts for why we don't use the
    // `auth()` shortcut.
    const user = await getUser(req);
    const actor = await resolveQuotaActor({ userId: user?.userId ?? null });
    if (!actor) {
      return jsonError(503, "actor_unresolved", "Cannot determine the request actor.");
    }
    const state = await getQuotaState(actor);
    return jsonOk({
      actorType: state.actorType,
      limit: state.limit,
      used: state.used,
      remaining: state.remaining,
      resetAt: state.resetAtIso,
    });
  });
}
