"use client";

/**
 * MegaPanel — the full-width dropdown that appears below the trigger
 * (a header button, a chip, a footer link, etc.) when a tools-category
 * is opened.
 *
 * Extracted from the original `tools-banner.tsx` so the same panel can
 * be used by the new client header (and any future mega-menu trigger)
 * without duplication.
 *
 * ## Layout
 *
 * - Outer wrapper spans full viewport width and handles centering
 *   + pointer-events passthrough.
 * - The visible panel uses `w-fit max-w-[1440px]` so it shrinks to
 *   fit its content when a category has only 2-3 subgroups, but
 *   caps at 1440px on wide viewports.
 * - The content uses `flex flex-wrap` of 200px columns. `flex-wrap`
 *   lets columns wrap to a second row when the panel max-width
 *   is reached (e.g. PDF's 7 subgroups at 1440px = 7 columns on
 *   one row).
 *
 * ## Why fixed-width 200px columns
 *
 * - `grid auto-fit minmax` stretches every column to fill
 *   available space, which on a 7-subgroup category at 1440px
 *   gives 6 thin columns. On a 3-subgroup category, the 3 columns
 *   stretch to 400px each — too wide, with dead space.
 * - Fixed 200px columns are readable at any subgroup count.
 *   3 subgroups = 660px panel (centered on screen).
 *   7 subgroups = 1 row of 7.
 *
 * ## Interaction
 *
 * - Hover on the panel cancels any pending close (so the cursor
 *   can re-enter the trigger without the panel snapping shut).
 * - mouseleave on the panel schedules a close (120ms delay, see
 *   `use-mega-menu.ts`).
 * - Clicking any link inside the panel fires `onLinkClick` (the
 *   consumer is responsible for closing the panel — typically by
 *   calling the close function from `useMegaMenu`).
 *
 * ## Accessibility
 *
 * - The panel has `role="menu"` and each link has `role="menuitem"`.
 * - The consumer should set `aria-controls` on the trigger to
 *   match the panel's `id` prop.
 */

import * as React from "react";
import { getIcon } from "@/lib/icons";
import { Link } from "@/i18n/navigation";
import { type AccentColor, type Subgroup, type SubTool } from "@/lib/tools-subgroups";
import type { HeaderCategory, HeaderLiveTool } from "@/lib/d1/header-tools";
import { cn } from "@/lib/utils";

/**
 * Map an `AccentColor` enum value to the Tailwind classes for the
 * sub-tool icon tile. Kept as a static map (not a template string)
 * so Tailwind's JIT sees every class name at build time.
 *
 * The 500/600 pairing is the standard "background darker on press"
 * feedback. The shade varies a bit by color to make the palette
 * feel cohesive rather than uniformly bright:
 *   - red/orange/pink/amber: 500 base (warm, "energetic" actions)
 *   - blue/indigo/cyan: 600 base (cooler, "structural" actions)
 *   - green/teal/purple: 500 base (action verbs)
 */
const ACCENT_TILE_CLASSES: Record<AccentColor, string> = {
  red: "bg-red-500 hover:bg-red-600 text-white",
  green: "bg-green-500 hover:bg-green-600 text-white",
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  indigo: "bg-indigo-600 hover:bg-indigo-700 text-white",
  purple: "bg-purple-500 hover:bg-purple-600 text-white",
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
  pink: "bg-pink-500 hover:bg-pink-600 text-white",
  teal: "bg-teal-500 hover:bg-teal-600 text-white",
  amber: "bg-amber-500 hover:bg-amber-600 text-white",
  cyan: "bg-cyan-600 hover:bg-cyan-700 text-white",
};

/** Convert a display name to an anchor id (matches the convention
 * used by `/tools/[category]` for sub-tool anchors). */
function toAnchor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Props for the MegaPanel. */
export type MegaPanelProps = {
  /** Unique id used by the trigger's `aria-controls`. */
  id: string;
  /**
   * Categories to render. Pass an array of one to show a single
   * category's sub-tools (the current behavior); pass multiple to
   * show several at once.
   */
  categories: readonly HeaderCategory[];
  /** Cancel any pending close (mouse entered the panel). */
  onMouseEnter: () => void;
  /** Schedule a close 120ms from now (mouse left the panel). */
  onMouseLeave: () => void;
  /** Click handler for any link inside the panel. */
  onLinkClick: () => void;
  /** Optional override for the "browse all" label, per category. */
  browseAllLabel?: (cat: HeaderCategory) => string;
  /** Optional override for the count label, per category. */
  countLabel?: (cat: HeaderCategory) => string;
};

