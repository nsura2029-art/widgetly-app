#!/usr/bin/env node
/**
 * scripts/seed-admin-subcategory.mjs
 *
 * Backfill `subcategory` on every existing row of admin_tools by
 * walking the static catalog at src/lib/tools-subgroups.ts and
 * matching each entry by (category, slug). Idempotent — UPDATE
 * with the canonical value, so re-running is safe.
 *
 * Why a separate script (instead of inlining into seed-admin.mjs)?
 * The existing seed-admin.mjs is the source of truth for tool
 * metadata (slug, name, description, accent, etc.). After it runs,
 * every row exists but with subcategory='Other' (the migration
 * default). This script stamps the canonical subcategory without
 * disturbing anything else.
 *
 * Env vars: none.
 *
 * CLI flags (same as seed-admin.mjs):
 *   --local / --remote   target D1 (default: local).
 *   --env <name>         wrangler environment (stage / production).
 *
 * Usage:
 *   node scripts/seed-admin-subcategory.mjs --local
 *   node scripts/seed-admin-subcategory.mjs --remote --env stage
 *   node scripts/seed-admin-subcategory.mjs --remote --env production
 *
 * The script writes a single .sql file and passes it to
 * `wrangler d1 execute --file=` so we get one round-trip instead
 * of 100+ subprocess calls.
 *
 * Implementation: we shell out to `pnpm exec tsx` to import the
 * TypeScript module statically. That's cleaner than regex-parsing
 * the file (which breaks every time someone tweaks indentation).
 */
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

function parseTarget() {
  const cliFlag = process.argv.find((a) => a === "--remote" || a === "--local");
  if (cliFlag) return cliFlag.slice(2);
  return process.env.D1_BINDING ?? "local";
}
function parseEnv() {
  const i = process.argv.indexOf("--env");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env.SEED_ENV ?? "";
}

const D1_BINDING = parseTarget();
const SEED_ENV = parseEnv();

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Extract (category, subcategory, slug) triples by importing the TS
// module via tsx. We isolate it in a child process so the TS
// runtime doesn't leak into the parent — keeps this script
// dependency-light.
// ---------------------------------------------------------------------------

const projectRoot = process.cwd();
const subgroupsPath = join(projectRoot, "src/lib/tools-subgroups.ts");

// Two-step: write a tiny tsx loader that imports the source and
// prints JSON to stdout. Pass the absolute path to avoid cwd
// confusion in CI runners.
const extractScript = `
import { TOOLS_SUBGROUPS } from ${JSON.stringify(subgroupsPath)};
const out = [];
for (const [category, subgroups] of Object.entries(TOOLS_SUBGROUPS)) {
  for (const group of subgroups) {
    for (const item of group.items) {
      out.push({
        category,
        subcategory: group.title,
        slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        name: item.name,
      });
    }
  }
}
process.stdout.write(JSON.stringify(out));
`;

const extractTmp = join(projectRoot, `.tmp-extract-subgroups-${Date.now()}.mjs`);
await writeFile(extractTmp, extractScript, "utf8");

let rows;
try {
  const out = execSync(`pnpm exec tsx ${extractTmp}`, {
    encoding: "utf8",
    cwd: projectRoot,
  });
  rows = JSON.parse(out);
} catch (e) {
  // Re-run without suppressing stderr so the actual tsx error
  // (missing module, syntax error, etc.) is visible in CI logs.
  console.error("✗ Failed to extract (category, subcategory, slug) triples.");
  console.error("  Debug info: cwd=" + projectRoot + " tmp=" + extractTmp);
  console.error("  Re-running with full stderr:");
  try {
    execSync(`pnpm exec tsx ${extractTmp}`, {
      encoding: "utf8",
      cwd: projectRoot,
      stdio: "inherit",
    });
  } catch {
    // already printed the error
  }
  process.exit(1);
} finally {
  await unlink(extractTmp).catch(() => {});
}

if (!Array.isArray(rows) || rows.length === 0) {
  console.error("✗ No (category, subcategory, slug) rows extracted from tools-subgroups.ts.");
  process.exit(1);
}

// Category fallbacks — for any tool that's in DB but NOT in
// tools-subgroups.ts (e.g. an admin hand-added a tool not in the
// static catalog), we still want a sensible subcategory instead of
// leaving it at "Other". We default to the category's own name so
// the menu doesn't have an empty column.
const CATEGORY_NAME_FALLBACK = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  ai: "AI",
  calculators: "Calculators",
  converters: "Converters",
  seo: "SEO",
  developer: "Developer",
  business: "Business",
  education: "Education",
  writing: "Writing",
};

// ---------------------------------------------------------------------------
// Build SQL
// ---------------------------------------------------------------------------

const lines = [];
lines.push("-- Generated by scripts/seed-admin-subcategory.mjs");
lines.push("-- Idempotent: UPDATE admin_tools SET subcategory WHERE (slug, category) match.");
// D1 / wrangler does NOT accept SQL transaction control
// (BEGIN TRANSACTION / COMMIT). Each statement is applied
// individually and D1 handles atomicity per-statement. Safe for
// our use case — the UPDATE is the only mutation, and re-running
// is idempotent.

for (const r of rows) {
  lines.push(
    `UPDATE admin_tools SET subcategory = '${esc(r.subcategory)}' WHERE slug = '${esc(r.slug)}' AND category = '${esc(r.category)}';`
  );
}

// Catch-all: any tool still at 'Other' (or empty) gets its
// category's display name. This is the safety net for hand-added
// tools that the static catalog doesn't cover.
for (const [cat, fallback] of Object.entries(CATEGORY_NAME_FALLBACK)) {
  lines.push(
    `UPDATE admin_tools SET subcategory = '${esc(fallback)}' WHERE category = '${esc(cat)}' AND (subcategory = '' OR subcategory = 'Other');`
  );
}

const sqlPath = join(tmpdir(), `seed-admin-subcategory-${Date.now()}.sql`);
await writeFile(sqlPath, lines.join("\n") + "\n", "utf8");

console.log(
  `Backfilling subcategory on ${rows.length} static-catalog tools + catch-all per category...`
);

const target = D1_BINDING === "remote" ? "--remote" : "--local";
const dbName = SEED_ENV ? `widgetly-${SEED_ENV}` : "widgetly";
const envFlag = SEED_ENV ? `--env ${SEED_ENV}` : "";
const cmd = `pnpm exec wrangler d1 execute ${dbName} ${target} ${envFlag} --file=${sqlPath}`
  .trim()
  .replace(/\s+/g, " ");

console.log(`→ ${cmd}`);
try {
  execSync(cmd, { stdio: "inherit" });
  console.log(`✓ Subcategory backfill complete on ${D1_BINDING}${SEED_ENV ? ` (env=${SEED_ENV})` : ""}.`);
} catch (e) {
  console.error("✗ Wrangler d1 execute failed. See output above.");
  process.exitCode = 1;
} finally {
  await unlink(sqlPath).catch(() => {});
}