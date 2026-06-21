/**
 * Leaderboard query layer.
 *
 * Public surface
 *   - LEADERBOARD_WINDOWS         — valid window keys + i18n label keys
 *   - normalizeLeaderboardWindow  — coerces a string into a valid window
 *   - getLeaderboard(window)      — ranked creators for the window
 *   - getCreator(handle)          — single creator + their tools + badges
 *   - getFeaturedCreator()        — the "latest creator" highlighted on the page
 *   - listAllCreators()           — full creator directory
 *
 * Data model
 *   The leaderboard ranks creators by the count of contributions
 *   (`contributions` table) within a rolling time window:
 *     - all-time: no time filter
 *     - month:    contributed_at >= now - 30 days
 *     - week:     contributed_at >= now -  7 days
 *     - today:    contributed_at >= today 00:00 UTC
 *
 *   Ties are broken by the most recent contribution (more recent wins),
 *   so two creators with the same count are ordered by who shipped most
 *   recently.
 *
 *   We deliberately keep the SQL in this file (no separate query builder)
 *   so the join structure stays easy to follow. The statements are short
 *   enough that a builder layer would be more friction than benefit.
 */
import { getD1, isD1Configured } from "./server";

/**
 * Wrap a D1 read query so a missing-table (or other transient) error
 * surfaces as an empty result instead of a 500. Lets the leaderboard
 * render the empty state in environments where the migrations
 * haven't been applied yet (e.g. local dev without Miniflare D1).
 */
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table") || msg.includes("D1 binding missing")) {
      return fallback;
    }
    throw err;
  }
}

/** All leaderboard time windows. Order is the tab order on the UI. */
export const LEADERBOARD_WINDOWS = ["all", "month", "week", "today"] as const;
export type LeaderboardWindow = (typeof LEADERBOARD_WINDOWS)[number];

export const LEADERBOARD_WINDOW_LABELS: Record<LeaderboardWindow, string> = {
  all: "allTime",
  month: "thisMonth",
  week: "thisWeek",
  today: "today",
};

/**
 * Coerces an arbitrary string into a valid LeaderboardWindow. Returns
 * "all" for anything that doesn't match — the "safe" default since it
 * surfaces the most data.
 */
export function normalizeLeaderboardWindow(value: unknown): LeaderboardWindow {
  if (typeof value !== "string") return "all";
  return (LEADERBOARD_WINDOWS as readonly string[]).includes(value)
    ? (value as LeaderboardWindow)
    : "all";
}

/** A badge kind that may appear in the UI. Mirrors the CHECK constraint. */
export type LeaderboardBadge =
  | "first-tool"
  | "pioneer"
  | "top-week"
  | "top-month"
  | "top-all"
  | "polyglot"
  | "streak-7"
  | "streak-30";

/** A row in the public leaderboard: a creator + their window-scoped stats. */
export type LeaderboardEntry = {
  rank: number;
  user: {
    handle: string;
    displayName: string;
    avatarSeed: string;
    bio: string;
    joinedAt: string;
  };
  contributions: number;
  tools: Array<{
    slug: string;
    name: string;
    category: string;
    description: string;
  }>;
  badges: LeaderboardBadge[];
};

/** Compute the SQL fragment that filters contributions by window. */
function windowFilter(window: LeaderboardWindow): {
  clause: string;
  params: unknown[];
} {
  switch (window) {
    case "all":
      return { clause: "1=1", params: [] };
    case "month":
      // 30 days back from now (UTC).
      return {
        clause: "c.contributed_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')",
        params: [],
      };
    case "week":
      return {
        clause: "c.contributed_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')",
        params: [],
      };
    case "today":
      // Everything since the start of today (UTC). D1's strftime gives
      // 'YYYY-MM-DD', which compares lexicographically against the ISO
      // timestamp prefix.
      return {
        clause: "c.contributed_at >= strftime('%Y-%m-%dT00:00:00Z', 'now')",
        params: [],
      };
  }
}

/**
 * Fetch the ranked leaderboard for the given window.
 *
 * Returns an empty array (not an error) when D1 is unconfigured so the
 * page can render the "no creators yet" empty state. Same for when the
 * contribution table is empty.
 */
