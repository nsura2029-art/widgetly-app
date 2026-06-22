/**
 * GET /api/admin/csrf-token
 *
 * Returns the current CSRF token (read from the non-HttpOnly
 * `wly_admin_csrf` cookie). The client uses this to populate the
 * `x-csrf-token` header on PATCH/POST/DELETE calls.
 *
 * If no CSRF cookie is present, this is treated as a fresh visitor
 * and we mint a new one (in a Set-Cookie response). The token
 * itself is also returned in the JSON body so the client can use
 * it before the cookie actually lands (e.g. when the cookie was
 * just set by /api/admin/account/password in a prior response).
 *
 * Auth not required — the cookie is set unauthenticated, but the
 * header check on state-changing endpoints is what actually
 * protects against CSRF.
 */
import { NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, mintCsrfToken, readCsrfCookie, writeCsrfCookie } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET() {
  let token = await readCsrfCookie();
  const res = NextResponse.json({ token });
  if (!token) {
    token = mintCsrfToken();
    await writeCsrfCookie(token);
    res.headers.append(
      "Set-Cookie",
      // Mirror writeCsrfCookie's params but as a raw header so we can
      // append it without overwriting other Set-Cookie responses.
      `${CSRF_COOKIE_NAME}=${token}; Path=/; Max-Age=86400; SameSite=Strict; Secure`
    );
  }
  return res;
}
