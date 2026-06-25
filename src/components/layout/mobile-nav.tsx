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

  // When the sheet closes, collapse all accordions so the next
  // open starts fresh.
  React.useEffect(() => {
    if (!open) setExpanded(new Set());
  }, [open]);

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
        "border-border/60 overflow-hidden border-t bg-white/95 backdrop-blur-xl transition-all md:hidden",
        open ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="container flex max-h-[85vh] flex-col gap-1 overflow-y-auto py-4">
        {/* Close button (sticky at top so it's always reachable
            when the user has scrolled deep into the sheet). */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.closeMenu}
            className="hover:bg-muted/5 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors"
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
                <ClerkSignInButton
                  label={auth.labels.signIn}
                  variant="outline"
                  size="default"
                />
                <ClerkSignUpButton
                  label={auth.labels.signUp}
                  variant="default"
                  size="default"
                />
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
  const Icon = getIcon(category.iconName);
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
        className="hover:bg-muted/5 flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
              ACCENT_TILE[category.accent] ?? ACCENT_TILE.primary
            )}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-foreground">{category.name}</span>
          <span className="text-muted-foreground text-xs">
            {category.liveCount} {category.liveCount === 1 ? "tool" : "tools"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 transition-transform",
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
