"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { type AccentColor, type Subgroup, type SubTool, getSubgroups } from "@/lib/tools-subgroups";
import { cn } from "@/lib/utils";

/**
 * Map an `AccentColor` enum value to the Tailwind classes for the
 * sub-tool icon tile (small square behind the icon). Each color is
 * rendered as a saturated background with a white icon. Kept as a
 * static map (not a template string) so Tailwind's JIT sees every
 * class name at build time and includes them in the bundle.
 *
 * `hover:` is darker than `bg-` so hover feels like a press.
 */
const ACCENT_TILE_CLASSES: Record<AccentColor, string> = {
  red: "bg-red-500 hover:bg-red-600 text-white",
  green: "bg-green-500 hover:bg-green-600 text-white",
  blue: "bg-blue-500 hover:bg-blue-600 text-white",
  indigo: "bg-indigo-500 hover:bg-indigo-600 text-white",
  purple: "bg-purple-500 hover:bg-purple-600 text-white",
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
  pink: "bg-pink-500 hover:bg-pink-600 text-white",
  teal: "bg-teal-500 hover:bg-teal-600 text-white",
  amber: "bg-amber-500 hover:bg-amber-600 text-white",
  cyan: "bg-cyan-500 hover:bg-cyan-600 text-white",
};

/**
 * Slugs shown in the banner. Picked to be a representative mix of
 * the most popular categories (PDF + Image + AI are the top three
 * search intent clusters for the brand) plus a couple of long-tail
 * ones (Calculators, Developer) so the row reads as a tool
 * discovery surface, not just the top 3.
 *
 * Order is intentional: scanning left-to-right should go from
 * "common need" (PDF) to "power user" (Developer).
 */
const FEATURED_SLUGS = [
  "pdf",
  "image",
  "video",
  "ai",
  "calculators",
  "developer",
  "seo",
  "writing",
] as const;

/**
 * Pre-resolve Lucide icon components at module load. The
 * `react-hooks/static-components` lint rule forbids creating
 * components inside render functions (each render would create
 * a new component identity, resetting state). Resolving once
 * here gives us stable references and avoids the warning.
 *
 * `SubIcon` is a map of sub-tool-name → icon component, used by
 * the mega-menu panel. Each category only resolves icons for
 * its own sub-tools.
 */
const FEATURED = FEATURED_SLUGS.map((slug) => {
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === slug)!;
  const subgroups = getSubgroups(slug);
  const subIcons: Record<string, ReturnType<typeof getIcon>> = {};
  if (subgroups) {
    for (const g of subgroups) {
      for (const item of g.items) {
        subIcons[item.name] = getIcon(item.icon);
      }
    }
  }
  return { ...cat, Icon: getIcon(cat.icon), subIcons };
});

/** Convert a sub-tool display name to an anchor id. Matches the
 *  pattern the `/tools/[category]` page uses for sub-tool anchors
 *  (lowercase, hyphen-separated, ASCII only). */
function toAnchor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MEGA_PANEL_ID = "tools-mega-panel";

/**
 * Sticky, themed band that sits below the page header and above
 * the page content. Replaces the per-page breadcrumb.
 *
 * Layout:
 *  - Background spans the full viewport width (same as header)
 *    so the band reads as a continuous global utility surface.
 *    The chip row inside is wrapped in a container so the chips
 *    themselves stay aligned with the rest of the page.
 *  - sticky top-16 z-40: parks the band directly under the
 *    sticky header.
 *  - bg-primary-50: the brand theme color, very light. Distinct
 *    from the white header above and the white page content
 *    below, so the band reads as its own layer.
 *  - backdrop-blur: keeps the band feeling "frosted" over
 *    content that scrolls under it.
 *
 * Interaction (mega menu, click-driven):
 *  - Each chip is a `<button>` (not a link). Click toggles the
 *    mega panel. Hover also opens it for desktop discovery.
 *  - Mega panel renders full-width below the chip row, anchored
 *    to the nav. It uses a multi-column grid (1col mobile →
 *    5-7col desktop depending on category) of sub-groupings,
 *    each with an uppercase title and a list of sub-tools
 *    (icon + name).
 *  - Click-outside (anywhere outside the panel) closes it.
 *  - Esc closes it.
 *  - 120ms close delay on mouseleave so the cursor can traverse
 *    the gap between chip and panel without it snapping shut.
 *
 * Accessibility:
 *  - Chip is a button with aria-expanded + aria-controls.
 *  - Panel has role="menu" with menuitem children.
 *  - Backdrop click target is invisible but covers the rest of
 *    the screen so users can click outside to close.
 */
