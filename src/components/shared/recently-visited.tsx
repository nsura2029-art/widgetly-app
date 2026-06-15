"use client";

/**
 * "Continue where you left off" strip.
 *
 * Reads from `useHistory()` and renders the most-recently-visited
 * tool categories as a horizontal pill list with a "Clear" button
 * at the end.
 *
 * Renders nothing (return null) when the history is empty. We
 * intentionally do NOT render an empty-state skeleton — the
 * section should be invisible on a first visit so the page layout
 * doesn't show a sad empty box. The `emptyHidden` i18n string
 * exists for the case where a parent wants to surface the
 * "nothing here yet" message elsewhere.
 *
 * All data is local. Nothing is fetched, nothing is sent anywhere.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Clock, X, type LucideIcon } from "lucide-react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ACCENT_STYLES } from "@/components/shared/accent";
import { clearHistory, useHistory } from "@/lib/history";
import type { HistoryAccent, HistoryItem } from "@/lib/history";

/* -------------------------------------------------------------------------- */
/*  Icon map (mirrors `src/lib/icons.ts` if it exists)                        */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, LucideIcon> = {
  FileText,
  Image: ImageIcon,
  Video,
  Sparkles,
  Calculator,
  ArrowLeftRight,
  Search,
  Code,
  Briefcase,
  GraduationCap,
  PenLine,
};

function iconFor(iconKey: string): LucideIcon {
  return ICONS[iconKey] ?? FileText;
}

/** Render an icon by key. Returns the JSX element directly so
 *  we never assign a component to a variable inside render. */
function renderIcon(iconKey: string) {
  const Icon = iconFor(iconKey);
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** "2 hours ago", "yesterday", "3 days ago" — coarse but useful. */
function relativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ms).toLocaleDateString();
}

/* -------------------------------------------------------------------------- */
/*  Per-item pill                                                             */
/* -------------------------------------------------------------------------- */

function HistoryPill({ item }: { item: HistoryItem }) {
  const accent = (item.accent ?? "primary") as HistoryAccent;
  const styles = ACCENT_STYLES[accent];
  return (
    <Link
      href={`/tools/${item.slug}`}
      className={cn(
        "group/pill border-border/60 shadow-soft hover:border-border bg-white",
        "inline-flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3",
        "hover:shadow-soft-lg transition-all hover:-translate-y-0.5"
      )}
      aria-label={`${item.name} (last visited ${relativeTime(item.visitedAt)})`}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", styles.iconBg)}>
        {renderIcon(item.iconKey)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm font-semibold">{item.name}</span>
        <span className="text-muted flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {relativeTime(item.visitedAt)}
        </span>
      </span>
      <ArrowRight
        className="text-muted group-hover/pill:text-foreground h-4 w-4 transition-all group-hover/pill:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Strip                                                                     */
/* -------------------------------------------------------------------------- */

export function RecentlyVisited() {
  const t = useTranslations("history");
  const items = useHistory();

  // The section hides when the history is empty. Clicking Clear
  // empties the history (via `clearHistory()`, which fires the
  // `wly:history` event synchronously, which invalidates the
  // snapshot cache and re-renders this component with items=[]).
  if (items.length === 0) return null;

  const handleClear = () => {
    clearHistory();
  };

  return (
    <section
      aria-labelledby="recently-visited-title"
      className="border-border/60 bg-muted/5 rounded-2xl border p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="recently-visited-title"
            className="text-foreground text-base font-semibold tracking-tight sm:text-lg"
          >
            {t("sectionTitle")}
          </h2>
          <p className="text-muted mt-1 text-xs sm:text-sm">{t("sectionHint")}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "border-border/60 text-muted hover:text-foreground hover:border-border bg-white",
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            "transition-colors"
          )}
          aria-label={t("clearAll")}
        >
          <X className="h-3 w-3" aria-hidden="true" />
          {t("clearAll")}
        </button>
      </div>

      <div
        className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible"
        role="list"
      >
        {items.map((item) => (
          <div key={item.slug} role="listitem" className="shrink-0">
            <HistoryPill item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
