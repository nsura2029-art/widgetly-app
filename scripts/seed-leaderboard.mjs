#!/usr/bin/env node
/**
 * Seed the leaderboard with a handful of fictional creators + tools.
 *
 * Idempotent: uses INSERT OR IGNORE on the unique slugs/handles so it
 * can be run repeatedly without duplicating data. Safe to run on both
 * local Miniflare D1 and the remote production D1.
 *
 * Usage:
 *   pnpm db:seed:local     # Miniflare local D1
 *   pnpm db:seed:remote    # Production D1 (CLOUDFLARE_API_TOKEN required)
 *
 * Why we use INSERT statements (not INSERT ... SELECT ... UNION ALL):
 *   D1 / SQLite enforce a `SQLITE_MAX_COMPOUND_SELECT` cap on the
 *   number of SELECTs that can be UNION'd together in a single query.
 *   With 6 creators × ~5 tools each, a batched UNION ALL form tripped
 *   the limit on some statements (errored with "too many terms in
 *   compound SELECT"). Per-row INSERTs are slower in absolute terms
 *   but each statement is independent — a single bad row doesn't fail
 *   the whole batch, and there's no compound limit to worry about.
 */
import { execSync } from "node:child_process";

const isRemote = process.argv.includes("--remote");
const target = isRemote ? "--remote" : "--local";

