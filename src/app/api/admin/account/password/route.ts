/**
 * PATCH /api/admin/account/password
 *
 * Body: { current_password, new_password, confirm_password }
 *
 * Auth: required (session cookie + CSRF token).
 *
 * Updates the authenticated admin's password. Clears the
 * `must_change_password` flag on success. Other sessions are NOT
 * invalidated — the user can change their own password without
 * forcing a logout on every device. If you want to do that, add
 * a `logout_all_devices` flag to the body and bump the
 * session_token_secret after rotate.
 */
import { NextResponse, type NextRequest } from "next/server";
import { changePassword, requireAdminFromRequest, readCsrfCookie } from "@/lib/admin/auth";
import { ChangePasswordBody } from "@/lib/admin/schemas";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csrfHeader = req.headers.get("x-csrf-token");
  const csrfCookie = await readCsrfCookie();
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  let body: ChangePasswordBody;
  try {
    body = ChangePasswordBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", issues: (err as { issues?: unknown }).issues },
      { status: 400 }
    );
  }

  const result = await changePassword(ctx.user.id, body.current_password, body.new_password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
