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
 * - No internal title or count subtitle — the trigger button above
 *   already labels the panel ("Tools"), and the tile grid is the
 *   visual hierarchy. Keeps the drop-down tight on first paint.
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

/* Accent → tailwind class mapping for the highlighted icon tile.
 *
 * The iLovePDF / Smallpdf mega-menu pattern: the colored tile IS
 * the visual hierarchy — full-saturation background paired with
 * the matching design-system foreground token
 * (`*-foreground`), so the icon reads as a white/contrast glyph
 * inside a solid color block. This replaced the prior
 * `bg-primary/20` (20% opacity) treatment that the user reported
 * as "I dont see the new icons for categories" — the tint was
 * too subtle to register as a highlighted state.
 *
 * Each accent gets:
 *  - `bg-{accent}` — full color fill (no opacity tint)
 *  - `text-{accent}-foreground` — contrast token from the design
 *    system, so the icon stays legible on the saturated bg
 *  - `ring-1 ring-{accent}/40` — a soft outline that defines the
 *    tile edge against any background, without doubling up on a
 *    hard border
 *  - `shadow-sm` — slight elevation so the tile pops off the card
 */
const ACCENT_TILE: Record<HeaderCategory["accent"], string> = {
  primary: "bg-primary text-primary-foreground ring-primary/40 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground ring-secondary/40 shadow-sm",
  accent: "bg-accent text-accent-foreground ring-accent/40 shadow-sm",
};

/* Hover-deepener — applied via group-hover on the tile. We
 * darken the ring + bump elevation rather than re-tinting the
 * background (the bg is already at full saturation, so further
 * opacity tweaks don't read). */
const ACCENT_TILE_HOVER: Record<HeaderCategory["accent"], string> = {
  primary: "group-hover:ring-primary/70 group-hover:shadow-md",
  secondary: "group-hover:ring-secondary/70 group-hover:shadow-md",
  accent: "group-hover:ring-accent/70 group-hover:shadow-md",
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
      aria-label="Tools categories"
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
        // Subtle enter animation. We use `animate-fade-in` (defined
        // locally in globals.css) instead of `animate-in fade-in-0
        // slide-in-from-top-1 duration-150` from the
        // tailwindcss-animate plugin — that plugin is NOT installed
        // in this project (Tailwind v4 + manual keyframes in
        // globals.css). Using plugin classes would make the panel
        // silently invisible because the classes are undefined.
        "animate-fade-in"
      )}
    >
      <div className="container py-6">
        {/* Category tile grid — no title/subtitle; the trigger button
            already labels the panel, and the tile names are the
            primary signal. Keeps the drop-down feeling tight. */}
        <ul
          role="list"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {categories.map((cat) => (
            <CategoryTile key={cat.slug} category={cat} labels={labels} onLinkClick={onLinkClick} />
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
        {/* Tinted icon square — larger, saturated, glossy */}
        <span
          aria-hidden="true"
          className={cn(
            // Slightly bigger tile so the highlighted color is the
            // first thing the eye lands on. ring-1 + ring-inset gives
            // the iLovePDF "stamped" feel without a hard border.
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            "shadow-inner ring-1 transition-colors ring-inset",
            ACCENT_TILE[category.accent] ?? ACCENT_TILE.primary,
            ACCENT_TILE_HOVER[category.accent] ?? ACCENT_TILE_HOVER.primary
          )}
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>

        {/* Name + count + browse CTA */}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-sm font-semibold">{category.name}</span>
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
