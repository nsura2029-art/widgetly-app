/**
 * PATCH /api/admin/suggestions/[id]
 *
 * Update a user-submitted suggestion's status. Admin-only.
 *
 * Body: { status: "in_review" | "building" | "live" | "rejected" }
 *
 * Auth: requires admin session (requireAdminFromRequest) and CSRF
 * header (requireCsrfHeader). Returns 401/403/404 as appropriate.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminFromRequest, requireCsrfHeader } from "@/lib/admin/auth";
import { updateSuggestionStatus } from "@/lib/admin/suggestions";
import { withErrorHandling } from "@/lib/api/responses";

export const runtime = "nodejs";

const PatchBody = z.object({
  status: z.enum(["in_review", "building", "live", "rejected"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const ctx = await requireAdminFromRequest();
    if (!ctx) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Admin sign-in required." } },
        { status: 401 }
      );
    }
    if (!(await requireCsrfHeader(request))) {
      return NextResponse.json(
        { error: { code: "csrf_invalid", message: "CSRF token missing or invalid." } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Invalid suggestion id." } },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "invalid_json", message: "Body must be valid JSON." } },
        { status: 400 }
      );
    }
    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Invalid status.",
            fields: parsed.error.issues.map((i) => ({
              path: i.path.join(".") || "(root)",
              message: i.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const ok = await updateSuggestionStatus(numericId, parsed.data.status);
    if (!ok) {
      return NextResponse.json(
        {
          error: {
            code: "not_found",
            message: "Suggestion not found or status unchanged.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, status: parsed.data.status });
  });
}
