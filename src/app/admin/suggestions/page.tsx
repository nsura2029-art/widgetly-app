/**
 * /admin/suggestions — manage user-submitted tool ideas.
 *
 * Lists every suggestion the public site has received, with submitter
 * email (admin-only — never exposed via the public API). Lets admins
 * filter by status and change status (in_review → building → live →
 * rejected) inline.
 *
 * Status change is done via /api/admin/suggestions/[id] PATCH (uses
 * CSRF + admin auth). The optimistic UI in the client component rolls
 * back if the server rejects.
 */
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { requireAdminFromRequest } from "@/lib/admin/auth";
import { listAdminSuggestions, type SuggestionStatus } from "@/lib/admin/suggestions";
import { SuggestionsTable } from "./_components/suggestions-table";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES: readonly SuggestionStatus[] = ["in_review", "building", "live", "rejected"];

function parseStatus(input: string | undefined): SuggestionStatus | "all" {
  if (!input || input === "all") return "all";
  return (VALID_STATUSES as readonly string[]).includes(input)
    ? (input as SuggestionStatus)
    : "all";
}

export default async function AdminSuggestionsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">Redirecting to sign-in…</div>
    );
  }

  const status = parseStatus(searchParams.status);
  const search = (searchParams.q ?? "").trim();
  const result = await listAdminSuggestions({
    status,
    search: search || undefined,
    pageSize: 100,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            <Lightbulb className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Suggestions
          </p>
          <h1 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
            User-submitted ideas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.total.toLocaleString()} suggestion{result.total === 1 ? "" : "s"} total.
            Submitter emails are visible to admins only — never shown on the public site.
          </p>
        </div>
        <Link
          href="/admin"
          className="border-border hover:bg-muted/5 inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors"
        >
          Back to dashboard
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <SuggestionsTable initial={result} currentStatus={status} currentSearch={search} />
    </div>
  );
}
