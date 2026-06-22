/**
 * GET /api/admin/auth/me
 *
 * Returns the current admin user, or 401 if no valid session.
 * Used by the admin layout to render the header avatar/name and by
 * the sign-in page to decide whether to redirect to /admin.
 */
import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: ctx.user.id,
      username: ctx.user.username,
      display_name: ctx.user.display_name,
      must_change_password: ctx.user.must_change_password,
    },
  });
}
