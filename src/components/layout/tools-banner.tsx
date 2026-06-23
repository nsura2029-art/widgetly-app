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
  // The 500/600 pairing is the standard "background darker on
  // press" feedback. The shade varies a bit by color to make the
  // palette feel cohesive rather than uniformly bright:
  //   - red/orange/pink/amber: 500 base (warm, "energetic" actions)
  //   - blue/indigo/cyan: 600 base (cooler, "structural" actions)
  //   - green/teal/purple: 500 base (action verbs)
  // This avoids the "candy" feel of using identical 500 shades
  // for every group and gives the menu a more refined look.
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

/** Live tool summary shape returned by /api/public/tools?format=grouped. */
type LiveTool = { slug: string; name: string };
type LiveToolsByCategory = Record<string, LiveTool[]>;

/**
 * Anchor id used to scroll to a sub-tool on the /tools/[category]
 * page. Lowercase, hyphen-separated, ASCII only. Matches the slug
 * the admin DB stores for live tools, so the "Live now" entries
 * can link to the same anchor ids the static groups use.
 */
function toAnchor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

const MEGA_PANEL_ID = "tools-mega-panel";

/**
 * Sticky, themed band that sits below the page header and above
 * the page content. Replaces the per-page breadcrumb.
 *
 * ## Why `prefetch={false}` on every Link in this file
 *
 * The mega panel renders 7-29 sub-tool Links at once. With
 * Next.js's default `prefetch` behavior, mounting the panel
 * triggers an RSC prefetch for every visible Link. That is
 * 7-29 parallel POSTs to the Cloudflare Worker, and when
 * the user opens the panel quickly (or opens multiple
 * panels in succession) the Worker's concurrent-request
 * budget is exhausted — the browser sees 503 Service
 * Unavailable for the losing requests.
 *
 * Two reasons `prefetch={false}` is correct here, not just
 * a workaround:
 *
 *  1. All destination routes (`/tools/[category]` and
 *     `/tools/[category]/[tool]`) are `force-static`. The
 *     page HTML is prerendered at build time and served
 *     from the edge cache on every request — no Worker
 *     involvement, no RSC serialization. A regular
 *     navigation is already faster than an RSC prefetch
 *     for these pages.
 *
 *  2. A user opening the mega panel is **exploring**,
 *     not committing to a destination. Most panels are
 *     opened-and-closed without a click. Prefetching 30
 *     routes just to be ready for the 1-in-30 click is
 *     pure waste.
 *
 * When real tool UIs ship (the "Coming Soon" hero is
 * replaced with an interactive tool), revisit this —
 * dynamic tool pages might benefit from intent-based
 * prefetch. For now, the static HTML navigation is
 * already < 50ms warm.
 *
 * Layout:
 *  - Background spans the full viewport width (same as header)
 *    so the band reads as a continuous global utility surface.
 *    The chip row inside is wrapped in a container so the chips
 *    themselves stay aligned with the rest of the page.
 *  - **Non-sticky by design.** The band sits in normal document
 *    flow directly under the sticky header and scrolls away with
 *    the page. Rationale: only the brand mark belongs at the top
 *    of every viewport; a sticky menu bar fights the user's eye
 *    for attention and pins real estate that would otherwise be
 *    content. With mega menus still openable on hover/click, the
 *    menu is always one tap away without taking viewport space.
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
 * ## Live catalog merge (2026-06-22)
 *
 * The mega panel used to render only the static sub-groupings
 * defined in src/lib/tools-subgroups.ts. That meant any tool an
 * admin marked `live` in the admin panel was invisible in the
 * menu — it would only show on /tools/[category] and on the
 * /suggest?status=live board. Now we fetch
 * /api/public/tools?format=grouped once on mount and append a
 * "Live now" column to each panel listing the DB tools that are
 * `status='live'` for that category. The fetch is edge-cached at
 * s-maxage=10 so admin status changes propagate within ~10s,
 * matching the cache policy on the category pages.
 *
 * ### Why we don't dedupe the Live column against static groups
 *
 * Earlier this filter was `extras = liveTools.filter((t) =>
 * !staticAnchors.has(t.slug))` — only show DB tools NOT in the
 * static list. With the current seed catalog, every admin tool is
 * a duplicate of a static tool (same slug, same display name), so
 * `extras` was always empty and the column never rendered. Users
 * who marked tools live in the admin saw no confirmation in the
 * menu and reasonably concluded "menu is broken".
 *
 * The Live column now shows every DB row for the category,
 * regardless of overlap with the static groups. The green dot in
 * the column header is the visible signal "these are live right
 * now" — answering the user's actual question. Duplicates with
 * static groups are kept; the column adds information (live
 * status) rather than competing for the same slot.
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
  const [liveTools, setLiveTools] = React.useState<LiveToolsByCategory>({});
  const [liveStatus, setLiveStatus] = React.useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
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

  // Fetch the grouped live-tools feed once on mount. Cached at the
  // edge (s-maxage=10) so the Worker's 10ms/request budget is
  // protected — see /api/public/tools?format=grouped. We do not
  // refetch on every panel open; the cache TTL is short enough
  // that status changes show up within ~10s.
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/public/tools?format=grouped", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { categories?: LiveToolsByCategory }) => {
        if (cancelled) return;
        setLiveTools(body.categories ?? {});
        setLiveStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLiveStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCat = openSlug ? FEATURED.find((c) => c.slug === openSlug) : undefined;

  return (
    <>
      <nav
        ref={navRef}
        aria-label={t("ariaLabel")}
        onMouseLeave={scheduleClose}
        className={cn(
          // Sticky directly under the brand header (which is sticky top-0,
          // h-16 = 4rem). Pinned at z-40 so the mega panel below can
          // render at z-40 too without z-fighting.
          // The user requested the tools menu stay visible on scroll so
          // a category chip is always one tap away. Scroll-margin-top in
          // globals.css is set to (header height + 1.5rem) so anchored
          // section headings still clear both layers.
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

      {/* Mega menu panel — anchored to the bottom of the banner.
          Since the banner is non-sticky (scrolls with the page),
          the panel follows the banner in document flow rather than
          being pinned to the viewport. Mounted only while open. */}
      {openCat ? (
        <MegaPanel
          id={MEGA_PANEL_ID}
          category={openCat}
          Icon={openCat.Icon}
          subIcons={openCat.subIcons}
          browseLabel={t("browseAll", { count: openCat.count })}
          countLabel={t("toolsCount", { count: openCat.count })}
          liveTools={liveTools[openCat.slug] ?? []}
          liveStatus={liveStatus}
          liveSectionTitle={t("liveSectionTitle")}
          liveSectionHint={t("liveSectionHint")}
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
 * just below the sticky banner via the shared sticky chrome variables.
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
  liveTools,
  liveStatus,
  liveSectionTitle,
  liveSectionHint,
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
  liveTools: LiveTool[];
  liveStatus: "idle" | "loading" | "ready" | "error";
  liveSectionTitle: string;
  liveSectionHint: string;
  onLinkClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const subgroups = getSubgroups(category.slug);
  // The full live list for this category (not deduped against static
  // groups). The user expects "I marked these live in the admin and
  // I should see them in the menu" — the green-dot column is the
  // signal that DB-driven admin additions are visible. Showing it
  // only for tools NOT already in static groups was wrong UX: with
  // the seed catalog, every admin tool is a duplicate of a static
  // tool, so the column never rendered and the user thought the
  // menu was empty.
  const live = liveTools;

  return (
    // Outer wrapper spans the full container width and handles centering
    // + pointer-events passthrough. Since the banner is non-sticky, the
    // panel is `absolute top-full` so it sits right under the banner and
    // follows it in document flow. The actual visible panel (with
    // background, border, shadow) is the inner div, which is sized
    // to its content via `w-fit max-w-[1600px]`. So when a category
    // has only 2-3 subgroups, the panel shrinks to fit those columns
    // instead of stretching across the whole viewport.
    <div className="pointer-events-none absolute inset-x-0 top-full z-40 flex justify-center">
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "animate-fade-in pointer-events-auto w-fit max-w-[1600px]",
          "border-border/60 bg-popover/98 supports-[backdrop-filter]:bg-popover/85",
          "rounded-b-xl border shadow-2xl backdrop-blur"
        )}
      >
        <div id={id} role="menu" aria-label={category.name} className="px-6 py-6">
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
              prefetch={false}
              onClick={onLinkClick}
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs font-medium"
            >
              {browseLabel}
            </Link>
          </div>

          {/*
            Column layout: flex with fixed-width columns (200px) and
            consistent gap-x-6 / gap-y-8. flex-wrap lets columns wrap
            to a second row when the panel max-width is reached.

            Why fixed-width columns instead of `grid auto-fit minmax`?
              - `auto-fit` stretches every column to fill available
                space, which on a 7-subgroup category at 1440px gives
                6 thin columns (180px each). On a 3-subgroup category,
                the 3 columns stretch to 400px each — too wide, with
                dead space on the right.
              - Fixed 200px columns are readable at any subgroup count.
                3 subgroups = 660px panel (centered on screen).
                7 subgroups wrap to 2 rows of 5+2.
                gap-x-6 is constant regardless of how many columns.
          */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-8">
            {subgroups ? (
              subgroups.map((group) => (
                <div key={group.title} className="w-[200px] shrink-0">
                  <SubgroupColumn
                    group={group}
                    categorySlug={category.slug}
                    subIcons={subIcons}
                    onLinkClick={onLinkClick}
                  />
                </div>
              ))
            ) : (
              // Fallback for any featured category that doesn't have
              // explicit sub-groupings defined yet — render the flat
              // `examples` list in a single column with category icon
              // as a placeholder for each item.
              <div className="w-[200px] shrink-0">
                <FallbackColumn
                  examples={category.examples}
                  categorySlug={category.slug}
                  onLinkClick={onLinkClick}
                />
              </div>
            )}
            {/* Live catalog — every live DB tool in this category,
                shown alongside the static groups. The green dot in
                the column header signals "these are live right now
                in the admin", which is the user-visible answer to
                "I marked them live, where are they?". Hidden only
                when D1 returns nothing (no live tools at all) or the
                fetch is still loading. Error states are non-blocking
                — the static groups still render underneath. */}
            {live.length > 0 ? (
              <div className="w-[200px] shrink-0">
                <LiveColumn
                  tools={live}
                  title={liveSectionTitle}
                  categorySlug={category.slug}
                  onLinkClick={onLinkClick}
                />
              </div>
            ) : null}
            {liveStatus === "error" ? (
              <p className="text-muted-foreground sr-only" aria-live="polite">
                {liveSectionHint}
              </p>
            ) : null}
          </div>
        </div>
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
              href={`/tools/${categorySlug}/${toAnchor(item.name)}`}
              onClick={onLinkClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiveColumn({
  tools,
  title,
  categorySlug,
  onLinkClick,
}: {
  tools: LiveTool[];
  title: string;
  categorySlug: string;
  onLinkClick: () => void;
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {title}
      </h3>
      <ul className="space-y-0.5">
        {tools.map((t) => (
          <li key={t.slug}>
            <SubToolLink
              item={{ name: t.name, icon: "Sparkles" }}
              Icon={getIcon("Sparkles")}
              accent="green"
              href={`/tools/${categorySlug}/${t.slug}`}
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

function FallbackColumn({
  examples,
  categorySlug,
  onLinkClick,
}: {
  examples: readonly string[];
  categorySlug: string;
  onLinkClick: () => void;
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
        Examples
      </h3>
      <ul className="space-y-0.5">
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
    </div>
  );
}
