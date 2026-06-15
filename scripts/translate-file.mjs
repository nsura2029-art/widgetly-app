#!/usr/bin/env node
/**
 * File-based translation workflow.
 *
 * Why this exists:
 *   Some translators (DeepL web UI at deepl.com/translator, Google
 *   Translate web UI, ChatGPT paste-the-text, even a human translator)
 *   don't expose a programmatic API. They accept a text file in,
 *   give you a text file out. This script bridges that workflow
 *   to the per-locale JSON files in src/i18n/messages/.
 *
 * Two modes:
 *
 *   EXPORT
 *     Reads src/i18n/messages/en.json, flattens to one string per
 *     leaf, assigns each a stable integer ID, and writes per
 *     target-locale files:
 *       tmp/translate/<locale>.txt        — DeepL-acceptable input
 *       tmp/translate/<locale>.ids.json   — ID -> { path, tags } mapping
 *       tmp/translate/en.json             — copy of source for reference
 *
 *   IMPORT
 *     Reads the translated <locale>.txt (after the user has run it
 *     through the translator of choice) and merges the translations
 *     into src/i18n/messages/<locale>.json, preserving the original
 *     key order and any strings that weren't in the export.
 *
 * FILE FORMAT (tab-separated, no comments):
 *
 *   <id>\t<text with placeholders wrapped in <xN>name</xN> tags>
 *   <id>\t<text...>
 *   ...
 *
 * Why this shape:
 *   - The <id> is a sequential integer; DeepL preserves leading
 *     digits (it doesn't try to translate "1" as a word).
 *   - The tab separator is preserved by every major translator
 *     (DeepL, Google, ChatGPT) when you select "preserve formatting".
 *   - No comment lines, no header — DeepL would translate them.
 *   - ICU {varName} placeholders are wrapped as <xN>varName</xN> so
 *     DeepL doesn't try to translate the inner word. The import
 *     script unwraps them back to {varName}.
 *
 * USAGE
 *
 *   # 1. Export for the three locales you want.
 *   node scripts/translate-file.mjs export --locales=es,pt,fr --out=tmp/translate
 *
 *   # 2. Upload each tmp/translate/<locale>.txt to DeepL web UI,
 *   #    Google Translate, or paste into ChatGPT. Download the
 *   #    translated file back to the same path.
 *   #    (DeepL: "Translate files" -> upload .txt -> download .txt.
 *   #     Make sure the source/target language pair is correct.)
 *
 *   # 3. Import the translations back.
 *   node scripts/translate-file.mjs import --dir=tmp/translate
 *   # or, for a single locale:
 *   node scripts/translate-file.mjs import --dir=tmp/translate --locale=es
 *
 *   # 4. Clean up.
 *   rm -rf tmp/translate
 *
 * PARTIAL / RESUMABLE:
 *   The import skips a string if the existing locale file already
 *   has a value different from the English source. So you can
 *   import one locale at a time, or skip locales you don't want
 *   to update.
 *
 * MODES:
 *   --mode=full    Export every leaf string (default).
 *   --mode=missing Export only the strings still equal to English
 *                  in the target locale. Useful for incremental
 *                  updates to a partially-translated locale (e.g.
 *                  id.json has 66 LibreTranslate strings, use
 *                  --mode=missing to export only the 130 that are
 *                  still English).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MSG_DIR = join(__dirname, "..", "src", "i18n", "messages");

const ALL_LOCALES = ["es", "fr"];

// --- CLI parsing ---

function arg(name, fallback) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=").slice(1).join("=") : fallback;  // values can contain "="
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}
const verbose = flag("verbose") || flag("v");
function getMode() {
  const m = arg("mode", "full");
  if (m !== "full" && m !== "missing") {
    console.error(`Unknown --mode=${m}. Valid: full, missing`);
    process.exit(1);
  }
  return m;
}
const cmd = process.argv[2];
if (cmd !== "export" && cmd !== "import") {
  console.error("Usage:");
  console.error("  node scripts/translate-file.mjs export  --locales=es,pt,fr --out=tmp/translate [--mode=full|missing]");
  console.error("  node scripts/translate-file.mjs import  --dir=tmp/translate [--locale=es] [--dry-run]");
  process.exit(1);
}

// --- Shared helpers ---

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

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

// --- ICU placeholder handling (same approach as the API script) ---

// {varName} -> <x1>varName</x1>
function icuToXmlTags(text, counter = { i: 0 }) {
  const tags = [];
  const out = text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
    counter.i += 1;
    const tag = `x${counter.i}`;
    tags.push({ tag, name });
    return `<${tag}>${name}</${tag}>`;
  });
  return { out, tags };
}

// <x1>varName</x1> -> {varName}
function xmlTagsToIcu(text, tags) {
  let out = text;
  for (const { tag, name } of tags) {
    const re = new RegExp(`<${tag}>(.*?)</${tag}>`, "g");
    out = out.replace(re, `{$1}`);
  }
  return out;
}

// --- EXPORT ---

function exportLocale(targetLocale, outDir, mode) {
  const src = JSON.parse(readFileSync(join(MSG_DIR, "en.json"), "utf8"));
  const flat = flattenStrings(src);

  // If --mode=missing, filter out paths that already have a non-English
  // translation in the target locale.
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(join(MSG_DIR, `${targetLocale}.json`), "utf8"));
  } catch {}
  const todo = mode === "missing"
    ? flat.filter(({ path, value }) => {
        const v = getPath(existing, path);
        return v === undefined || v === value;  // not translated yet
      })
    : flat;

  // Assign sequential integer IDs (1, 2, 3, ...) and pre-process
  // each value to wrap {placeholders} in <xN> tags.
  const lines = [];
  const ids = {};
  todo.forEach(({ path, value }, i) => {
    const id = String(i + 1);
    const { out: wireValue, tags } = icuToXmlTags(value);
    lines.push(`${id}\t${wireValue}`);
    ids[id] = { path, tags };
  });

  writeFileSync(join(outDir, `${targetLocale}.txt`), lines.join("\n") + "\n");
  writeFileSync(
    join(outDir, `${targetLocale}.ids.json`),
    JSON.stringify(ids, null, 2) + "\n"
  );

  return { total: flat.length, exported: todo.length, skipped: flat.length - todo.length };
}

async function cmdExport() {
  const outDir = arg("out", "tmp/translate");
  const onlyLocales = arg("locales", ALL_LOCALES.join(",")).split(",").filter(Boolean);
  const mode = getMode();

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  // Always copy the source for reference.
  writeFileSync(
    join(outDir, "en.json"),
    readFileSync(join(MSG_DIR, "en.json"), "utf8")
  );

  console.log(`Exporting to ${outDir}/ (mode=${mode})\n`);
  let totalExported = 0;
  for (const loc of onlyLocales) {
    const { total, exported, skipped } = exportLocale(loc, outDir, mode);
    console.log(
      `  ${loc.padEnd(8)}  ${String(exported).padStart(3)} exported` +
      (mode === "missing" ? `, ${String(skipped).padStart(3)} already translated (skipped)` : "") +
      `  (of ${total} total)`
    );
    totalExported += exported;
  }
  console.log(`\nDone. ${totalExported} strings across ${onlyLocales.length} locales in ${outDir}/`);
  console.log(`\nNext steps:`);
  console.log(`  1. Upload each ${outDir}/<locale>.txt to deepl.com/translator (or any other tool).`);
  console.log(`  2. Download the translated file back to the same path.`);
  console.log(`  3. Run: node scripts/translate-file.mjs import --dir=${outDir}`);
}

// --- IMPORT ---

function importLocale(targetLocale, dir, dryRun) {
  const txtPath = join(dir, `${targetLocale}.txt`);
  const idsPath = join(dir, `${targetLocale}.ids.json`);
  if (!existsSync(txtPath) || !existsSync(idsPath)) {
    return { ok: false, reason: "missing files", translated: 0, skipped: 0 };
  }
  const ids = JSON.parse(readFileSync(idsPath, "utf8"));
  const txt = readFileSync(txtPath, "utf8");

  let existing = {};
  try {
    existing = JSON.parse(readFileSync(join(MSG_DIR, `${targetLocale}.json`), "utf8"));
  } catch {
    existing = {};  // start from scratch if file doesn't exist
  }
  const src = JSON.parse(readFileSync(join(MSG_DIR, "en.json"), "utf8"));

  let translated = 0;
  let skipped = 0;
  let corrupted = 0;
  const placeholdersMissing = [];

  for (const line of txt.split("\n")) {
    if (!line.trim()) continue;
    const tabIdx = line.indexOf("\t");
    if (tabIdx < 0) {
      // No tab — malformed line, skip silently.
      continue;
    }
    const id = line.slice(0, tabIdx);
    let value = line.slice(tabIdx + 1);

    const meta = ids[id];
    if (!meta) {
      // Unknown ID — translator may have added/changed IDs. Skip.
      continue;
    }

    // Unwrap {placeholders} (was <xN>name</xN> in the wire form).
    if (meta.tags?.length) {
      const before = value;
      value = xmlTagsToIcu(value, meta.tags);
      if (value !== before && !value.includes("{")) {
        corrupted++;
        placeholdersMissing.push({ id, path: meta.path, before, after: value });
      }
    }

    // Resumability: skip if the existing value already differs from
    // the English source (i.e., already has a non-default translation).
    const englishValue = getPath(src, meta.path);
    const currentValue = getPath(existing, meta.path);
    if (typeof currentValue === "string" &&
        currentValue !== englishValue &&
        currentValue !== value) {
      skipped++;
      continue;
    }

    // Skip if the translation is the same as the English source
    // (translator gave up or the string had no translatable content).
    if (value === englishValue) {
      skipped++;
      continue;
    }

    existing = setPath(existing, meta.path, value);
    translated++;
  }

  if (!dryRun) {
    const outPath = join(MSG_DIR, `${targetLocale}.json`);
    const outContent = JSON.stringify(existing, null, 2) + "\n";
    writeFileSync(outPath, outContent);
    if (verbose) {
      const s = statSync(outPath);
      console.error(
        `        [verbose] wrote ${outContent.length} bytes to ${outPath} ` +
        `(mtime=${s.mtime.toISOString()})`
      );
    }
  }
  return { ok: true, translated, skipped, corrupted, placeholdersMissing };
}

async function cmdImport() {
  const dir = arg("dir", "tmp/translate");
  const onlyLocale = arg("locale", null);
  const dryRun = flag("dry-run");

  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    console.error(`Run 'export' first to generate the files.`);
    process.exit(1);
  }

  // Find all <locale>.txt files in the dir.
  const fs = await import("node:fs/promises");
  const entries = await fs.readdir(dir);
  const locales = entries
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(/\.txt$/, ""))
    .filter((loc) => !onlyLocale || onlyLocale === loc);

  if (locales.length === 0) {
    console.error(`No <locale>.txt files found in ${dir}/`);
    process.exit(1);
  }

  console.log(`Importing from ${dir}/ (${dryRun ? "DRY RUN" : "writing files"})\n`);
  let totalTranslated = 0;
  let totalCorrupted = 0;
  for (const loc of locales) {
    const result = importLocale(loc, dir, dryRun);
    if (!result.ok) {
      console.log(`  ${loc.padEnd(8)}  SKIPPED (${result.reason})`);
      continue;
    }
    const flag = result.corrupted > 0 ? "  ⚠ " : "  ✓ ";
    console.log(
      `  ${loc.padEnd(8)}${flag}${String(result.translated).padStart(3)} imported, ` +
      `${String(result.skipped).padStart(3)} skipped, ` +
      `${String(result.corrupted).padStart(3)} placeholder warnings`
    );
    if (result.placeholdersMissing?.length) {
      for (const m of result.placeholdersMissing) {
        console.log(`        ${m.path}: placeholders may be missing in "${m.after.slice(0, 60)}..."`);
      }
    }
    totalTranslated += result.translated;
    totalCorrupted += result.corrupted;
  }
  console.log(
    `\n${dryRun ? "Dry run complete" : "Done"}. ` +
    `${totalTranslated} strings imported, ${totalCorrupted} placeholder warnings.`
  );
}

// --- Run ---

const main = cmd === "export" ? cmdExport : cmdImport;
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
