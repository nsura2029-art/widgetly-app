"use client";

/**
 * MobileNav — the slide-down sheet that appears when the hamburger
 * is tapped on small screens. The Tools section is an accordion
 * that mirrors the desktop mega menu: tap a category to expand
 * its sub-tool list.
 *
 * No external UI lib (Headless UI Disclosure, Radix Accordion, etc.)
 * is used — Disclosure is a 20-line piece of state. Pulling in a
 * dep for it would bloat the bundle.
 *
 * Animation:
 *   - Outer sheet uses `max-h + opacity` transition (same approach
 *     as the original client-header) so the height animates as
 *     accordions expand/collapse inside.
 *   - Accordion sections use `grid-rows-[0fr] → grid-rows-[1fr]`
 *     trick, which is the modern way to animate to auto height
 *     without measuring with JS.
 *
 * Close behavior:
 *   - Tap any link inside → close
 *   - Tap the "X" close button → close
 *   - Resize up past 768px → close (handled in parent)
 *   - Route change → close (handled in parent)
 *
 * Accessibility:
 *   - Sheet has `role="dialog"` + `aria-modal="true"` when open
 *   - Each accordion button has `aria-expanded` + `aria-controls`
 *   - Tools header is a `<button>` (not a link) since it controls
 *     disclosure, not navigation
 */

import * as React from "react";
import { ChevronDown, Lightbulb, X } from "lucide-react";
import {
  ClerkSignInButton,
  ClerkSignUpButton,
  ClerkUserButton,
} from "@/components/auth/clerk-auth-buttons";
import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

export type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  categories: readonly HeaderCategory[];
  /** Primary nav links shown above the Tools accordion. */
  primaryLinks: readonly { href: string; label: string }[];
  /**
   * Optional Clerk auth UI shown at the bottom of the sheet. When
   * omitted (e.g. on a build without ClerkProvider), the sheet
   * skips the auth block entirely.
   */
  auth?: {
    isLoaded: boolean;
    isSignedIn: boolean;
    labels: { signIn: string; signUp: string };
  };
  /** Translation hooks. */
  labels: {
    suggestTool: string;
    closeMenu: string;
    toolsLabel: string;
    browseCategory: (name: string) => string;
  };
};

