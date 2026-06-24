/**
 * Server-side auth helpers. Thin wrappers around Clerk that give us a
 * stable, project-specific shape and a single place to handle the
 * "not signed in" case.
 *
 * Why a project-specific helper:
 *   - Components can `import { requireUser } from "@/lib/auth/server"`
 *     and get a typed result without knowing about Clerk's API.
 *   - Easier to mock in tests: replace the helper rather than every
 *     call site that imports Clerk.
 *   - Centralizes the email-extraction logic (Clerk primary email vs.
 *     fallback to `null`) so the suggest API doesn't have to duplicate
 *     the work.
 *
 * IMPORTANT — Clerk middleware status in this app:
 *   We deliberately do NOT register `clerkMiddleware` in src/middleware.ts
 *   because importing it in the workerd bundle makes the worker fail to
 *   boot (Clerk's SDK pulls `node:crypto.webcrypto` etc. at module-load
 *   time). The trade-off is that Clerk's `auth()` and `getAuth()`
 *   helpers — which both rely on AsyncLocalStorage populated by
 *   clerkMiddleware — do NOT work in our setup.
 *
 * Instead, every API route that needs the current user passes its
 * `NextRequest` to `getUser(request)` / `requireUser(request)`, which
 * reads the `__session` cookie directly and verifies it via
 * `@clerk/backend`'s `verifyToken`. This works without clerkMiddleware
 * and gives us the verified `sub` (userId). We then fetch the user's
 * email/name via `clerkClient()`.
 */
import { clerkClient, currentUser, verifyToken } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/api/responses";
import type { NextRequest } from "next/server";

export type AuthedUser = {
  /** Clerk user id, e.g. `user_2abc...`. */
  userId: string;
  /** Primary email address (verified). Null if the user has no
   *  verified email on file. */
  email: string | null;
  /** Display name. Falls back to firstName + lastName, then
   *  username, then userId-prefix. Never null. */
  displayName: string;
};

/**
 * Return the current user, or null if not signed in.
 *
 * Pass the `NextRequest` from the route handler if you have one
 * (API routes always do). This is the supported path in this app —
 * see the file header for why we can't use Clerk's auth() shortcut.
 *
 * Without a request, this falls back to Clerk's `currentUser()`
 * (which also requires clerkMiddleware and is effectively broken
 * in our setup). It's kept only as a best-effort fallback.
 */
export async function getUser(request?: NextRequest): Promise<AuthedUser | null> {
  try {
    if (request) {
      const userId = await verifySessionFromRequest(request);
      if (!userId) return null;
      return await loadUser(userId);
    }
    // Fallback path — only works when clerkMiddleware is registered,
    // which is currently never in our worker. Kept for completeness.
    const u = await currentUser();
    if (!u) return null;
    return shapeUser(u);
  } catch (err) {
    console.warn("[auth] getUser failed, treating as signed out:", err);
    return null;
  }
}

/**
 * Same as getUser but throws if not signed in. Use in API routes
 * that require auth (POST /api/suggestions, etc.). The thrown error
 * is caught by withErrorHandling and returned as 401.
 */
export async function requireUser(request?: NextRequest): Promise<AuthedUser> {
  const u = await getUser(request);
  if (!u) {
    throw new HttpError(401, "unauthorized", "Sign in to submit a suggestion.");
  }
  return u;
}

/**
 * Verify the Clerk session JWT from the request's __session cookie.
 * Returns the userId (sub claim) if valid, null if missing/invalid.
 *
 * This is the workaround for Clerk v7 requiring clerkMiddleware even
 * when you have the request in hand. `verifyToken` does the same
 * JWT validation + JWKS lookup that `getAuth(request)` would do, but
 * without the AsyncLocalStorage requirement.
 */
async function verifySessionFromRequest(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("__session")?.value ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!sessionToken) return null;

  const payload = await verifyToken(sessionToken, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  // verifyToken returns null when the token is invalid/expired/wrong
  // audience. Anything else means we have a verified sub claim.
  if (!payload) return null;
  return payload.sub ?? null;
}

async function loadUser(userId: string): Promise<AuthedUser> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return shapeUser(user);
  } catch (err) {
    // Defensive: the JWT is valid (we just verified it) but fetching
    // the user from Clerk's API failed. Fall back to a stub.

    console.warn("[auth] loadUser via clerkClient failed, returning stub:", err);
    return { userId, email: null, displayName: userId.slice(0, 8) };
  }
}

function shapeUser(user: {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): AuthedUser {
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const first = user.firstName ?? "";
  const last = user.lastName ?? "";
  const full = `${first} ${last}`.trim();
  const displayName = full || user.username || user.id.slice(0, 8);
  return { userId: user.id, email, displayName };
}
