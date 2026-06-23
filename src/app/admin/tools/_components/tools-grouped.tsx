"use client";

/**
 * Client component for /admin/tools — renders the tool catalog grouped
 * by category. Each category is a collapsible section with its own
 * status counts in the header.
 *
 * Why client (not server):
 *   - Selection state for bulk status changes (Set<number>)
 *   - Optimistic in-place updates when the status change PATCH returns
 *   - Collapse/expand state (one piece of state per category, kept
 *     client-side — server would re-render on every toggle otherwise)
 *
 * Layout:
 *   - Sticky filter bar (search + status filter)
 *   - One <section> per category with:
 *     - Header: category name, total, status breakdown badges,
 *       collapse toggle
 *     - Body (when expanded): a compact card grid of tools, each with
 *       status pill + name + slug + action buttons
 *
 * Selection model: tools across categories share one selection Set so
 * the bulk action bar at the top works regardless of which category the
 * user picked from. The bulk bar only appears when something is
 * selected.
 */

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, Filter, Search, Trash2 } from "lucide-react";
import { csrfFetch } from "@/lib/admin/csrf-client";
import { cn } from "@/lib/utils";
import { StatusChangeModal } from "./status-change-modal";
import type { AdminTool, ToolStatus } from "@/lib/admin/tools";

