import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  Calendar,
  CalendarDays,
  CalendarRange,
  Crown,
  Infinity as InfinityIcon,
  Lightbulb,
  Trophy,
  Users,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import { listTopSuggesters, type TopSuggester } from "@/lib/d1/suggestions";

export const metadata: Metadata = buildMetadata({
  title: "Top Suggesters",
  description:
    "The people shaping Widgetly's roadmap. Ranked by accepted tool suggestions — anonymous by design.",
  path: "/top-suggesters",
  keywords: [
    "widgetly top suggesters",
    "community contributors",
    "tool suggestions",
    "widgetly roadmap",
  ],
});

/**
 * Time windows, mirrors the leaderboard so the UI feels familiar.
 * Same SQL-friendly semantics: no time filter for "all", rolling 30 /
 * 7 / 0 (today UTC) days otherwise.
 */
type Window = "all" | "month" | "week" | "today";

const TAB_ICONS: Record<Window, React.ComponentType<{ className?: string }>> = {
  today: Calendar,
  week: CalendarDays,
  month: CalendarRange,
  all: InfinityIcon,
};

const TAB_KEYS: Record<Window, string> = {
  all: "allTime",
  month: "thisMonth",
  week: "thisWeek",
  today: "today",
};

/** Rolling-window start as ISO 8601 (UTC). `undefined` for "all time". */
function windowStart(window: Window): string | undefined {
  if (window === "all") return undefined;
  const now = new Date();
  if (window === "today") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString();
  }
  const days = window === "week" ? 7 : 30;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function parseWindow(input: string | undefined): Window {
  if (input === "today" || input === "week" || input === "month" || input === "all") {
    return input;
  }
  return "all";
}

export const dynamic = "force-dynamic";

type SearchParams = { window?: string };

export default async function TopSuggestersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("topSuggesters");
  const tLeaderboard = await getTranslations("leaderboard");

  const window = parseWindow(searchParams.window);
  const sinceIso = windowStart(window);
  const suggesters = await listTopSuggesters(30, sinceIso ? { sinceIso } : {});

  const baseHref = "/top-suggesters";

  return (
    <PageShell width="wide">
      {/* Hero */}
      <header className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-10">
        <Badge variant="secondary" className="self-start">
          <Users className="h-3 w-3" aria-hidden="true" />
          <span className="ml-1">{t("title")}</span>
        </Badge>
        <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("headline")}
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
          {t("subtitle")}
        </p>
        <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("privacyNote")}</span>
        </div>
      </header>

      {/* Tab bar — same control shape as the leaderboard */}
      <section className="mt-8" aria-labelledby="window-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="text-primary h-4 w-4" aria-hidden="true" />
            <h2
              id="window-heading"
              className="text-foreground text-sm font-semibold tracking-wider uppercase"
            >
              {tLeaderboard(TAB_KEYS[window])}
            </h2>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2" aria-label={tLeaderboard("tabsLabel")}>
          {(Object.keys(TAB_KEYS) as Window[]).map((w) => {
            const Icon = TAB_ICONS[w];
            const active = w === window;
            const href = w === "all" ? baseHref : `${baseHref}?window=${w}`;
            return (
              <Link
                key={w}
                href={href}
                className={
                  active
                    ? "bg-foreground text-background inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
                    : "border-border bg-card text-foreground hover:bg-muted/5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tLeaderboard(TAB_KEYS[w])}
              </Link>
            );
          })}
        </nav>

        {suggesters.length === 0 ? (
          <div className="border-border/60 mt-6 rounded-2xl border bg-white p-12 text-center">
            <Trophy className="text-muted-foreground mx-auto h-8 w-8" aria-hidden="true" />
            <p className="text-muted mt-3 text-sm">{t("empty")}</p>
          </div>
        ) : (
          <ol className="mt-6 grid gap-4">
            {suggesters.map((s, i) => (
              <SuggesterRow key={s.handle} rank={i + 1} entry={s} />
            ))}
          </ol>
        )}
      </section>
    </PageShell>
  );
}

function SuggesterRow({ rank, entry }: { rank: number; entry: TopSuggester }) {
  const isTop3 = rank <= 3;
  const accent =
    rank === 1
      ? "from-amber-400 to-yellow-500"
      : rank === 2
        ? "from-stone-300 to-stone-400"
        : rank === 3
          ? "from-amber-600 to-amber-700"
          : "from-stone-200 to-stone-200";

  return (
    <li className="border-border/60 shadow-soft rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Rank */}
        <div className="flex shrink-0 items-center gap-3 sm:w-20 sm:flex-col sm:items-start sm:gap-1">
          {isTop3 ? (
            <Crown
              className={
                rank === 1
                  ? "h-6 w-6 text-amber-500"
                  : rank === 2
                    ? "h-6 w-6 text-stone-400"
                    : "h-6 w-6 text-amber-700"
              }
              aria-hidden="true"
            />
          ) : (
            <span className="text-muted-foreground font-mono text-sm">#{rank}</span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${accent} px-2.5 py-0.5 text-xs font-semibold text-white`}
          >
            #{rank}
          </span>
        </div>

        {/* Identity + counts */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-mono text-sm font-medium">{entry.handle}</span>
            {entry.liveCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                <Trophy className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                {entry.liveCount} live
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {entry.totalSuggestions} suggestion{entry.totalSuggestions === 1 ? "" : "s"}
            {entry.lastSubmittedAt && (
              <>
                {" · last active "}
                {new Date(entry.lastSubmittedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            )}
          </div>
        </div>

        {/* Featured suggestion */}
        {entry.featured ? (
          <Link
            href={`/suggest/${entry.featured.slug}`}
            className="border-border/60 bg-muted/10 hover:bg-muted/20 group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors sm:max-w-md"
          >
            <div className="min-w-0">
              <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Top suggestion
              </div>
              <div className="text-foreground truncate text-sm font-medium">
                {entry.featured.toolName}
              </div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
                <span className="capitalize">{entry.featured.category}</span>
                <span>·</span>
                <span>
                  {entry.featured.upvotes} upvote{entry.featured.upvotes === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span className="capitalize">{entry.featured.status.replace("_", " ")}</span>
              </div>
            </div>
            <ArrowRight
              className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-colors"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>
    </li>
  );
}
