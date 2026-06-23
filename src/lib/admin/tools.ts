/**
 * Admin tools data layer.
 *
 * Owns the canonical list of "what's in the Widgetly public menu".
 * The public site reads from this table via getLiveToolsForCategory()
 * and the admin UI manages it via the CRUD + status change helpers.
 *
 * Lifecycle (enforced server-side, not just by DB CHECK):
 *
 *   suggested → under_review → in_progress → live → deprecated
 *                  ↓             ↓
 *               rejected      rejected
 *
 * Backward moves are allowed only for rejected (admin can revive) and
 * deprecated (admin can un-deprecate). We never silently rewind a
 * `live` tool back to `suggested` because the public menu would
 * vanish — that has to be an explicit choice.
 */
import { getDb, safeQuery } from "@/lib/d1/admin";
import { TOOL_STATUSES, type ToolStatus } from "@/lib/admin/auth";

export { TOOL_STATUSES, type ToolStatus };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminTool = {
  id: number;
  slug: string;
  category: string;
  /** Sub-menu group within the category (e.g. "Finance", "Health").
   *  Free-form display label, 1-60 chars. Defaults to "Other" when
   *  the admin hasn't picked one. */
  subcategory: string;
  name: string;
  description: string;
  long_description: string;
  api_endpoint: string | null;
  pricing_tier: "free" | "freemium" | "paid";
  icon_url: string | null;
  accent_color: "primary" | "secondary" | "accent";
  sort_order: number;
  status: ToolStatus;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  live_at: string | null;
};

export type ToolCreate = Omit<AdminTool, "id" | "created_at" | "updated_at" | "live_at">;
export type ToolUpdate = Partial<Omit<AdminTool, "id" | "created_at">>;

// ---------------------------------------------------------------------------
// Allowed status transitions
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<ToolStatus, ReadonlyArray<ToolStatus>> = {
  suggested: ["under_review", "rejected"],
  under_review: ["in_progress", "suggested", "rejected"],
  in_progress: ["live", "under_review", "rejected"],
  live: ["deprecated"],
  deprecated: ["live"],
  rejected: ["suggested", "under_review"],
};

