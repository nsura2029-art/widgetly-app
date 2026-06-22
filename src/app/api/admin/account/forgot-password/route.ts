/**
 * POST /api/admin/account/forgot-password
 *
 * Body: { username }
 *
 * Auth: none. The username is looked up; if it exists and is active,
 * a one-time reset token is generated and returned in the JSON
 * response (along with the expiry). The token's SHA-256 hash is
 * stored in D1 — the plaintext is only known to the requester.
 *
 * This endpoint is the no-email fallback: the response includes a
 * `reset_url` field the requester can copy and use. When email is
 * added later, send that URL via the email channel and remove the
 * `reset_url` from the response.
 *
 * Rate limited: 3 requests / 10 minutes per IP (enforced in
 * issuePasswordResetToken). We do NOT reveal whether the username
 * exists — the response is the same shape either way. The
 * `reset_url` is only present when the user actually exists.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  clientIpFromHeaders,
  issuePasswordResetToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/admin/auth";
import { ForgotPasswordBody } from "@/lib/admin/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: ForgotPasswordBody;
  try {
    body = ForgotPasswordBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const ip = clientIpFromHeaders(req.headers);
  const ua = req.headers.get("user-agent");
  const result = await issuePasswordResetToken(body.username, ip, ua);

  // Same response shape regardless of outcome — never leak whether
  // a username exists.
  if (result.ok) {
    // Build the reset URL from the request's own origin so it works
    // for both production and stage custom domains.
    const origin = new URL(req.url).origin;
    const resetUrl = `${origin}/admin/reset-password?token=${result.token}`;
    return NextResponse.json({
      ok: true,
      reset_url: resetUrl,
      expires_in_minutes: Math.round(PASSWORD_RESET_TTL_MS / 60_000),
    });
  }
  if (result.reason === "rate_limited") {
    return NextResponse.json(
      { error: "Too many reset attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }
  // no_user / disabled — return success shape but no token, so the
  // requester doesn't learn which usernames exist.
  return NextResponse.json({
    ok: true,
    reset_url: null,
    expires_in_minutes: 0,
  });
}
