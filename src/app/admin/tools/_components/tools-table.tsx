"use client";

/**
 * Client-side table for /admin/tools.
 *
 * Holds the filter state (status / category / search) and the
 * selection state for bulk actions. Changing a filter does a router
 * replace so the URL stays shareable and the server component
 * re-renders with the new query. Status changes (single + bulk) are
 * handled in a modal.
 */
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Filter, Search, Trash2 } from "lucide-react";
import { StatusChangeModal } from "./status-change-modal";
import { cn } from "@/lib/utils";
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

const STATUSES: Array<"all" | ToolStatus> = [
  "all",
  "suggested",
  "under_review",
  "in_progress",
  "live",
  "deprecated",
  "rejected",
];

type Filters = {
  status: ToolStatus | "all";
  category: string;
  q: string;
};

export function ToolsTable({
  initialRows,
  total,
  page,
  pageSize,
  filters,
}: {
  initialRows: AdminTool[];
  total: number;
  page: number;
  pageSize: number;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [rows, setRows] = React.useState(initialRows);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [modal, setModal] = React.useState<
    | { kind: "single"; tool: AdminTool }
    | { kind: "bulk"; tools: AdminTool[]; target: ToolStatus | null }
    | null
  >(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Re-sync when the server gives us a new page.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(initialRows);
  }, [initialRows]);

  // Build a URL for the current filter state, used by all the handlers.
  const buildHref = React.useCallback(
    (override: Partial<Filters> & { page?: number }) => {
      const next = new URLSearchParams(sp.toString());
      const merged = { ...filters, ...override };
      for (const k of ["status", "category", "q"] as const) {
        const v = merged[k];
        if (!v || v === "all" || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (override.page) next.set("page", String(override.page));
      else next.delete("page");
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [filters, pathname, sp]
  );

  const applyFilter = (override: Partial<Filters>) => {
    router.replace(buildHref(override));
  };

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    applyFilter({ q: String(fd.get("q") ?? "") });
  };

  // ---------- Selection ----------
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id)) && !allChecked;
  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // ---------- Status change ----------
  async function applyStatusChange(ids: number[], newStatus: ToolStatus, notes: string) {
    setBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        const r = await fetch(`/api/admin/tools/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: newStatus, notes }),
        });
        if (!r.ok) {
          const data = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || `Failed to update tool ${id}`);
        }
        const { tool } = (await r.json()) as { tool: AdminTool };
        setRows((rs) => rs.map((row) => (row.id === id ? tool : row)));
      }
      setSelected(new Set());
      setModal(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Delete ----------
  async function deleteTool(id: number) {
    if (!window.confirm("Delete this tool? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/tools/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      setRows((rs) => rs.filter((row) => row.id !== id));
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="border-border bg-card shadow-soft flex flex-wrap items-center gap-3 rounded-2xl border p-4">
        <form
          onSubmit={onSearchSubmit}
          className="border-border flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border bg-white px-3"
        >
          <Search className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by name, description, slug…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button type="submit" className="text-primary text-xs font-medium">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          <select
            value={filters.status}
            onChange={(e) => applyFilter({ status: e.target.value as Filters["status"] })}
            className="border-border h-10 rounded-lg border bg-white px-3 text-sm"
            aria-label="Status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : (STATUS_META[s]?.label ?? s)}
              </option>
            ))}
          </select>

          <input
            list="category-options"
            value={filters.category}
            placeholder="Category"
            onChange={(e) => applyFilter({ category: e.target.value })}
            className="border-border h-10 w-40 rounded-lg border bg-white px-3 text-sm"
          />
          <datalist id="category-options">
            {[...new Set(rows.map((r) => r.category))].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm">
          <span className="text-foreground font-medium">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => {
              const tools = rows.filter((r) => selected.has(r.id));
              setModal({ kind: "bulk", tools, target: null });
            }}
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

      {/* Table */}
      <div className="border-border bg-card shadow-soft overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                </th>
                <th className="px-3 py-3 text-left font-semibold">Name</th>
                <th className="px-3 py-3 text-left font-semibold">Category</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
                <th className="px-3 py-3 text-left font-semibold">Updated</th>
                <th className="w-44 px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-4 py-12 text-center">
                    No tools match the current filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const meta = STATUS_META[row.status] ?? {
                    label: row.status,
                    tone: "bg-stone-100 text-stone-700",
                  };
                  return (
                    <tr
                      key={row.id}
                      className="border-border/60 hover:bg-muted/5 border-t transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-4 w-4 rounded border-stone-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/tools/${row.id}`}
                          className="text-foreground font-medium hover:underline"
                        >
                          {row.name}
                        </Link>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          {row.slug}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="border-border bg-muted/5 inline-flex items-center rounded-md border px-2 py-0.5 text-xs">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                            meta.tone
                          )}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-3 py-3 text-xs">
                        {new Date(row.updated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/tools/${row.id}`}
                            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setModal({ kind: "single", tool: row })}
                            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/5 inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors"
                          >
                            Status
                          </button>
                          {row.status === "live" && (
                            <Link
                              href={`/tools/${row.category}/${row.slug}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-muted-foreground hover:text-foreground inline-flex h-7 items-center gap-1 rounded-md px-1 text-[11px] transition-colors"
                              aria-label="Open public page"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTool(row.id)}
                            disabled={busy}
                            className="text-muted-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:text-rose-600 disabled:opacity-40"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-border/60 flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground text-xs">
              Page {page} of {totalPages} · {total.toLocaleString()} results
            </div>
            <div className="flex items-center gap-2">
              <Link
                aria-disabled={page <= 1}
                href={buildHref({ page: Math.max(1, page - 1) })}
                className={cn(
                  "border-border inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                  page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted/5"
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Link>
              <Link
                aria-disabled={page >= totalPages}
                href={buildHref({ page: Math.min(totalPages, page + 1) })}
                className={cn(
                  "border-border inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors",
                  page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted/5"
                )}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Status change modal */}
      {modal?.kind === "single" && (
        <StatusChangeModal
          tools={[modal.tool]}
          onClose={() => setModal(null)}
          onApply={(status, notes) => applyStatusChange([modal.tool.id], status, notes)}
          busy={busy}
        />
      )}
      {modal?.kind === "bulk" && (
        <StatusChangeModal
          tools={modal.tools}
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
