"use client";

/**
 * Client shell for the site header — all the interactive bits that
 * need hooks / event handlers.
 *
 * ## Architecture
 *
 *  - Server (`client-header.tsx`)  →  fetches `getHeaderToolsData()`
 *  - Client (this file)            →  renders the chrome and the
 *                                      inline category strip / mobile
 *                                      sheet / Clerk auth UI.
 *
 * ## Layout
 *
 * Two visible rows on desktop:
 *   - **Row 1** (h-16): brand mark, primary nav (Leaderboard, Top
 *     Suggesters), Suggest CTA, Clerk auth UI, mobile hamburger.
 *   - **Row 2** (h-12): horizontal-scrolling category pill strip
 *     showing every tool category with its icon + live count. The
 *     strip is always visible — no hover or click required — so
 *     users can find a category at a glance without first opening a
 *     mega menu.
 *
 * On mobile (below `md`), the second row is hidden (the Tools
 * category list lives in `MobileNav`'s accordion instead).
 *
 * ## Why inline pills (not a "Tools" dropdown)
 *
 * The previous "Tools" mega-menu trigger required a hover/click to
 * surface the category list. SSR rendered the trigger as
 * `opacity:0` (framer-motion initial state) until hydration, so
 * first-paint users saw no tools navigation at all in the header.
 *
 * Inlining the category list as a pill strip:
 *   - Renders immediately on first paint (no JS needed to see it).
 *   - Saves the user one click per category browse.
 *   - Matches the modern pattern used by Vercel, Linear, Notion
 *     (always-visible mega strip below a compact top row).
 *
 * ## State machines
 *
 *  1. **Mobile sheet** — managed by `useState`. `MobileNav` owns
 *     the per-category accordion state.
 *  2. **Body scroll lock** — `document.body.style.overflow` while
 *     the mobile sheet is open.
 *
 *  No desktop mega-menu state anymore — the pill strip is static.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Menu, X } from "lucide-react";
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
import { getIcon } from "@/lib/icons";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

import { MobileNav } from "./mobile-nav";

export type ClientHeaderShellProps = {
  categories: readonly HeaderCategory[];
};

const MD_BREAKPOINT = 768;

export function ClientHeaderShell({ categories }: ClientHeaderShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations();
  // useSafeUser() is a Clerk-v7-safe wrapper that returns a stub
  // when the publishable key env var is missing, so the header
  // renders the signed-out UI even before Clerk is configured.
  const { isLoaded, isSignedIn } = useSafeUser();

  // ------------------------------------------------------------------
  // Close the mobile sheet when the viewport grows past the md
  // breakpoint. Without this, opening the sheet on a phone, then
  // rotating to landscape, would leave the sheet open with no
  // close button visible (it's hidden on md+).
  // ------------------------------------------------------------------
  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= MD_BREAKPOINT) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
  // Close the mobile sheet on route change. The new page should
  // always start with the header chrome in its default state.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [pathname]);

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
      {/* ----------------------------------------------------------------
        Row 1 — brand + primary nav + CTAs (h-16)
      ---------------------------------------------------------------- */}
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

        {/* Desktop primary nav */}
        <nav
          className="hidden md:flex md:items-center md:gap-1"
          aria-label={t("header.aria.mainNav")}
        >
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

      {/* ----------------------------------------------------------------
        Row 2 — inline category pill strip (h-12, desktop only)
        Hidden on mobile because MobileNav already shows the same list
        in its Tools accordion.
      ---------------------------------------------------------------- */}
      <div className="hidden border-border/60 border-t bg-white/95 backdrop-blur-md md:block">
        <div className="container">
          <nav
            aria-label={t("header.aria.toolsNav")}
            className="flex h-12 items-center gap-1 overflow-x-auto"
          >
            {categories.map((cat) => (
              <CategoryPill key={cat.slug} category={cat} />
            ))}
          </nav>
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
    </motion.header>
  );
}

/* ------------------------------------------------------------------ */
/* CategoryPill — single chip in the inline category strip.            */
/* ------------------------------------------------------------------ */

function CategoryPill({ category }: { category: HeaderCategory }) {
  const Icon = getIcon(category.iconName);
  return (
    <Link
      href={category.href}
      className={cn(
        "border-border/60 bg-background text-foreground/85 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors"
      )}
      aria-label={category.name}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="whitespace-nowrap">{category.name}</span>
      <span
        className="text-muted-foreground bg-muted/40 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
        aria-hidden="true"
      >
        {category.liveCount}
      </span>
    </Link>
  );
}