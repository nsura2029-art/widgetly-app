/**
 * POST /api/admin/account/reset-password
 *
 * Body: { token, new_password, confirm_password }
 *
 * Auth: none. The token in the URL is the entire proof of identity
 * (it's a 32-byte secret that's only known to the original requester
 * since we never email it yet — see /forgot-password route).
 *
 * Single-use: marks the token row with `used_at` so it can't be
 * replayed. Sets the new bcrypt hash and clears the
 * must_change_password flag.
 */
import { NextResponse, type NextRequest } from "next/server";
import { consumePasswordResetToken } from "@/lib/admin/auth";
import { ResetPasswordBody } from "@/lib/admin/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: ResetPasswordBody;
  try {
    body = ResetPasswordBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", issues: (err as { issues?: unknown }).issues },
      { status: 400 }
    );
  }

  const result = await consumePasswordResetToken(body.token, body.new_password);
  if (!result.ok) {
    // 410 Gone for expired/already-used tokens (semantic distinction).
    if (result.error.includes("expired") || result.error.includes("already been used")) {
      return NextResponse.json({ error: result.error }, { status: 410 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, userId: result.userId });
}