export function MegaPanel({
  id,
  categories,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
  browseAllLabel,
  countLabel,
}: MegaPanelProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[var(--wly-header-height)] z-40 flex justify-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn(
          "animate-fade-in pointer-events-auto w-fit max-w-[1440px]",
          "border-border/60 bg-popover/98 supports-[backdrop-filter]:bg-popover/85",
          "rounded-b-xl border shadow-2xl backdrop-blur"
        )}
      >
        <div id={id} role="menu" className="px-6 py-6">
          {categories.map((cat) => (
            <CategoryColumn
              key={cat.slug}
              category={cat}
              onLinkClick={onLinkClick}
              browseLabel={browseAllLabel?.(cat) ?? `Browse all ${cat.liveCount} tools`}
              countLabel={countLabel?.(cat) ?? `${cat.liveCount} tools`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function CategoryColumn({
  category,
  onLinkClick,
  browseLabel,
  countLabel,
}: {
  category: HeaderCategory;
  onLinkClick: () => void;
  browseLabel: string;
  countLabel: string;
}) {
  const Icon = getIcon(category.iconName);
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-3 flex items-center justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-md">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-foreground text-sm font-semibold">{category.name}</span>
          <span className="text-muted-foreground text-xs">{countLabel}</span>
        </div>
        <Link
          href={category.href}
          role="menuitem"
          prefetch={false}
          onClick={onLinkClick}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
        >
          {browseLabel} →
        </Link>
      </div>
      {category.subgroups ? (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-8">
          {category.subgroups.map((group) => (
            <SubgroupColumn
              key={group.title}
              group={group}
              categorySlug={category.slug}
              onLinkClick={onLinkClick}
            />
          ))}
        </div>
      ) : (
        <FallbackList
          examples={category.examples}
          categorySlug={category.slug}
          onLinkClick={onLinkClick}
        />
      )}
    </div>
  );
}

function SubgroupColumn({
  group,
  categorySlug,
  onLinkClick,
}: {
  group: Subgroup;
  categorySlug: string;
  onLinkClick: () => void;
}) {
  return (
    <div className="w-[200px] shrink-0">
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
        {group.title}
      </h3>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.name}>
            <SubToolLink
              item={item}
              Icon={getIcon(item.icon)}
              accent={group.accent}
              href={`/tools/${categorySlug}/${toAnchor(item.name)}`}
              onClick={onLinkClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubToolLink({
  item,
  Icon,
  accent,
  href,
  onClick,
}: {
  item: SubTool;
  Icon: React.ComponentType<{ className?: string }>;
  accent: AccentColor;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      prefetch={false}
      onClick={onClick}
      className={cn(
        "text-foreground/85 hover:bg-muted hover:text-foreground",
        "inline-flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors"
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
          ACCENT_TILE_CLASSES[accent]
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

function FallbackList({
  examples,
  categorySlug,
  onLinkClick,
}: {
  examples: readonly string[];
  categorySlug: string;
  onLinkClick: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:grid-cols-3">
      {examples.map((name) => (
        <li key={name}>
          <SubToolLink
            item={{ name, icon: "Sparkles" }}
            Icon={getIcon("Sparkles")}
            accent="blue"
            href={`/tools/${categorySlug}/${toAnchor(name)}`}
            onClick={onLinkClick}
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Live tools (D1) variant — used when the dashboard has populated     */
/* `category.liveTools`. Renders a flat list of the actual live tools, */
/* sorted by `sort_order` then `name`.                                  */
/* ------------------------------------------------------------------ */

export function LiveToolsList({
  tools,
  categorySlug,
  onLinkClick,
}: {
  tools: readonly HeaderLiveTool[];
  categorySlug: string;
  onLinkClick: () => void;
}) {
  if (tools.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:grid-cols-3">
      {tools.map((t) => (
        <li key={t.slug}>
          <Link
            href={t.href}
            role="menuitem"
            prefetch={false}
            onClick={onLinkClick}
            className={cn(
              "text-foreground/85 hover:bg-muted hover:text-foreground",
              "inline-flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors"
            )}
          >
            <span
              className="bg-primary/15 text-primary inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              aria-hidden="true"
            >
              <span className="text-[10px] font-semibold">●</span>
            </span>
            <span className="truncate">{t.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
