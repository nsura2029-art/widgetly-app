-- ============================================================================
-- Widgetly — public suggestion board
-- Migration: 0002_suggestion_board.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Evolves the original seed-era suggestions table into the richer public
-- board schema: listing filters, per-suggestion pages, anonymous/session
-- upvotes, and queued notification emails.
-- ============================================================================

DROP VIEW IF EXISTS top_suggestions;

ALTER TABLE suggestions RENAME TO suggestions_legacy;

CREATE TABLE IF NOT EXISTS suggestions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  tool_name   TEXT    NOT NULL,
  description TEXT    NOT NULL,
  use_case    TEXT    NOT NULL DEFAULT '',
  category    TEXT    NOT NULL DEFAULT 'AI',
  urgency     TEXT    NOT NULL DEFAULT 'medium'
                   CHECK (urgency IN ('low', 'medium', 'high')),
  email       TEXT    NOT NULL COLLATE NOCASE,
  status      TEXT    NOT NULL DEFAULT 'in_review'
                   CHECK (status IN ('in_review', 'building', 'live', 'rejected')),
  upvotes     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  built_at    TEXT
);

INSERT INTO suggestions
  (slug, tool_name, description, use_case, category, urgency, email, status, upvotes, created_at, updated_at, built_at)
SELECT
  slug,
  name,
  COALESCE(NULLIF(pitch, ''), COALESCE(description, name)),
  COALESCE(NULLIF(description, ''), COALESCE(pitch, '')),
  'AI',
  'medium',
  COALESCE(NULLIF(contact, ''), 'unknown@widgetly.tech'),
  CASE status
    WHEN 'pending_review' THEN 'in_review'
    WHEN 'in_queue' THEN 'in_review'
    WHEN 'in_progress' THEN 'building'
    WHEN 'in_development' THEN 'building'
    WHEN 'shipped' THEN 'live'
    WHEN 'declined' THEN 'rejected'
    ELSE 'in_review'
  END,
  COALESCE(vote_count, 0),
  created_at,
  created_at,
  CASE WHEN status = 'shipped' THEN created_at ELSE NULL END
FROM suggestions_legacy;

DROP TABLE suggestions_legacy;

CREATE INDEX IF NOT EXISTS suggestions_category_idx ON suggestions (category);
CREATE INDEX IF NOT EXISTS suggestions_status_idx ON suggestions (status);
CREATE INDEX IF NOT EXISTS suggestions_vote_idx ON suggestions (upvotes DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS suggestions_created_idx ON suggestions (created_at DESC);
CREATE INDEX IF NOT EXISTS suggestions_built_idx ON suggestions (built_at DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS suggestions_email_created_idx ON suggestions (email, created_at DESC);

CREATE TABLE IF NOT EXISTS upvotes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_id INTEGER NOT NULL,
  ip_hash       TEXT    NOT NULL,
  session_id    TEXT    NOT NULL,
  user_id       INTEGER,
  weight        INTEGER NOT NULL DEFAULT 1 CHECK (weight IN (1, 2)),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE,
  UNIQUE (suggestion_id, ip_hash, session_id),
  UNIQUE (suggestion_id, user_id)
);

CREATE INDEX IF NOT EXISTS upvotes_suggestion_idx ON upvotes (suggestion_id);
CREATE INDEX IF NOT EXISTS upvotes_session_idx ON upvotes (ip_hash, session_id);

CREATE TABLE IF NOT EXISTS email_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_id INTEGER NOT NULL,
  template      TEXT    NOT NULL
                    CHECK (template IN (
                      'suggestion_received',
                      'under_review',
                      'selected_for_build',
                      'building_started',
                      'tool_live',
                      'you_won_1000',
                      'suggestion_rejected'
                    )),
  status        TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx ON email_queue (status, created_at);
CREATE INDEX IF NOT EXISTS email_queue_suggestion_idx ON email_queue (suggestion_id);

CREATE VIEW IF NOT EXISTS top_suggestions AS
  SELECT id, slug, tool_name, description, category, upvotes, status, created_at, updated_at, built_at
  FROM suggestions
  WHERE status IN ('in_review', 'building', 'live')
  ORDER BY upvotes DESC, created_at DESC
  LIMIT 50;

-- ============================================================================
-- End of 0002_suggestion_board.sql
-- ============================================================================
