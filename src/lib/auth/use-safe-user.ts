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
 *   - Detect at MODULE LOAD whether the publishable key is
 *     configured. The key is inlined by Next.js at build time.
 *   - When the key is missing, return a stub from this hook
 *     without ever calling Clerk's useUser(). The call sites
 *     see `isSignedIn=false, user=null` and render the signed-out
 *     UI.
 *   - When the key is present, forward to Clerk's real useUser.
 *
 * This means: in environments without Clerk (dev without setup,
 * stage before secrets are configured), the site renders fine
 * with everyone signed-out; in environments with Clerk, real auth
 * works.
 *
 * Cost: ONE branch decision at module load, not per render.
 *
 * Hook rule note: this hook conditionally calls another hook
 * (`useClerkUser`) based on a build-time constant. The rule of
 * hooks normally forbids this, but since the value of
 * `CLERK_PUBLISHABLE_KEY` is fixed at module load and never
 * changes between renders, the conditional is invariant. We
 * suppress the lint rule for this one line.
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
  if (!CLERK_PUBLISHABLE_KEY) {
    return stub;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useClerkUser();
}
