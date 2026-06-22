/**
 * /admin/tools — catalog grouped by category.
 *
 * The catalog is small (~120 rows across 11 categories). Instead of
 * paginating a flat table, we render every category as a collapsible
 * section with its own status counts in the header. Filtering and
 * selection are handled client-side in `ToolsGroupedByCategory`.
 *
 * Why server: the initial DB read and category-bucketing happen
 * server-side so the first paint has all the data without an extra
 * client fetch. The client component takes it from there.
 */
import { requireAdminFromRequest } from "@/lib/admin/auth";
import { listToolsGroupedByCategory } from "@/lib/admin/tools";
import { ToolsGroupedByCategory } from "./_components/tools-grouped";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminToolsPage() {
  const ctx = await requireAdminFromRequest();
  if (!ctx) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">Redirecting to sign-in…</div>
    );
  }

  const { groups, total } = await listToolsGroupedByCategory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total.toLocaleString()} {total === 1 ? "tool" : "tools"} across {groups.length}{" "}
          {groups.length === 1 ? "category" : "categories"}. Status changes go live in the public
          menu immediately.
        </p>
      </header>
      <ToolsGroupedByCategory initialGroups={groups} total={total} />
    </div>
  );
}
