#!/usr/bin/env node
/**
 * scripts/seed-admin.mjs
 *
 * One-shot seed for the admin dashboard:
 *   1. Create the initial admin user from env vars.
 *   2. Migrate the static tool catalog into admin_tools with
 *      status='live' so the public-side D1 reader has data.
 *
 * Both are idempotent (INSERT OR IGNORE) so re-running is safe.
 *
 * Env vars:
 *   ADMIN_USERNAME       — required
 *   ADMIN_PASSWORD       — required (≥ 10 chars)
 *   ADMIN_DISPLAY_NAME   — optional
 *   ADMIN_EMAIL          — optional
 *
 * CLI flags:
 *   --local / --remote   target D1 (default: local). Cross-platform
 *                        (PowerShell-safe); preferred over the legacy
 *                        D1_BINDING env var.
 *   --env <name>         wrangler environment (default: none).
 *                        Use 'stage' to seed the widgetly-stage D1,
 *                        'production' to seed widgetly (the default).
 *                        When set, the D1 name becomes
 *                        `widgetly-<name>` and the wrangler command
 *                        adds `--env <name>`.
 *
 * Usage:
 *   pnpm seed:admin:local
 *   pnpm seed:admin:remote
 *   node scripts/seed-admin.mjs --remote --env stage
 *   ADMIN_PASSWORD=... node scripts/seed-admin.mjs --remote --env production
 *
 * Implementation note: we write a single .sql file and pass it to
 * `wrangler d1 execute --file=`. That avoids the per-row execSync
 * cost of the leaderboard seed (100+ tool rows × subprocess is
 * painful) while keeping wrangler as the single D1 client.
 */
import bcrypt from "bcryptjs";
import { readFile, writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

// Parse --remote / --local as a CLI flag (preferred on Windows /
// PowerShell where the `KEY=value command` idiom doesn't work) and
// fall back to the D1_BINDING env var for backwards compatibility.
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
const USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME ?? "Admin";
const EMAIL = process.env.ADMIN_EMAIL ?? null;

if (!PASSWORD || PASSWORD.length < 10) {
  console.error("✗ Set ADMIN_PASSWORD (≥ 10 chars) before running this script.");
  // Cross-platform examples: PowerShell needs `$env:VAR = "value"`, bash/zsh
  // accepts the `VAR=value command` form inline. Show both so either shell
  // can copy-paste the right one.
  console.error("");
  console.error("  PowerShell:  $env:ADMIN_PASSWORD = 'your-strong-password'; pnpm seed:admin:remote");
  console.error("  bash / zsh:  ADMIN_PASSWORD='your-strong-password' pnpm seed:admin:remote");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Catalog (mirrors TOOLS_CATEGORIES + TOOLS_SUBGROUPS structure)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { slug: "pdf", name: "PDF Tools", accent: "primary" },
  { slug: "image", name: "Image Tools", accent: "secondary" },
  { slug: "video", name: "Video Tools", accent: "accent" },
  { slug: "ai", name: "AI Tools", accent: "primary" },
  { slug: "calculators", name: "Calculators", accent: "secondary" },
  { slug: "converters", name: "Converters", accent: "accent" },
  { slug: "seo", name: "SEO Tools", accent: "primary" },
  { slug: "developer", name: "Developer", accent: "secondary" },
  { slug: "business", name: "Business", accent: "accent" },
  { slug: "education", name: "Education", accent: "primary" },
  { slug: "writing", name: "Writing", accent: "secondary" },
];

const TOOLS = {
  pdf: [
    "merge-pdf",
    "split-pdf",
    "compress-pdf",
    "pdf-to-word",
    "pdf-to-excel",
    "word-to-pdf",
    "excel-to-pdf",
    "pdf-to-jpg",
    "jpg-to-pdf",
    "rotate-pdf",
    "protect-pdf",
    "unlock-pdf",
    "sign-pdf",
    "edit-pdf",
    "ocr-pdf",
  ],
  image: [
    "image-compressor",
    "image-resizer",
    "image-converter",
    "image-cropper",
    "image-rotator",
    "image-watermark",
    "image-color-picker",
    "meme-generator",
    "qr-code-generator",
    "barcode-generator",
  ],
  video: ["video-compressor", "video-converter", "video-trimmer", "video-merger", "gif-maker"],
  ai: [
    "ai-resume-builder",
    "ai-email-writer",
    "ai-text-summarizer",
    "ai-paraphraser",
    "ai-grammar-checker",
    "ai-image-generator",
    "ai-voice-generator",
  ],
  calculators: [
    "percentage-calculator",
    "bmi-calculator",
    "mortgage-calculator",
    "loan-calculator",
    "tip-calculator",
    "age-calculator",
    "calorie-calculator",
    "compound-interest-calculator",
    "gpa-calculator",
    "scientific-calculator",
  ],
  converters: [
    "unit-converter",
    "currency-converter",
    "length-converter",
    "weight-converter",
    "temperature-converter",
    "time-zone-converter",
    "color-converter",
  ],
  seo: [
    "meta-tag-generator",
    "og-preview",
    "robots-txt-generator",
    "sitemap-generator",
    "keyword-density-checker",
    "word-counter",
    "case-converter",
  ],
  developer: [
    "json-formatter",
    "json-validator",
    "base64-encoder",
    "url-encoder",
    "regex-tester",
    "diff-checker",
    "uuid-generator",
    "password-generator",
    "hash-generator",
    "jwt-decoder",
  ],
  business: [
    "invoice-generator",
    "receipt-generator",
    "salary-calculator",
    "tax-calculator",
    "vat-calculator",
    "break-even-calculator",
  ],
  education: [
    "flashcard-generator",
    "lesson-plan-generator",
    "rubric-generator",
    "study-timer",
    "citation-generator",
    "word-unscrambler",
  ],
  writing: [
    "essay-typer",
    "paraphraser",
    "plagiarism-checker",
    "readability-checker",
    "tone-checker",
    "headline-generator",
  ],
};

const totalTools = Object.values(TOOLS).reduce((n, arr) => n + arr.length, 0);

// ---------------------------------------------------------------------------
// Build SQL
// ---------------------------------------------------------------------------

function humanize(slug) {
  return slug
    .split("-")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
}

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}

