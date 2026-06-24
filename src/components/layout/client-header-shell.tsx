"use client";

/**
 * Client shell for the site header — all the interactive bits that
 * need hooks / event handlers.
 *
 * ## Architecture
 *
 *  - Server (`client-header.tsx`)  →  fetches `getHeaderToolsData()`
 *  - Client (this file)            →  renders the chrome and the
 *                                      mega menu / mobile sheet /
 *                                      Clerk auth UI.
 *
 * ## State machines
 *
 *  1. **Desktop mega menu** — managed by `useMegaMenu`. The trigger
 *     button uses the standard mega-menu pattern:
 *       - hover: open immediately
 *       - leave: schedule close (120ms) — gives the cursor time
 *         to traverse the gap between the trigger and the panel
 *       - re-enter (button OR panel): cancel the pending close
 *       - click: toggle
 *       - Esc: close immediately
 *       - resize past md: close immediately
 *       - route change: close immediately
 *
 *  2. **Mobile sheet** — managed by `useState` (the sheet is either
 *     open or closed, no hover state). The Tools section is its own
 *     accordion (`MobileNav` owns the per-category open state).
 *
 *  3. **Body scroll lock** — `document.body.style.overflow = "hidden"`
 *     while the mobile sheet is open. Restored on close + on unmount.
 *
 *  4. **Auth UI** — `useSafeUser()` returns a build-time stub when
 *     the Clerk publishable key is missing. The desktop CTA section
 *     renders skeleton → sign-in/sign-up → user-button as the Clerk
 *     context resolves. The mobile sheet gets the same auth state
 *     via the `auth` prop so it can render the same UI inside the
 *     slide-down panel.
 *
 * ## Why one slug ("tools") for the mega menu
 *
 *  The header has a single "Tools" trigger that opens the category-
 *  tiles panel. The `useMegaMenu` hook supports multiple slugs (used
 *  by the `tools-banner` chips below), but the header only ever
 *  opens one panel. We still go through the hook so the hover-
 *  tolerance, Esc-to-close, and route-change logic are all shared
 *  with the banner.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Lightbulb, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  ClerkSignInButton,
  ClerkSignUpButton,
  ClerkUserButton,
} from "@/components/auth/clerk-auth-buttons";
import { Logo } from "@/components/shared/logo";
import { Link, usePathname } from "@/i18n/navigation";
import { useSafeUser } from "@/lib/auth/use-safe-user";
import { useMegaMenu } from "@/hooks/use-mega-menu";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

import { HeaderMegaPanel } from "./header-mega-panel";
import { MobileNav } from "./mobile-nav";

export type ClientHeaderShellProps = {
  categories: readonly HeaderCategory[];
};

const MEGA_PANEL_ID = "header-tools-mega-panel";
const TOOLS_SLUG = "tools";
const MD_BREAKPOINT = 768;

export function ClientHeaderShell({ categories }: ClientHeaderShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations();
  const mega = useMegaMenu();
  // useSafeUser() is a Clerk-v7-safe wrapper that returns a stub
  // when the publishable key env var is missing, so the header
  // renders the signed-out UI even before Clerk is configured.
  const { isLoaded, isSignedIn } = useSafeUser();

  // ------------------------------------------------------------------
  // Close both UIs when the viewport grows past the md breakpoint.
  // Without this, opening the mobile sheet on a phone, then rotating
  // to landscape, would leave the sheet open with no close button
  // visible (it's hidden on md+).
  // ------------------------------------------------------------------
  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= MD_BREAKPOINT) {
        setMobileOpen(false);
        mega.close();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mega]);

  // ------------------------------------------------------------------
  // Lock body scroll while the mobile sheet is open. The mobile
  // sheet can grow to 85vh, and the page behind it shouldn't be
  // scrollable — the user expects the sheet to feel like a modal.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // ------------------------------------------------------------------
  // Close both UIs on route change. The new page should always
  // start with the header chrome in its default state.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    setMobileOpen(false);
    mega.close();
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [pathname, mega]);

  // ------------------------------------------------------------------
  // Esc closes the desktop mega panel immediately (no close delay).
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (mega.openSlug === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") mega.close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mega.openSlug, mega]);

  const isMegaOpen = mega.openSlug === TOOLS_SLUG;
  const navLinks = [
    { href: "/leaderboard", label: t("header.nav.leaderboard") },
    { href: "/top-suggesters", label: t("header.nav.topSuggesters") },
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "border-border/70 sticky top-0 z-50 w-full border-b bg-white transition-shadow duration-300"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-2">
        {/* Brand mark — links to the locale home */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={t("header.aria.homeLink", { siteName: t("site.name") })}
        >
          <Logo showWordmark={false} />
          <span className="text-lg font-semibold">{t("site.name")}</span>
        </Link>

        {/* Desktop nav: Tools mega-menu trigger + primary links */}
        <nav
          className="hidden md:flex md:items-center md:gap-1"
          aria-label={t("header.aria.mainNav")}
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMegaOpen}
            aria-controls={MEGA_PANEL_ID}
            aria-label={t("header.aria.toolsMenu")}
            onClick={() => mega.toggle(TOOLS_SLUG)}
            onMouseEnter={() => mega.open(TOOLS_SLUG)}
            onMouseLeave={mega.scheduleClose}
            onFocus={() => mega.open(TOOLS_SLUG)}
            className={cn(
              "hover:text-foreground hover:bg-muted/5 text-muted inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isMegaOpen && "bg-muted/5 text-foreground"
            )}
          >
            <span>{t("header.tools.trigger")}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 opacity-60 transition-transform",
                isMegaOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground hover:bg-muted/5 text-muted rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA: Suggest a Tool + Clerk auth UI */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="outline" size="sm" className="h-9 gap-2 rounded-lg">
            <Link href="/suggest" aria-label={t("header.aria.suggestTool")}>
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("header.actions.suggestTool")}</span>
            </Link>
          </Button>
          {!isLoaded ? (
            // Skeleton while Clerk resolves. The ClerkSignInButton
            // helpers lazy-load, so once loaded the buttons appear.
            <div className="bg-muted/30 h-9 w-32 animate-pulse rounded-lg" />
          ) : !isSignedIn ? (
            <>
              <ClerkSignInButton
                label={t("header.actions.signIn")}
                variant="ghost"
                size="sm"
              />
              <ClerkSignUpButton
                label={t("header.actions.signUp")}
                variant="outline"
                size="sm"
              />
            </>
          ) : (
            <ClerkUserButton />
          )}
        </div>

        {/* Mobile: hamburger only (Sheet renders the rest below) */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? t("header.aria.closeMenu") : t("header.aria.openMenu")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="border-border text-foreground hover:bg-muted/5 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white/60 backdrop-blur transition-colors hover:bg-white"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile sheet — slides down below the header on small screens */}
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        primaryLinks={navLinks}
        auth={{
          // Coerce Clerk's optional booleans to strict booleans so
          // the MobileNav prop contract stays clean (`isSignedIn`
          // is typed `boolean | undefined` by Clerk's useUser()).
          isLoaded: Boolean(isLoaded),
          isSignedIn: Boolean(isSignedIn),
          labels: {
            signIn: t("header.actions.signIn"),
            signUp: t("header.actions.signUp"),
          },
        }}
        labels={{
          suggestTool: t("header.actions.suggestTool"),
          closeMenu: t("header.aria.closeMenu"),
          toolsLabel: t("header.tools.sheetLabel"),
          browseCategory: (name: string) => t("header.tools.browseCategory", { name }),
        }}
      />

      {/* Desktop mega panel — category-tiles grid */}
      {isMegaOpen ? (
        <HeaderMegaPanel
          id={MEGA_PANEL_ID}
          categories={categories}
          onLinkClick={mega.close}
          onMouseEnter={mega.cancelClose}
          onMouseLeave={mega.scheduleClose}
        />
      ) : null}
    </motion.header>
  );
}
