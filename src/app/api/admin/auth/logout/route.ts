/**
 * POST /api/admin/auth/logout
 *
 * Revokes the current session row in D1 and clears the cookie.
 * Always returns 200 — logout must be idempotent. We don't enforce
 * the CSRF header on logout because: (a) the action is intrinsically
 * idempotent, (b) requiring CSRF makes the 'stale tab' case
 * (cookie cleared server-side, user clicks sign-out) fail.
 */
import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  readSessionCookie,
  revokeSession,
  verifySessionToken,
} from "@/lib/admin/auth";
import { recordLoginAttempt } from "@/lib/admin/auth";
import { clientIpFromHeaders } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await readSessionCookie();
  let username = "(unknown)";
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      await revokeSession(payload.sid);
      username = `user#${payload.uid}`;
    }
  }
  await clearSessionCookie();
  // Audit: log the logout. Uses the same admin_login_attempts table
  // as login events, with success=1 and reason="logout", so a single
  // SELECT ordered by created_at gives the full session timeline.
  await recordLoginAttempt(clientIpFromHeaders(req.headers), username, true, "logout");
  return NextResponse.json({ ok: true });
}
