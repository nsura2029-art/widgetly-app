"use client";

/**
 * Client shell for the site header — all the interactive bits that
 * need hooks / event handlers.
 *
 * ## Architecture
 *
 *  - Server (`client-header.tsx`)  →  fetches `getHeaderToolsData()`
 *  - Client (this file)            →  renders the chrome and the
 *                                      "Tools" mega menu trigger +
 *                                      the always-visible pill strip
 *                                      + mobile sheet + Clerk auth UI.
 *
 * ## Layout (desktop, md+)
 *
 *   Row 1 (h-16): brand · "Tools ▾" mega-menu trigger · primary nav
 *                 (Leaderboard, Top Suggesters) · Suggest CTA · Clerk
 *                 auth UI · mobile hamburger (md:hidden).
 *   Row 2 (h-12): horizontal-scrolling category pill strip — always
 *                 visible, shows every category at a glance.
 *   Mega panel:   when the "Tools ▾" trigger is hovered or clicked,
 *                 a 4-col tile grid drops down, anchored to the
 *                 trigger and covering row 2. Closed by Esc, click
 *                 outside, route change, or resize past md.
 *
 * On mobile (below `md`) the mega trigger + row 2 are hidden — the
 * same Tools list lives in `MobileNav`'s accordion instead.
 *
 * ## Two views of the same data
 *
 * The pill strip and the mega panel both render the same 11
 * categories, just at different densities:
 *
 *   - Pill strip — compact: icon + name + live count badge. Always
 *     visible, so first-paint users can browse without interacting.
 *   - Mega panel — rich: 4-col grid of larger tiles with accent-
 *     tinted icons, exact "N tools" counts, and a "Browse →" CTA per
 *     tile. Opens on demand when the user wants a fuller view.
 *
 * Both come from the same `categories` prop (server-fetched D1 +
 * static catalog). No extra fetches.
 *
 * ## State machines
 *
 *  1. **Mega menu** — `useMegaMenu`. Standard mega-menu pattern:
 *     click-to-toggle, 500ms close delay on leave, Esc /
 *     route-change / resize-past-md to close.
 *  2. **Mobile sheet** — `useState`. `MobileNav` owns the per-
 *     category accordion state.
 *  3. **Body scroll lock** — `document.body.style.overflow` while
 *     the mobile sheet is open.
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
import { getIcon } from "@/lib/icons";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

import { HeaderMegaPanel } from "./header-mega-panel";
import { MobileNav } from "./mobile-nav";

export type ClientHeaderShellProps = {
  categories: readonly HeaderCategory[];
};

const MD_BREAKPOINT = 768;
const TOOLS_SLUG = "tools";
const MEGA_PANEL_ID = "header-tools-mega-panel";

export function ClientHeaderShell({ categories }: ClientHeaderShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [staticMenuOpen, setStaticMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const t = useTranslations();
  const mega = useMegaMenu();
  // useSafeUser() is a Clerk-v7-safe wrapper that returns a stub
  // when the publishable key env var is missing, so the header
  // renders the signed-out UI even before Clerk is configured.
  const { isLoaded, isSignedIn } = useSafeUser();

  const { openSlug, close: closeMega, toggle: toggleMega, scheduleClose, cancelClose } = mega;
  const megaRef = React.useRef(mega);
  const isMegaOpen = openSlug === TOOLS_SLUG;
  const suppressNextTriggerClickRef = React.useRef(false);

  // Ref to the header root element. Used by the click-outside
  // effect below: any mousedown whose target is NOT contained in
  // this ref means the user clicked outside the header, which
  // closes the mega panel. This makes the trigger button's
  // onClick handler safe to be `open` instead of `toggle` —
  // clicking the trigger always opens; clicking outside closes.
  const headerRef = React.useRef<HTMLElement>(null);
  const toolsTriggerRef = React.useRef<HTMLButtonElement>(null);

  // ------------------------------------------------------------------
  // Close both UIs when the viewport grows past the md breakpoint.
  // Without this, opening the mobile sheet on a phone, then rotating
  // to landscape, would leave the sheet open with no close button
  // visible (it's hidden on md+). Same for the mega panel — the
  // trigger is hidden on mobile, so leaving it open would dangle.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= MD_BREAKPOINT) {
        setMobileOpen(false);
      } else {
        closeMega();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [closeMega]);

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

  React.useEffect(() => {
    if (!staticMenuOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setStaticMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [staticMenuOpen]);

  // ------------------------------------------------------------------
  // Close both UIs on route change. The new page should always
  // start with the header chrome in its default state.
  //
  // The setState calls fire synchronously in the effect body, which
  // trips React's "set-state-in-effect" lint rule. That's intentional
  // here: when the route changes we MUST close the menu in the same
  // tick, before the user sees the new page render with the old menu
  // still open. A deferred setState would briefly render the menu
  // open on top of the new route, which is a worse UX than the
  // cascade React is warning about.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setStaticMenuOpen(false);
    closeMega();
  }, [pathname, closeMega]);

  // ------------------------------------------------------------------
  // Esc closes the mega panel immediately (no close delay). Only
  // listens while the panel is open so we don't pay the cost of a
  // global keydown listener on every page just for this feature.
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (!isMegaOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMega();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMegaOpen, closeMega]);

  // ------------------------------------------------------------------
  // Click-outside closes the mega panel. Combined with `onClick={open}`
  // on the trigger button (instead of `toggle`), this gives the user a
  // reliable interaction: hover OR click the trigger to open; click
  // anywhere else to close. Without this, `onClick=toggle` would close
  // the panel on the very click the user made to "confirm" opening it
  // after hovering, causing the flicker the user reported.
  //
  // Why `mousedown` (not `click`): mousedown fires before the trigger
  // button's click handler would have a chance to re-open the panel,
  // and before focus changes can fire onMouseEnter. Using mousedown
  // for the outside detector + open for the click handler avoids any
  // order-of-operations races.
  //
  // Why we check `headerRef.current?.contains(target)`: the header
  // root wraps BOTH the trigger button AND the mega panel, so a click
  // on the panel itself (e.g. on a category tile) is "inside" and
  // does NOT close — those tiles have their own onClick (the panel's
  // `onLinkClick` prop) that closes on link navigation.
  //
  // Why we read `mega` through a ref: the `useMegaMenu()` hook returns
  // a fresh object on every render (it just bundles a `useState` value
  // with `useCallback`s), so depending on `mega` directly would cause
  // this effect to tear down + re-install its `mousedown` listener on
  // every parent re-render. That churn is what was making the panel
  // flicker: parent re-renders (e.g. from `pathname` changing in the
  // route-change effect) re-ran this effect, the listener was removed
  // and re-added in the same tick, and during the brief gap a stray
  // event closed the panel. By reading `mega` through a ref, the
  // effect only re-runs when `isMegaOpen` actually changes.
  // ------------------------------------------------------------------
  // Sync the ref inside an effect so the React Compiler's
  // "no ref access during render" rule is satisfied. The effect runs
  // after every commit with no dependency array, so the ref always
  // holds the latest mega reference by the time the click-outside
  // handler next fires.
  React.useEffect(() => {
    megaRef.current = mega;
  }, [mega]);

  React.useEffect(() => {
    if (!isMegaOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      if (toolsTriggerRef.current?.contains(target)) {
        suppressNextTriggerClickRef.current = true;
        e.preventDefault();
        e.stopPropagation();
        megaRef.current.close();
        return;
      }

      if (!headerRef.current?.contains(target)) {
        megaRef.current.close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isMegaOpen]);

  const navLinks = React.useMemo(
    () => [
      { href: "/leaderboard", label: t("header.nav.leaderboard") },
      { href: "/top-suggesters", label: t("header.nav.topSuggesters") },
    ],
    [t]
  );

  return (
    <motion.header
      ref={headerRef}
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

        {/* Desktop primary nav: "Tools" mega trigger + Leaderboard + Top Suggesters */}
        <nav
          className="hidden md:flex md:items-center md:gap-1"
          aria-label={t("header.aria.mainNav")}
        >
          {/* "Tools" mega-menu trigger — opens the 4-col category tile panel.
              click toggles the panel. Hover/focus only cancel pending
              close timers so pointer travel between trigger and panel
              stays forgiving without opening before the click lands. */}
          <button
            ref={toolsTriggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isMegaOpen}
            aria-controls={MEGA_PANEL_ID}
            aria-label={t("header.aria.toolsMenu")}
            onClick={() => {
              if (suppressNextTriggerClickRef.current) {
                suppressNextTriggerClickRef.current = false;
                return;
              }

              toggleMega(TOOLS_SLUG);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                toggleMega(TOOLS_SLUG);
              }
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onFocus={cancelClose}
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
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={staticMenuOpen}
              aria-controls="header-static-tools-menu"
              onClick={() => setStaticMenuOpen((open) => !open)}
              className={cn(
                "hover:text-foreground hover:bg-muted/5 text-muted inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                staticMenuOpen && "bg-muted/5 text-foreground"
              )}
            >
              <span>Static menu</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 opacity-60 transition-transform",
                  staticMenuOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            {staticMenuOpen ? (
              <div
                id="header-static-tools-menu"
                role="menu"
                className="border-border/70 shadow-soft absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border bg-white p-2"
              >
                {categories.slice(0, 5).map((category) => (
                  <Link
                    key={category.slug}
                    href={`/tools/${category.slug}`}
                    role="menuitem"
                    onClick={() => setStaticMenuOpen(false)}
                    className="hover:bg-muted/5 text-foreground block rounded-md px-3 py-2 text-sm transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
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
              <ClerkSignInButton label={t("header.actions.signIn")} variant="ghost" size="sm" />
              <ClerkSignUpButton label={t("header.actions.signUp")} variant="outline" size="sm" />
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
        Hidden when the mega panel is open (the panel is a richer
        view of the same categories) and on mobile (MobileNav has
        the same list in its Tools accordion).
      ---------------------------------------------------------------- */}
      <div
        onMouseEnter={cancelClose}
        className={cn(
          "border-border/60 hidden border-t bg-white/95 backdrop-blur-md md:block",
          // Hide row 2 + disable pointer events while the mega panel is
          // open. `invisible` (visibility:hidden) hides the pill strip
          // visually but pointer-event handling is browser-inconsistent
          // for invisible elements, so we also add `pointer-events-none`
          // to guarantee the cursor passes straight through to the
          // panel below. This removes any chance of a "dead zone"
          // between the trigger and the panel.
          isMegaOpen && "pointer-events-none invisible"
        )}
      >
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

      {/* Desktop mega panel — 4-col category tile grid (anchored to
          the header, covers row 2 when open) */}
      {isMegaOpen ? (
        <HeaderMegaPanel
          id={MEGA_PANEL_ID}
          categories={categories}
          labels={{
            browseCategory: (name) => t("header.tools.browseCategory", { name }),
            tileCount: (count) => t("header.tools.tileCount", { count }),
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onLinkClick={closeMega}
        />
      ) : null}

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

/* Accent → tailwind class for the highlighted icon chip inside the
 * pill strip. Same color philosophy as the mega panel: full
 * saturation, color-coded by accent, with the matching
 * `-foreground` token so the icon glyph stays legible. The
 * previous `bg-primary/20` (20% opacity) treatment was too subtle
 * to read as "highlighted" — the user reported "I dont see the
 * new icons for categories". Full color fixes that.
 */
const PILL_ACCENT_TILE: Record<HeaderCategory["accent"], string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
};

function CategoryPill({ category }: { category: HeaderCategory }) {
  const Icon = getIcon(category.iconName);
  return (
    <Link
      href={category.href}
      className={cn(
        "border-border/60 bg-background text-foreground/85 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border pr-3 pl-1.5 text-xs font-medium transition-colors"
      )}
      aria-label={category.name}
    >
      {/* Highlighted icon chip — small, saturated, matches the mega
          panel tile color so the two views feel like the same UI
          surface. Sits flush against the pill edge (`-ml-1` is
          avoided; we use `pl-1.5` on the pill + flush `h-7 w-7`
          tile instead). */}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          PILL_ACCENT_TILE[category.accent] ?? PILL_ACCENT_TILE.primary
        )}
      >
        {/* Category icon names are data from D1/static catalog; resolve them at render. */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      </span>
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
