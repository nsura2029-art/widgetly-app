import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  Trophy,
  Crown,
  Sparkles,
  ArrowRight,
  Award,
  Calendar,
  CalendarDays,
  CalendarRange,
  Infinity as InfinityIcon,
  Flame,
  Layers,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import {
  getFeaturedCreator,
  getLeaderboard,
  LEADERBOARD_WINDOWS,
  normalizeLeaderboardWindow,
  type LeaderboardBadge,
  type LeaderboardEntry,
  type LeaderboardWindow,
} from "@/lib/d1/leaderboard";

export const metadata: Metadata = buildMetadata({
  title: "Leaderboard",
  description:
    "The creators building Widgetly's tools, ranked by contributions across all time, this month, this week, and today.",
  path: "/leaderboard",
  keywords: [
    "widgetly leaderboard",
    "tool creators",
    "contributor ranking",
    "online tools community",
  ],
});

/**
 * Static-render friendly: we don't know which window a user will pick
 * from the URL until request time, so we let Next.js SSR each request
 * and rely on the CDN to cache the most common path (`all`) for an
 * hour. The featured creator block is the part that benefits most from
 * edge caching — it's the same across windows.
 */
export const revalidate = 300;

type SearchParams = { window?: string };

/**
 * Tab metadata for the 4 time windows. Icons map to the visual scale of
 * the window (clock → calendar → calendar-days → infinity) so a reader
 * can tell which tab shows the largest scope at a glance.
 */
const TAB_ICONS: Record<LeaderboardWindow, React.ComponentType<{ className?: string }>> = {
  today: Calendar,
  week: CalendarDays,
  month: CalendarRange,
  all: InfinityIcon,
};

const TAB_KEYS: Record<LeaderboardWindow, string> = {
  all: "allTime",
  month: "thisMonth",
  week: "thisWeek",
  today: "today",
};

/**
 * Visual metadata for each badge kind. The `tint` is the colour family
 * used for the badge pill background — picked to read as "earned" rather
 * than "alert" against the white card surface.
 */
