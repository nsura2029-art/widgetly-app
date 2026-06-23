"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { getIcon } from "@/lib/icons";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { cn } from "@/lib/utils";

/**
 * ToolsBanner — fully DB-driven mega menu.
 *
 * ## Why DB-driven now
 *
 * The banner used to merge a static `src/lib/tools-subgroups.ts`
 * catalog with live rows from `/api/public/tools?format=grouped`.
 * That gave us a "Live Now" column duplicating static placeholders
 * for every admin-marked-live tool, because the seed data made the
 * static and DB sets overlap 100% in practice.
 *
 * We now read everything from D1. The grouped endpoint returns
 * `Record<category, Record<subcategory, LiveToolSummary[]>>` and we
 * render one column per subcategory. Status changes propagate via
 * the 10s edge cache on the API, so flipping a tool to `deprecated`
 * makes it vanish from the menu within ~10s without a redeploy.
 *
 * ## What stays from the static catalog
 *
 * - `TOOLS_CATEGORIES` (12 entries) is still the source of truth
 *   for category-level metadata: slug, name, icon, accent, count,
 *   intro. The menu chips use these to identify which categories
 *   are featured.
 * - `getSubgroups()` is no longer called — its data now lives in
 *   the `subcategory` column of `admin_tools`.
 *
 * ## Layout
 *
 * - Sticky under the brand header at top-16 (z-40). The brand
 *   header sits at top-0 (z-50), the tools banner at top-16
 *   (z-40), the mega panel below the banner at z-40 — same z-index
 *   because the panel only renders inside the banner's positioning
 *   context, so they don't z-fight in practice.
 * - Chip row scrolls horizontally on mobile (overflow-x-auto).
 * - Panel renders one column per subcategory for the open category.
 *   Each column is a fixed 200px wide, matching the previous layout
 *   so the visual rhythm doesn't change.
 */

// ---------------------------------------------------------------------------
// Accent palette
// ---------------------------------------------------------------------------

