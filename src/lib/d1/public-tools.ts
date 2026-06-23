/**
 * Public-side read of admin_tools.
 *
 * The public Widgetly site renders /tools/[category] and the homepage
 * categories showcase. Both should only show rows where
 * `status = 'live'` — the rest of the lifecycle (suggested, in
 * progress, deprecated, etc.) is admin-internal.
 *
 * We keep this in a separate file from the admin read path so the
 * public code can never accidentally include non-live rows (different
 * imports = different blast radius).
 */
import { safeQuery } from "@/lib/d1/admin";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { log } from "@/lib/log";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success: boolean; meta?: unknown }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

export type PublicTool = {
  slug: string;
  category: string;
  name: string;
  description: string;
  long_description: string;
  api_endpoint: string | null;
  pricing_tier: "free" | "freemium" | "paid";
  icon_url: string | null;
  accent_color: "primary" | "secondary" | "accent";
  sort_order: number;
  live_at: string | null;
};

/**
 * Public read — returns all live tools for a category. Falls back to
 * an empty array on D1-not-configured or table-missing (so the static
 * catalog remains the source of truth until the admin pipeline
 * populates D1).
 */
export async function getLiveToolsForCategoryPublic(category: string): Promise<PublicTool[]> {
  let db: D1Database;
  try {
    const { env } = getCloudflareContext();
    const candidate = (env as { DB?: D1Database })?.DB;
    if (!candidate) return [];
    db = candidate;
  } catch {
    return [];
  }
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT slug, category, name, description, long_description,
                  api_endpoint, pricing_tier, icon_url, accent_color,
                  sort_order, live_at
           FROM admin_tools
           WHERE category = ?1 AND status = 'live'
           ORDER BY sort_order ASC, name ASC`
        )
        .bind(category)
        .all<PublicTool>()
        .then((r) => r.results ?? []),
    []
  ).catch((err) => {
    log.warn("public.tools.getLive.failed", "public-read-failed", {
      category,
      error: (err as Error).message,
    });
    return [];
  });
}

/** Used by the homepage categories showcase to show "live in DB" counts. */
export async function getLiveToolCountsByCategory(): Promise<Record<string, number>> {
  let db: D1Database;
  try {
    const { env } = getCloudflareContext();
    const candidate = (env as { DB?: D1Database })?.DB;
    if (!candidate) return {};
    db = candidate;
  } catch {
    return {};
  }
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT category, COUNT(*) AS n FROM admin_tools
           WHERE status = 'live' GROUP BY category`
        )
        .all<{ category: string; n: number }>()
        .then((r) => {
          const out: Record<string, number> = {};
          for (const row of r.results ?? []) out[row.category] = row.n;
          return out;
        }),
    {}
  ).catch(() => ({}));
}

/**
 * Lightweight summary used by the header mega-menu's "Live now" section.
 * Returns the slug + display name for every live tool grouped by
 * category. We deliberately project only the two columns we need —
 * keeps the response small (one tiny JSON for all 12 categories
 * combined) and lets the menu merge this with the static catalog
 * without paying for the full tool payload.
 *
 * Slug is included so the client can dedupe against the static
 * sub-groups (which are keyed by display name) and decide which
 * "Live now" entries to surface.
 */
export type LiveToolSummary = { slug: string; name: string };

export async function listLiveToolsGroupedByCategory(): Promise<Record<string, LiveToolSummary[]>> {
  let db: D1Database;
  try {
    const { env } = getCloudflareContext();
    const candidate = (env as { DB?: D1Database })?.DB;
    if (!candidate) return {};
    db = candidate;
  } catch {
    return {};
  }
  return safeQuery(
    () =>
      db
        .prepare(
          `SELECT category, slug, name FROM admin_tools
           WHERE status = 'live'
           ORDER BY category ASC, sort_order ASC, name ASC`
        )
        .all<{ category: string; slug: string; name: string }>()
        .then((r) => {
          const out: Record<string, LiveToolSummary[]> = {};
          for (const row of r.results ?? []) {
            if (!out[row.category]) out[row.category] = [];
            out[row.category]!.push({ slug: row.slug, name: row.name });
          }
          return out;
        }),
    {}
  ).catch((err) => {
    log.warn("public.tools.listGrouped.failed", "public-read-failed", {
      error: (err as Error).message,
    });
    return {};
  });
}
