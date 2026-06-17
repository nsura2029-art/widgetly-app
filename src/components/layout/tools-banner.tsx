"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { cn } from "@/lib/utils";

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
 */
const FEATURED = FEATURED_SLUGS.map((slug) => {
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === slug)!;
  return { ...cat, Icon: getIcon(cat.icon) };
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

/**
 * Sticky, themed band that sits below the page header and above
 * the page content. Replaces the per-page breadcrumb.
 *
 * Layout:
 *  - Background spans the full viewport width (same as header) so
 *    the band reads as a continuous global utility surface. The
 *    chip row is wrapped in a container so the chips themselves
 *    stay aligned with the rest of the page.
 *  - sticky top-16 z-40: parks the band directly under the sticky
 *    header. When the user scrolls, both bands are visible and
 *    the user can switch categories without scrolling back up.
 *  - bg-primary-50: the brand theme color, very light. Distinct
 *    from the white header above (bg-background) and the white
 *    page content below, so the band reads as its own layer.
 *  - backdrop-blur: keeps the band feeling "frosted" over content
 *    that scrolls under it.
 *
 * Hover dropdown (the key UX):
 *  - Each chip is a wrapper around the category link. On
 *    `mouseenter`, we open a panel anchored to that chip.
 *  - The panel previews up to 8 sub-tools (the `examples` array
 *    from TOOLS_CATEGORIES) plus a "Browse all N tools →" footer.
 *  - We close on `mouseleave` from either the chip or the panel,
 *    with a 120ms grace period so the user can traverse the gap
 *    between the chip and the panel without it snapping shut.
 *  - Keyboard: focus opens, Tab moves into the panel, Escape
 *    closes (handled by blurring the active element).
 *  - Click on the chip itself still navigates to
 *    `/tools/[slug]` (the category landing page).
 *
 * Trade-offs:
 *  - We do NOT implement click-to-toggle. Hover-driven discovery
 *    is the dominant desktop pattern for these surfaces
 *    (smallpdf.com, cloudconvert.com, etc.) and matches what the
 *    user asked for. Mobile uses the same code path but the chip
 *    becomes tappable — that's acceptable because the dropdown
 *    just shows more links, all of which are also reachable via
 *    the underlying link.
 */
export function ToolsBanner() {
  const t = useTranslations("toolsBanner");
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function open(slug: string) {
    cancelClose();
    setOpenSlug(slug);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenSlug(null), 120);
  }

  return (
    <nav
      aria-label={t("ariaLabel")}
      onMouseLeave={scheduleClose}
      className={cn(
        // Full-bleed themed band, sticks under the header.
        "bg-primary-50/85 supports-[backdrop-filter]:bg-primary-50/70",
        "border-primary-100/80 sticky top-16 z-40 border-b backdrop-blur"
      )}
    >
      {/* Container inside so the chip row stays aligned with the
          rest of the page content (matches header alignment). */}
      <div className="container flex items-center gap-1 overflow-x-auto py-2">
        <span className="text-primary/70 hidden shrink-0 px-2 text-[11px] font-semibold tracking-wider uppercase sm:inline">
          {t("label")}
        </span>
        {FEATURED.map((cat) => {
          const Icon = cat.Icon;
          const isOpen = openSlug === cat.slug;
          return (
            <div
              key={cat.slug}
              className="relative shrink-0"
              onMouseEnter={() => open(cat.slug)}
              onFocus={() => open(cat.slug)}
              onBlur={(e) => {
                // Only close if focus left the wrapper entirely
                // (otherwise tabbing into the dropdown closes it).
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  scheduleClose();
                }
              }}
            >
              <Link
                href={`/tools/${cat.slug}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isOpen
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/75 hover:bg-background hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">{cat.name}</span>
                <ChevronDown
                  className={cn("h-3 w-3 opacity-50 transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </Link>

              {isOpen ? (
                <CategoryPanel
                  category={cat}
                  Icon={cat.Icon}
                  browseLabel={t("browseAll", { count: cat.count })}
                  countLabel={t("toolsCount", { count: cat.count })}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                  onLinkClick={() => setOpenSlug(null)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * The dropdown panel anchored below a category chip. Kept as a
 * separate component so the JSX above stays readable.
 */
function CategoryPanel({
  category,
  Icon,
  browseLabel,
  countLabel,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: {
  category: (typeof FEATURED)[number];
  Icon: React.ComponentType<{ className?: string }>;
  browseLabel: string;
  countLabel: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLinkClick: () => void;
}) {
  // Cap the preview at 8 sub-tools — enough to fill a 2-col grid
  // without becoming a wall. The full list is one click away.
  const examples = category.examples.slice(0, 8);

  return (
    <div
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "bg-popover text-popover-foreground border-border/60 animate-fade-in",
        "absolute top-full left-0 z-50 mt-2 w-72 rounded-xl border p-3 shadow-xl"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 border-b pb-2">
        <span className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="text-primary h-3.5 w-3.5" aria-hidden="true" />
          {category.name}
        </span>
        <span className="text-muted-foreground text-[11px]">{countLabel}</span>
      </div>

      <ul className="grid grid-cols-2 gap-x-1 gap-y-0.5">
        {examples.map((tool) => (
          <li key={tool}>
            <Link
              href={`/tools/${category.slug}#${toAnchor(tool)}`}
              role="menuitem"
              onClick={onLinkClick}
              className={cn(
                "text-foreground/85 hover:bg-muted hover:text-foreground",
                "block truncate rounded-md px-2 py-1 text-xs transition-colors"
              )}
              title={tool}
            >
              {tool}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/tools/${category.slug}`}
        role="menuitem"
        onClick={onLinkClick}
        className={cn(
          "text-primary hover:text-primary/80",
          "mt-2 inline-flex items-center gap-1 border-t pt-2 text-xs font-medium"
        )}
      >
        {browseLabel}
      </Link>
    </div>
  );
}
