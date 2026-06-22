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
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb, safeQuery } from "@/lib/d1/admin";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COOKIE_NAME = "wly_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
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
  // Read from the Cloudflare binding via getCloudflareContext, falling
  // back to a per-process random secret in dev (which invalidates
  // sessions across restarts — fine for local).
  try {
    const { env } = (globalThis as { __cloudflare__?: { env?: Record<string, string> } })
      ?.__cloudflare__ ?? { env: {} as Record<string, string> };
    const fromEnv = env?.ADMIN_SESSION_SECRET;
    if (fromEnv) return fromEnv;
  } catch {
    /* ignore */
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