export function ToolsBanner() {
  const t = useTranslations("toolsBanner");
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = React.useRef<HTMLElement>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = React.useCallback(
    (slug: string) => {
      cancelClose();
      setOpenSlug(slug);
    },
    [cancelClose]
  );

  const close = React.useCallback(() => {
    cancelClose();
    setOpenSlug(null);
  }, [cancelClose]);

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenSlug(null), 120);
  }, [cancelClose]);

  // Esc closes the panel.
  React.useEffect(() => {
    if (openSlug === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSlug, close]);

  const openCat = openSlug ? FEATURED.find((c) => c.slug === openSlug) : undefined;

  return (
    <>
      <nav
        ref={navRef}
        aria-label={t("ariaLabel")}
        onMouseLeave={scheduleClose}
        className={cn(
          "bg-primary-50/85 supports-[backdrop-filter]:bg-primary-50/70",
          "border-primary-100/80 sticky top-16 z-40 border-b backdrop-blur"
        )}
      >
        <div className="container flex items-center gap-1 overflow-x-auto py-2">
          <span className="text-primary/70 hidden shrink-0 px-2 text-[11px] font-semibold tracking-wider uppercase sm:inline">
            {t("label")}
          </span>
          {FEATURED.map((cat) => {
            const Icon = cat.Icon;
            const isOpen = openSlug === cat.slug;
            return (
              <div key={cat.slug} className="relative shrink-0" onMouseEnter={() => open(cat.slug)}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={MEGA_PANEL_ID}
                  onClick={() => (isOpen ? close() : open(cat.slug))}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isOpen
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-background hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="whitespace-nowrap">{cat.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 opacity-50 transition-transform",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Mega menu panel — rendered as a sibling of the nav so it
          sits above page content via the nav's z-40 stack. It's
          only mounted while open. */}
      {openCat ? (
        <MegaPanel
          id={MEGA_PANEL_ID}
          category={openCat}
          Icon={openCat.Icon}
          subIcons={openCat.subIcons}
          browseLabel={t("browseAll", { count: openCat.count })}
          countLabel={t("toolsCount", { count: openCat.count })}
          onLinkClick={close}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      ) : null}
    </>
  );
}

/**
 * Full-width mega panel anchored to the banner. Positions itself
 * just below the sticky banner via `top-16` (header height).
 * Stretches full viewport width but uses `container` inside so
 * the content aligns with the rest of the page.
 */
function MegaPanel({
  id,
  category,
  Icon,
  subIcons,
  browseLabel,
  countLabel,
  onLinkClick,
  onMouseEnter,
  onMouseLeave,
}: {
  id: string;
  category: (typeof FEATURED)[number];
  Icon: React.ComponentType<{ className?: string }>;
  subIcons: Record<string, ReturnType<typeof getIcon>>;
  browseLabel: string;
  countLabel: string;
  onLinkClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const subgroups = getSubgroups(category.slug);

  return (
    // Outer wrapper is `fixed top-16 left-0 right-0 z-30` so the
    // panel parks immediately below the sticky banner on screen.
    // The actual menu content is inside, max-width container.
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "animate-fade-in fixed top-16 right-0 left-0 z-30",
        "border-border/60 bg-popover/98 supports-[backdrop-filter]:bg-popover/85",
        "border-b shadow-2xl backdrop-blur"
      )}
    >
      <div id={id} role="menu" aria-label={category.name} className="container max-w-[120rem] py-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary inline-flex h-7 w-7 items-center justify-center rounded-md">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-foreground text-sm font-semibold">{category.name}</span>
            <span className="text-muted-foreground text-xs">{countLabel}</span>
          </div>
          <Link
            href={`/tools/${category.slug}`}
            role="menuitem"
            onClick={onLinkClick}
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
          >
            {browseLabel}
          </Link>
        </div>

        {subgroups ? (
          <div
            className="grid gap-x-6 gap-y-6"
            style={{
              // Auto-fit columns: minimum 200px wide each, max as
              // many as fit. On a 1280px container that's
              // ~6 columns; on 1920px monitor, ~9 columns.
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {subgroups.map((group) => (
              <SubgroupColumn
                key={group.title}
                group={group}
                categorySlug={category.slug}
                subIcons={subIcons}
                onLinkClick={onLinkClick}
              />
            ))}
          </div>
        ) : (
          // Fallback for any featured category that doesn't have
          // explicit sub-groupings defined yet — render the flat
          // `examples` list in a single column with category icon
          // as a placeholder for each item.
          <FallbackList
            examples={category.examples}
            categorySlug={category.slug}
            onLinkClick={onLinkClick}
          />
        )}
      </div>
    </div>
  );
}

function SubgroupColumn({
  group,
  categorySlug,
  subIcons,
  onLinkClick,
}: {
  group: Subgroup;
  categorySlug: string;
  subIcons: Record<string, ReturnType<typeof getIcon>>;
  onLinkClick: () => void;
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
        {group.title}
      </h3>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.name}>
            <SubToolLink
              item={item}
              Icon={subIcons[item.name] ?? getIcon("Sparkles")}
              accent={group.accent}
              href={`/tools/${categorySlug}#${toAnchor(item.name)}`}
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
      onClick={onClick}
      className={cn(
        "text-foreground/85 hover:bg-muted hover:text-foreground",
        "inline-flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors"
      )}
    >
      {/*
        Colored icon tile — matches the iLovePDF mega-menu pattern.
        A 28px rounded square with a saturated background in the
        subgroup's accent color and a 14px white Lucide icon
        centered inside. Each item in a column shares the same
        color, which makes the column read as a unit at a glance.
      */}
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
            href={`/tools/${categorySlug}#${toAnchor(name)}`}
            onClick={onLinkClick}
          />
        </li>
      ))}
    </ul>
  );
}
