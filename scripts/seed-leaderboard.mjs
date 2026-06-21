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
 */
import { execSync } from "node:child_process";

const isRemote = process.argv.includes("--remote");
const target = isRemote ? "--remote" : "--local";

// Run against the bound `widgetly` DB name (matches wrangler.toml).
const cmd = (sql) => `wrangler d1 execute widgetly ${target} --command=${JSON.stringify(sql)}`;

const STMT = [
  // Wipe existing seed data so we have a deterministic starting point.
  // (Won't touch production data the user has added — these handles are
  // fictional and uniquely tagged.)
  "DELETE FROM badges WHERE user_id IN (SELECT id FROM users WHERE handle LIKE 'seed-%')",
  "DELETE FROM contributions WHERE user_id IN (SELECT id FROM users WHERE handle LIKE 'seed-%')",
  "DELETE FROM users WHERE handle LIKE 'seed-%'",

  // Creators (5 fictional ones with varied stats).
  "INSERT OR IGNORE INTO users (handle, display_name, avatar_seed, bio) VALUES " +
    "('seed-aria', 'Aria Sun', 'aria-sun', 'Privacy-first tools and image utilities.'), " +
    "('seed-mateo', 'Mateo Reyes', 'mateo-reyes', 'Calculator nerd. Mortgage and finance specialist.'), " +
    "('seed-zara', 'Zara Patel', 'zara-patel', 'PDF and document workflow enthusiast.'), " +
    "('seed-jin', 'Jin Park', 'jin-park', 'AI tools, daily. Currently obsessed with summarization.'), " +
    "('seed-leo', 'Leo Andersen', 'leo-andersen', 'Video, audio, and file format everything.'), " +
    "('seed-nia', 'Nia Okafor', 'nia-okafor', 'Education + study tools. Beta tester in chief.')",

  // Aria — 8 contributions, spread across months.
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'aria-image-compress', 'Image Compressor', 'image', 'Drop a photo, get a smaller one. Nothing leaves your browser.', contributed_at FROM users WHERE handle='seed-aria' UNION ALL " +
    "SELECT id, 'aria-exif-strip', 'EXIF Stripper', 'image', 'Remove GPS and camera metadata from JPEGs in one click.', contributed_at FROM users WHERE handle='seed-aria' UNION ALL " +
    "SELECT id, 'aria-bg-remover', 'Background Remover', 'image', 'Cut out the subject, keep the pixels that matter.', contributed_at FROM users WHERE handle='seed-aria'",

  // Mateo — calculators (recent + historical).
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'mateo-mortgage', 'Mortgage Calculator', 'calculators', 'Monthly payment + amortization schedule.', contributed_at FROM users WHERE handle='seed-mateo' UNION ALL " +
    "SELECT id, 'mateo-loan-amort', 'Loan Amortization', 'calculators', 'See exactly where each payment goes.', contributed_at FROM users WHERE handle='seed-mateo' UNION ALL " +
    "SELECT id, 'mateo-bmi', 'BMI Calculator', 'calculators', 'Body mass index + healthy range.', contributed_at FROM users WHERE handle='seed-mateo' UNION ALL " +
    "SELECT id, 'mateo-tip', 'Tip Calculator', 'calculators', 'Split the bill without the awkward math.', contributed_at FROM users WHERE handle='seed-mateo'",

  // Zara — PDF tools.
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'zara-pdf-merge', 'PDF Merger', 'pdf', 'Combine PDFs without uploading them anywhere.', contributed_at FROM users WHERE handle='seed-zara' UNION ALL " +
    "SELECT id, 'zara-pdf-split', 'PDF Splitter', 'pdf', 'Pick the pages you want, get a new PDF.', contributed_at FROM users WHERE handle='seed-zara' UNION ALL " +
    "SELECT id, 'zara-pdf-compress', 'PDF Compressor', 'pdf', 'Smaller file, same content.', contributed_at FROM users WHERE handle='seed-zara' UNION ALL " +
    "SELECT id, 'zara-pdf-to-word', 'PDF to Word', 'pdf', 'Editable .docx from a PDF.', contributed_at FROM users WHERE handle='seed-zara' UNION ALL " +
    "SELECT id, 'zara-pdf-rotate', 'PDF Rotator', 'pdf', 'Rotate one page or all of them.', contributed_at FROM users WHERE handle='seed-zara'",

  // Jin — AI tools, lots of recent activity.
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'jin-summarize', 'Text Summarizer', 'ai', 'TL;DR for any document.', contributed_at FROM users WHERE handle='seed-jin' UNION ALL " +
    "SELECT id, 'jin-rewrite', 'Tone Rewriter', 'ai', 'Formal, casual, friendly — pick a vibe.', contributed_at FROM users WHERE handle='seed-jin' UNION ALL " +
    "SELECT id, 'jin-translate', 'AI Translator', 'ai', 'Context-aware translation with glossary support.', contributed_at FROM users WHERE handle='seed-jin' UNION ALL " +
    "SELECT id, 'jin-keywords', 'Keyword Extractor', 'ai', 'Pull the topics out of any text.', contributed_at FROM users WHERE handle='seed-jin' UNION ALL " +
    "SELECT id, 'jin-headline', 'Headline Analyzer', 'ai', 'Score your headline for click-worthiness.', contributed_at FROM users WHERE handle='seed-jin' UNION ALL " +
    "SELECT id, 'jin-resume', 'AI Resume Builder', 'ai', 'Tailored resume bullets from a job description.', contributed_at FROM users WHERE handle='seed-jin'",

  // Leo — video/audio/convert.
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'leo-video-compress', 'Video Compressor', 'video', 'Smaller file, same playback.', contributed_at FROM users WHERE handle='seed-leo' UNION ALL " +
    "SELECT id, 'leo-video-trim', 'Video Trimmer', 'video', 'Cut the dead air from the start and end.', contributed_at FROM users WHERE handle='seed-leo' UNION ALL " +
    "SELECT id, 'leo-video-to-gif', 'Video to GIF', 'video', 'Pick the segment, get the loop.', contributed_at FROM users WHERE handle='seed-leo' UNION ALL " +
    "SELECT id, 'leo-audio-transcribe', 'Audio Transcriber', 'video', 'Speech to text with timestamps.', contributed_at FROM users WHERE handle='seed-leo' UNION ALL " +
    "SELECT id, 'leo-unit-convert', 'Unit Converter', 'converters', 'Length, weight, temperature, time, and more.', contributed_at FROM users WHERE handle='seed-leo' UNION ALL " +
    "SELECT id, 'leo-color-palette', 'Color Palette Generator', 'converters', 'Pull a palette from any image.', contributed_at FROM users WHERE handle='seed-leo'",

  // Nia — education/writing (newest creator).
  "INSERT OR IGNORE INTO contributions (user_id, tool_slug, tool_name, category, description, contributed_at) " +
    "SELECT id, 'nia-flashcards', 'Flashcard Maker', 'education', 'Spaced repetition, your way.', contributed_at FROM users WHERE handle='seed-nia' UNION ALL " +
    "SELECT id, 'nia-lesson-plan', 'Lesson Plan Generator', 'education', 'Outline, objectives, activities — done.', contributed_at FROM users WHERE handle='seed-nia' UNION ALL " +
    "SELECT id, 'nia-gpa', 'GPA Calculator', 'education', 'Weighted + unweighted, supports any scale.', contributed_at FROM users WHERE handle='seed-nia' UNION ALL " +
    "SELECT id, 'nia-word-count', 'Word Counter', 'writing', 'Live count + reading time.', contributed_at FROM users WHERE handle='seed-nia'",

  // Backdate some contributions so time-window filtering has signal.
  // Jin's recent burst (today + this week).
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hours') WHERE tool_slug='jin-headline'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days') WHERE tool_slug='jin-keywords'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days') WHERE tool_slug='jin-translate'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days') WHERE tool_slug='jin-rewrite'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days') WHERE tool_slug='jin-summarize'",
  // Mateo backdated (this month, outside week).
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days') WHERE tool_slug='mateo-tip'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-22 days') WHERE tool_slug='mateo-bmi'",
  // Zara backdated further (this month but not recent).
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days') WHERE tool_slug='zara-pdf-rotate'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days') WHERE tool_slug='zara-pdf-to-word'",
  // Aria and Leo backdated well into the past (so they only show in all-time).
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days') WHERE user_id IN (SELECT id FROM users WHERE handle='seed-aria')",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 days') WHERE user_id IN (SELECT id FROM users WHERE handle='seed-leo')",
  // Nia is the newest creator (joined yesterday).
  "UPDATE users SET joined_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 days') WHERE handle='seed-nia'",
  // Nia's recent contributions (this week + today).
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 hours') WHERE tool_slug='nia-word-count'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days') WHERE tool_slug='nia-gpa'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days') WHERE tool_slug='nia-lesson-plan'",
  "UPDATE contributions SET contributed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days') WHERE tool_slug='nia-flashcards'",

  // Award badges based on the contribution patterns we just seeded.
  // INSERT OR IGNORE so re-running the seed is a no-op.
  "INSERT OR IGNORE INTO badges (user_id, badge) SELECT id, 'first-tool' FROM users WHERE handle LIKE 'seed-%'",
  "INSERT OR IGNORE INTO badges (user_id, badge) SELECT id, 'pioneer' FROM users WHERE handle='seed-zara'",
  // Jin is top-week + top-month (6 contributions in the last 30 days).
  "INSERT OR IGNORE INTO badges (user_id, badge) SELECT id, 'top-week' FROM users WHERE handle='seed-jin'",
  "INSERT OR IGNORE INTO badges (user_id, badge) SELECT id, 'top-month' FROM users WHERE handle='seed-jin'",
  // Mateo has tools in 1 category, Jin in 1 — none get polyglot.
  // Nia has 4 contributions in <30 days but only 1 category.
];

for (const sql of STMT) {
  try {
    execSync(cmd(sql), { stdio: "inherit" });
  } catch (err) {
    console.error(`Failed: ${sql.split("\n")[0].slice(0, 80)}…`);
    throw err;
  }
}

console.log("Leaderboard seed complete.");
