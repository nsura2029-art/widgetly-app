-- ============================================================================
-- Widgetly — admin password reset
-- Migration: 0005_password_reset.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Adds the table backing the "forgot password" flow. A reset token is
-- generated when an admin requests a reset, stored here with an expiry,
-- and consumed (marked used_at) when the admin sets a new password
-- via the emailed/displayed link.
--
-- Tokens are 32 random bytes (hex) — 64 chars — and expire 1 hour
-- after issue. One-time use (used_at is set on consume). Old tokens
-- for a user are invalidated when a new one is issued.
--
-- Note: there's no email service wired up yet, so the route handler
-- returns the reset URL in the JSON response (only visible to the
-- requester — no other admin sees it). When email is added later,
-- the route should send the URL via the email channel instead.
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,             -- SHA-256 hex of the random token (we never store the plaintext)
  expires_at  TEXT    NOT NULL,                    -- 1 hour from issue
  used_at     TEXT,                               -- set on consume
  ip          TEXT,                               -- IP that requested the reset
  user_agent  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_user    ON admin_password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_expires ON admin_password_resets(expires_at);
