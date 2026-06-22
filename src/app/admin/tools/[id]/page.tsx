/**
 * /admin/tools/[id] — tool detail + edit.
 *
 * Server component: loads the tool and its history. The edit form is
 * a client component (`ToolEditForm`) that POSTs the PATCH and
 * refreshes. The status change UI is reused from the table page.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";
import { requireAdminFromRequest } from "@/lib/admin/auth";
import {
  getStatusHistoryForTool,
  getTool,
  type StatusHistoryRow,
  type AdminTool,
} from "@/lib/admin/tools";
import { ToolEditForm } from "../_components/tool-edit-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_META: Record<string, { label: string; tone: string }> = {
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

export default async function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">Redirecting to sign-in…</div>
    );
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const tool: AdminTool | null = await getTool(id);
  if (!tool) notFound();
  const history: StatusHistoryRow[] = await getStatusHistoryForTool(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/tools"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Tools
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{tool.name}</span>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">{tool.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            /tools/{tool.category}/{tool.slug} · #{tool.id}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${
            STATUS_META[tool.status]?.tone ?? ""
          }`}
        >
          {STATUS_META[tool.status]?.label ?? tool.status}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ToolEditForm tool={tool} />
        </div>

        <aside className="border-border bg-card shadow-soft h-fit rounded-2xl border p-5">
          <h2 className="text-foreground mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <HistoryIcon className="h-3.5 w-3.5" /> Status history
          </h2>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-xs">No changes yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((row) => {
                const from = row.old_status ? STATUS_META[row.old_status] : null;
                const to = STATUS_META[row.new_status] ?? STATUS_META.suggested!;
                return (
                  <li
                    key={row.id}
                    className="border-border/60 border-b pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="text-muted-foreground text-[10px]">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                    <div className="text-foreground mt-1 text-xs">
                      {from ? (
                        <>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${from.tone}`}
                          >
                            {from.label}
                          </span>{" "}
                          →{" "}
                        </>
                      ) : (
                        "created → "
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${to.tone}`}
                      >
                        {to.label}
                      </span>
                    </div>
                    {row.notes && (
                      <p className="text-muted-foreground mt-1 text-[11px] italic">"{row.notes}"</p>
                    )}
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      by {row.changed_by_name || `user #${row.changed_by}`}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