const passwordHash = await bcrypt.hash(PASSWORD, 12);
const now = new Date().toISOString();

const catIndex = new Map(CATEGORIES.map((c) => [c.slug, c]));

const lines = [];
lines.push("-- Generated by scripts/seed-admin.mjs");
lines.push("-- Idempotent (INSERT OR IGNORE). Safe to re-run.");

lines.push(
  `INSERT OR IGNORE INTO admin_users
     (username, password_hash, display_name, email, is_active, must_change_password, created_at, updated_at)
   VALUES ('${esc(USERNAME)}', '${esc(passwordHash)}', '${esc(DISPLAY_NAME)}', ${
     EMAIL ? `'${esc(EMAIL)}'` : "NULL"
   }, 1, 1, '${now}', '${now}');`
);

for (const [category, slugs] of Object.entries(TOOLS)) {
  const cat = catIndex.get(category);
  for (const slug of slugs) {
    const name = humanize(slug);
    const desc = `Free online ${cat?.name ?? category} tool.`;
    const longDesc = `Run ${name.toLowerCase()} in your browser — no sign-up, no install, no watermark. ${desc}`;
    lines.push(
      `INSERT OR IGNORE INTO admin_tools
         (slug, category, name, description, long_description, api_endpoint,
          pricing_tier, icon_url, accent_color, sort_order, status, notes, live_at,
          created_at, updated_at)
       VALUES ('${esc(slug)}','${esc(category)}','${esc(name)}','${esc(desc)}',
         '${esc(longDesc)}','/api/tools/${esc(category)}/${esc(slug)}','free',
         NULL, '${esc(cat?.accent ?? "primary")}', 100, 'live',
         'Seeded from static catalog', '${now}', '${now}', '${now}');`
    );
  }
}

const sqlPath = join(tmpdir(), `seed-admin-${Date.now()}.sql`);
await writeFile(sqlPath, lines.join("\n") + "\n", "utf8");

console.log(`Seeding admin user "${USERNAME}" (bcrypt cost 12)…`);
console.log(`Seeding ${totalTools} tools into admin_tools (status='live')…`);

const target = D1_BINDING === "remote" ? "--remote" : "--local";
// When --env <name> is passed, the D1 is widgetly-<name> and we need
// to pass --env <name> to wrangler so the right [env.<name>] block
// in wrangler.toml is selected. When --env is not passed we target
// the default D1 (widgetly) without an --env flag (no top-level D1
// binding exists in wrangler.toml — only [env.production] and
// [env.stage] blocks do).
const dbName = SEED_ENV ? `widgetly-${SEED_ENV}` : "widgetly";
const envFlag = SEED_ENV ? `--env ${SEED_ENV}` : "";
const cmd = `pnpm exec wrangler d1 execute ${dbName} ${target} ${envFlag} --file=${sqlPath}`.trim().replace(/\s+/g, " ");

console.log(`→ ${cmd}`);
try {
  execSync(cmd, { stdio: "inherit" });
  const targetUrl = SEED_ENV === "stage" ? "https://beta.widgetly.tech" : "https://widgetly.tech";
  console.log(`✓ Seed complete. Sign in at ${targetUrl}/admin/sign-in with username="${USERNAME}".`);
} catch (e) {
  console.error("✗ Wrangler d1 execute failed. See output above.");
  process.exitCode = 1;
} finally {
  await unlink(sqlPath).catch(() => {});
}