const STATUS_META: Record<ToolStatus, { label: string; tone: string }> = {
  suggested: { label: "Suggested", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  under_review: { label: "Under review", tone: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  in_progress: {
    label: "In progress",
    tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  },
  live: { label: "Live", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  deprecated: { label: "Deprecated", tone: "bg-stone-500/10 text-stone-700 border-stone-500/20" },
  rejected: { label: "Rejected", tone: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
};

type AdminToolLite = Omit<AdminTool, "long_description" | "notes">;

type CategoryGroup = {
  category: string;
  tools: AdminToolLite[];
  counts: Record<ToolStatus, number>;
};

export function ToolsGroupedByCategory({
  initialGroups,
  total,
}: {
  initialGroups: CategoryGroup[];
  total: number;
}) {
  const [groups, setGroups] = React.useState<CategoryGroup[]>(initialGroups);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<ToolStatus | "all">("all");
  const [query, setQuery] = React.useState("");
  const [modal, setModal] = React.useState<
    | { kind: "single"; tool: AdminToolLite }
    | { kind: "bulk"; tools: AdminToolLite[]; target: ToolStatus | null }
    | null
  >(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Helpers that operate on the live state and mirror the API shape so
  // we can re-use the same PATCH endpoint as the old paginated table.
  const allTools = React.useMemo(() => groups.flatMap((g) => g.tools), [groups]);
  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      groups
        .map((g) => {
          const tools = g.tools.filter((t) => {
            if (statusFilter !== "all" && t.status !== statusFilter) return false;
            if (!q) return true;
            return (
              t.name.toLowerCase().includes(q) ||
              t.slug.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q)
            );
          });
          return { ...g, tools };
        })
        // Drop empty groups when a filter narrows them to nothing — keeps
        // the page compact.
        .filter((g) => g.tools.length > 0)
    );
  }, [groups, statusFilter, query]);

  const liveCount = React.useMemo(
    () =>
      groups.reduce(
        (n, g) => n + (statusFilter === "all" || statusFilter === "live" ? g.counts.live : 0),
        0
      ),
    [groups, statusFilter]
  );

  // ---- selection helpers ------------------------------------------------
  const toggleAllInGroup = (g: CategoryGroup) => {
    const ids = g.tools.map((t) => t.id);
    const next = new Set(selected);
    const allOn = ids.every((id) => next.has(id));
    if (allOn) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  };
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // ---- status change ----------------------------------------------------
  async function applyStatusChange(ids: number[], newStatus: ToolStatus, notes: string) {
    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        const r = await csrfFetch(`/api/admin/tools/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: newStatus, notes }),
        });
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `Failed to update tool ${id}`);
        }
        const { tool } = (await r.json()) as { tool: AdminToolLite & { notes: string } };
        // Replace the row in-place across all groups so the status pill +
        // count badge both update without a full re-fetch.
        setGroups((gs) =>
          gs.map((g) => {
            const idx = g.tools.findIndex((t) => t.id === id);
            if (idx === -1) return g;
            const tools = [...g.tools];
            const oldStatus = tools[idx]!.status;
            tools[idx] = { ...tools[idx]!, ...tool };
            const counts = { ...g.counts };
            counts[oldStatus] = Math.max(0, counts[oldStatus] - 1);
            counts[newStatus] = counts[newStatus] + 1;
            return { ...g, tools, counts };
          })
        );
      }
      setSelected(new Set());
      setModal(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---- delete -----------------------------------------------------------
  async function deleteTool(id: number) {
    if (!window.confirm("Delete this tool? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await csrfFetch(`/api/admin/tools/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      setGroups((gs) =>
        gs
          .map((g) => {
            const idx = g.tools.findIndex((t) => t.id === id);
            if (idx === -1) return g;
            const removed = g.tools[idx]!;
            const counts = { ...g.counts };
            counts[removed.status] = Math.max(0, counts[removed.status] - 1);
            return { ...g, tools: g.tools.filter((t) => t.id !== id), counts };
          })
          .filter((g) => g.tools.length > 0)
      );
      setSelected((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedTools = React.useMemo(
    () => allTools.filter((t) => selected.has(t.id)),
    [allTools, selected]
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="border-border bg-card shadow-soft flex flex-wrap items-center gap-3 rounded-2xl border p-4">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border-border flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-white px-3"
        >
          <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug, description…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ToolStatus | "all")}
            className="border-border h-10 rounded-lg border bg-white px-3 text-sm"
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_META) as ToolStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-muted-foreground ml-auto text-xs">
          {total} tools · {liveCount} live
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
          <span className="text-foreground font-medium">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => setModal({ kind: "bulk", tools: selectedTools, target: null })}
            className="border-border hover:bg-muted/5 inline-flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-medium transition-colors"
          >
            Change status…
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear selection
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Category sections */}
      {filteredGroups.length === 0 ? (
        <div className="text-muted-foreground border-border bg-card rounded-2xl border px-4 py-12 text-center text-sm">
          No tools match the current filter.
        </div>
      ) : (
        filteredGroups.map((g) => {
          const isCollapsed = collapsed[g.category] ?? false;
          const allChecked = g.tools.length > 0 && g.tools.every((t) => selected.has(t.id));
          return (
            <section
              key={g.category}
              aria-labelledby={`cat-${g.category}`}
              className="border-border bg-card shadow-soft overflow-hidden rounded-2xl border"
            >
              <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.category]: !isCollapsed }))}
                  className="hover:bg-muted/5 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                  aria-expanded={!isCollapsed}
                  aria-controls={`cat-${g.category}-body`}
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <h2
                  id={`cat-${g.category}`}
                  className="text-foreground font-mono text-sm font-semibold tracking-tight"
                >
                  {g.category}
                </h2>
                <span className="text-muted-foreground text-xs">
                  {g.tools.length} {g.tools.length === 1 ? "tool" : "tools"}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {(Object.entries(g.counts) as Array<[ToolStatus, number]>)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([s, n]) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase transition-colors",
                          STATUS_META[s].tone,
                          statusFilter === s ? "ring-primary/40 ring-2" : ""
                        )}
                        aria-label={`Filter by ${STATUS_META[s].label}`}
                      >
                        {STATUS_META[s].label} · {n}
                      </button>
                    ))}
                </div>
              </header>

              {!isCollapsed && (
                <div id={`cat-${g.category}-body`} className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = !allChecked && g.tools.some((t) => selected.has(t.id));
                        }
                      }}
                      onChange={() => toggleAllInGroup(g)}
                      aria-label={`Select all ${g.category}`}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    <span className="text-muted-foreground text-xs">Select all</span>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {g.tools.map((t) => (
                      <li
                        key={t.id}
                        className={cn(
                          "border-border bg-background/50 hover:border-primary/40 group rounded-xl border p-3 transition-colors",
                          selected.has(t.id) && "border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selected.has(t.id)}
                              onChange={() => toggleOne(t.id)}
                              aria-label={`Select ${t.name}`}
                              className="mt-1 h-4 w-4 rounded border-stone-300"
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/admin/tools/${t.id}`}
                                className="text-foreground block truncate text-sm font-semibold hover:underline"
                              >
                                {t.name}
                              </Link>
                              <div className="text-muted-foreground truncate font-mono text-[10px]">
                                {t.slug}
                              </div>
                              {"subcategory" in t && t.subcategory ? (
                                <div
                                  className="text-muted-foreground/80 mt-0.5 truncate text-[9px] tracking-wider uppercase"
                                  title={`Sub-menu column: ${t.subcategory}`}
                                >
                                  {t.subcategory}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase",
                              STATUS_META[t.status].tone
                            )}
                          >
                            {STATUS_META[t.status].label}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/tools/${t.id}`}
                            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setModal({ kind: "single", tool: t })}
                            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors"
                          >
                            Status
                          </button>
                          {t.status === "live" && (
                            <Link
                              href={`/tools/${t.category}/${t.slug}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                              aria-label="Open public page"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTool(t.id)}
                            disabled={busy}
                            className="text-muted-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:text-rose-600 disabled:opacity-40"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })
      )}

      {/* Status change modal */}
      {modal?.kind === "single" && (
        <StatusChangeModal
          tools={[modal.tool as AdminTool]}
          onClose={() => setModal(null)}
          onApply={(status, notes) => applyStatusChange([modal.tool.id], status, notes)}
          busy={busy}
        />
      )}
      {modal?.kind === "bulk" && (
        <StatusChangeModal
          tools={modal.tools as AdminTool[]}
          initialTarget={modal.target ?? undefined}
          onClose={() => setModal(null)}
          onApply={(status, notes) =>
            applyStatusChange(
              modal.tools.map((t) => t.id),
              status,
              notes
            )
          }
          busy={busy}
        />
      )}
    </div>
  );
}
