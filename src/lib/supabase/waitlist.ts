/**
 * Waitlist data access — thin wrapper around the Supabase client that the
 * API route calls. Kept separate from `server.ts` so:
 *  - The Supabase client can be swapped (e.g. for a test double) without
 *    touching the call sites.
 *  - The route imports only what it needs (no transitive dep on the rest
 *    of the supabase helpers).
 *  - Each function maps to one user-visible operation, so the call site
 *    reads like a verb.
 */

import { getSupabase } from "./server";

export type WaitlistInput = {
  email: string;
  locale: string;
  referrer?: string | null;
  userAgent?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  ipHash?: string | null;
};

export type WaitlistResult =
  | { kind: "inserted"; position: number; createdAt: string }
  | { kind: "duplicate"; position: number; createdAt: string }
  | { kind: "error"; message: string };

/**
 * Upsert a waitlist signup. If the email already exists (case-insensitive
 * via citext), return the existing row's position — don't error, don't
 * double-count. Otherwise insert and let the trigger assign the position.
 *
 * The route handler turns an `error` into a 503 with the existing
 * webhook fallback path. The user always gets a "you're on the list"
 * response if the system is at all reachable.
 */
export async function recordWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "supabase not configured" };
  }

  // The unique constraint on `email` plus Postgres's `returning` clause
  // lets us upsert idempotently. We use `ignoreDuplicates: false` so the
  // returning clause still fires on conflict (we need the existing
  // position).
  const { data, error } = await supabase
    .from("waitlist")
    .upsert(
      {
        email: input.email,
        locale: input.locale,
        referrer: input.referrer ?? null,
        user_agent: input.userAgent ?? null,
        utm_source: input.utmSource ?? null,
        utm_medium: input.utmMedium ?? null,
        utm_campaign: input.utmCampaign ?? null,
        ip_hash: input.ipHash ?? null,
      },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select("position, created_at")
    .single();

  if (error) {
    return { kind: "error", message: error.message };
  }

  // We can't easily distinguish "newly inserted" from "already existed"
  // from the upsert response alone (both return the row). For the user
  // message we treat a re-signup as a duplicate: check if the row was
  // created within the last 2 seconds; if not, it's a re-signup.
  const createdAt = String(data.created_at);
  const isFresh = Date.now() - new Date(createdAt).getTime() < 2_000;
  return {
    kind: isFresh ? "inserted" : "duplicate",
    position: Number(data.position),
    createdAt,
  };
}