const ACCENT_TILE_CLASSES: Record<string, string> = {
  // Mirrors the previous static palette so the menu looks identical
  // when seeded from tools-subgroups.ts. The DB's `accent_color`
  // is one of the three accent vars ("primary" | "secondary" |
  // "accent"); the legacy subgroup accent names ("orange",
  // "indigo", etc.) come from a different palette map and are
  // handled by the API: per-tool `accent_color` from D1 is what the
  // menu uses, but subgroup color is no longer authoritative.
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  secondary: "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
  accent: "bg-accent hover:bg-accent/90 text-accent-foreground",
  // Direct accent names from the legacy tools-subgroups.ts palette,
  // preserved here so admin-added tools that reference these
  // colors still get a sensible tile. The DB stores
  // `accent_color = 'primary'|'secondary'|'accent'` only — these
  // are defensive fallbacks for any seeded row that pre-dates the
  // palette unification.
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

// ---------------------------------------------------------------------------
// Featured categories (chip row)
// ---------------------------------------------------------------------------

/**
 * Categories shown as chips in the banner. After the move to a
 * DB-driven menu, all 12 categories are listed (no curation). If
 * a category has zero live DB tools, the chip still renders but
 * the panel shows a friendly "Coming soon" empty state instead of
 * columns — keeps the menu structure predictable across the board.
 */
const FEATURED_SLUGS = TOOLS_CATEGORIES.map((c) => c.slug);

/** Live tool summary shape returned by /api/public/tools?format=grouped. */
type LiveTool = {
  slug: string;
  name: string;
  accent_color: "primary" | "secondary" | "accent";
  sort_order: number;
};
type LiveToolsByCategory = Record<string, Record<string, LiveTool[]>>;

/**
 * Anchor id used to scroll to a tool on the /tools/[category] page.
 * Lowercase, hyphen-separated, ASCII only. Matches the slug the
 * admin DB stores for live tools, so menu links land at the right
 * anchor (or, for tools with a [tool] page, route to the page).
 *
 * Currently unused — the menu links straight to the [tool] page
 * since every live DB tool has one. Kept exported for future
 * anchor-scroll behaviors.
 */

function _toAnchor(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const MEGA_PANEL_ID = "tools-mega-panel";

const FEATURED = FEATURED_SLUGS.map((slug) => {
  const cat = TOOLS_CATEGORIES.find((c) => c.slug === slug)!;
  return { ...cat, Icon: getIcon(cat.icon) };
});

// ---------------------------------------------------------------------------
// ToolsBanner (the export)
// ---------------------------------------------------------------------------

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
  // protected. We do not refetch on every panel open; the cache
  // TTL is short enough that admin status changes show up within
  // ~10s — the menu is "live enough" for the admin workflow.
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
    // `sticky top-16 z-40` wrapper establishes the positioning
    // context for the absolute mega panel below AND keeps the
    // banner pinned to the top of the viewport as the page
    // scrolls. See git history for the bug where the panel
    // rendered at y=100vh because there was no positioned
    // ancestor.
    <div className="sticky top-16 z-40">
      <nav
        ref={navRef}
        aria-label={t("ariaLabel")}
        onMouseLeave={scheduleClose}
        className={cn(
          // Sits inside the sticky wrapper above (which pins both
          // this banner and the mega panel at top-16). The banner's
          // own background, border, and backdrop-blur stay on the
          // inner <nav> so the panel below it doesn't accidentally
          // inherit them when the panel scrolls under the brand
          // header.
          "bg-primary-50/85 supports-[backdrop-filter]:bg-primary-50/70",
          "border-primary-100/80 border-b backdrop-blur"
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

      {/* Mega menu panel — anchored to the bottom of the banner via
          the wrapper above. Sticky elements form a containing block
          for absolute descendants, so `absolute top-full` lands
          directly under the banner and scrolls with it. */}
      {openCat ? (
        <MegaPanel
          id={MEGA_PANEL_ID}
          category={openCat}
          Icon={openCat.Icon}
          browseLabel={t("browseAll", { count: openCat.count })}
          countLabel={t("toolsCount", { count: openCat.count })}
          subcategories={liveTools[openCat.slug] ?? {}}
          liveStatus={liveStatus}
          emptyHint={t("emptyHint", { category: openCat.name })}
          onLinkClick={close}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MegaPanel — renders one column per subcategory for the open cat
// ---------------------------------------------------------------------------

function MegaPanel({
  id,
  category,
  Icon,
  browseLabel,
  countLabel,
  subcategories,
  liveStatus,
  emptyHint,
  onLinkClick,
  onMouseEnter,
  onMouseLeave,
}: {
  id: string;
  category: (typeof FEATURED)[number];
  Icon: React.ComponentType<{ className?: string }>;
  browseLabel: string;
  countLabel: string;
  /** Two-level grouping from /api/public/tools?format=grouped. */
  subcategories: Record<string, LiveTool[]>;
  liveStatus: "idle" | "loading" | "ready" | "error";
  emptyHint: string;
  onLinkClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  // Subcategories come back from the DB already sorted by
  // (subcategory, sort_order, name). Convert the map to an array of
  // [name, tools[]] tuples so the panel renders columns in DB order.
  const subEntries = React.useMemo(
    () =>
      Object.entries(subcategories)
        .map(([subcategory, tools]) => ({ subcategory, tools }))
        // Stable sort by sort_order inside each subcategory (DB does
        // this for us, but be defensive if the API ever returns
        // unsorted data).
        .map((s) => ({
          ...s,
          tools: [...s.tools].sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
            return a.name.localeCompare(b.name);
          }),
        })),
    [subcategories]
  );

  const totalTools = subEntries.reduce((n, s) => n + s.tools.length, 0);

  return (
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

          {/* Column layout: flex with fixed-width columns (200px) and
              consistent gap-x-6 / gap-y-8. flex-wrap lets columns wrap
              to a second row when the panel max-width is reached.
              Mirrors the previous layout exactly — the visual rhythm
              doesn't change, only the data source. */}
          {subEntries.length === 0 ? (
            <div className="text-muted-foreground px-2 py-8 text-center text-sm">
              {liveStatus === "error" ? emptyHint : t_("emptyWhileLoading")}
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-x-6 gap-y-8">
              {subEntries.map((s) => (
                <div key={s.subcategory} className="w-[200px] shrink-0">
                  <SubcategoryColumn
                    subcategory={s.subcategory}
                    tools={s.tools}
                    categorySlug={category.slug}
                    onLinkClick={onLinkClick}
                  />
                </div>
              ))}
            </div>
          )}

          {/* sr-only live region for screen readers when the data is
              still loading or errored — the visible UI shows an
              empty-state message, so this is the only signal for
              non-sighted users that something went wrong. */}
          <p className="sr-only" aria-live="polite">
            {liveStatus === "loading" ? t_("loadingLive") : ""}
            {liveStatus === "error" ? t_("errorLive") : ""}
            {liveStatus === "ready" && totalTools > 0 ? t_("readyLive", { count: totalTools }) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// Tiny i18n accessor that doesn't depend on a top-level hook — keeps
// MegaPanel's signature stable while letting the live region pull
// translations. Substitutes `{name}` placeholders with the values
// from `vars` so we can format counts and category names without a
// second hook.
function t_(key: string, vars?: Record<string, string | number>): string {
  if (!vars) return key;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    key
  );
}

function SubcategoryColumn({
  subcategory,
  tools,
  categorySlug,
  onLinkClick,
}: {
  subcategory: string;
  tools: LiveTool[];
  categorySlug: string;
  onLinkClick: () => void;
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">
        {subcategory}
      </h3>
      <ul className="space-y-0.5">
        {tools.map((t) => (
          <li key={t.slug}>
            <ToolLink
              slug={t.slug}
              name={t.name}
              accent={t.accent_color}
              categorySlug={categorySlug}
              onClick={onLinkClick}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolLink({
  slug,
  name,
  accent,
  categorySlug,
  onClick,
}: {
  slug: string;
  name: string;
  accent: LiveTool["accent_color"];
  categorySlug: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/tools/${categorySlug}/${slug}`}
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
          ACCENT_TILE_CLASSES[accent] ?? ACCENT_TILE_CLASSES.primary
        )}
        aria-hidden="true"
      >
        <ToolLinkIcon name={name} />
      </span>
      <span className="truncate">{name}</span>
    </Link>
  );
}

/**
 * Pre-resolved icon map for the dynamic tool links. The DB doesn't
 * send an icon name (keeps the grouped payload small), so we derive
 * one from the tool's display name. The lint rule
 * `react-hooks/static-components` forbids creating components during
 * render, so we resolve every named icon ONCE at module load and
 * look it up at render time by name.
 *
 * Falls back to "Sparkles" for any name we don't recognize — better
 * than no icon at all.
 */
const NAME_TO_ICON: Array<[RegExp, string]> = [
  [/merge|combine|join/i, "Combine"],
  [/split|separate/i, "Split"],
  [/compress|minif/i, "Minimize2"],
  [/convert|to pdf|from pdf/i, "ArrowLeftRight"],
  [/edit|modify/i, "Edit3"],
  [/rotate/i, "RotateCw"],
  [/sign|signature/i, "PenTool"],
  [/protect|lock|password|secure/i, "Lock"],
  [/unlock/i, "LockOpen"],
  [/ocr|scan|text/i, "ScanText"],
  [/image|photo|picture/i, "Image"],
  [/resize|crop|scale/i, "Crop"],
  [/video|mp4|mov/i, "Video"],
  [/audio|music|sound|voice/i, "Volume2"],
  [/pdf/i, "FileText"],
  [/word|doc/i, "FileText"],
  [/excel|sheet|spreadsheet/i, "Sheet"],
  [/ppt|presentation|slide/i, "Presentation"],
  [/json|format|validate/i, "Braces"],
  [/base64|hash|encrypt/i, "Lock"],
  [/url|encoder|decoder/i, "Link"],
  [/color|hex|rgb/i, "Palette"],
  [/qr|barcode/i, "QrCode"],
  [/calculate|calculator|math/i, "Calculator"],
  [/percent|ratio/i, "Percent"],
  [/bmi|health|body/i, "Heart"],
  [/loan|mortgage|finance|money|tax|invoice|salary|receipt/i, "DollarSign"],
  [/age|birth/i, "Calendar"],
  [/calorie|diet/i, "Apple"],
  [/gpa|grade|score/i, "GraduationCap"],
  [/scientific|formula/i, "Sigma"],
  [/tip/i, "Coins"],
  [/compound|interest/i, "TrendingUp"],
  [/currency|exchange/i, "Banknote"],
  [/unit|measure|length|weight|temperature/i, "Ruler"],
  [/time.?zone|clock/i, "Clock"],
  [/meta|og|seo/i, "Search"],
  [/sitemap|robots/i, "Sitemap"],
  [/keyword|word.?count/i, "Type"],
  [/case/i, "CaseSensitive"],
  [/json.?formatter|validator/i, "Braces"],
  [/regex|test/i, "Regex"],
  [/diff|compare/i, "GitCompare"],
  [/uuid/i, "Fingerprint"],
  [/password.?gen/i, "KeyRound"],
  [/jwt/i, "ShieldCheck"],
  [/flashcard|lesson|rubric|study|citation/i, "GraduationCap"],
  [/essay|writing|paraphras|plagiar|readab|tone|headline/i, "PenLine"],
  [/resume/i, "Briefcase"],
  [/email/i, "Mail"],
  [/summariz/i, "AlignLeft"],
  [/grammar/i, "CheckCircle"],
  [/paraphrase/i, "Repeat"],
  [/chat/i, "MessageCircle"],
  [/translate/i, "Languages"],
  [/image.?gen|generator/i, "Wand2"],
  [/voice|speech|tts/i, "Mic"],
  [/ai|sparkle/i, "Sparkles"],
  [/meme/i, "Smile"],
  [/background/i, "Eraser"],
  [/upscale/i, "ZoomIn"],
  [/watermark/i, "Stamp"],
  [/gif/i, "Film"],
  [/trim/i, "Scissors"],
  [/remove.?pages|delete/i, "FileX"],
  [/extract/i, "FileOutput"],
  [/insert/i, "FilePlus"],
  [/reorder/i, "ArrowUpDown"],
  [/scan.?to/i, "ScanLine"],
  [/repair/i, "Wrench"],
  [/page.?number/i, "Hash"],
  [/redact/i, "EyeOff"],
  [/fill/i, "Signature"],
  [/request|send/i, "Send"],
  [/compare/i, "Eye"],
  [/generate.?presentation/i, "Presentation"],
];

function pickIconForName(name: string): string {
  for (const [re, iconName] of NAME_TO_ICON) {
    if (re.test(name)) return iconName;
  }
  return "Sparkles";
}

/** Pre-resolve every icon name in NAME_TO_ICON so the JSX layer can
 *  pick a component by name (string lookup) instead of creating
 *  components during render. */
const PRE_RESOLVED_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = Object.fromEntries(
  Array.from(new Set(NAME_TO_ICON.map(([, name]) => name).concat("Sparkles"))).map(
    (n) => [n, getIcon(n)] as const
  )
);

function ToolLinkIcon({ name }: { name: string }) {
  const iconName = pickIconForName(name);
  const Icon = PRE_RESOLVED_ICONS[iconName] ?? PRE_RESOLVED_ICONS.Sparkles!;
  return <Icon className="h-3.5 w-3.5" />;
}
