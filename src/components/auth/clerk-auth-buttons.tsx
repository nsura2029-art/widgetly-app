"use client";

/**
 * ClerkAuthButtons — small wrappers that render Clerk's
 * SignInButton / SignUpButton / UserButton only when Clerk is
 * configured. When the publishable key is missing, render plain
 * <Link>s to the admin sign-in page so the UI doesn't crash.
 *
 * Why lazy: Clerk's component runtime checks throw at static-
 * generation time when the key is missing. Loading Clerk lazily
 * (only after mount, only when configured) avoids the throw.
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type ClerkMod = {
  SignInButton: (props: {
    mode?: "modal";
    forceRedirectUrl?: string;
    children?: React.ReactNode;
  }) => React.JSX.Element;
  SignUpButton: (props: {
    mode?: "modal";
    forceRedirectUrl?: string;
    children?: React.ReactNode;
  }) => React.JSX.Element;
  UserButton: (props: { afterSignOutUrl?: string }) => React.JSX.Element;
};

let cachedMod: ClerkMod | null = null;

function loadClerk(): ClerkMod | null {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  if (!cachedMod) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMod = require("@clerk/nextjs") as ClerkMod;
  }
  return cachedMod;
}

function useClerk(): ClerkMod | null {
  const [clerk, setClerk] = React.useState<ClerkMod | null>(() => loadClerk());
  // loadClerk synchronously returns the module (via require) when
  // configured, so the initial useState already has it. No
  // useEffect needed.
  void clerk;
  void setClerk;
  return clerk;
}

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
  const clerk = useClerk();
  const redirect = useForceRedirectUrl();
  if (!clerk) {
    return (
      <Button asChild variant={variant} size={size}>
        <Link href="/admin/sign-in">{label}</Link>
      </Button>
    );
  }
  const SignInButton = clerk.SignInButton;
  return (
    <SignInButton mode="modal" forceRedirectUrl={redirect}>
      <Button variant={variant} size={size}>
        {label}
      </Button>
    </SignInButton>
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
  const clerk = useClerk();
  const redirect = useForceRedirectUrl();
  if (!clerk) {
    return (
      <Button asChild variant={variant} size={size}>
        <Link href="/admin/sign-in">{label}</Link>
      </Button>
    );
  }
  const SignUpButton = clerk.SignUpButton;
  return (
    <SignUpButton mode="modal" forceRedirectUrl={redirect}>
      <Button variant={variant} size={size}>
        {label}
      </Button>
    </SignUpButton>
  );
}

export function ClerkUserButton() {
  const clerk = useClerk();
  if (!clerk) return null;
  const UserButton = clerk.UserButton;
  return (
    <div className="flex items-center">
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
