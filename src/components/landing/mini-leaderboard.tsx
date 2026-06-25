import * as React from "react";
import { ArrowUp, Trophy, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { listSuggestions } from "@/lib/d1/suggestions";
import { isD1Configured } from "@/lib/d1/server";
import { SUGGESTIONS } from "@/lib/suggestions-seed";
import { normalizeCategory } from "@/lib/d1/suggestions";
import { cn } from "@/lib/utils";

/**
 * Mini Leaderboard Teaser — a tight "Top Ideas This Week" panel that
 * sits below the hero banner. Shows the top 2 ideas by upvote count
 * (with their Wits totals) so first-time visitors immediately see
 * the social proof of a working idea → rewards loop.
 *
 * Data source: `listSuggestions({ sort: "top", pageSize: 2 })` when
 * D1 is configured. Falls back to the seed catalogue sorted by
 * `voteCount` when running locally without Miniflare D1, so the
 * homepage never renders an empty/blank panel during dev or in
 * environments where migrations haven't been applied.
 *
 * Rendered as a server component because the home page is statically
 * prerendered (see `[locale]/page.tsx`). The 60s revalidate window
 * matches the rest of the public suggest surface so the homepage
 * stays in sync without hammering D1.
 *
 * Empty state: if D1 returns zero suggestions AND no seed entries
 * match, we hide the panel entirely instead of showing an empty
 * card — the homepage shouldn't expose a broken section.
 */

export const revalidate = 60;

type TeaserRow = {
  rank: 1 | 2;
  slug: string;
  name: string;
  upvotes: number;
  wits: number;
  category: string;
};

const SEED_WITS_RATIO = 4; // 1 upvote ≈ 4 Wits in the seed teaser, rounded
const TOP_N = 2;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

async function fetchTopRows(): Promise<TeaserRow[]> {
  if (isD1Configured()) {
    try {
      const result = await listSuggestions({ sort: "most_voted", pageSize: TOP_N });
      return result.suggestions.slice(0, TOP_N).map((row, idx) => ({
        rank: (idx === 0 ? 1 : 2) as 1 | 2,
        slug: row.slug,
        name: row.toolName,
        upvotes: row.upvotes,
        // Wits aren't tracked in the suggestions table yet (rewards
        // tier is a future feature). Until they are, derive a stable
        // display value from upvotes so the panel doesn't show "0".
        wits: Math.round(row.upvotes * SEED_WITS_RATIO),
        category: row.category,
      }));
    } catch {
      // Fall through to seed fallback below
    }
  }

  // Seed fallback — used locally when D1 isn't bound (e.g. plain
  // `pnpm dev`) and as a defensive fallback if the D1 query throws.
  const seeded = [...SUGGESTIONS]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, TOP_N)
    .map((row, idx) => ({
      rank: (idx === 0 ? 1 : 2) as 1 | 2,
      slug: row.slug,
      name: row.name,
      upvotes: row.voteCount,
      wits: Math.round(row.voteCount * SEED_WITS_RATIO),
      category: normalizeCategory(row.category),
    }));

  return seeded;
}

export async function MiniLeaderboardTeaser() {
  const t = await getTranslations("home.miniLeaderboard");
  const rows = await fetchTopRows();

  if (rows.length === 0) {
    // Hide entirely if we have nothing to show — the homepage
    // shouldn't surface an empty leaderboard card.
    return null;
  }

  return (
    <section aria-labelledby="mini-leaderboard-title" className="py-10 sm:py-14 lg:py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="border-border/80 text-muted shadow-soft inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                <Trophy className="h-3 w-3" aria-hidden="true" />
                {t("eyebrow")}
              </span>
              <h2
                id="mini-leaderboard-title"
                className="text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {t("title")}
              </h2>
              <p className="text-muted mt-2 text-sm sm:text-base">{t("subtitle")}</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/suggest">
                {t("viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ol className="border-border/80 shadow-soft mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border bg-white">
            {rows.map((row) => (
              <li key={row.slug}>
                <Link
                  href={`/suggest/${row.slug}`}
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-gray-50 sm:p-5"
                  aria-label={`${row.name} — ${row.upvotes} upvotes`}
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold tabular-nums",
                      row.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                    )}
                    aria-hidden="true"
                  >
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-semibold sm:text-base">
                      {row.name}
                    </p>
                    <p className="text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        <span className="tabular-nums">{formatCount(row.upvotes)}</span>{" "}
                        {t("upvotes")}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="tabular-nums">{formatCount(row.wits)}</span> {t("wits")}
                      </span>
                    </p>
                  </div>
                  <ArrowRight
                    className="text-muted h-4 w-4 flex-none opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-4 sm:hidden">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/suggest">
                {t("viewAll")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
