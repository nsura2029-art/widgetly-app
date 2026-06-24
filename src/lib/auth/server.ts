/**
 * Server-side auth helpers. Thin wrappers around Clerk's `auth()`
 * that give us a stable, project-specific shape and a single place
 * to handle the "not signed in" case.
 *
 * Why a project-specific helper:
 *   - Components can `import { requireUser } from "@/lib/auth/server"`
 *     and get a typed result without knowing about Clerk's API.
 *   - Easier to mock in tests: replace the helper rather than
 *     every call site that imports Clerk.
 *   - Centralizes the email-extraction logic (Clerk primary email
 *     vs. fallback to `null`) so the suggest API doesn't have to
 *     duplicate the work.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/api/responses";

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
 * Return the current user, or null if not signed in. Cheap — just
 * a JWT check, no DB hit. Use this in pages that should render
 * different content for signed-in vs signed-out visitors.
 *
 * IMPORTANT: Clerk's `auth()` can throw in some edge cases (missing
 * env vars, middleware issues, network blips reaching the Clerk API).
 * For our use case, any failure to determine the current user
 * should be treated as "not signed in" — never as a 500. Pages and
 * routes that need a signed-in user should call `requireUser()`
 * which throws a proper HttpError(401).
 */
export async function getUser(): Promise<AuthedUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    return await loadUser(userId);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] getUser failed, treating as signed out:", err);
    }
    return null;
  }
}

/**
 * Same as getUser but throws if not signed in. Use in API routes
 * that require auth (POST /api/suggest, etc.). The thrown error
 * is caught by withErrorHandling and returned as 401.
 */
export async function requireUser(): Promise<AuthedUser> {
  const u = await getUser();
  if (!u) {
    throw new HttpError(401, "unauthorized", "Sign in to submit a suggestion.");
  }
  return u;
}

async function loadUser(userId: string): Promise<AuthedUser> {
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
