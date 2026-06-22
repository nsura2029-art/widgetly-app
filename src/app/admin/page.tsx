/**
 * /admin — dashboard overview.
 *
 * Server component. Reads the session via requireAdminFromRequest (D1
 * lookup is fine in the Node runtime), fetches the tool stats and the
 * last 10 status changes, renders them. If unauthenticated, the
 * client shell has already kicked off a redirect; we still render
 * something for SSR so curl/HTTP clients see a sane page.
 */
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Hourglass,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { getDb, safeQuery } from "@/lib/d1/admin";
import {
  getRecentStatusHistory,
  getToolStats,
  type StatusHistoryRow,
  type ToolStats,
} from "@/lib/admin/tools";
import { requireAdminFromRequest } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  suggested: { label: "Suggested", icon: Lightbulb, tone: "bg-amber-500/10 text-amber-700" },
  under_review: { label: "Under review", icon: Clock, tone: "bg-sky-500/10 text-sky-700" },
  in_progress: { label: "In progress", icon: Hourglass, tone: "bg-indigo-500/10 text-indigo-700" },
  live: { label: "Live", icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-700" },
  deprecated: { label: "Deprecated", icon: XCircle, tone: "bg-stone-500/10 text-stone-700" },
  rejected: { label: "Rejected", icon: XCircle, tone: "bg-rose-500/10 text-rose-700" },
};

async function loadRecentHistory(limit: number): Promise<StatusHistoryRow[]> {
  return getRecentStatusHistory(limit);
}

async function loadStats(): Promise<ToolStats> {
  return getToolStats();
}

export default async function AdminDashboardPage() {
  const ctx = await requireAdminFromRequest();
  if (!ctx) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">Redirecting to sign-in…</div>
    );
  }

  const [stats, recent] = await Promise.all([loadStats(), loadRecentHistory(10)]);
  const headersList = await headers();
  const isD1 = (() => {
    try {
      getDb();
      return true;
    } catch {
      return false;
    }
  })();

  const cards: Array<{
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }> = [
    { label: "Total tools", value: stats.total, icon: Wrench, tone: "bg-stone-100 text-stone-700" },
    { label: "Live", value: stats.live, icon: Eye, tone: "bg-emerald-100 text-emerald-700" },
    {
      label: "In progress",
      value: stats.in_progress,
      icon: Hourglass,
      tone: "bg-indigo-100 text-indigo-700",
    },
    {
      label: "Under review",
      value: stats.under_review,
      icon: Clock,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Suggested",
      value: stats.suggested,
      icon: Lightbulb,
      tone: "bg-amber-100 text-amber-700",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            <BarChart3 className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Overview
          </p>
          <h1 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
            Welcome back, {ctx.user.display_name || ctx.user.username}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tools progress through the lifecycle here. Only <strong>Live</strong> tools appear in
            the public menu.
          </p>
        </div>
        <Link
          href="/admin/tools"
          className="border-border hover:bg-muted/5 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors"
        >
          Manage tools
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      {!isD1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          D1 binding is not configured. Run <code>pnpm db:migrate:remote</code> after applying the
          0004_admin.sql migration.
        </div>
      )}

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="border-border bg-card shadow-soft rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {c.label}
              </span>
              <div
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}
              >
                <c.icon className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <div className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
              {c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </section>

      {/* Lifecycle visualizer */}
      <section className="border-border bg-card shadow-soft rounded-2xl border p-6">
        <h2 className="text-foreground mb-1 text-sm font-semibold tracking-tight">Lifecycle</h2>
        <p className="text-muted-foreground mb-5 text-xs">
          How a tool moves from suggestion to live.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              ["suggested", stats.suggested],
              ["under_review", stats.under_review],
              ["in_progress", stats.in_progress],
              ["live", stats.live],
              ["deprecated", stats.deprecated],
            ] as Array<[string, number]>
          ).map(([k, n], i, arr) => {
            const meta = STATUS_META[k]!;
            return (
              <div key={k} className="flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${meta.tone}`}
                >
                  <meta.icon className="h-3 w-3" aria-hidden="true" />
                  {meta.label}
                  <span className="bg-background/40 ml-1 rounded-full px-1.5 py-0.5 text-[10px]">
                    {n}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="text-muted-foreground/40 h-3 w-3" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section className="border-border bg-card shadow-soft rounded-2xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">Recent activity</h2>
          <TrendingUp className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        </div>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No status changes yet.</p>
        ) : (
          <ol className="space-y-3">
            {recent.map((row) => {
              const from = row.old_status ? STATUS_META[row.old_status] : null;
              const to = STATUS_META[row.new_status] ?? STATUS_META.suggested!;
              return (
                <li
                  key={row.id}
                  className="border-border/60 flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                    {new Date(row.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="text-foreground text-sm">
                      <Link
                        href={`/admin/tools/${row.tool_id ?? ""}`}
                        className="font-medium hover:underline"
                      >
                        {row.tool_name}
                      </Link>{" "}
                      {from ? (
                        <>
                          moved{" "}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${from.tone}`}
                          >
                            {from.label}
                          </span>{" "}
                          →
                        </>
                      ) : (
                        "created as"
                      )}{" "}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${to.tone}`}
                      >
                        {to.label}
                      </span>
                    </div>
                    {row.notes && <p className="text-muted-foreground mt-1 text-xs">{row.notes}</p>}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {row.changed_by_name || `user #${row.changed_by}`}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="text-muted-foreground flex items-center gap-2 pt-2 text-[10px]">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Server time: {new Date().toISOString()} · DB: {isD1 ? "connected" : "not configured"}
      </div>
    </div>
  );
}
