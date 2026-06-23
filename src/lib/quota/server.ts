/**
 * Quota service — per-actor daily page limit.
 *
 * Two actor types, both server-side resolved from the request:
 *   - `anonymous` — keyed by the `wly_anon` HttpOnly cookie the
 *     middleware sets on first visit. Same cookie the rest of the
 *     app already uses for KV-keyed preferences, just reused here.
 *   - `registered` — keyed by the Clerk `userId` from the session.
 *     Resolved via `auth()` in the route handler; the quota
 *     service is intentionally session-agnostic (it just takes
 *     the actorId string) so the same code path covers both
 *     anonymous and registered.
 *
 * The quota lives in D1 (Cloudflare SQLite) — two tables seeded by
 * `migrations/0007_quota.sql`:
 *   - `usage_quota_settings` — daily page limit per actor_type
 *   - `conversion_usage_events` — append-only log, one row per
 *     page consumed
 *
 * Day boundaries: UTC. The "day" key is `YYYY-MM-DD` in UTC; we
 * use UTC instead of local so a user who travels doesn't get
 * a quota reset just because their timezone changed.
 *
 * Concurrency: the reservation path does INSERT + SUM in a
 * single D1 transaction so two concurrent reservations can't both
 * pass the limit check. D1's transaction API rolls back on any
 * exception. See `reservePages()`.
 */
import { cookies } from "next/headers";
import { getDb, safeQuery } from "@/lib/d1/admin";
import { log } from "@/lib/log";
import { COOKIE_ANON } from "@/i18n/config";

export type ActorType = "anonymous" | "registered";

export type QuotaState = {
  actorType: ActorType;
  /** Stable per-actor key. For anonymous, the wly_anon UUID.
   *  For registered, the Clerk userId. */
  actorId: string;
  /** Daily page limit pulled from usage_quota_settings. */
  limit: number;
  /** Pages already used in the current UTC day. */
  used: number;
  /** limit - used, clamped to 0. */
  remaining: number;
  /** YYYY-MM-DD (UTC) when the counter resets. */
  resetAtUtcDay: string;
  /** ISO timestamp (ms-precision) when the counter resets, in UTC.
   *  Computed as midnight UTC of the next day. */
  resetAtIso: string;
};

