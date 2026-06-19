/**
 * Waitlist data access — thin wrapper around the D1 binding.
 *
 * Idempotent upsert: if the email already exists (case-insensitive
 * thanks to the COLLATE NOCASE in the schema), we return the existing
 * row's position. Otherwise we insert and the `id` IS the position
 * (the schema uses `INTEGER PRIMARY KEY AUTOINCREMENT` so SQLite
 * auto-assigns a monotonic id; the user-visible "you're #N" comes
 * straight from that).
 *
 * Why no separate `position` column anymore? The Supabase version had
 * `id` (a sequence) and `position` (a denormalized copy maintained by
 * a BEFORE INSERT trigger). SQLite has no triggers in the same shape
 * and no need for one — the auto-increment id already gives us the
 * monotonic position. Saves a column, a trigger, and an UPDATE roundtrip.
 */

import { log, maskEmail } from "@/lib/log";
import { getD1 } from "./server";

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
 * Upsert a waitlist signup. If the email already exists, return the
 * existing row's position. Otherwise insert and let SQLite assign the
 * auto-increment id, which we report as the position.
 *
 * The route handler turns an `error` into a 503 with the existing
 * webhook fallback path. The user always gets a "you're on the list"
 * response if the system is at all reachable.
 */
export async function recordWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  const start = Date.now();
  const emailDomain = input.email.includes("@") ? input.email.split("@")[1] : "(no-domain)";

  log.info("waitlist.insert", "start", {
    email: maskEmail(input.email),
    email_domain: emailDomain,
    locale: input.locale,
    has_referrer: Boolean(input.referrer),
    has_user_agent: Boolean(input.userAgent),
  });

  let db;
  try {
    db = getD1();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "d1 not configured";
    log.error("waitlist.insert", "client unavailable", {
      email_domain: emailDomain,
      err: msg,
      duration_ms: Date.now() - start,
    });
    return { kind: "error", message: msg };
  }

  // INSERT ... ON CONFLICT(email) DO NOTHING RETURNING id, created_at
  //
  // SQLite's RETURNING clause (supported since 3.35) gives us back the
  // new row's id and created_at on insert. If a row with the same email
  // already exists, the conflict clause silently skips the insert and
  // RETURNING returns no rows — that's our "duplicate" signal.
  //
  // The unique constraint is `email TEXT ... COLLATE NOCASE UNIQUE`,
  // so the dedup is case-insensitive (a@b.com == A@B.com).
  try {
    const inserted = await db
      .prepare(
        `INSERT INTO waitlist
           (email, locale, referrer, user_agent, utm_source, utm_medium, utm_campaign, ip_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO NOTHING
         RETURNING id, created_at`
      )
      .bind(
        input.email,
        input.locale,
        input.referrer ?? null,
        input.userAgent ?? null,
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
        input.ipHash ?? null
      )
      .first<{ id: number; created_at: string }>();

    if (inserted) {
      log.info("waitlist.insert", "inserted", {
        email_domain: emailDomain,
        position: inserted.id,
        duration_ms: Date.now() - start,
      });
      return {
        kind: "inserted",
        position: inserted.id,
        createdAt: inserted.created_at,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("waitlist.insert", "insert threw", {
      email_domain: emailDomain,
      err: msg,
      duration_ms: Date.now() - start,
    });
    return { kind: "error", message: msg };
  }

  // No row returned → conflict. Fetch the existing row so we can
  // return its position and created_at to the caller.
  try {
    const existing = await db
      .prepare(`SELECT id, created_at FROM waitlist WHERE email = ? COLLATE NOCASE`)
      .bind(input.email)
      .first<{ id: number; created_at: string }>();

    if (!existing) {
      // Race condition: the row disappeared between the INSERT and the
      // SELECT (someone deleted it, or another insert won the race).
      // Treat as an error and let the route return 503 — the user can
      // retry safely.
      log.warn("waitlist.insert", "duplicate but row vanished", {
        email_domain: emailDomain,
        duration_ms: Date.now() - start,
      });
      return { kind: "error", message: "waitlist row vanished between insert and select" };
    }

    log.info("waitlist.insert", "duplicate", {
      email_domain: emailDomain,
      position: existing.id,
      duration_ms: Date.now() - start,
    });
    return {
      kind: "duplicate",
      position: existing.id,
      createdAt: existing.created_at,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("waitlist.insert", "select existing threw", {
      email_domain: emailDomain,
      err: msg,
      duration_ms: Date.now() - start,
    });
    return { kind: "error", message: msg };
  }
}

/**
 * Cheap count for the diag endpoint. Returns the row count or -1 if
 * the query fails (caller treats -1 as "unknown").
 */
export async function countWaitlist(): Promise<number> {
  try {
    const db = getD1();
    const row = await db.prepare("SELECT COUNT(*) AS n FROM waitlist").first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return -1;
  }
}
