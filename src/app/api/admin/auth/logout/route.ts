/**
 * POST /api/admin/auth/logout
 *
 * Revokes the current session row in D1 and clears the cookie.
 * Always returns 200 — logout must be idempotent.
 */
import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  readSessionCookie,
  revokeSession,
  verifySessionToken,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST() {
  const token = await readSessionCookie();
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) await revokeSession(payload.sid);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
