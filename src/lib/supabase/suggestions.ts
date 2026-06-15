/**
 * Suggestions data access. The API route already mints a server id
 * (e.g. "sg_abc123") and a slug from the user-supplied name; we
 * persist both so the public suggestion board (when it exists) can
 * deep-link to `/suggest/[slug]` without an extra id-resolution hop.
 */

import { getSupabase } from "./server";

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
  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "supabase not configured" };
  }

  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      id: input.id,
      slug: input.slug,
      name: input.name,
      pitch: input.pitch,
      description: input.description ?? null,
      contact: input.contact ?? null,
      locale: input.locale,
      status: "pending_review",
    })
    .select("id, slug, created_at")
    .single();

  if (!error && data) {
    return {
      kind: "inserted",
      id: String(data.id),
      slug: String(data.slug),
      createdAt: String(data.created_at),
    };
  }

  // 23505 = Postgres unique_violation. Supabase surfaces this as
  // error.code on the JS client.
  if (error && (error.code === "23505" || /duplicate key/i.test(error.message))) {
    return { kind: "duplicate_slug", existingSlug: input.slug };
  }

  return { kind: "error", message: error?.message ?? "unknown supabase error" };
}

/**
 * Read the top N suggestions for the public leaderboard widget.
 * Hits the `top_suggestions` view (excludes declined, ordered by
 * votes then recency). Returns [] if the view is empty or the
 * table doesn't exist yet.
 */
export async function readTopSuggestions(
  limit = 4
): Promise<
  Array<{ slug: string; name: string; voteCount: number; pitch: string; status: string }>
> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("top_suggestions")
    .select("slug, name, vote_count, pitch, status")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    voteCount: Number(row.vote_count ?? 0),
    pitch: String(row.pitch ?? ""),
    status: String(row.status ?? "pending_review"),
  }));
}
