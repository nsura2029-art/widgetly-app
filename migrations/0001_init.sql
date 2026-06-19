-- ============================================================================
-- Widgetly — initial schema (waitlist + tool suggestions)
-- Migration: 0001_init.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Apply via:
--   pnpm db:migrate:local     # against `wrangler dev`'s local D1 (Miniflare)
--   pnpm db:migrate:remote    # against the deployed D1 binding
--
-- Idempotent: every CREATE uses IF NOT EXISTS. Safe to re-apply.
--
-- D1 differences from the original Postgres / Supabase schema:
--   - `citext` extension → use `COLLATE NOCASE` on the email column
--   - `nextval('seq')` → use `INTEGER PRIMARY KEY AUTOINCREMENT` (id is
--     auto-assigned by SQLite; we use `id` directly as the position —
--     no denormalized column, no trigger needed)
--   - No plpgsql → no stored procedures
--   - No RLS → the DB is only reachable from the Worker via the
--     binding, so there's no public surface to lock down
--   - JSONB → we don't need it; suggestion fields are flat TEXT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- waitlist: one row per email signup. id is auto-assigned and doubles as
-- the user-visible position (#1, #2, ...). Case-insensitive unique on email
-- via COLLATE NOCASE (no citext in SQLite).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waitlist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  locale       TEXT    NOT NULL DEFAULT 'en',
  referrer     TEXT,
  user_agent   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  ip_hash      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at);


-- ----------------------------------------------------------------------------
-- suggestions: tool ideas submitted via /api/suggest. id is server-minted
-- (e.g. "sg_abc123") so it's safe to reference from the client without
-- an extra round-trip; slug is the URL-friendly version of the name and
-- must be unique.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suggestions (
  id          TEXT    PRIMARY KEY,                  -- e.g. "sg_..."
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  pitch       TEXT    NOT NULL,
  description TEXT,
  contact     TEXT,
  locale      TEXT    NOT NULL DEFAULT 'en',
  status      TEXT    NOT NULL DEFAULT 'pending_review'
                   CHECK (status IN ('pending_review', 'in_progress', 'shipped', 'declined')),
  vote_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS suggestions_status_idx    ON suggestions (status);
CREATE INDEX IF NOT EXISTS suggestions_vote_idx      ON suggestions (vote_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS suggestions_created_idx   ON suggestions (created_at DESC);


-- ----------------------------------------------------------------------------
-- top_suggestions view: for the public leaderboard on /suggest. Filters
-- out declined, orders by votes then recency, caps at 50.
--
-- (In the Postgres version this was a SECURITY DEFINER function that
-- exposed a curated subset. D1 has no such concept; the binding is
-- already isolated to the Worker, so the view is just a query helper.)
-- ----------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS top_suggestions AS
  SELECT id, slug, name, pitch, vote_count, status, created_at
  FROM suggestions
  WHERE status IN ('pending_review', 'in_progress', 'shipped')
  ORDER BY vote_count DESC, created_at DESC
  LIMIT 50;


-- ============================================================================
-- End of 0001_init.sql
-- ============================================================================