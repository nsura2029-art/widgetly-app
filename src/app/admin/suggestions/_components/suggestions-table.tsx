"use client";

/**
 * Client-side suggestions table for /admin/suggestions.
 *
 * Renders the table from server-provided data and handles inline
 * status changes via PATCH /api/admin/suggestions/[id]. Filters are
 * controlled via query params so the URL stays shareable.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Loader2, Search, ThumbsUp, X } from "lucide-react";
import { csrfFetch } from "@/lib/admin/csrf-client";
import { cn } from "@/lib/utils";
import type { AdminSuggestionRow, SuggestionStatus } from "@/lib/admin/suggestions";

const STATUS_META: Record<SuggestionStatus, { label: string; tone: string; dot: string }> = {
  in_review: {
    label: "In review",
    tone: "bg-amber-500/10 text-amber-800",
    dot: "bg-amber-500",
  },
  building: {
    label: "Building",
    tone: "bg-indigo-500/10 text-indigo-800",
    dot: "bg-indigo-500",
  },
  live: {
    label: "Live",
    tone: "bg-emerald-500/10 text-emerald-800",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-500/10 text-rose-800",
    dot: "bg-rose-500",
  },
};

const ALL_STATUSES: SuggestionStatus[] = ["in_review", "building", "live", "rejected"];

type Props = {
  initial: {
    suggestions: AdminSuggestionRow[];
    total: number;
    counts: Record<SuggestionStatus, number>;
  };
  currentStatus: SuggestionStatus | "all";
  currentSearch: string;
};

export function SuggestionsTable({ initial, currentStatus, currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(currentSearch);
  const [pending, setPending] = React.useState<Record<number, SuggestionStatus>>({});
  const [errors, setErrors] = React.useState<Record<number, string>>({});

  function updateQuery(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    if (next.q !== undefined) {
      if (!next.q) params.delete("q");
      else params.set("q", next.q);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/suggestions?${qs}` : `/admin/suggestions`);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    updateQuery({ q: search });
  }

  async function changeStatus(id: number, newStatus: SuggestionStatus) {
    setPending((p) => ({ ...p, [id]: newStatus }));
    setErrors((e) => {
      const next = { ...e };
      delete next[id];
      return next;
    });
    try {
      const res = await csrfFetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors((e) => ({
          ...e,
          [id]: body?.error?.message ?? `HTTP ${res.status}`,
        }));
        return;
      }
      router.refresh();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [id]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label={`All (${initial.total})`}
          active={currentStatus === "all"}
          onClick={() => updateQuery({ status: "all" })}
        />
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={`${STATUS_META[s].label} (${initial.counts[s]})`}
            active={currentStatus === s}
            onClick={() => updateQuery({ status: s })}
          />
        ))}
        <form
          onSubmit={submitSearch}
          className="border-border bg-card ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5"
        >
          <Search className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search name, email, slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                updateQuery({ q: "" });
              }}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      {initial.suggestions.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {currentSearch
              ? `No suggestions match "${currentSearch}".`
              : currentStatus === "all"
                ? "No suggestions yet. Users can submit ideas from the public /suggest/new page."
                : `No suggestions with status "${STATUS_META[currentStatus as SuggestionStatus].label}".`}
          </p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-semibold tracking-wider">Tool</th>
                <th className="px-4 py-3 text-left font-semibold tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-left font-semibold tracking-wider">Category</th>
                <th className="px-4 py-3 text-center font-semibold tracking-wider">
                  <ThumbsUp className="inline h-3 w-3" aria-hidden="true" />
                </th>
                <th className="px-4 py-3 text-left font-semibold tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-left font-semibold tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {initial.suggestions.map((s) => {
                const meta = STATUS_META[s.status];
                const isPending = pending[s.id] !== undefined;
                const error = errors[s.id];
                return (
                  <tr key={s.id} className="border-border/60 hover:bg-muted/5 border-t align-top">
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">{s.tool_name}</div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 max-w-md text-xs">
                        {s.description}
                      </p>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1.5 font-mono text-[10px]">
                        <span>/{s.slug}</span>
                        <Link
                          href={`/en/suggest/${s.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-mono text-xs">{s.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-muted/30 text-foreground inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize">
                        {s.category}
                      </span>
                      <div className="text-muted-foreground mt-1 text-[10px] capitalize">
                        {s.urgency} urgency
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{s.upvotes}</td>
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {new Date(s.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
                            meta.tone
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        <StatusPicker
                          current={s.status}
                          pending={pending[s.id]}
                          disabled={isPending}
                          onChange={(next) => changeStatus(s.id, next)}
                        />
                      </div>
                      {isPending && (
                        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                          saving…
                        </div>
                      )}
                      {error && <div className="mt-1 text-[10px] text-rose-600">{error}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card hover:bg-muted/5 text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function StatusPicker({
  current,
  pending,
  disabled,
  onChange,
}: {
  current: SuggestionStatus;
  pending?: SuggestionStatus;
  disabled: boolean;
  onChange: (next: SuggestionStatus) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Change status"
        className="border-border hover:bg-muted/5 text-muted-foreground inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors"
      >
        Change
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
      {open && (
        <div className="border-border bg-card absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border shadow-lg">
          {ALL_STATUSES.map((s) => {
            const isCurrent = s === current;
            const meta = STATUS_META[s];
            return (
              <button
                key={s}
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  setOpen(false);
                  if (!isCurrent) onChange(s);
                }}
                className={cn(
                  "hover:bg-muted/5 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs",
                  isCurrent && "bg-muted/10 font-medium",
                  pending === s && "opacity-60"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>
                {isCurrent && (
                  <Check className="text-muted-foreground h-3 w-3" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
