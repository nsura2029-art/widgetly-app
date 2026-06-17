/**
 * Suggestions data access — thin wrapper around the D1 binding.
 *
 * The API route already mints a server id (e.g. "sg_abc123") and a
 * slug from the user-supplied name; we persist both so the public
 * suggestion board can deep-link to `/suggest/[slug]` without an
 * extra id-resolution hop.
 */

import { log } from "@/lib/log";
import { getD1 } from "./server";

export type SuggestionInput = {
  id: string; // server-minted, e.g. "sg_..."
  slug: string;
  name: string;
  pitch: string;
  description?: string | null;
  contact?: string | null;
  locale: string;
};

export type SuggestionResult =
  | { kind: "inserted"; id: string; slug: string; createdAt: string }
  | { kind: "duplicate_slug"; existingSlug: string }
  | { kind: "error"; message: string };

/**
 * Insert a new tool suggestion. The id and slug are unique constraints
 * so duplicate submissions surface as `duplicate_slug` rather than a
 * generic 500 — the route can return a friendly "this name is taken,
 * try rephrasing" message.
 */
export async function recordSuggestion(input: SuggestionInput): Promise<SuggestionResult> {
  const start = Date.now();

  log.info("suggestions.insert", "start", {
    id: input.id,
    slug: input.slug,
    name_len: input.name.length,
    pitch_len: input.pitch.length,
    locale: input.locale,
  });

  let db;
  try {
    db = getD1();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "d1 not configured";
    log.error("suggestions.insert", "client unavailable", {
      id: input.id,
      err: msg,
      duration_ms: Date.now() - start,
    });
    return { kind: "error", message: msg };
  }

  try {
    const row = await db
      .prepare(
        `INSERT INTO suggestions
           (id, slug, name, pitch, description, contact, locale, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')
         RETURNING id, slug, created_at`
      )
      .bind(
        input.id,
        input.slug,
        input.name,
        input.pitch,
        input.description ?? null,
        input.contact ?? null,
        input.locale
      )
      .first<{ id: string; slug: string; created_at: string }>();

    if (!row) {
      // RETURNING returning null is unusual — D1 only does that on a
      // constraint violation when there's no ON CONFLICT clause, in
      // which case the underlying prepare() throws. Treat as unknown.
      log.warn("suggestions.insert", "no row returned", {
        id: input.id,
        slug: input.slug,
        duration_ms: Date.now() - start,
      });
      return { kind: "error", message: "insert returned no row" };
    }

    log.info("suggestions.insert", "inserted", {
      id: String(row.id),
      slug: String(row.slug),
      duration_ms: Date.now() - start,
    });
    return {
      kind: "inserted",
      id: String(row.id),
      slug: String(row.slug),
      createdAt: String(row.created_at),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // SQLite surfaces UNIQUE violations as errors with a recognizable
    // message. Match on `UNIQUE constraint failed` so the route gets
    // a structured `duplicate_slug` instead of a generic 500.
    if (/UNIQUE constraint failed.*slug/i.test(msg)) {
      log.warn("suggestions.insert", "duplicate slug", {
        id: input.id,
        slug: input.slug,
        duration_ms: Date.now() - start,
      });
      return { kind: "duplicate_slug", existingSlug: input.slug };
    }
    log.error("suggestions.insert", "insert threw", {
      id: input.id,
      slug: input.slug,
      err: msg,
      duration_ms: Date.now() - start,
    });
    return { kind: "error", message: msg };
  }
}

/**
 * Read the top N suggestions for the public leaderboard widget.
 * Hits the `top_suggestions` view (excludes declined, ordered by
 * votes then recency). Returns [] if the view is empty or the
 * query fails.
 */
export async function readTopSuggestions(
  limit = 4
): Promise<
  Array<{ slug: string; name: string; voteCount: number; pitch: string; status: string }>
> {
  const start = Date.now();
  log.debug("suggestions.read", "start", { limit });

  let db;
  try {
    db = getD1();
  } catch {
    log.debug("suggestions.read", "d1 not configured, returning []");
    return [];
  }

  try {
    const result = await db
      .prepare(
        `SELECT slug, name, vote_count, pitch, status
         FROM top_suggestions
         ORDER BY vote_count DESC, created_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<{ slug: string; name: string; vote_count: number; pitch: string; status: string }>();

    log.info("suggestions.read", "ok", {
      rows: result.results?.length ?? 0,
      duration_ms: Date.now() - start,
    });
    return (result.results ?? []).map(
      (row: { slug: string; name: string; vote_count: number; pitch: string; status: string }) => ({
        slug: String(row.slug),
        name: String(row.name),
        voteCount: Number(row.vote_count ?? 0),
        pitch: String(row.pitch ?? ""),
        status: String(row.status ?? "pending_review"),
      })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.warn("suggestions.read", "read failed", {
      err: msg,
      duration_ms: Date.now() - start,
    });
    return [];
  }
}
