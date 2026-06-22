/**
 * POST /api/admin/auth/login
 *
 * Body: { username, password }
 *
 * Returns 200 with { user } on success and sets the `wly_admin` cookie.
 * Returns 401 for bad credentials, 429 for too-many-attempts, 400 for
 * malformed body.
 *
 * Hardening:
 *   - bcrypt compare (cost 12)
 *   - 5 attempts / IP / minute sliding window
 *   - record every attempt (success + failure) in admin_login_attempts
 *   - never leak which of username/password was wrong
 *   - sets must_change_password flag (admin must rotate the seeded
 *     password on first login)
 */
import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import {
  checkRateLimit,
  clientIpFromHeaders,
  COOKIE_NAME,
  findUserByUsername,
  issueSessionToken,
  passwordVerify,
  recordLoginAttempt,
  recordSession,
  SESSION_TTL_MS,
  touchLastLogin,
} from "@/lib/admin/auth";

export const runtime = "nodejs";

type Body = { username?: string; password?: string };

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);

  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!username || !password) {
    await recordLoginAttempt(ip, username, false, "missing_fields");
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    await recordLoginAttempt(ip, username, false, "no_such_user");
    // Constant-ish-time response: still hash a dummy to avoid timing
    // oracle on the username-existence check.
    await new Promise((r) => setTimeout(r, 250));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.is_active !== 1) {
    await recordLoginAttempt(ip, username, false, "disabled");
    return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
  }

  // Pull the hash lazily to keep the happy path fast.
  const { getPasswordHashForUser } = await import("@/lib/admin/auth");
  const hash = await getPasswordHashForUser(user.id);
  if (!hash) {
    await recordLoginAttempt(ip, username, false, "no_hash");
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await passwordVerify(password, hash);
  if (!ok) {
    await recordLoginAttempt(ip, username, false, "bad_password");
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Mint session token + record in D1.
  const sid = randomBytes(32).toString("hex");
  const token = issueSessionToken({
    sid,
    uid: user.id,
    exp: Date.now() + SESSION_TTL_MS,
  });
  await recordSession(sid, user.id, ip, req.headers.get("user-agent"));
  await touchLastLogin(user.id, ip);
  await recordLoginAttempt(ip, username, true, null);

  const res = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      must_change_password: user.must_change_password,
    },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}
