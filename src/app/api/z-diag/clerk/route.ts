import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * GET /api/z-diag/clerk — TEMPORARY diagnostic endpoint.
 *
 * Returns what we see from the Clerk session cookie + what Clerk's
 * auth helpers return when called with this request. Helps debug
 * "user is signed in but /api/suggestions says no" reports.
 *
 * Returns:
 *   cookiesSeen: string[]   — every cookie name from the request
 *   hasClerkSession: boolean — is there a Clerk __session cookie?
 *   authViaRequest:          — getAuth(request) result
 *   envPresent:              — are Clerk env vars present?
 *
 * DO NOT KEEP THIS IN PROD. Remove before going to main.
 */
export async function GET(request: NextRequest) {
  const cookiesSeen = request.cookies.getAll().map((c) => c.name);
  const hasClerkSession = cookiesSeen.includes("__session");

  let authViaRequest: { userId: string | null; sessionId: string | null } = {
    userId: null,
    sessionId: null,
  };
  try {
    const result = getAuth(request);
    authViaRequest = {
      userId: result.userId,
      sessionId: result.sessionId,
    };
  } catch (err) {
    authViaRequest = {
      userId: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      sessionId: null,
    } as { userId: string | null; sessionId: string | null };
  }

  return NextResponse.json({
    cookiesSeen,
    hasClerkSession,
    clerkSessionCookieLength: request.cookies.get("__session")?.value.length ?? 0,
    authViaRequest,
    envPresent: {
      publishableKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      secretKey: Boolean(process.env.CLERK_SECRET_KEY),
    },
  });
}
