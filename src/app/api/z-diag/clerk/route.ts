import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * GET /api/z-diag/clerk — TEMPORARY diagnostic endpoint.
 *
 * Returns what we see from the Clerk session cookie + what
 * verifyToken returns for it. Helps debug "user is signed in
 * but /api/suggestions says no" reports.
 *
 * Returns:
 *   cookiesSeen: string[]          — every cookie name from the request
 *   hasClerkSession: boolean       — is there a Clerk __session cookie?
 *   clerkSessionCookieLength: int  — how long the cookie value is
 *   verifyTokenResult:             — what verifyToken() returns
 *   envPresent:                    — are Clerk env vars set in the worker?
 *
 * DO NOT KEEP THIS IN PROD. Remove before going to main.
 */
export async function GET(request: NextRequest) {
  const cookiesSeen = request.cookies.getAll().map((c) => c.name);
  const sessionCookie = request.cookies.get("__session")?.value;
  const hasClerkSession = Boolean(sessionCookie);

  let verifyTokenResult: unknown = null;
  let verifyTokenError: string | null = null;
  if (sessionCookie) {
    try {
      verifyTokenResult = await verifyToken(sessionCookie, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (err) {
      verifyTokenError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    cookiesSeen,
    hasClerkSession,
    clerkSessionCookieLength: sessionCookie?.length ?? 0,
    verifyTokenResult: verifyTokenResult
      ? {
          hasPayload: true,
          sub: (verifyTokenResult as { sub?: string }).sub ?? null,
        }
      : null,
    verifyTokenError,
    envPresent: {
      publishableKey: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      secretKey: Boolean(process.env.CLERK_SECRET_KEY),
    },
  });
}
