#!/usr/bin/env node
/**
 * Translate src/i18n/messages/en.json into the other 23 locales.
 *
 * Uses a public LibreTranslate instance (libretranslate.com) which
 * accepts anonymous traffic. If the primary is down, the script
 * tries a few fallbacks. The translation quality is "good enough
 * for MVP" — fine for marketing copy, not for legal/medical text.
 * Always review the output before shipping.
 *
 * Usage:
 *   node scripts/translate-messages.mjs               # all 23 locales
 *   node scripts/translate-messages.mjs --locales=es,fr,de  # subset
 *   node scripts/translate-messages.mjs --dry-run     # preview only
 *   node scripts/translate-messages.mjs --delay=1500  # ms between calls
 *
 * The script preserves JSON key order and only translates string
 * VALUES (not keys). It writes the result to src/i18n/messages/<locale>.json.
 *
 * Rate limiting / failures:
 *   - Default 1.2s delay between API calls (per LibreTranslate's
 *     soft rate limit on the public instance).
 *   - On 429/5xx, backs off exponentially up to 30s, then skips
 *     that string (leaves it as English fallback).
 *   - 3 retries per string before giving up.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MSG_DIR = join(__dirname, "..", "src", "i18n", "messages");

// Public LibreTranslate instances, in order of preference. The first
// to respond wins; others are fallbacks. These are free public
// services that may rate-limit, so we batch + back off.
const ENDPOINTS = [
  "https://translate.fedilab.app",
  "https://lt.blitzw.in",
  "https://libretranslate.com",
  "https://translate.terraprint.co",
];

const DEFAULT_LOCALE = "en";
const ALL_LOCALES = [
  "id", "ms", "da", "de", "es", "fr", "it", "nl", "no",
  "pl", "pt", "sv", "vi", "tr", "ru", "uk", "ar", "hi",
  "th", "ko", "ja", "zh-CN", "zh-TW",
];

function arg(name, fallback) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : fallback;
}
const onlyLocales = arg("locales", ALL_LOCALES.join(",")).split(",").filter(Boolean);
const dryRun = process.argv.includes("--dry-run");
const baseDelayMs = Number(arg("delay", "1200"));

// Translate a single string. Retries with backoff on transient errors.
async function translate(text, sourceLang, targetLang, attempt = 1) {
  if (!text || !text.trim()) return text;
  if (sourceLang === targetLang) return text;

  let lastErr = null;
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep + "/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`${ep} returned ${res.status}`);
        continue; // try next endpoint
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${ep} returned ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json();
      return json.translatedText ?? text;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  if (attempt < 3) {
    const wait = Math.min(2000 * 2 ** attempt, 30000);
    console.warn(`  ! ${targetLang}: "${text.slice(0, 40)}…" failed (${lastErr?.message}); retrying in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return translate(text, sourceLang, targetLang, attempt + 1);
  }
  console.warn(`  ! ${targetLang}: giving up on "${text.slice(0, 40)}…", keeping English`);
  return text;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Walk the source object, collecting {path, value} pairs for every
// string leaf. Preserves the path so we can reconstruct the object
// in the same shape.
function flattenStrings(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      out.push({ path, value: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenStrings(v, path));
    }
  }
  return out;
}

// Set a value at a dotted path inside an object, creating intermediate
// objects as needed. Returns a new object (doesn't mutate).
function setPath(obj, path, value) {
  const keys = path.split(".");
  const root = Array.isArray(obj) ? [...obj] : { ...obj };
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = cur[k] && typeof cur[k] === "object" ? { ...cur[k] } : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}

async function translateLocale(targetLocale) {
  console.log(`\n→ ${targetLocale}`);
  const src = JSON.parse(readFileSync(join(MSG_DIR, `${DEFAULT_LOCALE}.json`), "utf8"));
  const flat = flattenStrings(src);
  console.log(`  ${flat.length} strings to translate`);

  // Start from the existing locale file so we can resume after a partial run
  let out = {};
  try {
    out = JSON.parse(readFileSync(join(MSG_DIR, `${targetLocale}.json`), "utf8"));
  } catch {}

  let translated = 0;
  let skipped = 0;
  const start = Date.now();

  for (let i = 0; i < flat.length; i++) {
    const { path, value } = flat[i];

    // Skip if the value is already a non-default translation
    // (i.e. doesn't equal the English source). This makes the
    // script idempotent and resumable.
    const existing = path.split(".").reduce((o, k) => (o ? o[k] : undefined), out);
    if (typeof existing === "string" && existing !== value) {
      skipped++;
      continue;
    }

    const translatedStr = await translate(value, DEFAULT_LOCALE, targetLocale);
    out = setPath(out, path, translatedStr);
    translated++;

    // Save progress every 20 strings so a crash doesn't lose work
    if (translated % 20 === 0) {
      if (!dryRun) {
        writeFileSync(join(MSG_DIR, `${targetLocale}.json`), JSON.stringify(out, null, 2) + "\n");
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ${translated}/${flat.length} (${skipped} skipped, ${elapsed}s)`);
    }

    await sleep(baseDelayMs);
  }

  // Final save
  if (!dryRun) {
    writeFileSync(join(MSG_DIR, `${targetLocale}.json`), JSON.stringify(out, null, 2) + "\n");
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ✓ ${targetLocale} done: ${translated} translated, ${skipped} skipped, ${elapsed}s`);
}

async function main() {
  const en = JSON.parse(readFileSync(join(MSG_DIR, `${DEFAULT_LOCALE}.json`), "utf8"));
  const total = flattenStrings(en).length;
  console.log(`en.json: ${total} strings to translate across ${onlyLocales.length} locales`);
  console.log(`Delay: ${baseDelayMs}ms per call; ${dryRun ? "DRY RUN" : "writing files"}`);

  for (const loc of onlyLocales) {
    try {
      await translateLocale(loc);
    } catch (err) {
      console.error(`  ! ${loc} failed catastrophically:`, err);
    }
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
