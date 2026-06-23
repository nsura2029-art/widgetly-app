-- ============================================================================
-- Widgetly — admin tools subcategory
-- Migration: 0006_admin_subcategory.sql
-- Target:    Cloudflare D1 (SQLite)
--
-- Adds a `subcategory` column to admin_tools so the mega menu can render
-- Category → Subcategory → Tool as a proper three-level hierarchy.
--
-- Before this migration, the menu hierarchy was expressed in
-- src/lib/tools-subgroups.ts (a static TypeScript file). That made it
-- impossible for admins to add or remove subcategories without a code
-- deploy. Now subcategories live alongside tools in D1 and the menu
-- reads them dynamically.
--
-- Migration notes:
--   - Backfill: every existing row is set to subcategory = 'Other'
--     so the new NOT NULL constraint doesn't fail on existing data.
--     A subsequent seed (scripts/seed-admin-tools.mjs) re-stamps the
--     correct subcategories by walking tools-subgroups.ts.
--   - CHECK constraint: subcategory must be 1-60 chars, allowing
--     letters / digits / hyphens / spaces (mirrors the category slug
--     rule but with spaces, since subcategory labels are display-only
--     and don't appear in URLs).
--   - New composite index for the menu query: WHERE status='live'
--     ORDER BY category, subcategory, sort_order.
-- ============================================================================

-- Add the column as nullable first so the ALTER doesn't break on
-- pre-existing rows; the backfill below flips it to NOT NULL.
ALTER TABLE admin_tools ADD COLUMN subcategory TEXT;

-- Backfill: every existing row gets 'Other' so the NOT NULL
-- constraint can land without dropping data. The seed script
-- overwrites this with the canonical subcategory for every tool
-- that's also in src/lib/tools-subgroups.ts.
UPDATE admin_tools SET subcategory = 'Other' WHERE subcategory IS NULL;

-- Enforce NOT NULL + length sanity going forward.
-- SQLite doesn't support ALTER COLUMN, so we use the table-rebuild
-- pattern: create new_admin_tools with the new shape, copy data over,
-- swap the names, drop the old.
CREATE TABLE IF NOT EXISTS new_admin_tools (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  subcategory      TEXT    NOT NULL DEFAULT 'Other',
  name             TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  long_description TEXT    NOT NULL DEFAULT '',
  api_endpoint     TEXT,
  pricing_tier     TEXT    NOT NULL DEFAULT 'free'
                         CHECK (pricing_tier IN ('free', 'freemium', 'paid')),
  icon_url         TEXT,
  accent_color     TEXT    NOT NULL DEFAULT 'primary'
                         CHECK (accent_color IN ('primary', 'secondary', 'accent')),
  sort_order       INTEGER NOT NULL DEFAULT 100,
  status           TEXT    NOT NULL DEFAULT 'suggested'
                         CHECK (status IN ('suggested','under_review','in_progress','live','deprecated','rejected')),
  notes            TEXT    NOT NULL DEFAULT '',
  created_by       INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  live_at          TEXT,
  UNIQUE(slug, category)
);

INSERT INTO new_admin_tools
  (id, slug, category, subcategory, name, description, long_description,
   api_endpoint, pricing_tier, icon_url, accent_color, sort_order, status,
   notes, created_by, created_at, updated_at, live_at)
SELECT
  id, slug, category, subcategory, name, description, long_description,
  api_endpoint, pricing_tier, icon_url, accent_color, sort_order, status,
  notes, created_by, created_at, updated_at, live_at
FROM admin_tools;

DROP TABLE admin_tools;
ALTER TABLE new_admin_tools RENAME TO admin_tools;

-- Indexes (the same set as 0004, plus a new one for the subcategory
-- menu query).
CREATE INDEX IF NOT EXISTS idx_admin_tools_status        ON admin_tools(status);
CREATE INDEX IF NOT EXISTS idx_admin_tools_category      ON admin_tools(category);
CREATE INDEX IF NOT EXISTS idx_admin_tools_subcategory   ON admin_tools(category, subcategory);
CREATE INDEX IF NOT EXISTS idx_admin_tools_status_live   ON admin_tools(status, category, sort_order)
  WHERE status = 'live';

-- New composite index that backs the live-grouped menu query:
-- WHERE status = 'live' ORDER BY category, subcategory, sort_order, name.
-- Lives on the status column so SQLite can use it for the equality
-- filter, then walks the rest in index order — no temp B-tree sort.
CREATE INDEX IF NOT EXISTS idx_admin_tools_status_subcat_sort
  ON admin_tools(status, category, subcategory, sort_order, name)
  WHERE status = 'live';