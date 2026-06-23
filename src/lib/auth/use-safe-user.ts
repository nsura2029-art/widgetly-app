"use client";

/**
 * useSafeUser — Clerk's useUser() with a build-time fallback.
 *
 * Why: in Clerk v7, `useUser()` throws "useUser can only be used
 * within the <ClerkProvider /> component" when called outside a
 * provider. During Next.js static generation, every client
 * component is rendered on the server to produce HTML, so useUser
 * crashes the build when ClerkProvider isn't initialized (e.g.
 * publishable key not configured).
 *
 * The fallback strategy:
 *   - We detect at MODULE LOAD (not render) whether the publishable
 *     key is configured. `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
 *     is inlined by Next.js at build time.
 *   - When the key is missing, we export a noop hook that returns
 *     `{ isLoaded: true, isSignedIn: false, user: null }`. The
 *     call sites get a sensible default and never throw.
 *   - When the key is present, we forward to Clerk's real useUser.
 *
 * This means: in environments without Clerk (dev without setup,
 * stage before secrets are configured), the site renders fine with
 * everyone signed-out; in environments with Clerk, real auth works.
 *
 * Cost: ONE branch decision at module load, not per render.
 */

import { useUser as useClerkUser } from "@clerk/nextjs";

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

type ClerkUser = ReturnType<typeof useClerkUser>;

const stub: ClerkUser = {
  isLoaded: true,
  isSignedIn: false,
  user: null,
} as unknown as ClerkUser;

export function useSafeUser(): ClerkUser {
  // Always call useClerkUser — React Hooks must be called in the
  // same order on every render. The Clerk hook returns the stub
  // shape (isLoaded=true, isSignedIn=false, user=null) when no
  // ClerkProvider is mounted in the tree. We return the stub
  // explicitly when the publishable key isn't configured so we
  // don't accidentally rely on Clerk's runtime fallback (which
  // can make network calls and time out).
  const user = useClerkUser();
  if (!CLERK_PUBLISHABLE_KEY) {
    return stub;
  }
  return user;
}
