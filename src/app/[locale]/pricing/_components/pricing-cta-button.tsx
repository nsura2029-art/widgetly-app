"use client";

/**
 * PricingCtaButton — the action button at the bottom of each
 * pricing card.
 *
 * - When Clerk isn't configured (publishable key missing), the
 *   "registered" tier CTA falls back to a plain link to the admin
 *   sign-in page so the UI still does something useful.
 * - When Clerk IS configured, we lazy-import SignUpButton so the
 *   Clerk runtime checks don't fire during static generation when
 *   the key is absent.
 *
 * Extracted as a client component because Clerk's component
 * runtime needs a browser. The parent page stays a server
 * component.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type ClerkSignUpButton = (props: {
  mode?: "modal" | "redirect";
  children?: React.ReactNode;
}) => React.JSX.Element;

let cachedMod: { SignUpButton: ClerkSignUpButton } | null = null;

function loadSignUpButton(): { SignUpButton: ClerkSignUpButton } | null {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  if (!cachedMod) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMod = require("@clerk/nextjs") as { SignUpButton: ClerkSignUpButton };
  }
  return cachedMod;
}

export function PricingCtaButton({ cta, accent }: { cta: string; accent: "primary" | "default" }) {
  // Lazy-load Clerk on the client. During static generation (no
  // ClerkProvider in the tree) we skip the import entirely so the
  // component renders without touching Clerk's runtime.
  const clerk = typeof window !== "undefined" ? loadSignUpButton() : null;

  if (accent === "primary" && clerk) {
    const SignUpButton = clerk.SignUpButton;
    return (
      <SignUpButton mode="modal">
        <Button className="w-full" size="lg">
          {cta}
        </Button>
      </SignUpButton>
    );
  }
  if (accent === "primary") {
    // Clerk not configured — show a CTA that links to the admin
    // sign-in page so the user can still register when an admin
    // turns on Clerk.
    return (
      <Button asChild className="w-full" size="lg">
        <Link href="/admin/sign-in">{cta}</Link>
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" className="w-full" size="lg">
      <Link href="/">{cta}</Link>
    </Button>
  );
}