export async function getLeaderboard(
  window: LeaderboardWindow,
  limit = 50
): Promise<LeaderboardEntry[]> {
  if (!isD1Configured()) return [];
  let db: ReturnType<typeof getD1>;
  try {
    db = getD1();
  } catch {
    return [];
  }
  return safeQuery(async () => {
    const { clause, params } = windowFilter(window);

    // Step 1: ranked creators. Use a sub-query so we can ORDER BY
    // contribution count with a tiebreaker by most-recent contribution.
    const rankedRows = await db
      .prepare(
        `SELECT
         u.id           AS user_id,
         u.handle       AS handle,
         u.display_name AS display_name,
         u.avatar_seed  AS avatar_seed,
         u.bio          AS bio,
         u.joined_at    AS joined_at,
         COUNT(c.id)    AS contributions,
         MAX(c.contributed_at) AS latest_contribution_at
       FROM users u
       JOIN contributions c ON c.user_id = u.id
       WHERE ${clause}
       GROUP BY u.id
       ORDER BY contributions DESC, latest_contribution_at DESC
       LIMIT ?`
      )
      .bind(...params, limit)
      .all<{
        user_id: number;
        handle: string;
        display_name: string;
        avatar_seed: string;
        bio: string;
        joined_at: string;
        contributions: number;
        latest_contribution_at: string;
      }>();

    if (!rankedRows.results || rankedRows.results.length === 0) return [];

    // Step 2: fetch tools + badges for these creators in one query each.
    // Bounded by `limit` so the IN(...) list stays short and D1 handles it.
    const userIds = rankedRows.results.map((r) => r.user_id);
    const placeholders = userIds.map(() => "?").join(",");

    const toolsRows = await db
      .prepare(
        `SELECT user_id, slug, tool_name, category, description
       FROM contributions
       WHERE user_id IN (${placeholders})
       ORDER BY contributed_at DESC`
      )
      .bind(...userIds)
      .all<{
        user_id: number;
        slug: string;
        tool_name: string;
        category: string;
        description: string;
      }>();

    const badgeRows = await db
      .prepare(
        `SELECT user_id, badge
       FROM badges
       WHERE user_id IN (${placeholders})
       ORDER BY awarded_at ASC`
      )
      .bind(...userIds)
      .all<{ user_id: number; badge: LeaderboardBadge }>();

    // Group per-user data so we can attach it to each ranked row.
    const toolsByUser = new Map<number, LeaderboardEntry["tools"]>();
    for (const row of toolsRows.results ?? []) {
      const arr = toolsByUser.get(row.user_id) ?? [];
      arr.push({
        slug: row.slug,
        name: row.tool_name,
        category: row.category,
        description: row.description,
      });
      toolsByUser.set(row.user_id, arr);
    }

    const badgesByUser = new Map<number, LeaderboardBadge[]>();
    for (const row of badgeRows.results ?? []) {
      const arr = badgesByUser.get(row.user_id) ?? [];
      arr.push(row.badge);
      badgesByUser.set(row.user_id, arr);
    }

    return rankedRows.results.map((row, idx) => ({
      rank: idx + 1,
      user: {
        handle: row.handle,
        displayName: row.display_name,
        avatarSeed: row.avatar_seed,
        bio: row.bio,
        joinedAt: row.joined_at,
      },
      contributions: row.contributions,
      tools: toolsByUser.get(row.user_id) ?? [],
      badges: badgesByUser.get(row.user_id) ?? [],
    }));
  }, []);
}

/** A single creator (no leaderboard window applied — all-time view). */
export type CreatorProfile = {
  user: LeaderboardEntry["user"];
  allTimeRank: number | null;
  contributions: LeaderboardEntry["tools"];
  badges: LeaderboardBadge[];
};

/**
 * Fetch one creator by handle, including their all-time rank.
 *
 * Returns null if D1 is unconfigured, the user doesn't exist, or the
 * contributions table is empty for them.
 */
