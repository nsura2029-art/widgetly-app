/**
 * Custom auth for the /admin/* dashboard.
 *
 * Deliberately does NOT use Clerk, NextAuth, or any other framework —
 * the admin stack is fully isolated from the public site's auth. This
 * is a defense-in-depth boundary: even if a public-side auth bug lets
 * an attacker forge a session, they still can't reach /admin/*.
 *
 * Components
 * ──────────
 *   1. passwordHash() / passwordVerify() — bcryptjs (cost 12)
 *   2. issueSessionToken() / verifySessionToken() — HMAC-SHA256 over a
 *      JSON payload, encoded as `<payload>.<sig>` base64url
 *   3. recordSession() / isSessionValid() / revokeSession() — D1-backed
 *      session rows so we can revoke a session before its expiry
 *   4. requireAdminFromRequest() — gate used by every /api/admin/* handler
 *   5. checkRateLimit() — 5 attempts per IP per minute
 *
 * Cookie shape
 * ────────────
 *   Name:    `wly_admin`
 *   Flags:   HttpOnly · Secure · SameSite=Strict · Path=/ · Max-Age=7d
 *   Value:   `<sessionId>.<HMAC>` (compact, no JSON wrapping)
 *
 * The HMAC key is `ADMIN_SESSION_SECRET` — set in wrangler as a
 * secret (NOT in .env). See scripts/setup-cloudflare-secrets.mjs.
 */
import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, safeQuery } from "@/lib/d1/admin";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COOKIE_NAME = "wly_admin";
export const CSRF_COOKIE_NAME = "wly_admin_csrf";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity
export const BCRYPT_COST = 12;
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX = 5; // 5 attempts per window per IP

// Status enums — mirrored from the CHECK constraints in 0004_admin.sql.
export type ToolStatus =
  | "suggested"
  | "under_review"
  | "in_progress"
  | "live"
  | "deprecated"
  | "rejected";

export const TOOL_STATUSES: ReadonlyArray<ToolStatus> = [
  "suggested",
  "under_review",
  "in_progress",
  "live",
  "deprecated",
  "rejected",
];

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function passwordHash(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function passwordVerify(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// HMAC-signed session token
// ---------------------------------------------------------------------------
// Format: base64url(JSON({sid, uid, exp})).base64url(HMAC-SHA256(payload, secret))
// Compact, signed, and doesn't require a JWT lib to parse.

type SessionPayload = {
  /** Session row id (D1 admin_sessions.id) */
  sid: string;
  /** Admin user id (D1 admin_users.id) */
  uid: number;
  /** Expiry, ms epoch */
  exp: number;
};

let devSecret: string | null = null;
function getSecret(): string {
  // Read from the Cloudflare binding via getCloudflareContext (the
  // canonical way to access env vars in OpenNext on Cloudflare).
  // Fall back to a per-process random secret in dev (which invalidates
  // sessions across restarts — fine for local).
  //
  // IMPORTANT: do NOT read from `globalThis.__cloudflare__` — that
  // object doesn't exist in OpenNext's runtime, so the lookup always
  // misses and we fall through to the dev secret. With Workers Free /
  // multi-region, different Worker instances use different random
  // secrets, so a token signed on instance A fails verification on
  // instance B. This caused the bug where /api/admin/auth/login
  // succeeded but every subsequent request (including /api/admin/auth/me
  // and the admin pages' server-side auth check) returned 401 —
  // because each request landed on a different Worker instance.
  try {
    const { env } = getCloudflareContext();
    const fromEnv = (env as { ADMIN_SESSION_SECRET?: string })?.ADMIN_SESSION_SECRET;
    if (fromEnv) return fromEnv;
  } catch {
    /* ignore — local dev without OpenNext shim */
  }
  if (!devSecret) devSecret = randomBytes(32).toString("hex");
  return devSecret;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function issueSessionToken(payload: SessionPayload): string {
  const data = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", getSecret()).update(data).digest());
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = b64url(createHmac("sha256", getSecret()).update(data).digest());
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(data).toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof payload.sid !== "string" ||
    typeof payload.uid !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp < Date.now()) return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Cookie helpers — Next.js cookies() API
// ---------------------------------------------------------------------------

export async function readSessionCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value ?? null;
  } catch {
    // cookies() can only be called from a request context; callers
    // outside one (e.g. scripts) treat null as "no session".
    return null;
  }
}

export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  store.set({ name: CSRF_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
}

// ---------------------------------------------------------------------------
// CSRF token
// ---------------------------------------------------------------------------
// Belt-and-suspenders CSRF: even though the session cookie is
// SameSite=Strict (so cross-site requests never include it), we
// require a separate non-HttpOnly cookie carrying a token that the
// client must echo back as `x-csrf-token` on every state-changing
// request. A cross-site attacker can't read this cookie (it lives
// in the user's browser), so they can't forge the header.
//
// The token is generated on sign-in and rotated on every login.
// On logout we clear both cookies.
//
// Token format: 32 random bytes, base64url. Stored client-side in
// `wly_admin_csrf` (NOT HttpOnly so the JS can read it). The header
// value on state-changing requests is the exact same string.

export function mintCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function readCsrfCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(CSRF_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function writeCsrfCookie(token: string): Promise<void> {
  const store = await cookies();
  // NOT HttpOnly — the client must read this to send the header.
  // SameSite=Strict so cross-site reads never happen.
  store.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function requireCsrfHeader(req: Request): Promise<boolean> {
  const cookie = await readCsrfCookie();
  if (!cookie) return false;
  const header = req.headers.get("x-csrf-token");
  if (!header) return false;
  // Constant-time compare to avoid timing oracles.
  if (cookie.length !== header.length) return false;
  try {
    return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// D1-backed session lifecycle
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: number;
  username: string;
  display_name: string;
  is_active: 0 | 1;
  must_change_password: 0 | 1;
};

export async function findUserByUsername(username: string): Promise<AdminUser | null> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT id, username, display_name, is_active, must_change_password
           FROM admin_users WHERE username = ?1 COLLATE NOCASE LIMIT 1`
        )
        .bind(username)
        .first<AdminUser>(),
    null
  );
}

export async function findUserById(id: number): Promise<AdminUser | null> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT id, username, display_name, is_active, must_change_password
           FROM admin_users WHERE id = ?1 LIMIT 1`
        )
        .bind(id)
        .first<AdminUser>(),
    null
  );
}

export async function getPasswordHashForUser(userId: number): Promise<string | null> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(`SELECT password_hash FROM admin_users WHERE id = ?1 LIMIT 1`)
        .bind(userId)
        .first<{ password_hash: string }>()
        .then((r) => r?.password_hash ?? null),
    null
  );
}

