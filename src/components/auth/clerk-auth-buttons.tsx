"use client";

/**
 * ClerkAuthButtons — small wrappers that render Clerk's
 * SignInButton / SignUpButton / UserButton.
 *
 * When Clerk isn't configured (no publishable key at build time),
 * the buttons render `null` so the public header / pricing CTA /
 * suggest gate don't show user-facing auth UI. Admin sign-in lives
 * at /admin/sign-in and is reachable directly — it's never
 * surfaced from the public site.
 *
 * Why static imports (not `require()`):
 *   Clerk's SignInButton / SignUpButton / UserButton read from
 *   the ClerkProvider React context. If the lazy `require()` path
 *   resolves to a different module instance than the one used by
 *   <ClerkProvider> in src/app/[locale]/layout.tsx, the contexts
 *   don't match and Clerk throws "SignInButton can only be used
 *   within the <ClerkProvider /> component" at render time. Static
 *   imports guarantee the same module instance. The build-time
 *   guard (CLERK_ENABLED) means we still don't call into Clerk at
 *   render time when the keys are missing.
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  SignInButton as ClerkSignInBtn,
  SignUpButton as ClerkSignUpBtn,
  UserButton as ClerkUserBtn,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function useForceRedirectUrl(): string | undefined {
  const pathname = usePathname();
  if (typeof window === "undefined") return undefined;
  return window.location.origin + pathname;
}

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

export function ClerkSignInButton({
  label,
  variant = "default",
  size = "lg",
}: {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const redirect = useForceRedirectUrl();
  if (!CLERK_ENABLED) return null;
  return (
    <ClerkSignInBtn mode="modal" forceRedirectUrl={redirect}>
      <Button variant={variant} size={size}>
        {label}
      </Button>
    </ClerkSignInBtn>
  );
}

export function ClerkSignUpButton({
  label,
  variant = "outline",
  size = "lg",
}: {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const redirect = useForceRedirectUrl();
  if (!CLERK_ENABLED) return null;
  return (
    <ClerkSignUpBtn mode="modal" forceRedirectUrl={redirect}>
      <Button variant={variant} size={size}>
        {label}
      </Button>
    </ClerkSignUpBtn>
  );
}

export function ClerkUserButton() {
  if (!CLERK_ENABLED) return null;
  return (
    <div className="flex items-center">
      <ClerkUserBtn />
    </div>
  );
}