/** Run one SQL statement via wrangler. Logs success / throws on error. */
function run(sql) {
  const cmd = `wrangler d1 execute widgetly ${target} --command=${JSON.stringify(sql)}`;
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err) {
    // Re-throw with the failing SQL prepended so logs make the culprit
    // obvious without needing to enable wrangler verbose mode.
    const snippet = sql.length > 120 ? sql.slice(0, 120) + "…" : sql;
    throw new Error(`SQL failed: ${snippet}\n${err.stderr?.toString() || err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Data: creators, contributions, badges
// ---------------------------------------------------------------------------

const CREATORS = [
  { handle: "seed-aria",  display_name: "Aria Sun",      avatar_seed: "aria-sun",      bio: "Privacy-first tools and image utilities." },
  { handle: "seed-mateo", display_name: "Mateo Reyes",   avatar_seed: "mateo-reyes",   bio: "Calculator nerd. Mortgage and finance specialist." },
  { handle: "seed-zara",  display_name: "Zara Patel",    avatar_seed: "zara-patel",    bio: "PDF and document workflow enthusiast." },
  { handle: "seed-jin",   display_name: "Jin Park",      avatar_seed: "jin-park",      bio: "AI tools, daily. Currently obsessed with summarization." },
  { handle: "seed-leo",   display_name: "Leo Andersen",  avatar_seed: "leo-andersen",  bio: "Video, audio, and file format everything." },
  { handle: "seed-nia",   display_name: "Nia Okafor",    avatar_seed: "nia-okafor",    bio: "Education + study tools. Beta tester in chief." },
];

// Each contribution has a tool_slug (unique key), name, category, description,
// and a `delayDays` offset from now — positive means "in the past", 0 = now.
// Backdating is applied via UPDATE statements after the INSERTs so each
// creator gets a realistic contribution timeline.
const CONTRIBUTIONS = [
  // Aria — 3 tools, all backdated 90 days so she's only in all-time.
  { handle: "seed-aria", slug: "aria-image-compress", name: "Image Compressor", category: "image", description: "Drop a photo, get a smaller one. Nothing leaves your browser.", delayDays: 90 },
  { handle: "seed-aria", slug: "aria-exif-strip",     name: "EXIF Stripper",     category: "image", description: "Remove GPS and camera metadata from JPEGs in one click.",       delayDays: 90 },
  { handle: "seed-aria", slug: "aria-bg-remover",     name: "Background Remover",category: "image", description: "Cut out the subject, keep the pixels that matter.",              delayDays: 90 },

  // Mateo — 4 calculators, mix of past + recent.
  { handle: "seed-mateo", slug: "mateo-mortgage",  name: "Mortgage Calculator",  category: "calculators", description: "Monthly payment + amortization schedule.", delayDays: 30 },
  { handle: "seed-mateo", slug: "mateo-loan-amort",name: "Loan Amortization",    category: "calculators", description: "See exactly where each payment goes.",     delayDays: 30 },
  { handle: "seed-mateo", slug: "mateo-bmi",       name: "BMI Calculator",       category: "calculators", description: "Body mass index + healthy range.",         delayDays: 22 },
  { handle: "seed-mateo", slug: "mateo-tip",       name: "Tip Calculator",       category: "calculators", description: "Split the bill without the awkward math.", delayDays: 15 },

  // Zara — 5 PDF tools, mid-range dates.
  { handle: "seed-zara", slug: "zara-pdf-merge",    name: "PDF Merger",    category: "pdf", description: "Combine PDFs without uploading them anywhere.", delayDays: 25 },
  { handle: "seed-zara", slug: "zara-pdf-split",    name: "PDF Splitter",  category: "pdf", description: "Pick the pages you want, get a new PDF.",     delayDays: 25 },
  { handle: "seed-zara", slug: "zara-pdf-compress", name: "PDF Compressor",category: "pdf", description: "Smaller file, same content.",                delayDays: 20 },
  { handle: "seed-zara", slug: "zara-pdf-to-word",  name: "PDF to Word",   category: "pdf", description: "Editable .docx from a PDF.",                 delayDays: 18 },
  { handle: "seed-zara", slug: "zara-pdf-rotate",   name: "PDF Rotator",   category: "pdf", description: "Rotate one page or all of them.",            delayDays: 10 },

  // Jin — 6 AI tools, recent burst (today + this week).
  { handle: "seed-jin", slug: "jin-summarize", name: "Text Summarizer",     category: "ai", description: "TL;DR for any document.",                       delayDays: 12 },
  { handle: "seed-jin", slug: "jin-rewrite",   name: "Tone Rewriter",       category: "ai", description: "Formal, casual, friendly — pick a vibe.",       delayDays: 6 },
  { handle: "seed-jin", slug: "jin-translate", name: "AI Translator",       category: "ai", description: "Context-aware translation with glossary support.", delayDays: 4 },
  { handle: "seed-jin", slug: "jin-keywords",  name: "Keyword Extractor",   category: "ai", description: "Pull the topics out of any text.",             delayDays: 2 },
  { handle: "seed-jin", slug: "jin-headline",  name: "Headline Analyzer",   category: "ai", description: "Score your headline for click-worthiness.",    delayDays: 0 },
  { handle: "seed-jin", slug: "jin-resume",    name: "AI Resume Builder",   category: "ai", description: "Tailored resume bullets from a job description.", delayDays: 8 },

  // Leo — 6 video/audio/convert tools, all backdated 60 days.
  { handle: "seed-leo", slug: "leo-video-compress",   name: "Video Compressor",       category: "video", description: "Smaller file, same playback.",                delayDays: 60 },
  { handle: "seed-leo", slug: "leo-video-trim",       name: "Video Trimmer",          category: "video", description: "Cut the dead air from the start and end.",    delayDays: 60 },
  { handle: "seed-leo", slug: "leo-video-to-gif",     name: "Video to GIF",           category: "video", description: "Pick the segment, get the loop.",             delayDays: 60 },
  { handle: "seed-leo", slug: "leo-audio-transcribe", name: "Audio Transcriber",      category: "video", description: "Speech to text with timestamps.",             delayDays: 60 },
  { handle: "seed-leo", slug: "leo-unit-convert",     name: "Unit Converter",         category: "converters", description: "Length, weight, temperature, time, and more.", delayDays: 60 },
  { handle: "seed-leo", slug: "leo-color-palette",    name: "Color Palette Generator",category: "converters", description: "Pull a palette from any image.",              delayDays: 60 },

  // Nia — 4 education/writing tools, very recent (she's the newest creator).
  { handle: "seed-nia", slug: "nia-flashcards",   name: "Flashcard Maker",      category: "education", description: "Spaced repetition, your way.",         delayDays: 3 },
  { handle: "seed-nia", slug: "nia-lesson-plan",  name: "Lesson Plan Generator",category: "education", description: "Outline, objectives, activities — done.", delayDays: 5 },
  { handle: "seed-nia", slug: "nia-gpa",          name: "GPA Calculator",       category: "education", description: "Weighted + unweighted, supports any scale.", delayDays: 2 },
  { handle: "seed-nia", slug: "nia-word-count",   name: "Word Counter",         category: "writing",  description: "Live count + reading time.",            delayDays: 0 },
];

// Badges awarded to creators based on their contribution patterns.
// `seed-nia` has joined_at = now-1 day, others default to now (so she's
// always the "featured" creator at the top of the page).
const BADGES = [
  // Every creator gets first-tool.
  ...CREATORS.map((c) => ({ handle: c.handle, badge: "first-tool" })),
  // Zara is a pioneer (early contributor).
  { handle: "seed-zara", badge: "pioneer" },
  // Jin is ranked #1 this week and this month.
  { handle: "seed-jin", badge: "top-week" },
  { handle: "seed-jin", badge: "top-month" },
];

// ---------------------------------------------------------------------------
// Apply the seed
// ---------------------------------------------------------------------------

console.log(`Seeding widgetly D1 (${target})...`);

// 1. Wipe existing seed data so re-runs are deterministic.
console.log("  → wiping previous seed data");
run("DELETE FROM badges WHERE user_id IN (SELECT id FROM users WHERE handle LIKE 'seed-%')");
run("DELETE FROM contributions WHERE user_id IN (SELECT id FROM users WHERE handle LIKE 'seed-%')");
run("DELETE FROM users WHERE handle LIKE 'seed-%'");

// 2. Insert creators.
console.log(`  → inserting ${CREATORS.length} creators`);
for (const c of CREATORS) {
  const sql =
    `INSERT OR IGNORE INTO users (handle, display_name, avatar_seed, bio) VALUES ` +
    `('${c.handle}', '${c.display_name.replace(/'/g, "''")}', '${c.avatar_seed}', '${c.bio.replace(/'/g, "''")}')`;
  run(sql);
}

// 3. Insert contributions one row at a time.
//    We use a temp user_id lookup via the unique handle — SQLite doesn't
//    support INSERT ... SELECT ... with a runtime param in wrangler's
//    --command mode, so the simplest approach is: insert, then UPDATE
//    contributed_at to backdate.
console.log(`  → inserting ${CONTRIBUTIONS.length} contributions`);
for (const c of CONTRIBUTIONS) {
  const sql =
    `INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description) ` +
    `SELECT id, '${c.slug}', '${c.name.replace(/'/g, "''")}', '${c.category}', ` +
    `'${c.description.replace(/'/g, "''")}' FROM users WHERE handle = '${c.handle}'`;
  run(sql);
}

// 4. Backdate each contribution to its `delayDays` offset from now.
console.log("  → backdating contributed_at");
for (const c of CONTRIBUTIONS) {
  const days = c.delayDays;
  const offset =
    days === 0
      ? "0 hours"
      : days < 1
        ? `${Math.round(days * 24)} hours`
        : `-${days} days`;
  const sql =
    `UPDATE contributions SET contributed_at = ` +
    `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '${offset}') ` +
    `WHERE tool_slug = '${c.slug}'`;
  run(sql);
}

// 5. Backdate Nia's joined_at to yesterday (she's the newest creator, so
//    she shows up as the "featured" creator at the top of the leaderboard).
console.log("  → backdating Nia's joined_at to yesterday");
run(
  "UPDATE users SET joined_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days') " +
    "WHERE handle = 'seed-nia'"
);

// 6. Award badges.
console.log(`  → awarding ${BADGES.length} badges`);
for (const b of BADGES) {
  const sql =
    `INSERT OR IGNORE INTO badges (user_id, badge) ` +
    `SELECT id, '${b.badge}' FROM users WHERE handle = '${b.handle}'`;
  run(sql);
}

console.log("Leaderboard seed complete.");