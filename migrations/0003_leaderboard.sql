-- ============================================================================
-- Widgetly — public creator leaderboard
-- Migration: 0003_leaderboard.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Tracks creators (people who contribute tools to the platform) and the
-- tools they've contributed. The leaderboard page ranks creators by
-- contribution count within rolling time windows (all-time, month, week,
-- today) and awards badges for milestones.
--
-- Notes
-- - Users have a stable URL-safe `handle` so we can link to their profile
--   without exposing numeric IDs.
-- - `avatar_seed` is a deterministic string used by the client to render
--   an SVG/emoji avatar; no external image fetches.
-- - `contributions` is append-only; the leaderboard counts rows per
--   user within the time window.
-- - `badges` records awarded achievements; a user can hold multiple
--   instances of the same badge (e.g. multiple 'streak-7' for distinct
--   streaks). We dedupe on (user_id, badge) for display purposes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  handle        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT    NOT NULL,
  avatar_seed   TEXT    NOT NULL,
  bio           TEXT    NOT NULL DEFAULT '',
  joined_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_handle ON users(handle COLLATE NOCASE);

-- ============================================================================
-- Tool contributions
-- One row per tool a creator has contributed. The leaderboard counts these
-- rows per user within a time window. `contributed_at` is set at insert
-- time and never updated, so time-window filtering is straightforward.
-- ============================================================================
CREATE TABLE IF NOT EXISTS contributions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_slug       TEXT    NOT NULL UNIQUE,
  tool_name       TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  contributed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_contrib_user_date
  ON contributions(user_id, contributed_at);

CREATE INDEX IF NOT EXISTS idx_contrib_date
  ON contributions(contributed_at);

CREATE INDEX IF NOT EXISTS idx_contrib_category
  ON contributions(category);

-- ============================================================================
-- Badges
-- Awarded when a creator hits a milestone. The application layer (D1
-- helper in src/lib/d1/leaderboard.ts) decides when to award; this table
-- just records the historical fact. Badge kinds:
--   first-tool      : contributed at least one tool
--   pioneer         : contributed a tool in the first 30 days of the platform
--   top-week        : ranked #1 in the past 7 days (re-evaluated weekly)
--   top-month       : ranked #1 in the past 30 days
--   top-all         : ranked #1 all-time
--   polyglot        : contributed tools in 4+ categories
--   streak-7        : contributed on 7+ distinct days within a 30-day window
--   streak-30       : contributed on 20+ distinct days within a 90-day window
-- ============================================================================
CREATE TABLE IF NOT EXISTS badges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge        TEXT    NOT NULL
                        CHECK (badge IN (
                          'first-tool', 'pioneer',
                          'top-week', 'top-month', 'top-all',
                          'polyglot', 'streak-7', 'streak-30'
                        )),
  awarded_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_badges_user
  ON badges(user_id);

-- A creator can only hold one of each badge at a time. Re-awarding a
-- badge the user already holds is a no-op via INSERT OR IGNORE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_badges_user_kind
  ON badges(user_id, badge);