const BADGE_META: Record<
  LeaderboardBadge,
  { labelKey: string; icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  "first-tool": {
    labelKey: "first-tool",
    icon: Sparkles,
    tint: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  pioneer: { labelKey: "pioneer", icon: Crown, tint: "bg-amber-50 text-amber-700 ring-amber-200" },
  "top-week": {
    labelKey: "top-week",
    icon: Trophy,
    tint: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  "top-month": {
    labelKey: "top-month",
    icon: Trophy,
    tint: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  "top-all": { labelKey: "top-all", icon: Crown, tint: "bg-rose-50 text-rose-700 ring-rose-200" },
  polyglot: { labelKey: "polyglot", icon: Layers, tint: "bg-sky-50 text-sky-700 ring-sky-200" },
  "streak-7": {
    labelKey: "streak-7",
    icon: Flame,
    tint: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  "streak-30": { labelKey: "streak-30", icon: Flame, tint: "bg-red-50 text-red-700 ring-red-200" },
};

/**
 * Deterministic avatar from a seed string. We pick an emoji + colour
 * ring by hashing the seed, so the same creator always renders the same
 * avatar without any external image fetches.
 */
function avatarFromSeed(seed: string): { emoji: string; ring: string } {
  // Tiny hash: sum of char codes mod the bucket size. Stable across runs.
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const EMOJIS = [
    "🦊",
    "🐼",
    "🦉",
    "🐝",
    "🦄",
    "🐙",
    "🦋",
    "🐢",
    "🦁",
    "🐯",
    "🐧",
    "🦔",
    "🐬",
    "🦦",
    "🦜",
    "🦝",
  ];
  const RINGS = [
    "from-violet-500 to-fuchsia-500",
    "from-amber-500 to-rose-500",
    "from-sky-500 to-emerald-500",
    "from-indigo-500 to-cyan-500",
    "from-rose-500 to-orange-500",
    "from-emerald-500 to-teal-500",
  ];
  return {
    emoji: EMOJIS[Math.abs(hash) % EMOJIS.length] ?? "🦊",
    ring: RINGS[Math.abs(hash >> 8) % RINGS.length] ?? RINGS[0]!,
  };
}

function CreatorAvatar({ seed, size = "md" }: { seed: string; size?: "sm" | "md" | "lg" }) {
  const { emoji, ring } = avatarFromSeed(seed);
  const sizeClass =
    size === "lg"
      ? "h-16 w-16 text-2xl"
      : size === "sm"
        ? "h-8 w-8 text-base"
        : "h-10 w-10 text-lg";
  return (
    <span
      aria-hidden="true"
      className={`bg-gradient-to-br ${ring} flex ring-2 ring-white/60 ${sizeClass} items-center justify-center rounded-full shadow-sm`}
    >
      {emoji}
    </span>
  );
}

/**
 * Featured creator card — the "latest creator" highlight at the top.
 * Different from the ranked list because it doesn't have a numeric rank
 * (it sits above the leaderboard) and gets a larger card.
 */
function FeaturedCreatorCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <article className="from-primary/5 via-secondary/5 to-accent/5 border-border/60 shadow-soft relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <CreatorAvatar seed={entry.user.avatarSeed} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-muted flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Latest creator
          </div>
          <h2 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
            @{entry.user.handle}
          </h2>
          <p className="text-foreground mt-1 text-base font-medium">{entry.user.displayName}</p>
          {entry.user.bio && (
            <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">{entry.user.bio}</p>
          )}
          <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              <strong className="text-foreground font-semibold">{entry.contributions}</strong> tools
              shipped
            </span>
            {entry.tools.length > 0 && entry.tools[0] && (
              <span>
                Latest:{" "}
                <Link
                  href={`/tools/${entry.tools[0].category}/${entry.tools[0].slug}`}
                  className="text-primary hover:underline"
                >
                  {entry.tools[0].name}
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Standard ranked leaderboard row. Used in all 4 tabs. */
function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className="border-border/60 shadow-soft flex h-full flex-col gap-4 rounded-2xl border bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex w-10 shrink-0 flex-col items-center pt-1">
          <span className="text-muted text-[10px] font-semibold tracking-wider uppercase">
            Rank
          </span>
          <span className="text-foreground text-2xl font-bold tabular-nums">#{entry.rank}</span>
        </div>
        <CreatorAvatar seed={entry.user.avatarSeed} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground truncate font-semibold">@{entry.user.handle}</h3>
          <p className="text-muted truncate text-sm">{entry.user.displayName}</p>
          {entry.user.bio && (
            <p className="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">{entry.user.bio}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {entry.contributions}
          </div>
          <div className="text-muted text-[10px] font-semibold tracking-wider uppercase">tools</div>
        </div>
      </div>

      {entry.tools.length > 0 && (
        <div className="border-border/60 border-t pt-3">
          <div className="text-muted mb-2 text-[10px] font-semibold tracking-wider uppercase">
            Recent tools
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {entry.tools.slice(0, 4).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.category}/${t.slug}`}
                  className="border-border bg-muted/5 hover:bg-muted/10 text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors"
                >
                  {t.name}
                </Link>
              </li>
            ))}
            {entry.tools.length > 4 && (
              <li className="text-muted self-center text-xs">+{entry.tools.length - 4} more</li>
            )}
          </ul>
        </div>
      )}

      {entry.badges.length > 0 && (
        <div className="border-border/60 border-t pt-3">
          <div className="text-muted mb-2 text-[10px] font-semibold tracking-wider uppercase">
            Badges
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {entry.badges.slice(0, 4).map((b) => {
              const meta = BADGE_META[b];
              const Icon = meta.icon;
              return (
                <li key={b}>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${meta.tint}`}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {b}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * Tab bar — inlined into the page rather than extracted as a child
 * component because it needs the `t` translation function. Server
 * components can't pass functions across the RSC boundary (the
 * serialization boundary rejects anything non-plain-object), so
 * pulling this out into its own component would silently work in
 * `next dev` (where the RSC payload format is more lenient) but
 * blow up at build time with a __next_error__ page in production.
 * Inlining keeps everything in one server-component scope.
 */
function TabBar({
  active,
  baseHref,
  tabsLabel,
  labels,
}: {
  active: LeaderboardWindow;
  baseHref: string;
  tabsLabel: string;
  labels: Record<LeaderboardWindow, string>;
}) {
  return (
    <nav aria-label={tabsLabel} className="border-border/60 bg-muted/5 rounded-xl border p-1.5">
      <ul className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
        {LEADERBOARD_WINDOWS.map((w) => {
          const Icon = TAB_ICONS[w];
          const isActive = w === active;
          return (
            <li key={w} className="flex-1">
              <Link
                href={w === "all" ? baseHref : `${baseHref}?window=${w}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {labels[w]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const window = normalizeLeaderboardWindow(sp.window);
  const t = await getTranslations("leaderboard");

  let featured: Awaited<ReturnType<typeof getFeaturedCreator>> = null;
  let ranked: Awaited<ReturnType<typeof getLeaderboard>> = [];
  let fetchError: string | null = null;
  try {
    [featured, ranked] = await Promise.all([getFeaturedCreator(), getLeaderboard(window, 30)]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    console.error("LEADERBOARD_FETCH_ERROR:", fetchError);
    // Fall through with empty results — page renders the empty state.
  }

  const baseHref = `/${locale}/leaderboard`;

  return (
    <PageShell width="wide">
      {/* Hero */}
      <header className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-10">
        <Badge variant="secondary" className="self-start">
          <Trophy className="h-3 w-3" aria-hidden="true" />
          <span className="ml-1">{t("title")}</span>
        </Badge>
        <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("subtitle")}
        </h1>
      </header>

      {/* Featured creator (always shown, regardless of window) */}
      {featured ? (
        <section className="mt-8" aria-labelledby="featured-creator-heading">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
            <h2
              id="featured-creator-heading"
              className="text-foreground text-sm font-semibold tracking-wider uppercase"
            >
              {t("featuredHeading")}
            </h2>
          </div>
          <FeaturedCreatorCard entry={featured} />
        </section>
      ) : (
        /* No creators yet — show the empty state CTA instead. */
        <section className="mt-8" aria-labelledby="empty-heading">
          <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-8 text-center">
            <div className="bg-primary/10 text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="empty-heading" className="text-foreground mt-4 text-xl font-semibold">
              {t("noCreatorsTitle")}
            </h2>
            <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
              {t("noCreatorsBody")}
            </p>
            {fetchError && (
              <pre className="mt-4 max-w-2xl overflow-x-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-700">
                {fetchError}
              </pre>
            )}
            <Button asChild className="mt-6">
              <Link href="/suggest">
                {t("contributeCta")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Tab bar */}
      <section className="mt-12" aria-labelledby="ranking-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="text-primary h-4 w-4" aria-hidden="true" />
            <h2
              id="ranking-heading"
              className="text-foreground text-sm font-semibold tracking-wider uppercase"
            >
              {t(TAB_KEYS[window])}
            </h2>
          </div>
        </div>

        <TabBar
          active={window}
          baseHref={baseHref}
          tabsLabel={t("tabsLabel")}
          labels={{
            all: t("allTime"),
            month: t("thisMonth"),
            week: t("thisWeek"),
            today: t("today"),
          }}
        />

        {ranked.length === 0 ? (
          <div className="border-border/60 mt-6 rounded-2xl border bg-white p-8 text-center">
            <p className="text-muted text-sm">{t("empty")}</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {ranked.map((entry) => (
              <LeaderboardRow key={entry.user.handle} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
