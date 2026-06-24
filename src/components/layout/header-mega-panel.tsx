"use client";

/**
 * HeaderMegaPanel — the desktop dropdown that opens beneath the
 * header when the user hovers or clicks the "Tools" trigger.
 *
 * ## Layout
 *
 * - Anchored below the header via `absolute top-full`. The header
 *   itself is `position: sticky`, so the panel stays attached as the
 *   user scrolls.
 * - One row of category tiles in a responsive grid (1 / 2 / 3 / 4
 *   columns by breakpoint). Each tile is a `<Link>` to the category
 *   browse page.
 * - The header (title + subtitle) lives inside the panel itself so
 *   it's always in the same place regardless of category count.
 *
 * ## Content per tile
 *
 * - Lucide icon (resolved from `category.iconName` via `getIcon`)
 *   inside a tinted accent square.
 * - Category name.
 * - Live count badge (e.g. "14 tools") — driven by `category.liveCount`
 *   and translated through `tileCount`.
 * - "Browse {name} →" CTA — `category.name` flows into the
 *   `browseCategory` translator for grammatically correct link text
 *   in non-English locales.
 *
 * ## Why a custom panel instead of the old `<ToolsBanner>` mega
 *
 * `<ToolsBanner>` was a separate sticky bar that overlapped the
 * header (z-40 vs header's z-50). Now that the categories are
 * inline in the header (pill strip), the mega panel is a true
 * dropdown — no overlapping sticky bars, no z-fight.
 */

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { type HeaderCategory } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

export type HeaderMegaPanelLabels = {
  /** e.g. "Browse by category" */
  title: string;
  /** e.g. "{count} categories" — count is filled in by the caller. */
  subtitle: (count: number) => string;
  /** e.g. "Browse {name} →" — name is filled in by the caller. */
  browseCategory: (name: string) => string;
  /** e.g. "{count} {count, plural, one {tool} other {tools}}" */
  tileCount: (count: number) => string;
};

export type HeaderMegaPanelProps = {
  id: string;
  categories: readonly HeaderCategory[];
  labels: HeaderMegaPanelLabels;
  /** Called when the user mouses back onto the panel (cancels close). */
  onMouseEnter?: () => void;
  /** Called when the user mouses off the panel (schedules close). */
  onMouseLeave?: () => void;
  /** Called when the user clicks a category tile. */
  onLinkClick?: () => void;
};

/* Accent → tailwind class mapping. Mirrors the design tokens used
 * elsewhere in the app so the tile icons match the brand palette. */
const ACCENT_TILE: Record<HeaderCategory["accent"], string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary-foreground",
  accent: "bg-accent/20 text-accent-foreground",
};

export function HeaderMegaPanel({
  id,
  categories,
  labels,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: HeaderMegaPanelProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={labels.title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "border-border/70 bg-popover text-popover-foreground",
        // Position: anchored to the header at `top-12` (3rem = 48px)
        // so the panel's *hit-testing* box overlaps the trigger
        // button by ~8px (the trigger's bottom is at y≈56).
        //
        // The visible white card starts at y = 48 + 16 (padding-top)
        // = 64, which is the top of row 2. So the visible gap from
        // the trigger to the panel card is still ~8px — but the
        // invisible `padding-top` area at y=48–64 acts as a CSS-only
        // "hover bridge". While the cursor is anywhere in that 16px
        // band, the panel's `onMouseEnter` has already fired (it
        // fires on the border-box, not the content-box), so the
        // close timer is cancelled before the user finishes the
        // gesture.
        //
        // This is the iLovePDF pattern: the panel's own padding
        // extends its hover region upward so the close-on-mouseleave
        // handler never gets a chance to start its timer mid-
        // traversal. See docs/ilovepdf_megamenu_study.md §5.
        "absolute inset-x-0 top-12 z-40 w-full border-b shadow-lg shadow-black/5",
        // The hover bridge — 16px of transparent padding at the top
        // of the panel. The panel's background starts BELOW this
        // padding (at the `border-b` line, y=64), so the bridge is
        // invisible but still part of the hit-testing area.
        "pt-4",
        // Subtle enter animation — fades + slides down 4px.
        "animate-in fade-in-0 slide-in-from-top-1 duration-150"
      )}
    >
      <div className="container py-6">
        {/* Panel header — title + count */}
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">{labels.title}</h2>
          <p className="text-muted-foreground text-xs">
            {labels.subtitle(categories.length)}
          </p>
        </div>

        {/* Category tile grid */}
        <ul
          role="list"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {categories.map((cat) => (
            <CategoryTile
              key={cat.slug}
              category={cat}
              labels={labels}
              onLinkClick={onLinkClick}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CategoryTile — single category entry in the mega panel grid.        */
/* ------------------------------------------------------------------ */

function CategoryTile({
  category,
  labels,
  onLinkClick,
}: {
  category: HeaderCategory;
  labels: HeaderMegaPanelLabels;
  onLinkClick?: () => void;
}) {
  const Icon = getIcon(category.iconName);
  return (
    <li>
      <Link
        href={category.href}
        onClick={onLinkClick}
        className={cn(
          "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5",
          "group flex h-full items-start gap-3 rounded-xl border p-3 transition-colors"
        )}
      >
        {/* Tinted icon square */}
        <span
          aria-hidden="true"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            ACCENT_TILE[category.accent] ?? ACCENT_TILE.primary
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        {/* Name + count + browse CTA */}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-sm font-semibold">
            {category.name}
          </span>
          <span className="text-muted-foreground text-xs">
            {labels.tileCount(category.liveCount)}
          </span>
          <span
            className={cn(
              "text-primary mt-1 inline-flex items-center gap-1 text-xs font-medium",
              "opacity-80 transition-opacity group-hover:opacity-100"
            )}
          >
            {labels.browseCategory(category.name)}
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </span>
      </Link>
    </li>
  );
}