export async function recordSession(
  sid: string,
  userId: number,
  ip: string | null,
  userAgent: string | null
): Promise<void> {
  const db = getDb();
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db
    .prepare(
      `INSERT INTO admin_sessions (id, user_id, ip, user_agent, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(sid, userId, ip, userAgent, expires)
    .run();
}

export async function isSessionValid(sid: string): Promise<boolean> {
  const db = getDb();
  return safeQuery(async () => {
    const row = await db
      .prepare(`SELECT expires_at, revoked_at FROM admin_sessions WHERE id = ?1 LIMIT 1`)
      .bind(sid)
      .first<{ expires_at: string; revoked_at: string | null }>();
    if (!row) return false;
    if (row.revoked_at) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;
    return true;
  }, false);
}

export async function revokeSession(sid: string): Promise<void> {
  const db = getDb();
  await safeQuery(async () => {
    await db
      .prepare(`UPDATE admin_sessions SET revoked_at = ?1 WHERE id = ?2`)
      .bind(new Date().toISOString(), sid)
      .run();
  }, null);
}

export async function touchLastLogin(userId: number, ip: string | null): Promise<void> {
  const db = getDb();
  await safeQuery(async () => {
    await db
      .prepare(
        `UPDATE admin_users SET last_login_at = ?1, last_login_ip = ?2, updated_at = ?1
         WHERE id = ?3`
      )
      .bind(new Date().toISOString(), ip, userId)
      .run();
  }, null);
}

// ---------------------------------------------------------------------------
// Rate limiting + login attempts
// ---------------------------------------------------------------------------

export async function checkRateLimit(ip: string): Promise<{ ok: boolean; remaining: number }> {
  const db = getDb();
  return safeQuery(
    async () => {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS n FROM admin_login_attempts
         WHERE ip = ?1 AND created_at > ?2`
        )
        .bind(ip, since)
        .first<{ n: number }>();
      const n = row?.n ?? 0;
      return { ok: n < RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - n) };
    },
    { ok: true, remaining: RATE_LIMIT_MAX }
  );
}

export async function recordLoginAttempt(
  ip: string,
  username: string,
  success: boolean,
  reason: string | null
): Promise<void> {
  const db = getDb();
  await safeQuery(async () => {
    await db
      .prepare(
        `INSERT INTO admin_login_attempts (ip, username, success, reason)
         VALUES (?1, ?2, ?3, ?4)`
      )
      .bind(ip, username, success ? 1 : 0, reason)
      .run();
  }, null);
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}

// ---------------------------------------------------------------------------
// requireAdminFromRequest — gate for /api/admin/* handlers
// ---------------------------------------------------------------------------

