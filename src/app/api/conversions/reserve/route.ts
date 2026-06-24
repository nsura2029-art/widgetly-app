/**
 * POST /api/conversions/reserve
 *
 * Reserves `pages` quota for the current actor. Used by the
 * placeholder conversion CTA on tool detail pages: when the user
 * clicks "Convert", the client first hits this endpoint to
 * reserve the page; if it returns 429, the client shows the
 * "limit reached" state with a sign-up prompt.
 *
 * Body: { pages?: number, toolSlug?: string }
 *   - pages defaults to 1
 *   - toolSlug is optional, used for the audit log
 *
 * Response on success: { ok: true, remaining: number }
 * Response on limit: 429 { error: "limit_reached", limit, used, remaining: 0 }
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError, withErrorHandling } from "@/lib/api/responses";
import { getUser } from "@/lib/auth/server";
import { reservePages, resolveQuotaActor } from "@/lib/quota/server";

export const runtime = "nodejs";

const ReserveBody = z.object({
  pages: z.number().int().min(1).max(10).default(1),
  toolSlug: z.string().min(1).max(120).optional(),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // Pass `req` so Clerk's getAuth() can read the session cookie
    // directly. See src/lib/auth/server.ts for why we don't use the
    // `auth()` shortcut.
    const user = await getUser(req);
    const actor = await resolveQuotaActor({ userId: user?.userId ?? null });
    if (!actor) {
      return jsonError(503, "actor_unresolved", "Cannot determine the request actor.");
    }
    let body: z.infer<typeof ReserveBody> = { pages: 1 };
    try {
      const raw = await req.json();
      body = ReserveBody.parse(raw);
    } catch {
      // Empty / unparseable body is fine — use defaults.
    }
    const result = await reservePages(actor, body.pages, { toolSlug: body.toolSlug });
    if (!result.ok) {
      return jsonError(
        429,
        "limit_reached",
        "Daily conversion limit reached. Sign up to get more pages.",
        { used: result.used, limit: result.limit, remaining: 0 }
      );
    }
    return jsonOk({ remaining: result.remaining, used: result.newUsed });
  });
}