export function canTransition(from: ToolStatus, to: ToolStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// List + search
// ---------------------------------------------------------------------------

export type ListToolsOptions = {
  status?: ToolStatus | "all";
  category?: string | "all";
  subcategory?: string | "all";
  q?: string;
  sort?: "live_first" | "updated_desc" | "updated_asc" | "name_asc" | "name_desc" | "sort_asc";
  limit?: number;
  offset?: number;
};

const SORT_CLAUSES: Record<NonNullable<ListToolsOptions["sort"]>, string> = {
  live_first: "status = 'live' DESC, sort_order ASC, updated_at DESC",
  updated_desc: "updated_at DESC",
  updated_asc: "updated_at ASC",
  name_asc: "name COLLATE NOCASE ASC",
  name_desc: "name COLLATE NOCASE DESC",
  sort_asc: "sort_order ASC, name COLLATE NOCASE ASC",
};

export async function listTools(opts: ListToolsOptions = {}): Promise<{
  rows: AdminTool[];
  total: number;
}> {
  const db = getDb();
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sortClause = SORT_CLAUSES[opts.sort ?? "live_first"] ?? SORT_CLAUSES.live_first;
  const where: string[] = [];
  const binds: unknown[] = [];

  if (opts.status && opts.status !== "all") {
    where.push("status = ?");
    binds.push(opts.status);
  }
  if (opts.category && opts.category !== "all") {
    where.push("category = ?");
    binds.push(opts.category);
  }
  if (opts.subcategory && opts.subcategory !== "all") {
    where.push("subcategory = ?");
    binds.push(opts.subcategory);
  }
  if (opts.q) {
    where.push("(name LIKE ? OR description LIKE ? OR slug LIKE ?)");
    const like = `%${opts.q}%`;
    binds.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  return safeQuery(
    async () => {
      const totalRow = await db
        .prepare(`SELECT COUNT(*) AS n FROM admin_tools ${whereSql}`)
        .bind(...binds)
        .first<{ n: number }>();
      const rows = await db
        .prepare(
          `SELECT * FROM admin_tools ${whereSql}
         ORDER BY ${sortClause}
         LIMIT ? OFFSET ?`
        )
        .bind(...binds, limit, offset)
        .all<AdminTool>();
      return { rows: rows.results ?? [], total: totalRow?.n ?? 0 };
    },
    { rows: [], total: 0 }
  );
}

/**
 * Lightweight row shape used by the grouped dashboard. Excludes the
 * heavy text fields (long_description, notes) so we can return the
 * full catalog (109+ tools across 11 categories) in one query without
 * hauling megabytes of HTML through the network.
 */
export type AdminToolRow = Omit<AdminTool, "long_description" | "notes">;

/**
 * Fetch every tool in the catalog grouped by category, ordered by
 * `category ASC, sort_order ASC, name ASC`. No pagination — the full
 * catalog is small (~120 rows × a few hundred bytes per row ≈ 50 KB
 * total) and the admin dashboard wants to see them all at once.
 *
 * Used by `/admin/tools` to render category sections. Excludes the
 * long text columns (`long_description`, `notes`) because the dashboard
 * only displays the short metadata fields.
 */
export async function listToolsGroupedByCategory(): Promise<{
  groups: Array<{
    category: string;
    /** Flat list of all tools in the category. Kept for backwards
     *  compat with the admin dashboard components that pre-date the
     *  subcategory UI. */
    tools: AdminToolRow[];
    /** Tools bucketed by subcategory, preserving the DB's sort order
     *  (category, subcategory, sort_order, name). Used by the admin
     *  dashboard to render Category → Subcategory → Tool hierarchy. */
    subcategories: Array<{
      subcategory: string;
      tools: AdminToolRow[];
    }>;
    counts: Record<ToolStatus, number>;
  }>;
  total: number;
}> {
  const db = getDb();
  return safeQuery(
    async () => {
      const rows = await db
        .prepare(
          `SELECT id, slug, category, subcategory, name, description, api_endpoint,
                  pricing_tier, icon_url, accent_color, sort_order,
                  status, created_by, created_at, updated_at, live_at
             FROM admin_tools
            ORDER BY category ASC, subcategory ASC, sort_order ASC, name COLLATE NOCASE ASC`
        )
        .all<AdminToolRow>();
      const list = rows.results ?? [];
      // Bucket by category, then by subcategory, preserving D1's
      // order. The outer Map walks categories in the DB's natural
      // order; the inner Map walks subcategories in the same.
      const catMap = new Map<
        string,
        {
          tools: AdminToolRow[];
          subMap: Map<string, AdminToolRow[]>;
          counts: Record<ToolStatus, number>;
        }
      >();
      for (const t of list) {
        let c = catMap.get(t.category);
        if (!c) {
          c = {
            tools: [],
            subMap: new Map(),
            counts: {
              suggested: 0,
              under_review: 0,
              in_progress: 0,
              live: 0,
              deprecated: 0,
              rejected: 0,
            },
          };
          catMap.set(t.category, c);
        }
        c.tools.push(t);
        const subKey = t.subcategory || "Other";
        let subTools = c.subMap.get(subKey);
        if (!subTools) {
          subTools = [];
          c.subMap.set(subKey, subTools);
        }
        subTools.push(t);
        c.counts[t.status]++;
      }
      return {
        groups: Array.from(catMap.entries()).map(([category, c]) => ({
          category,
          tools: c.tools,
          subcategories: Array.from(c.subMap.entries()).map(([subcategory, tools]) => ({
            subcategory,
            tools,
          })),
          counts: c.counts,
        })),
        total: list.length,
      };
    },
    {
      groups: [],
      total: 0,
    }
  );
}

export async function getTool(id: number): Promise<AdminTool | null> {
  const db = getDb();
  return safeQuery(
    () => db.prepare(`SELECT * FROM admin_tools WHERE id = ?1 LIMIT 1`).bind(id).first<AdminTool>(),
    null
  );
}

export async function getLiveToolsForCategory(category: string): Promise<AdminTool[]> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT * FROM admin_tools WHERE category = ?1 AND status = 'live'
           ORDER BY sort_order ASC, name ASC`
        )
        .bind(category)
        .all<AdminTool>()
        .then((r) => r.results ?? []),
    []
  );
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export type ToolStats = {
  total: number;
  suggested: number;
  under_review: number;
  in_progress: number;
  live: number;
  deprecated: number;
  rejected: number;
};

export async function getToolStats(): Promise<ToolStats> {
  const db = getDb();
  return safeQuery(
    async () => {
      const rows = await db
        .prepare(`SELECT status, COUNT(*) AS n FROM admin_tools GROUP BY status`)
        .all<{ status: ToolStatus; n: number }>();
      const out: ToolStats = {
        total: 0,
        suggested: 0,
        under_review: 0,
        in_progress: 0,
        live: 0,
        deprecated: 0,
        rejected: 0,
      };
      for (const r of rows.results ?? []) {
        out[r.status] = r.n;
        out.total += r.n;
      }
      return out;
    },
    {
      total: 0,
      suggested: 0,
      under_review: 0,
      in_progress: 0,
      live: 0,
      deprecated: 0,
      rejected: 0,
    }
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createTool(input: ToolCreate, userId: number): Promise<AdminTool> {
  const db = getDb();
  const now = new Date().toISOString();
  const liveAt = input.status === "live" ? now : null;
  const subcategory = input.subcategory?.trim() || "Other";
  const result = await db
    .prepare(
      `INSERT INTO admin_tools
        (slug, category, subcategory, name, description, long_description,
         api_endpoint, pricing_tier, icon_url, accent_color,
         sort_order, status, notes, created_by, created_at, updated_at, live_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14, ?15)
       RETURNING *`
    )
    .bind(
      input.slug,
      input.category,
      subcategory,
      input.name,
      input.description,
      input.long_description,
      input.api_endpoint,
      input.pricing_tier,
      input.icon_url,
      input.accent_color,
      input.sort_order,
      input.status,
      input.notes,
      userId,
      now,
      liveAt
    )
    .first<AdminTool>();
  if (!result) throw new Error("createTool: no row returned");
  await recordStatusHistory({
    tool_id: result.id,
    tool_slug: result.slug,
    tool_name: result.name,
    old_status: null,
    new_status: result.status,
    notes: "Initial create",
    changed_by: userId,
    changed_by_name: "",
  });
  return result;
}

export async function updateTool(
  id: number,
  patch: ToolUpdate,
  userId: number
): Promise<AdminTool> {
  const db = getDb();
  const current = await getTool(id);
  if (!current) throw new Error(`Tool ${id} not found`);

  // If status is changing, validate the transition.
  if (patch.status && patch.status !== current.status) {
    if (!canTransition(current.status, patch.status)) {
      throw new Error(`Illegal transition: ${current.status} → ${patch.status}`);
    }
  }

  const merged: AdminTool = { ...current, ...patch, updated_at: new Date().toISOString() };
  // Stamp live_at the first time the tool hits `live`.
  if (patch.status === "live" && current.status !== "live" && !current.live_at) {
    merged.live_at = new Date().toISOString();
  }
  // Normalize subcategory: empty / whitespace → "Other" so the DB
  // CHECK constraint can never see a blank.
  const subcategory = (merged.subcategory ?? "").trim() || "Other";

  await db
    .prepare(
      `UPDATE admin_tools SET
         slug            = ?1,
         category        = ?2,
         subcategory     = ?3,
         name            = ?4,
         description     = ?5,
         long_description= ?6,
         api_endpoint    = ?7,
         pricing_tier    = ?8,
         icon_url        = ?9,
         accent_color    = ?10,
         sort_order      = ?11,
         status          = ?12,
         notes           = ?13,
         live_at         = ?14,
         updated_at      = ?15
       WHERE id = ?16`
    )
    .bind(
      merged.slug,
      merged.category,
      subcategory,
      merged.name,
      merged.description,
      merged.long_description,
      merged.api_endpoint,
      merged.pricing_tier,
      merged.icon_url,
      merged.accent_color,
      merged.sort_order,
      merged.status,
      merged.notes,
      merged.live_at,
      merged.updated_at,
      id
    )
    .run();

  if (patch.status && patch.status !== current.status) {
    await recordStatusHistory({
      tool_id: id,
      tool_slug: merged.slug,
      tool_name: merged.name,
      old_status: current.status,
      new_status: merged.status,
      notes: patch.notes ?? "",
      changed_by: userId,
      changed_by_name: "",
    });
  }

  return (await getTool(id))!;
}

export async function deleteTool(id: number): Promise<void> {
  const db = getDb();
  await db.prepare(`DELETE FROM admin_tools WHERE id = ?1`).bind(id).run();
}

// ---------------------------------------------------------------------------
// Status history
// ---------------------------------------------------------------------------

export type StatusHistoryRow = {
  id: number;
  tool_id: number | null;
  tool_slug: string;
  tool_name: string;
  old_status: ToolStatus | null;
  new_status: ToolStatus;
  notes: string;
  changed_by: number | null;
  changed_by_name: string;
  created_at: string;
};

export async function recordStatusHistory(row: {
  tool_id: number | null;
  tool_slug: string;
  tool_name: string;
  old_status: ToolStatus | null;
  new_status: ToolStatus;
  notes: string;
  changed_by: number | null;
  changed_by_name: string;
}): Promise<void> {
  const db = getDb();
  await safeQuery(async () => {
    await db
      .prepare(
        `INSERT INTO admin_status_history
          (tool_id, tool_slug, tool_name, old_status, new_status,
           notes, changed_by, changed_by_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
      )
      .bind(
        row.tool_id,
        row.tool_slug,
        row.tool_name,
        row.old_status,
        row.new_status,
        row.notes,
        row.changed_by,
        row.changed_by_name
      )
      .run();
  }, null);
}

export async function getRecentStatusHistory(limit = 10): Promise<StatusHistoryRow[]> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT * FROM admin_status_history
           ORDER BY created_at DESC LIMIT ?1`
        )
        .bind(limit)
        .all<StatusHistoryRow>()
        .then((r) => r.results ?? []),
    []
  );
}

export async function getStatusHistoryForTool(toolId: number): Promise<StatusHistoryRow[]> {
  const db = getDb();
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT * FROM admin_status_history
           WHERE tool_id = ?1 ORDER BY created_at DESC`
        )
        .bind(toolId)
        .all<StatusHistoryRow>()
        .then((r) => r.results ?? []),
    []
  );
}

export function isToolStatus(value: unknown): value is ToolStatus {
  return typeof value === "string" && (TOOL_STATUSES as ReadonlyArray<string>).includes(value);
}
