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
 *   time). The trade-off is that Clerk's `auth()` shortcut — which reads
 *   from AsyncLocalStorage populated by clerkMiddleware — does NOT work
 *   here. Instead, every API route that needs the current user must
 *   pass the `NextRequest` to `getUser(request)` / `requireUser(request)`
 *   so we can call `getAuth(request)`, which reads the session cookie
 *   directly and validates it against the Clerk API.
 */
import { auth, currentUser, getAuth } from "@clerk/nextjs/server";
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
 * (API routes always do). This uses Clerk's `getAuth(request)` which
 * reads the session cookie directly — it works without clerkMiddleware,
 * which is the situation in this app's worker bundle.
 *
 * Without a request, this falls back to Clerk's `auth()` shortcut. That
 * path needs clerkMiddleware and will return null in our setup; it's
 * kept as a best-effort fallback for places that don't have a request
 * (e.g. server components called outside route handlers).
 */
export async function getUser(request?: NextRequest): Promise<AuthedUser | null> {
  try {
    const a = request ? getAuth(request) : await auth();
    // TEMP DIAG — log in all envs so we can see what's happening on stage.
    console.warn(
      "[auth:diag] path=%s userId=%s sessionId=%s cookies=%s",
      request ? "getAuth(request)" : "auth()",
      a.userId ?? "null",
      a.sessionId ?? "null",
      request
        ? request.cookies
            .getAll()
            .map((c) => c.name)
            .join(",")
        : "(no req)"
    );
    if (!a.userId) return null;
    return await loadUser(a.userId);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] getUser failed, treating as signed out:", err);
    }
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

async function loadUser(userId: string): Promise<AuthedUser> {
  // Prefer the explicit `getAuth` route so we don't accidentally
  // re-trigger `auth()` and lose the request context.
  const user = await currentUser();
  if (!user) {
    // Defensive: auth() said userId is set but currentUser() came
    // back null. This can happen briefly during session
    // transitions. Return a stub.
    return { userId, email: null, displayName: userId.slice(0, 8) };
  }
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const first = user.firstName ?? "";
  const last = user.lastName ?? "";
  const full = `${first} ${last}`.trim();
  const displayName = full || user.username || userId.slice(0, 8);
  return { userId, email, displayName };
}
