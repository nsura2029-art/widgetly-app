/**
 * GET  /api/admin/quotas   — current anonymous + registered limits
 * PATCH /api/admin/quotas  — update one or both limits
 *
 * Auth: requires an active admin session + valid CSRF header.
 * Mirrors the patterns in /api/admin/tools.
 *
 * Body for PATCH: { anonymous?: number, registered?: number }
 *   - At least one of the two fields must be present.
 *   - Each value is an integer >= 0 (0 = no quota).
 *   - Response: updated QuotaSettings.
 */
import { type NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api/responses";
import { readCsrfCookie } from "@/lib/admin/auth";
import { requireAdminFromRequest } from "@/lib/admin/auth";
import { getQuotaSettings, setQuotaLimit } from "@/lib/quota/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  return withErrorHandling(async () => {
    const ctx = await requireAdminFromRequest();
    if (!ctx) return jsonError(401, "Unauthorized", "Admin sign-in required.");
    const settings = await getQuotaSettings();
    return jsonOk(settings);
  });
}

const PatchBody = z
  .object({
    anonymous: z.number().int().min(0).optional(),
    registered: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((d) => d.anonymous !== undefined || d.registered !== undefined, {
    message: "At least one of `anonymous` or `registered` is required.",
  });

export async function PATCH(req: NextRequest) {
  return withErrorHandling(async () => {
    const ctx = await requireAdminFromRequest();
    if (!ctx) return jsonError(401, "Unauthorized", "Admin sign-in required.");

    // CSRF: the cookie was set when the admin signed in; the
    // browser sends it back on every request. The X-CSRF-Token
    // header is the same value, included by the client.
    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = await readCsrfCookie();
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return jsonError(403, "Invalid CSRF token", "CSRF token missing or invalid.");
    }

    let body: z.infer<typeof PatchBody>;
    try {
      body = PatchBody.parse(await req.json());
    } catch (e) {
      return jsonError(
        400,
        "Invalid request body",
        (e as { issues?: unknown }).issues
          ? JSON.stringify((e as { issues?: unknown }).issues)
          : "Bad JSON"
      );
    }

    if (body.anonymous !== undefined) {
      await setQuotaLimit("anonymous", body.anonymous, ctx.user.id);
    }
    if (body.registered !== undefined) {
      await setQuotaLimit("registered", body.registered, ctx.user.id);
    }

    const updated = await getQuotaSettings();
    return jsonOk(updated);
  });
}