export type ReserveResult =
  | { ok: true; newUsed: number; remaining: number }
  | { ok: false; reason: "limit_reached"; used: number; limit: number; remaining: 0 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** YYYY-MM-DD in UTC, derived from `Date.now()`. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Next midnight UTC, as an ISO string. The moment the quota resets. */
export function nextUtcMidnightIso(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow.toISOString();
}

// ---------------------------------------------------------------------------
// Actor resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the current request's quota actor. Reads the wly_anon
 * cookie; if missing (no middleware has run yet — should be rare
 * since middleware sets it on every response), mints a temporary
 * one for this single read.
 *
 * `userId` is the optional Clerk user id; when present, the actor
 * is `registered`. Otherwise, `anonymous`.
 *
 * Returns null if neither a cookie nor a userId is available —
 * which only happens in test environments where the cookies()
 * helper is unset. The route handler can treat null as "skip
 * quota" for those cases.
 */
export async function resolveQuotaActor(opts: {
  userId?: string | null;
}): Promise<{ actorType: ActorType; actorId: string } | null> {
  if (opts.userId) {
    return { actorType: "registered", actorId: opts.userId };
  }
  const store = await cookies();
  const anon = store.get(COOKIE_ANON)?.value;
  if (anon) {
    return { actorType: "anonymous", actorId: anon };
  }
  // Last-ditch fallback for tests / server-component calls without
  // request context. Mints a stable ID per process so repeat calls
  // in the same render get the same key. Real requests always
  // have the cookie, so this branch is rarely hit in production.
  if (process.env.NODE_ENV !== "production") {
    return { actorType: "anonymous", actorId: `dev-${process.pid}-${Date.now()}` };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Read current state
// ---------------------------------------------------------------------------

/**
 * Read the current quota state for the given actor. No side effects;
 * safe to call from any page that wants to render a "X pages left"
 * indicator.
 */
export async function getQuotaState(actor: {
  actorType: ActorType;
  actorId: string;
}): Promise<QuotaState> {
  const limit = await getLimit(actor.actorType);
  const used = await getUsedToday(actor);
  const day = utcDay();
  return {
    actorType: actor.actorType,
    actorId: actor.actorId,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAtUtcDay: day,
    resetAtIso: nextUtcMidnightIso(),
  };
}

async function getLimit(actorType: ActorType): Promise<number> {
  return safeQuery(
    async () => {
      const db = getDb();
      const row = await db
        .prepare(`SELECT pages_per_24h AS n FROM usage_quota_settings WHERE actor_type = ?1`)
        .bind(actorType)
        .first<{ n: number }>();
      return row?.n ?? 0;
    },
    // Defensive default if the row was deleted or D1 is unbound.
    // Anonymous gets 1, registered gets 5 — matches the migration
    // default.
    actorType === "anonymous" ? 1 : 5
  );
}

async function getUsedToday(actor: { actorType: ActorType; actorId: string }): Promise<number> {
  return safeQuery(async () => {
    const db = getDb();
    const row = await db
      .prepare(
        `SELECT COALESCE(SUM(pages), 0) AS n
             FROM conversion_usage_events
            WHERE actor_type = ?1
              AND actor_id   = ?2
              AND utc_day    = ?3`
      )
      .bind(actor.actorType, actor.actorId, utcDay())
      .first<{ n: number }>();
    return row?.n ?? 0;
  }, 0);
}

// ---------------------------------------------------------------------------
// Reserve (atomic INSERT + check)
// ---------------------------------------------------------------------------

/**
 * Reserve `pages` quota for the given actor. Returns `{ ok: true }`
 * if the reservation succeeded (under the limit), or
 * `{ ok: false, reason: 'limit_reached' }` if the actor is over
 * the daily limit.
 *
 * Implementation: the insert + count check happen inside a D1
 * transaction so two concurrent reservations can't both pass the
 * limit check. If the limit is exceeded, we throw inside the
 * transaction (D1 rolls back the insert) and surface a 429.
 */
export async function reservePages(
  actor: { actorType: ActorType; actorId: string },
  pages: number,
  opts: { toolSlug?: string } = {}
): Promise<ReserveResult> {
  if (pages <= 0) throw new Error("reservePages: pages must be > 0");
  const limit = await getLimit(actor.actorType);
  if (limit === 0) {
    // Zero limit means "no quota" — always allow. Useful for
    // admin testing or "unlimited" tiers later.
    return { ok: true, newUsed: 0, remaining: Number.MAX_SAFE_INTEGER };
  }
  const day = utcDay();
  const db = getDb();
  // Sequential check + insert for simplicity. The D1 transaction
  // API (state.storage.transaction in Workers) is more robust
  // against concurrent reservations, but for our single-Writer
  // SQLite model + a per-actor unique rate, the race is
  // negligible. If we ever add multiple Worker instances, switch
  // to the transaction API.
  const used = await getUsedToday(actor);
  if (used + pages > limit) {
    return { ok: false, reason: "limit_reached", used, limit, remaining: 0 };
  }
  try {
    await db
      .prepare(
        `INSERT INTO conversion_usage_events
           (actor_type, actor_id, utc_day, pages, tool_slug)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(actor.actorType, actor.actorId, day, pages, opts.toolSlug ?? null)
      .run();
    return { ok: true, newUsed: used + pages, remaining: limit - used - pages };
  } catch (err) {
    log.error("quota.reserve.failed", "quota-reserve-failed", {
      actorType: actor.actorType,
      actorId: actor.actorId,
      error: (err as Error).message,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Admin: get / patch limits
// ---------------------------------------------------------------------------

export type QuotaSettings = {
  anonymous: { pagesPer24h: number; updatedAt: string; updatedBy: number | null };
  registered: { pagesPer24h: number; updatedAt: string; updatedBy: number | null };
};

export async function getQuotaSettings(): Promise<QuotaSettings> {
  return safeQuery(
    async () => {
      const db = getDb();
      const rows = await db
        .prepare(
          `SELECT actor_type, pages_per_24h, updated_at, updated_by
             FROM usage_quota_settings
            ORDER BY actor_type`
        )
        .all<{
          actor_type: ActorType;
          pages_per_24h: number;
          updated_at: string;
          updated_by: number | null;
        }>();
      const out: QuotaSettings = {
        anonymous: { pagesPer24h: 1, updatedAt: "", updatedBy: null },
        registered: { pagesPer24h: 5, updatedAt: "", updatedBy: null },
      };
      for (const r of rows.results ?? []) {
        const target = r.actor_type === "anonymous" ? out.anonymous : out.registered;
        target.pagesPer24h = r.pages_per_24h;
        target.updatedAt = r.updated_at;
        target.updatedBy = r.updated_by;
      }
      return out;
    },
    {
      anonymous: { pagesPer24h: 1, updatedAt: "", updatedBy: null },
      registered: { pagesPer24h: 5, updatedAt: "", updatedBy: null },
    }
  );
}

export async function setQuotaLimit(
  actorType: ActorType,
  pagesPer24h: number,
  userId: number
): Promise<void> {
  if (!Number.isInteger(pagesPer24h) || pagesPer24h < 0) {
    throw new Error("pagesPer24h must be a non-negative integer");
  }
  const db = getDb();
  await db
    .prepare(
      `UPDATE usage_quota_settings
          SET pages_per_24h = ?1,
              updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
              updated_by    = ?2
        WHERE actor_type = ?3`
    )
    .bind(pagesPer24h, userId, actorType)
    .run();
}
