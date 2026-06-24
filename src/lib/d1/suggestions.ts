/**
 * Suggestions data access for Cloudflare D1.
 *
 * The public board reads from D1 when the binding is available and
 * falls back to seed content in server components when it is not.
 * Route handlers should use these helpers instead of raw SQL so the
 * response contracts, rate limits, and upvote invariants stay in one
 * place.
 */

import { createHash } from "node:crypto";
import { log } from "@/lib/log";
import { getD1 } from "./server";

export const SUGGESTION_CATEGORIES = [
  "PDF",
  "Image",
  "SEO",
  "Dev",
  "AI",
  "Video",
  "Calculators",
  "Converters",
  "Writing",
  "Business",
  "Education",
  "Other",
] as const;

export const SUGGESTION_STATUSES = ["in_review", "building", "live", "rejected"] as const;
export const SUGGESTION_URGENCIES = ["low", "medium", "high"] as const;
export const SUGGESTION_SORTS = ["most_voted", "newest", "recently_built"] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
export type SuggestionUrgency = (typeof SUGGESTION_URGENCIES)[number];
export type SuggestionSort = (typeof SUGGESTION_SORTS)[number];

export type SuggestionRecord = {
  id: number;
  slug: string;
  toolName: string;
  description: string;
  useCase: string;
  category: SuggestionCategory;
  urgency: SuggestionUrgency;
  email: string;
  status: SuggestionStatus;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
  builtAt: string | null;
};

export type SuggestionCreateInput = {
  toolName: string;
  description: string;
  useCase: string;
  category: SuggestionCategory;
  urgency: SuggestionUrgency;
  email: string;
};

export type SuggestionListInput = {
  category?: string | null;
  status?: string | null;
  sort?: SuggestionSort;
  page?: number;
  pageSize?: number;
};

type SuggestionRow = {
  id: number;
  slug: string;
  tool_name: string;
  description: string;
  use_case: string;
  category: string;
  urgency: string;
  email: string;
  status: string;
  upvotes: number;
  created_at: string;
  updated_at: string;
  built_at: string | null;
};

function mapRow(row: SuggestionRow): SuggestionRecord {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    toolName: String(row.tool_name),
    description: String(row.description),
    useCase: String(row.use_case ?? ""),
    category: normalizeCategory(row.category),
    urgency: normalizeUrgency(row.urgency),
    email: String(row.email ?? ""),
    status: normalizeStatus(row.status),
    upvotes: Number(row.upvotes ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    builtAt: row.built_at ? String(row.built_at) : null,
  };
}

export function normalizeCategory(value: unknown): SuggestionCategory {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "Other";
  const exact = SUGGESTION_CATEGORIES.find((category) => category.toLowerCase() === raw);
  if (exact) return exact;
  const prefix = SUGGESTION_CATEGORIES.find((category) => category.toLowerCase().startsWith(raw));
  if (prefix) return prefix;
  // Unknown / unmappable value — fall back to the "Other" bucket so
  // user-submitted tools that don't match any defined category still
  // land somewhere searchable. Previously this fell back to "AI",
  // which silently mis-categorized suggestions.
  return "Other";
}

export function normalizeStatus(value: unknown): SuggestionStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "pending_review" || raw === "in_queue") return "in_review";
  if (raw === "declined") return "rejected";
  if (raw === "in_progress" || raw === "in_development" || raw === "shipped") {
    return raw === "shipped" ? "live" : "building";
  }
  return SUGGESTION_STATUSES.includes(raw as SuggestionStatus)
    ? (raw as SuggestionStatus)
    : "in_review";
}

export function normalizeUrgency(value: unknown): SuggestionUrgency {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return SUGGESTION_URGENCIES.includes(raw as SuggestionUrgency)
    ? (raw as SuggestionUrgency)
    : "medium";
}

export function normalizeSort(value: unknown): SuggestionSort {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return SUGGESTION_SORTS.includes(raw as SuggestionSort) ? (raw as SuggestionSort) : "most_voted";
}

export function suggestionStatusLabel(status: SuggestionStatus): string {
  switch (status) {
    case "in_review":
      // Public-facing label is "Suggested" to match the user's mental
      // model: a freshly submitted tool hasn't been "reviewed" yet, it's
      // just been suggested. The internal DB value is still `in_review`
      // so the rest of the pipeline is unchanged.
      return "Suggested";
    case "building":
      return "Building";
    case "live":
      return "Live";
    case "rejected":
      return "Rejected";
  }
}