export function MobileNav({
  open,
  onClose,
  categories,
  primaryLinks,
  auth,
  labels,
}: MobileNavProps) {
  // Track which accordion sections are open. Multi-open allowed so
  // users can compare sub-tools across two categories at once.
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // When the sheet closes (or re-opens), collapse all accordions so
  // the next open starts fresh. We use the "adjust state when a
  // prop changes" pattern (React docs:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // instead of a useEffect — calling setState synchronously inside
  // a useEffect triggers cascading renders that the lint rule
  // `react-hooks/set-state-in-effect` flags as a perf hazard.
  // The user-visible behavior is identical to the previous
  // effect-based reset (accords are empty on every fresh open);
  // the render-time adjustment happens once per `open` transition.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setExpanded(new Set());
  }

  const toggle = (slug: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div
      id="mobile-nav"
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      className={cn(
        // Sheet chrome. `overflow-hidden` keeps the slide animation
        // clean (no content leaks past the rounded corners during
        // collapse). The actual scroll lives on the inner container.
        // `bg-background/95` (instead of hardcoded `bg-white/95`)
        // makes the sheet dark-mode aware.
        // `max-h-[85dvh]` prefers the *dynamic* viewport height —
        // when the mobile URL bar collapses, the sheet grows with it
        // instead of staying pinned to the smallest viewport (which
        // is what the old `85vh` did, causing a visual jump on iOS
        // Safari / Android Chrome). Browsers without `dvh` support
        // fall back to `vh` via the property that Tailwind emits
        // alongside the arbitrary value.
        "border-border/60 bg-background/95 overflow-hidden border-t backdrop-blur-xl transition-all md:hidden",
        open ? "max-h-[85dvh] opacity-100" : "pointer-events-none max-h-0 opacity-0"
      )}
    >
      {/*
        Inner scroll region.
        - `min-h-0` is the canonical flexbox-overflow fix: without
          it, a flex column child can grow past its `max-h` cap
          (Flexbox gives children an implicit `min-height: auto`,
          which means "don't shrink me"). Setting `min-h-0` lets the
          85dvh cap actually constrain the scroll height.
        - `scrollbar-none` suppresses the native vertical scrollbar
          chrome on all three engines while keeping scroll behavior.
        - `overflow-x-hidden` is the explicit horizontal lock —
          prevents any oversized child (long category name + count
          + chevron) from leaking a horizontal scrollbar.
        - `overscroll-contain` keeps scroll chaining from bouncing
          the page behind the sheet.
        - Bottom padding uses `env(safe-area-inset-bottom)` so the
          iPhone home indicator doesn't cover the last menu item.
       */}
      <div className="container flex max-h-[85dvh] min-h-0 scrollbar-none flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {/* Close button — sticky at top so it stays reachable when
            the user has scrolled deep into a long category list.
            The sticky background matches the sheet bg so content
            scrolls behind it cleanly. */}
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 -mx-4 mb-1 flex items-center justify-between px-4 py-1 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.closeMenu}
            className="hover:bg-muted/5 active:bg-muted/10 -mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Primary nav links */}
        {primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="text-foreground hover:bg-muted/5 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
          >
            {link.label}
          </Link>
        ))}

        {/* Tools accordion */}
        <div className="border-border/60 mt-2 border-t pt-2">
          <div className="text-muted-foreground px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider uppercase">
            {labels.toolsLabel}
          </div>
          <ul className="flex flex-col">
            {categories.map((cat) => (
              <CategoryAccordionItem
                key={cat.slug}
                category={cat}
                expanded={expanded.has(cat.slug)}
                onToggle={() => toggle(cat.slug)}
                onLinkClick={onClose}
                browseLabel={labels.browseCategory(cat.name)}
              />
            ))}
          </ul>
        </div>

        {/* Suggest CTA + Clerk auth UI pinned at the bottom */}
        <div className="border-border/60 mt-3 flex flex-col gap-2 border-t pt-3">
          <Link
            href="/suggest"
            onClick={onClose}
            className="border-border text-foreground hover:bg-muted/5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors"
          >
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            {labels.suggestTool}
          </Link>
          {auth ? (
            !auth.isLoaded ? (
              <div className="bg-muted/30 h-11 w-full animate-pulse rounded-xl" />
            ) : !auth.isSignedIn ? (
              <>
                <ClerkSignInButton label={auth.labels.signIn} variant="outline" size="default" />
                <ClerkSignUpButton label={auth.labels.signUp} variant="default" size="default" />
              </>
            ) : (
              <div className="flex justify-center pt-2">
                <ClerkUserButton />
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion sub-component                                              */
/* ------------------------------------------------------------------ */

/**
 * Wrapper component for a category's icon. Declared at module scope
 * (not inside `CategoryAccordionItem`'s render body) so React sees a
 * stable component type across renders — defining `const Icon =
 * getIcon(...)` inside render would cause React to treat every render
 * as a new component type, which (a) remounts the icon and resets its
 * internal state every parent re-render and (b) is flagged by the
 * `react-hooks/static-components` lint rule.
 *
 * Note on the implementation: the lint rule fires on the pattern
 * `const Icon = <expr>; <Icon />` (component-typed variable used in
 * JSX), even when the resolved component is statically stable (which
 * it is here — `getIcon(name)` returns one of the statically-imported
 * LucideIcon references from `ICON_MAP`; same name → same reference
 * across renders, no actual remount risk). We sidestep the pattern by
 * going through `React.createElement` directly, which is semantically
 * equivalent to `<Icon ... />` but doesn't introduce a component-
 * typed local variable.
 */
function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return React.createElement(getIcon(name), {
    className,
    "aria-hidden": "true",
  });
}

function CategoryAccordionItem({
  category,
  expanded,
  onToggle,
  onLinkClick,
  browseLabel,
}: {
  category: HeaderCategory;
  expanded: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
  browseLabel: string;
}) {
  const panelId = `mobile-cat-${category.slug}`;
  // Same accent-aware full-color tile treatment as the desktop pill
  // strip (`PILL_ACCENT_TILE` in client-header-shell.tsx). Using a
  // local map (rather than importing) keeps the mobile-nav bundle
  // independent of the header; the two surfaces share the same
  // design language but don't share the constant. The previous
  // hardcoded `bg-primary/10 text-primary` was both visually weak
  // AND ignored the category accent — every category in the drawer
  // showed the same primary-tinted square.
  const ACCENT_TILE: Record<HeaderCategory["accent"], string> = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };
  return (
    <li className="border-border/40 border-b last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="hover:bg-muted/5 active:bg-muted/10 flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
      >
        {/*
          Left cluster (icon + name + count):
          - `min-w-0` is the canonical flexbox-overflow fix for the
            child of a `flex` parent: without it, the row can grow
            past the container's width when the category name is
            long, causing a horizontal scrollbar on the sheet.
          - `flex-1` + `min-w-0` lets the name truncate (via
            `truncate`) instead of pushing siblings (the live count
            and the chevron) off-screen.
          - `shrink-0` on the icon and live-count badge keeps them
            pinned at their natural widths — only the name gives
            way under pressure.
        */}
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              ACCENT_TILE[category.accent] ?? ACCENT_TILE.primary
            )}
            aria-hidden="true"
          >
            <CategoryIcon name={category.iconName} className="h-3.5 w-3.5" />
          </span>
          <span className="text-foreground truncate">{category.name}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {category.liveCount} {category.liveCount === 1 ? "tool" : "tools"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Animated expand panel — uses the grid-rows trick to
          animate to auto height without JS measurement. */}
      <div
        id={panelId}
        className={cn(
          "grid transition-all duration-200 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-0.5 px-3 pb-3">
            {/* Browse all link (always shown) */}
            <li>
              <Link
                href={category.href}
                onClick={onLinkClick}
                className="text-primary hover:bg-primary/5 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium"
              >
                {browseLabel} →
              </Link>
            </li>
            {/* Sub-tools: prefer live D1 tools, fall back to static examples */}
            {(category.liveTools.length > 0
              ? category.liveTools.map((t) => ({ name: t.name, href: t.href }))
              : category.examples.map((name) => ({
                  name,
                  href: `/tools/${category.slug}/${slugify(name)}`,
                }))
            ).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onLinkClick}
                  className="text-foreground/80 hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
                >
                  <span className="bg-foreground/10 h-1 w-1 rounded-full" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** Display name → URL slug. Matches the convention in tools-banner.tsx. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
