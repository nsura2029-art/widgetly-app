/**
 * Admin suggestions data layer.
 *
 * Manages user-submitted suggestions from the public site. The admin
 * uses this to:
 *   - See all submissions with submitter email (admin-only)
 *   - Filter by status (in_review / building / live / rejected)
 *   - Change status (approve → building → live, or reject)
 *
 * Public vs admin:
 *   The public suggest API (`/api/suggestions` GET) returns suggestions
 *   WITHOUT internal fields and the rate-limited POST is for end users.
 *   This module is the admin-facing read/write surface that exposes
 *   email + allows status changes.
 */

import { getDb, safeQuery } from "@/lib/d1/admin";

export type SuggestionStatus = "in_review" | "building" | "live" | "rejected";

export const SUGGESTION_STATUSES: readonly SuggestionStatus[] = [
  "in_review",
  "building",
  "live",
  "rejected",
] as const;

export type AdminSuggestionRow = {
  id: number;
  slug: string;
  tool_name: string;
  description: string;
  use_case: string;
  category: string;
  urgency: string;
  email: string;
  status: SuggestionStatus;
  upvotes: number;
  created_at: string;
  updated_at: string;
  built_at: string | null;
};

export type AdminSuggestionListInput = {
  status?: SuggestionStatus | "all";
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminSuggestionListResult = {
  suggestions: AdminSuggestionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<SuggestionStatus, number>;
};

export async function listAdminSuggestions(
  input: AdminSuggestionListInput = {}
): Promise<AdminSuggestionListResult> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);
  const page = Math.max(input.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  return safeQuery(
    async () => {
      const db = getDb();
      const where: string[] = [];
      const bindings: unknown[] = [];
      if (input.status && input.status !== "all") {
        where.push("status = ?");
        bindings.push(input.status);
      }
      if (input.search) {
        where.push("(tool_name LIKE ? OR email LIKE ? OR slug LIKE ? OR description LIKE ?)");
        const like = `%${input.search}%`;
        bindings.push(like, like, like, like);
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

      const [countRow, rows, countsRows] = await Promise.all([
        db
          .prepare(`SELECT COUNT(*) AS count FROM suggestions ${whereSql}`)
          .bind(...bindings)
          .first<{ count: number }>(),
        db
          .prepare(
            `SELECT id, slug, tool_name, description, use_case, category, urgency,
                    email, status, upvotes, created_at, updated_at, built_at
               FROM suggestions
              ${whereSql}
              ORDER BY created_at DESC
              LIMIT ? OFFSET ?`
          )
          .bind(...bindings, pageSize, offset)
          .all<AdminSuggestionRow>(),
        db
          .prepare(`SELECT status, COUNT(*) AS count FROM suggestions GROUP BY status`)
          .all<{ status: string; count: number }>(),
      ]);

      const counts: Record<SuggestionStatus, number> = {
        in_review: 0,
        building: 0,
        live: 0,
        rejected: 0,
      };
      for (const r of countsRows.results ?? []) {
        if ((SUGGESTION_STATUSES as readonly string[]).includes(r.status)) {
          counts[r.status as SuggestionStatus] = Number(r.count);
        }
      }

      const total = Number(countRow?.count ?? 0);
      return {
        suggestions: (rows.results ?? []).map((r) => ({
          ...r,
          status: r.status as SuggestionStatus,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        counts,
      };
    },
    {
      suggestions: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      counts: { in_review: 0, building: 0, live: 0, rejected: 0 },
    }
  );
}

/**
 * Update a suggestion's status. Returns true on success, false if no
 * row matched. The status must be one of the allowed values.
 */
export async function updateSuggestionStatus(
  id: number,
  status: SuggestionStatus
): Promise<boolean> {
  if (!(SUGGESTION_STATUSES as readonly string[]).includes(status)) return false;
  return safeQuery(async () => {
    const db = getDb();
    const now = new Date().toISOString();
    const builtAt = status === "live" ? now : null;
    const result = await db
      .prepare(
        `UPDATE suggestions
              SET status = ?, updated_at = ?, built_at = COALESCE(?, built_at)
            WHERE id = ?`
      )
      .bind(status, now, builtAt, id)
      .run();
    return Boolean(result.success);
  }, false);
}