export function slugifySuggestionName(toolName: string): string {
  const slug = toolName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "suggested-tool";
}

async function uniqueSlug(baseSlug: string): Promise<string> {
  const db = getD1();
  const existing = await db
    .prepare("SELECT slug FROM suggestions WHERE slug = ? OR slug LIKE ?")
    .bind(baseSlug, `${baseSlug}-%`)
    .all<{ slug: string }>();
  const used = new Set((existing.results ?? []).map((row) => row.slug));
  if (!used.has(baseSlug)) return baseSlug;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function countSuggestionsByEmailToday(email: string): Promise<number> {
  const row = await getD1()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM suggestions
       WHERE email = ?
         AND created_at >= strftime('%Y-%m-%dT00:00:00.000Z', 'now')`
    )
    .bind(email.toLowerCase())
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function createSuggestion(input: SuggestionCreateInput): Promise<SuggestionRecord> {
  const start = Date.now();
  const baseSlug = slugifySuggestionName(input.toolName);
  const slug = await uniqueSlug(baseSlug);
  const now = new Date().toISOString();

  const row = await getD1()
    .prepare(
      `INSERT INTO suggestions
         (slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'in_review', 0, ?, ?)
       RETURNING id, slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at, built_at`
    )
    .bind(
      slug,
      input.toolName,
      input.description,
      input.useCase,
      normalizeCategory(input.category),
      normalizeUrgency(input.urgency),
      input.email.toLowerCase(),
      now,
      now
    )
    .first<SuggestionRow>();

  if (!row) throw new Error("Suggestion insert returned no row.");

  const suggestion = mapRow(row);
  await enqueueSuggestionEmail(suggestion.id, "suggestion_received");
  log.info("suggestions.create", "inserted", {
    id: suggestion.id,
    slug: suggestion.slug,
    duration_ms: Date.now() - start,
  });
  return suggestion;
}

export async function listSuggestions(input: SuggestionListInput = {}): Promise<{
  suggestions: SuggestionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 50);
  const page = Math.max(input.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const bindings: unknown[] = [];

  if (input.category) {
    where.push("category = ?");
    bindings.push(normalizeCategory(input.category));
  }
  if (input.status) {
    where.push("status = ?");
    bindings.push(normalizeStatus(input.status));
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const sort = normalizeSort(input.sort);
  const orderSql =
    sort === "newest"
      ? "created_at DESC"
      : sort === "recently_built"
        ? "COALESCE(built_at, updated_at) DESC, upvotes DESC"
        : "upvotes DESC, created_at DESC";

  const db = getD1();
  const [countRow, rows] = await Promise.all([
    db
      .prepare(`SELECT COUNT(*) AS count FROM suggestions ${whereSql}`)
      .bind(...bindings)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT id, slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at, built_at
         FROM suggestions
         ${whereSql}
         ORDER BY ${orderSql}
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, pageSize, offset)
      .all<SuggestionRow>(),
  ]);

  const total = Number(countRow?.count ?? 0);
  return {
    suggestions: (rows.results ?? []).map(mapRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Live tools sourced from the admin catalog (`admin_tools` table where
 * `status = 'live'`). Returned in the same `SuggestionRecord` shape so
 * the public suggest board can render admin-catalog entries alongside
 * user-submitted suggestions when the requested status is `live`.
 *
 * Why a separate read path: the public board needs a unified list per
 * status, and the suggest/leaderboard/admin surfaces each have their
 * own read patterns. Keeping this isolated makes it easy to swap in
 * caching or a view later without touching the rest of the page logic.
 */
type AdminToolRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  long_description: string | null;
  category: string;
  live_at: string | null;
  sort_order: number;
};

function mapAdminToolAsLiveSuggestion(row: AdminToolRow): SuggestionRecord {
  const now = row.live_at ?? new Date().toISOString();
  return {
    id: -row.id, // negative to keep admin rows distinct from suggestion rows in any downstream join
    slug: row.slug,
    toolName: row.name,
    description: row.description,
    useCase: row.long_description ?? row.description,
    category: normalizeCategory(row.category),
    urgency: "medium",
    email: "",
    status: "live",
    upvotes: 0,
    createdAt: now,
    updatedAt: now,
    builtAt: now,
  };
}

export async function listLiveToolsFromAdminCatalog(
  input: { category?: string | null; limit?: number } = {}
): Promise<SuggestionRecord[]> {
  try {
    const db = getD1();
    const { clause, bindings } = (() => {
      if (input.category) {
        return {
          clause: "WHERE status = 'live' AND category = ?",
          bindings: [normalizeCategory(input.category)],
        };
      }
      return { clause: "WHERE status = 'live'", bindings: [] as unknown[] };
    })();
    const rows = await db
      .prepare(
        `SELECT id, slug, name, description, long_description, category, live_at, sort_order
         FROM admin_tools
         ${clause}
         ORDER BY live_at DESC, sort_order ASC
         LIMIT ?`
      )
      .bind(...bindings, input.limit ?? 60)
      .all<AdminToolRow>();
    return (rows.results ?? []).map(mapAdminToolAsLiveSuggestion);
  } catch (err) {
    // If the admin_tools table doesn't exist yet (e.g. fresh D1),
    // return an empty list rather than 500-ing the suggest board.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table") || msg.includes("D1 binding missing")) {
      return [];
    }
    throw err;
  }
}

export async function getSuggestionByIdOrSlug(idOrSlug: string): Promise<SuggestionRecord | null> {
  const db = getD1();
  // Try slug first regardless of shape — users can create suggestions
  // with all-numeric tool names, in which case the slug is "12345" but
  // it's still a slug, not the auto-increment id. Only fall back to
  // id lookup if no slug match exists.
  const bySlug = await db
    .prepare(
      `SELECT id, slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at, built_at
       FROM suggestions
       WHERE slug = ?
       LIMIT 1`
    )
    .bind(idOrSlug)
    .first<SuggestionRow>();
  if (bySlug) return mapRow(bySlug);

  const isNumeric = /^\d+$/.test(idOrSlug);
  if (!isNumeric) return null;
  return db
    .prepare(
      `SELECT id, slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at, built_at
       FROM suggestions
       WHERE id = ?
       LIMIT 1`
    )
    .bind(Number(idOrSlug))
    .first<SuggestionRow>()
    .then((row) => (row ? mapRow(row) : null));
}

export async function enqueueSuggestionEmail(
  suggestionId: number,
  template: string
): Promise<void> {
  await getD1()
    .prepare(
      `INSERT INTO email_queue (suggestion_id, template, status, attempts, created_at)
       VALUES (?, ?, 'pending', 0, ?)`
    )
    .bind(suggestionId, template, new Date().toISOString())
    .run();
}

export async function setSuggestionStatus(
  suggestionId: number,
  status: SuggestionStatus
): Promise<void> {
  const templateByStatus: Record<SuggestionStatus, string> = {
    in_review: "under_review",
    building: "building_started",
    live: "tool_live",
    rejected: "suggestion_rejected",
  };
  const now = new Date().toISOString();
  await getD1()
    .prepare(
      `UPDATE suggestions
       SET status = ?, updated_at = ?, built_at = CASE WHEN ? = 'live' THEN COALESCE(built_at, ?) ELSE built_at END
       WHERE id = ?`
    )
    .bind(status, now, status, now, suggestionId)
    .run();
  await enqueueSuggestionEmail(suggestionId, templateByStatus[status]);
}

export async function setSuggestionUpvote(input: {
  suggestionId: number;
  ipHash: string;
  sessionId: string;
  userId?: number | null;
  weight?: number;
}): Promise<{ upvotes: number; voted: boolean }> {
  const weight = input.weight ?? (input.userId ? 2 : 1);
  const now = new Date().toISOString();
  await getD1()
    .prepare(
      `INSERT OR IGNORE INTO upvotes
         (suggestion_id, ip_hash, session_id, user_id, weight, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(input.suggestionId, input.ipHash, input.sessionId, input.userId ?? null, weight, now)
    .run();
  return recomputeUpvotes(input.suggestionId, true);
}

export async function removeSuggestionUpvote(input: {
  suggestionId: number;
  ipHash: string;
  sessionId: string;
  userId?: number | null;
}): Promise<{ upvotes: number; voted: boolean }> {
  const isRegistered = typeof input.userId === "number";
  await getD1()
    .prepare(
      `DELETE FROM upvotes
       WHERE suggestion_id = ?
         AND ${isRegistered ? "user_id = ?" : "ip_hash = ? AND session_id = ?"}`
    )
    .bind(input.suggestionId, ...(isRegistered ? [input.userId] : [input.ipHash, input.sessionId]))
    .run();
  return recomputeUpvotes(input.suggestionId, false);
}

async function recomputeUpvotes(
  suggestionId: number,
  voted: boolean
): Promise<{ upvotes: number; voted: boolean }> {
  const row = await getD1()
    .prepare("SELECT COALESCE(SUM(weight), 0) AS total FROM upvotes WHERE suggestion_id = ?")
    .bind(suggestionId)
    .first<{ total: number }>();
  const total = Number(row?.total ?? 0);
  await getD1()
    .prepare("UPDATE suggestions SET upvotes = ?, updated_at = ? WHERE id = ?")
    .bind(total, new Date().toISOString(), suggestionId)
    .run();
  return { upvotes: total, voted };
}

export async function recordSuggestion(input: {
  id?: string;
  slug?: string;
  name: string;
  pitch: string;
  description?: string | null;
  contact?: string | null;
  locale?: string;
}): Promise<
  | { kind: "inserted"; id: string; slug: string; createdAt: string }
  | { kind: "duplicate_slug"; existingSlug: string }
  | { kind: "error"; message: string }
> {
  try {
    const suggestion = await createSuggestion({
      toolName: input.name,
      description: input.pitch,
      useCase: input.description || input.pitch.slice(0, 300),
      category: "AI",
      urgency: "medium",
      email: input.contact || "unknown@widgetly.tech",
    });
    return {
      kind: "inserted",
      id: String(suggestion.id),
      slug: suggestion.slug,
      createdAt: suggestion.createdAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE constraint failed.*slug/i.test(message)) {
      return {
        kind: "duplicate_slug",
        existingSlug: input.slug ?? slugifySuggestionName(input.name),
      };
    }
    return { kind: "error", message };
  }
}

export async function readTopSuggestions(
  limit = 4
): Promise<
  Array<{ slug: string; name: string; voteCount: number; pitch: string; status: string }>
> {
  const result = await listSuggestions({ sort: "most_voted", pageSize: limit });
  return result.suggestions.map((suggestion) => ({
    slug: suggestion.slug,
    name: suggestion.toolName,
    voteCount: suggestion.upvotes,
    pitch: suggestion.description,
    status: suggestion.status,
  }));
}

/**
 * Top user-submitted suggestions by vote count, for the leaderboard page.
 * Excludes `rejected` rows so the leaderboard always surfaces a useful
 * set (rejected items are still discoverable on /suggest?status=rejected).
 *
 * Returns a small, lean shape (slug, name, votes, category, status) so
 * the leaderboard section can render a focused "Top Community
 * Suggestions" card without pulling the full SuggestionRecord.
 */
export type TopSuggestion = {
  slug: string;
  name: string;
  votes: number;
  category: string;
  status: SuggestionStatus;
  createdAt: string;
};

export async function listTopSuggestions(limit = 6): Promise<TopSuggestion[]> {
  try {
    const rows = await getD1()
      .prepare(
        `SELECT slug, tool_name, category, status, upvotes, created_at
         FROM suggestions
         WHERE status != 'rejected'
         ORDER BY upvotes DESC, created_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{
        slug: string;
        tool_name: string;
        category: string;
        status: string;
        upvotes: number;
        created_at: string;
      }>();
    return (rows.results ?? []).map((row) => ({
      slug: row.slug,
      name: row.tool_name,
      votes: Number(row.upvotes ?? 0),
      category: row.category,
      status: normalizeStatus(row.status),
      createdAt: String(row.created_at),
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table") || msg.includes("D1 binding missing")) {
      return [];
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Top Suggesters (public, privacy-preserving)
// ---------------------------------------------------------------------------
//
// Groups user-submitted suggestions by SHA-256 hash of the submitter's
// email, counts non-rejected submissions, and returns the top N.
// Exposing the raw email on a public page would be a privacy issue;
// the hash is the same across a user's submissions (so they're
// recognisable as "the same person") without revealing their address.
//
// The "featured" suggestion per user is the one with the most upvotes,
// which gives the page a hook into the actual suggestion content.

export type TopSuggester = {
  /** Stable, privacy-preserving identifier like "anon_3a9f2c1e". */
  handle: string;
  /** Total accepted (non-rejected) suggestions across all time. */
  totalSuggestions: number;
  /** Suggestions accepted as 'live' (built and shipped). */
  liveCount: number;
  /** Most upvoted suggestion by this user, used as the card's featured link. */
  featured: {
    slug: string;
    toolName: string;
    category: string;
    upvotes: number;
    status: SuggestionStatus;
  } | null;
  /** When this user last submitted a suggestion. */
  lastSubmittedAt: string | null;
};

export async function listTopSuggesters(
  limit = 30,
  opts: { sinceIso?: string } = {}
): Promise<TopSuggester[]> {
  try {
    const db = getD1();
    // Pull every non-rejected suggestion, then bucket by hashed email
    // in JS. Doing the bucketing in SQL would require registering a
    // SQLite hash function in D1, which Cloudflare doesn't allow for
    // user-defined functions; bucketing in JS is fine because the row
    // count is bounded by the number of suggestions (low thousands at
    // most in the near term).
    const where: string[] = ["status != 'rejected'"];
    const bindings: unknown[] = [];
    if (opts.sinceIso) {
      where.push("created_at >= ?");
      bindings.push(opts.sinceIso);
    }
    const rows = await db
      .prepare(
        `SELECT slug, tool_name, category, status, upvotes, email, created_at
           FROM suggestions
          WHERE ${where.join(" AND ")}
          ORDER BY created_at DESC`
      )
      .bind(...bindings)
      .all<{
        slug: string;
        tool_name: string;
        category: string;
        status: string;
        upvotes: number;
        email: string;
        created_at: string;
      }>();

    const byHash = new Map<string, TopSuggester & { _rows: typeof rows.results }>();
    for (const r of rows.results ?? []) {
      const handle = hashEmail(r.email);
      const existing = byHash.get(handle);
      const isLive = r.status === "live";
      if (!existing) {
        byHash.set(handle, {
          handle,
          totalSuggestions: 1,
          liveCount: isLive ? 1 : 0,
          featured: {
            slug: r.slug,
            toolName: r.tool_name,
            category: r.category,
            upvotes: Number(r.upvotes ?? 0),
            status: normalizeStatus(r.status),
          },
          lastSubmittedAt: String(r.created_at),
          _rows: [r],
        });
        continue;
      }
      existing.totalSuggestions += 1;
      if (isLive) existing.liveCount += 1;
      if (!existing.featured || Number(r.upvotes ?? 0) > existing.featured.upvotes) {
        existing.featured = {
          slug: r.slug,
          toolName: r.tool_name,
          category: r.category,
          upvotes: Number(r.upvotes ?? 0),
          status: normalizeStatus(r.status),
        };
      }
      const created = String(r.created_at);
      if (!existing.lastSubmittedAt || created > existing.lastSubmittedAt) {
        existing.lastSubmittedAt = created;
      }
    }

    return Array.from(byHash.values())
      .map(({ _rows, ...rest }) => rest)
      .sort((a, b) => {
        if (b.totalSuggestions !== a.totalSuggestions) {
          return b.totalSuggestions - a.totalSuggestions;
        }
        // Tie-break: live count, then most recent activity.
        if (b.liveCount !== a.liveCount) return b.liveCount - a.liveCount;
        return (b.lastSubmittedAt ?? "").localeCompare(a.lastSubmittedAt ?? "");
      })
      .slice(0, limit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table") || msg.includes("D1 binding missing")) {
      return [];
    }
    throw err;
  }
}

/**
 * Privacy-preserving user handle derived from an email. We use
 * SHA-256 + the first 8 hex chars + "anon_" prefix so the same person
 * is recognisable across submissions (same handle every time) but the
 * raw email is never stored or displayed publicly.
 */
function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  // Sync SHA-256 via Node's createHash. The Web Crypto API is async
  // which would force this whole helper (and listTopSuggesters) to
  // become async; node:crypto's createHash is sync and Cloudflare
  // Workers ship it under the nodejs compat layer.
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `anon_${digest.slice(0, 8)}`;
}
