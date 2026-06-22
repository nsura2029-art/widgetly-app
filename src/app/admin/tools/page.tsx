/**
 * /admin/tools — table view of every tool in the catalog.
 *
 * Server component: reads the cookie + D1 and renders the page shell
 * with the initial table. Filtering, sorting, and the status-change
 * modal are client components (ToolsTable + StatusChangeModal).
 */
import { requireAdminFromRequest } from "@/lib/admin/auth";
import { listTools, type AdminTool, isToolStatus, type ToolStatus } from "@/lib/admin/tools";
import { ToolsTable } from "./_components/tools-table";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = {
  status?: string;
  category?: string;
  q?: string;
  page?: string;
  sort?: string;
};

const SORT_KEYS = [
  "live_first",
  "updated_desc",
  "updated_asc",
  "name_asc",
  "name_desc",
  "sort_asc",
] as const;
type SortKey = (typeof SORT_KEYS)[number];

function parseSort(v: string | undefined): SortKey {
  return (SORT_KEYS as ReadonlyArray<string>).includes(v ?? "") ? (v as SortKey) : "live_first";
}

export default async function AdminToolsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireAdminFromRequest();
  if (!ctx) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">Redirecting to sign-in…</div>
    );
  }

  const sp = await searchParams;
  const status = (sp.status && isToolStatus(sp.status) ? sp.status : "all") as ToolStatus | "all";
  const category = sp.category ?? "all";
  const q = sp.q ?? "";
  const sort = parseSort(sp.sort);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const { rows, total } = await listTools({
    status,
    category,
    q,
    sort,
    limit: pageSize,
    offset,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total.toLocaleString()} {total === 1 ? "tool" : "tools"} matching the current filter.
        </p>
      </header>
      <ToolsTable
        initialRows={rows as AdminTool[]}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ status, category, q, sort }}
      />
    </div>
  );
}
