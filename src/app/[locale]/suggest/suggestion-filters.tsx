"use client";

/**
 * Auto-filter toolbar for /suggest.
 *
 * Each select on change pushes the new params into the URL (via
 * router.replace) so the server component re-renders with the filtered
 * list. No "Apply" button — the change IS the apply, just like the
 * rest of the modern web (Linear, GitHub Issues, etc.).
 *
 * Why client-side rather than a server-rendered `<form>` with
 * auto-submit onChange:
 *   - `useRouter().replace` keeps the URL in sync without a full page
 *     reload, so the search/category state survives back/forward
 *     navigation and is shareable as a link.
 *   - The server component stays pure and easy to reason about — the
 *     only input it reads is `searchParams`.
 *   - We get a `key` reset on the results section for free, so the
 *     <motion.article> cards re-animate on each filter change.
 */
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
  type SuggestionCategory,
  type SuggestionStatus,
} from "@/lib/d1/suggestions";
import { useTranslations } from "next-intl";

type SortOption = "most_voted" | "newest" | "recently_built";

const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; labelKey: string }> = [
  { value: "most_voted", labelKey: "sortMostVoted" },
  { value: "newest", labelKey: "sortNewest" },
  { value: "recently_built", labelKey: "sortRecentlyBuilt" },
];

const SUGGESTION_STATUS_LABEL_KEYS: Record<SuggestionStatus, string> = {
  in_review: "statusInReview",
  building: "statusBuilding",
  live: "statusLive",
  rejected: "statusRejected",
};

export function SuggestionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("suggest.filters");

  /**
   * Update one query param and replace the current history entry.
   * Uses startTransition so React keeps the old UI on screen until
   * the server component is ready — no flash of empty results.
   */
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    // Reset to page 1 on any filter change so we never land on a
    // page that's now empty.
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div
      className="border-border/60 shadow-soft mt-8 grid gap-3 rounded-2xl border bg-white/75 p-4 backdrop-blur md:grid-cols-4"
      role="group"
      aria-label={t("label")}
    >
      <FilterSelect
        name="category"
        value={searchParams.get("category") ?? "all"}
        onChange={(v) => setParam("category", v)}
        loading={pending}
      >
        <option value="all">{t("allCategories")}</option>
        {SUGGESTION_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        name="status"
        value={searchParams.get("status") ?? "all"}
        onChange={(v) => setParam("status", v)}
        loading={pending}
      >
        <option value="all">{t("allStatuses")}</option>
        {SUGGESTION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(SUGGESTION_STATUS_LABEL_KEYS[s])}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        name="sort"
        value={searchParams.get("sort") ?? "most_voted"}
        onChange={(v) => setParam("sort", v)}
        loading={pending}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </FilterSelect>

      {/* Status badge showing we're waiting on the server. The label
          changes between idle and pending so screen readers announce
          the transition. */}
      <div
        className="border-border flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-xs"
        aria-live="polite"
      >
        <Filter className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-muted-foreground">{pending ? t("updating") : t("live")}</span>
      </div>
    </div>
  );
}

/**
 * Single labelled `<select>` styled to match the rest of the toolbar.
 * Wrapped here so all three dropdowns share the same height, border,
 * focus ring, and `aria-busy` plumbing — keeps the parent's JSX tidy.
 *
 * The visible label is sr-only because the first `<option>` in each
 * select already says what the field is (e.g. "All categories",
 * "All statuses", "Most voted"); putting the same text in a visible
 * label would duplicate the affordance.
 */
function FilterSelect({
  name,
  value,
  onChange,
  children,
  loading,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <select
      id={`filter-${name}`}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-busy={loading || undefined}
      className="border-border focus:border-primary focus:ring-primary/20 h-11 rounded-xl border bg-white px-3 text-sm transition-colors focus:ring-2 focus:outline-none"
    >
      {children}
    </select>
  );
}