export type AuthContext = {
  user: AdminUser;
  sessionId: string;
};

/**
 * Validates the session cookie, the D1 session row, and the user
 * account. Returns the user + session id on success; null otherwise.
 */
export async function requireAdminFromRequest(): Promise<AuthContext | null> {
  const token = await readSessionCookie();
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const valid = await isSessionValid(payload.sid);
  if (!valid) return null;
  const user = await findUserById(payload.uid);
  if (!user || user.is_active !== 1) return null;
  return { user, sessionId: payload.sid };
}

// ---------------------------------------------------------------------------
// Password change + reset (admin account self-service)
// ---------------------------------------------------------------------------

/** Token TTL for password reset links (1 hour). */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** Minimum password length for new passwords. */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Change the password for the currently-authenticated admin. Requires
 * the current password to confirm identity (defense against stolen
 * session cookies on shared/lost devices). Clears the
 * `must_change_password` flag on success.
 */
export async function changePassword(
  userId: number,
  currentPlain: string,
  newPlain: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPlain.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (newPlain === currentPlain) {
    return { ok: false, error: "New password must be different from the current one" };
  }
  const db = getDb();
  const row = await safeQuery(
    () =>
      db
        .prepare(`SELECT password_hash FROM admin_users WHERE id = ?1 LIMIT 1`)
        .bind(userId)
        .first<{ password_hash: string }>(),
    null
  );
  if (!row) return { ok: false, error: "Account not found" };
  const ok = await passwordVerify(currentPlain, row.password_hash);
  if (!ok) return { ok: false, error: "Current password is incorrect" };
  const newHash = await passwordHash(newPlain);
  await safeQuery(
    () =>
      db
        .prepare(
          `UPDATE admin_users
             SET password_hash = ?1,
                 must_change_password = 0,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?2`
        )
        .bind(newHash, userId)
        .run(),
    null
  );
  return { ok: true };
}

export type PasswordResetOutcome =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; reason: "no_user" | "disabled" | "rate_limited" };

/**
 * Issue a one-time password-reset token for the given username.
 *
 * Stores only the SHA-256 hash of the token in D1 (the plaintext is
 * returned in the response — currently used by the no-email fallback
 * where the requester copies the link). Invalidates any pre-existing
 * unused tokens for this user by setting used_at on them.
 */
export async function issuePasswordResetToken(
  username: string,
  ip: string | null,
  userAgent: string | null
): Promise<PasswordResetOutcome> {
  const user = await findUserByUsername(username);
  if (!user) return { ok: false, reason: "no_user" };
  if (user.is_active !== 1) return { ok: false, reason: "disabled" };

  if (ip) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const db = getDb();
    const n = await safeQuery(
      () =>
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM admin_password_resets WHERE ip = ?1 AND created_at > ?2`
          )
          .bind(ip, since)
          .first<{ n: number }>(),
      null
    );
    if ((n?.n ?? 0) >= 3) return { ok: false, reason: "rate_limited" };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

  const db = getDb();
  await safeQuery(async () => {
    await db
      .prepare(
        `UPDATE admin_password_resets SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE user_id = ?1 AND used_at IS NULL`
      )
      .bind(user.id)
      .run();
    await db
      .prepare(
        `INSERT INTO admin_password_resets
             (user_id, token_hash, expires_at, ip, user_agent)
           VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(user.id, tokenHash, expiresAt, ip, userAgent)
      .run();
  }, null);
  return { ok: true, token, expiresAt };
}

/**
 * Validate a reset token + write a new password to the user account.
 */
export async function consumePasswordResetToken(
  token: string,
  newPlain: string
): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  if (newPlain.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const row = await safeQuery(
    () =>
      db
        .prepare(
          `SELECT id, user_id, expires_at, used_at
             FROM admin_password_resets WHERE token_hash = ?1 LIMIT 1`
        )
        .bind(tokenHash)
        .first<{ id: number; user_id: number; expires_at: string; used_at: string | null }>(),
    null
  );
  if (!row) return { ok: false, error: "Invalid or expired reset link" };
  if (row.used_at) return { ok: false, error: "This reset link has already been used" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This reset link has expired" };
  }
  const newHash = await passwordHash(newPlain);
  await safeQuery(async () => {
    await db
      .prepare(
        `UPDATE admin_users
             SET password_hash = ?1,
                 must_change_password = 0,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?2`
      )
      .bind(newHash, row.user_id)
      .run();
    await db
      .prepare(
        `UPDATE admin_password_resets
             SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?1`
      )
      .bind(row.id)
      .run();
  }, null);
  return { ok: true, userId: row.user_id };
}