export async function getCreator(handle: string): Promise<CreatorProfile | null> {
  if (!isD1Configured()) return null;
  return safeQuery(async () => {
    const db = getD1();

    const userRow = await db
      .prepare(
        `SELECT id, handle, display_name, avatar_seed, bio, joined_at
       FROM users WHERE handle = ? COLLATE NOCASE`
      )
      .bind(handle)
      .first<{
        id: number;
        handle: string;
        display_name: string;
        avatar_seed: string;
        bio: string;
        joined_at: string;
      }>();
    if (!userRow) return null;

    const toolsRows = await db
      .prepare(
        `SELECT slug, tool_name, category, description
       FROM contributions
       WHERE user_id = ?
       ORDER BY contributed_at DESC`
      )
      .bind(userRow.id)
      .all<{
        slug: string;
        tool_name: string;
        category: string;
        description: string;
      }>();

    const badgeRows = await db
      .prepare(`SELECT badge FROM badges WHERE user_id = ? ORDER BY awarded_at ASC`)
      .bind(userRow.id)
      .all<{ badge: LeaderboardBadge }>();

    // All-time rank = position in a global ranking by contribution count.
    // We compute it via a correlated count of how many users have strictly
    // more contributions than this user, plus 1.
    const rankRow = await db
      .prepare(
        `SELECT (
         SELECT COUNT(DISTINCT user_id) FROM (
           SELECT user_id, COUNT(*) AS c
           FROM contributions
           GROUP BY user_id
           HAVING c > (
             SELECT COUNT(*) FROM contributions WHERE user_id = ?
           )
         )
       ) + 1 AS rank`
      )
      .bind(userRow.id)
      .first<{ rank: number }>();

    return {
      user: {
        handle: userRow.handle,
        displayName: userRow.display_name,
        avatarSeed: userRow.avatar_seed,
        bio: userRow.bio,
        joinedAt: userRow.joined_at,
      },
      allTimeRank: rankRow?.rank ?? null,
      contributions: (toolsRows.results ?? []).map((row) => ({
        slug: row.slug,
        name: row.tool_name,
        category: row.category,
        description: row.description,
      })),
      badges: (badgeRows.results ?? []).map((row) => row.badge),
    };
  }, null);
}

/**
 * The "featured creator" shown at the top of the leaderboard page.
 *
 * Returns the most recently-joined creator who has at least one
 * contribution, so visitors see a fresh face rather than the all-time
 * top (who may have been around forever).
 */
export async function getFeaturedCreator(): Promise<LeaderboardEntry | null> {
  if (!isD1Configured()) return null;
  return safeQuery(async () => {
    const db = getD1();

    const row = await db
      .prepare(
        `SELECT u.id AS user_id,
              u.handle, u.display_name, u.avatar_seed, u.bio, u.joined_at,
              COUNT(c.id) AS contributions,
              MAX(c.contributed_at) AS latest_contribution_at
       FROM users u
       JOIN contributions c ON c.user_id = u.id
       GROUP BY u.id
       ORDER BY u.joined_at DESC
       LIMIT 1`
      )
      .first<{
        user_id: number;
        handle: string;
        display_name: string;
        avatar_seed: string;
        bio: string;
        joined_at: string;
        contributions: number;
        latest_contribution_at: string;
      }>();

    if (!row) return null;

    const toolsRows = await db
      .prepare(
        `SELECT slug, tool_name, category, description
       FROM contributions WHERE user_id = ?
       ORDER BY contributed_at DESC LIMIT 6`
      )
      .bind(row.user_id)
      .all<{
        slug: string;
        tool_name: string;
        category: string;
        description: string;
      }>();

    const badgeRows = await db
      .prepare(`SELECT badge FROM badges WHERE user_id = ?`)
      .bind(row.user_id)
      .all<{ badge: LeaderboardBadge }>();

    return {
      // Featured creator is highlighted but doesn't get a numeric rank
      // (they're shown above the ranked list). Rank = 0 signals that to
      // the UI.
      rank: 0,
      user: {
        handle: row.handle,
        displayName: row.display_name,
        avatarSeed: row.avatar_seed,
        bio: row.bio,
        joinedAt: row.joined_at,
      },
      contributions: row.contributions,
      tools: (toolsRows.results ?? []).map((r) => ({
        slug: r.slug,
        name: r.tool_name,
        category: r.category,
        description: r.description,
      })),
      badges: (badgeRows.results ?? []).map((r) => r.badge),
    };
  }, null);
}

/**
 * List all creators (no contribution filter). Used by the creator
 * directory or for "browse all" admin views.
 */
export async function listAllCreators(
  limit = 100
): Promise<Array<{ handle: string; displayName: string; avatarSeed: string; bio: string }>> {
  if (!isD1Configured()) return [];
  return safeQuery(async () => {
    const db = getD1();
    const rows = await db
      .prepare(
        `SELECT handle, display_name, avatar_seed, bio
       FROM users
       ORDER BY joined_at DESC
       LIMIT ?`
      )
      .bind(limit)
      .all<{ handle: string; display_name: string; avatar_seed: string; bio: string }>();
    return (rows.results ?? []).map((r) => ({
      handle: r.handle,
      displayName: r.display_name,
      avatarSeed: r.avatar_seed,
      bio: r.bio,
    }));
  }, []);
}
