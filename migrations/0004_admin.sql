-- ============================================================================
-- Widgetly — admin dashboard
-- Migration: 0004_admin.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Adds the schema backing /admin/* and the public tools menu gating.
-- Five tables:
--   1. admin_users           — credentials + account state for admins
--   2. admin_sessions        — server-side session store (revocable)
--   3. admin_login_attempts  — rate-limit + audit log for sign-in
--   4. admin_tools           — the canonical "what's in the public menu"
--   5. admin_status_history  — append-only log of every status change
--
-- Public menu rule: only rows from admin_tools WHERE status = 'live' are
-- shown in the widgetly public site. The static catalog in
-- src/lib/tools-categories.ts remains as the seed source for the
-- existing shipped tools (migrated with status='live' by
-- scripts/seed-admin.mjs); new tools go through the lifecycle via the
-- admin UI.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_users
-- One row per admin account. Username is the login handle; password_hash
-- is bcrypt with cost ≥ 12 (managed in src/lib/admin/auth.ts). The
-- must_change_password flag is set on first login — the user is bounced
-- to a "change password" flow before they can do anything else.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash        TEXT    NOT NULL,
  display_name         TEXT    NOT NULL DEFAULT '',
  email                TEXT             COLLATE NOCASE,
  is_active            INTEGER NOT NULL DEFAULT 1
                              CHECK (is_active IN (0, 1)),
  must_change_password INTEGER NOT NULL DEFAULT 1
                              CHECK (must_change_password IN (0, 1)),
  last_login_at        TEXT,
  last_login_ip        TEXT,
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_admin_users_active   ON admin_users(is_active);

-- ---------------------------------------------------------------------------
-- 2. admin_sessions
-- Server-side record of every issued session. The cookie carries an
-- HMAC-signed session id; we look up the row here to support forced
-- logout, "log out everywhere", and immediate revocation. Expired
-- sessions are purged by a periodic job (TODO) — short expiry + small
-- per-row payload makes the table self-cleaning in practice.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          TEXT    PRIMARY KEY,                       -- random 32-byte hex
  user_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at  TEXT    NOT NULL,                          -- 7 days from creation
  revoked_at  TEXT                                       -- set on logout
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user    ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ---------------------------------------------------------------------------
-- 3. admin_login_attempts
-- Both successful and failed attempts, for two purposes:
--   a) Rate limiting: 5 per IP per minute (sliding window) on POST /login
--   b) Audit: who tried to sign in as what, and from where, and when
-- We never store the password here — only the username that was attempted
-- and whether the credentials matched.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT    NOT NULL,
  username   TEXT    NOT NULL,
  success    INTEGER NOT NULL CHECK (success IN (0, 1)),
  reason     TEXT,                                       -- e.g. 'bad_password', 'no_such_user', 'locked'
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON admin_login_attempts(ip, created_at);

-- ---------------------------------------------------------------------------
-- 4. admin_tools
-- The canonical record of "what's in the public menu". The public site
-- reads from this table and only renders rows where status = 'live'.
-- A row's `slug` must be unique within its category; combined with the
-- category slug it's the route key for /tools/[category]/[slug].
--
-- Lifecycle: suggested → under_review → in_progress → live → deprecated
-- (or → rejected from any of the first three). Enforced in the API
-- layer (src/lib/admin/tools.ts) so the DB CHECK constraint is a safety
-- net, not the rulebook.
--
-- icon_url, accent_color, sort_order are UI-only knobs surfaced in the
-- public category page. pricing_tier + api_endpoint are the metadata
-- blocks on the tool detail page.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_tools (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  long_description TEXT   NOT NULL DEFAULT '',
  api_endpoint    TEXT,
  pricing_tier    TEXT    NOT NULL DEFAULT 'free'
                        CHECK (pricing_tier IN ('free', 'freemium', 'paid')),
  icon_url        TEXT,
  accent_color    TEXT    NOT NULL DEFAULT 'primary'
                        CHECK (accent_color IN ('primary', 'secondary', 'accent')),
  sort_order      INTEGER NOT NULL DEFAULT 100,
  status          TEXT    NOT NULL DEFAULT 'suggested'
                        CHECK (status IN ('suggested','under_review','in_progress','live','deprecated','rejected')),
  notes           TEXT    NOT NULL DEFAULT '',            -- admin-internal, not public
  created_by      INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  live_at         TEXT,                                    -- when status first reached 'live'
  UNIQUE(slug, category)
);

CREATE INDEX IF NOT EXISTS idx_admin_tools_status        ON admin_tools(status);
CREATE INDEX IF NOT EXISTS idx_admin_tools_category      ON admin_tools(category);
CREATE INDEX IF NOT EXISTS idx_admin_tools_status_live   ON admin_tools(status, category, sort_order)
  WHERE status = 'live';

-- ---------------------------------------------------------------------------
-- 5. admin_status_history
-- Append-only log of every status change. The `old_status` is NULL on
-- initial create; `notes` carries the optional comment the admin typed
-- in the change-status modal. The public audit trail is reconstructed
-- by joining on tool_id (or tool_slug if the tool was later deleted).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_status_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id       INTEGER REFERENCES admin_tools(id) ON DELETE SET NULL,
  tool_slug     TEXT    NOT NULL,                        -- denormalized for join after delete
  tool_name     TEXT    NOT NULL,
  old_status    TEXT,                                    -- NULL on insert
  new_status    TEXT    NOT NULL,
  notes         TEXT    NOT NULL DEFAULT '',
  changed_by    INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  changed_by_name TEXT  NOT NULL DEFAULT '',             -- denormalized for audit joins
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_status_history_tool    ON admin_status_history(tool_id);
CREATE INDEX IF NOT EXISTS idx_admin_status_history_recent ON admin_status_history(created_at DESC);
