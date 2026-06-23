-- ============================================================================
-- Widgetly — usage quota (anonymous + registered daily page limits)
-- Migration: 0007_quota.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Two tables back the per-actor daily page quota:
--   1. usage_quota_settings   — one row per actor_type ("anonymous",
--                               "registered"). Holds the daily page
--                               limit. Admin-editable via
--                               /admin/quotas + /api/admin/quotas.
--   2. conversion_usage_events — append-only log of every page that
--                                consumes quota. Summed per
--                                (actor_type, actor_id, utc_day) to
--                                compute used / remaining.
--
-- Defaults:
--   anonymous   = 1 page / 24h
--   registered  = 5 pages / 24h
--
-- Why event-log instead of a per-day counter row:
--   - One row per event means we can audit "which 5 pages did this
--     user hit today" if abuse is suspected.
--   - The reservation path uses a transaction (INSERT + check
--     SUM) to avoid TOCTOU. See lib/quota/server.ts.
--   - Periodic GC: rows older than 30 days can be pruned; index
--     on (actor_type, actor_id, utc_day DESC) keeps the SUM
--     query fast for hot actors.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. usage_quota_settings
-- One row per actor_type. The PRIMARY KEY is the actor_type string
-- itself, so admins can't accidentally create two "anonymous" rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_quota_settings (
  actor_type              TEXT PRIMARY KEY
                                CHECK (actor_type IN ('anonymous', 'registered')),
  pages_per_24h          INTEGER NOT NULL
                                CHECK (pages_per_24h >= 0),
  -- When the row was last changed. Useful for showing "limits
  -- updated 3 days ago" in the admin UI.
  updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- Last admin user that touched the row. JOIN to admin_users.
  updated_by             INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Default rows for the two known actor types. Uses INSERT OR
-- IGNORE so re-running this migration is safe. The values
-- below are the production defaults; change them in
-- /admin/quotas or via a follow-up migration.
INSERT OR IGNORE INTO usage_quota_settings (actor_type, pages_per_24h) VALUES
  ('anonymous',  1),
  ('registered', 5);

-- ---------------------------------------------------------------------------
-- 2. conversion_usage_events
-- One row per page consumed. The `utc_day` column is the YYYY-MM-DD
-- representation of the event time in UTC — bucketing events by
-- this column lets us do an indexed SUM for the quota check
-- without a date-range scan.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversion_usage_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  -- "anonymous" or "registered". Mirrors usage_quota_settings.
  actor_type     TEXT    NOT NULL
                       CHECK (actor_type IN ('anonymous', 'registered')),
  -- Stable per-actor key. For anonymous: the wly_anon UUID. For
  -- registered: the Clerk user id. Both are strings, both are
  -- globally unique to the actor, neither leaks PII beyond
  -- their own scope.
  actor_id       TEXT    NOT NULL,
  -- YYYY-MM-DD in UTC. Storing as TEXT (not INTEGER epoch) means
  -- the index is human-readable and the SUM query is a simple
  -- range scan on the leading column.
  utc_day        TEXT    NOT NULL
                       CHECK (length(utc_day) = 10 AND utc_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- 1 by default; we keep the column in case we later add
  -- variable-weight events (e.g. heavy pages count as 3).
  pages          INTEGER NOT NULL DEFAULT 1
                       CHECK (pages > 0),
  -- Where the event came from — which tool slug consumed the
  -- page. Optional; admin debugging aid.
  tool_slug      TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Hot path: SUM(pages) WHERE actor_type=? AND actor_id=? AND
-- utc_day=?. The composite index lets SQLite answer the query
-- from the index alone, no row reads.
CREATE INDEX IF NOT EXISTS idx_usage_events_actor_day
  ON conversion_usage_events (actor_type, actor_id, utc_day);

-- GC: when we want to delete events older than 30 days, this
-- index makes the DELETE fast.
CREATE INDEX IF NOT EXISTS idx_usage_events_created
  ON conversion_usage_events (created_at);