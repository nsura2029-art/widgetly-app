#!/usr/bin/env node
/**
 * Translate src/i18n/messages/en.json into the other 23 locales.
 *
 * PROVIDERS (pick via --provider=<name>):
 *   - libretranslate  : free public instances. Quality is "MVP" --
 *                       fine for marketing copy, not for legal text.
 *                       Default if no --provider flag is given.
 *   - deepl           : DeepL Pro / Free. Better quality for European
 *                       languages (de, fr, es, it, nl, pl, pt, sv, da,
 *                       no, ru, uk, tr, etc.). Requires DEEPL_API_KEY.
 *   - google          : Google Cloud Translation v2 (REST + API key).
 *                       Covers all 22 locales including CJK (ja, ko,
 *                       zh-CN, zh-TW, th, vi). Requires
 *                       GOOGLE_TRANSLATE_API_KEY.
 *   - auto            : picks per-locale -- deepl for European languages,
 *                       google for everything else. This is the
 *                       recommended mode for a full paid-API pass.
 *   - mock            : no real translation, just prefixes the value
 *                       with "[<locale>] ". Useful for verifying the
 *                       pipeline (write paths, JSON shape, resumability)
 *                       without spending API quota.
 *
 * ICU PLACEHOLDER HANDLING:
 *   The message strings contain ICU placeholders like {siteName},
 *   {year}, {count}. Most MT engines (including Google) leave these
 *   alone in `format=text` mode. DeepL is the exception -- it will
 *   try to translate anything that looks like a word, including the
 *   text inside braces. To keep placeholders intact, we:
 *     1. Pre-process:  {varName}  ->  <x>varName</x>
 *     2. Send to DeepL with tag_handling=xml and a list of the
 *        placeholder tags.
 *     3. Post-process: <x>varName</x>  ->  {varName}
 *   The variable-name inside the tag (varName) is never translated
 *   by DeepL because it's marked as a tag, not translatable text.
 *
 * USAGE:
 *   # LibreTranslate (free, MVP quality, all 23 locales)
 *   node scripts/translate-messages.mjs
 *   node scripts/translate-messages.mjs --provider=libretranslate --locales=es,fr
 *
 *   # DeepL (European, needs DEEPL_API_KEY)
 *   node scripts/translate-messages.mjs --provider=deepl --locales=de,fr,es,it,nl,pl,pt,sv,da,no
 *
 *   # Google Cloud Translation (all, needs GOOGLE_TRANSLATE_API_KEY)
 *   node scripts/translate-messages.mjs --provider=google --locales=ja,ko,zh-CN,zh-TW
 *
 *   # Auto (recommended for a full paid pass)
 *   DEEPL_API_KEY=xxx GOOGLE_TRANSLATE_API_KEY=yyy \
 *     node scripts/translate-messages.mjs --provider=auto
 *
 *   # Mock (verify the pipeline without API cost)
 *   node scripts/translate-messages.mjs --provider=mock --locales=es --dry-run
 *
 *   # Common flags
 *   --dry-run                 : don't write files
 *   --delay=<ms>              : ms between API calls (default 1200)
 *   --concurrency=<n>         : parallel calls per locale (default 1)
 *
 * The script preserves JSON key order and only translates string
 * VALUES (not keys). It writes the result to
 * src/i18n/messages/<locale>.json.
 *
 * Idempotency / resumability:
 *   On a re-run, the script skips strings that are already different
 *   from the English source. You can stop and restart safely.
 *   Progress is saved every 20 strings.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MSG_DIR = join(__dirname, "..", "src", "i18n", "messages");

const ALL_LOCALES = [
  "id", "ms", "da", "de", "es", "fr", "it", "nl", "no",
  "pl", "pt", "sv", "vi", "tr", "ru", "uk", "ar", "hi",
  "th", "ko", "ja", "zh-CN", "zh-TW",
];

// Locales that DeepL supports (as of late 2025). Used by the
// `--provider=auto` dispatcher to route European languages through
// DeepL (better quality) and everything else through Google.
// Source: https://developers.deepl.com/docs/getting-started/supported-languages
const DEEPL_SUPPORTED = new Set([
  "bg", "cs", "da", "de", "el", "en", "es", "et", "fi", "fr",
  "hu", "id", "it", "ja", "ko", "lt", "lv", "nb", "nl", "pl",
  "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "zh",
]);

// Map our locale codes to the exact code DeepL expects.
const DEEPL_LOCALE_MAP = {
  "no": "NB",  // Norwegian Bokmål is `NB` in DeepL (we don't have Nynorsk)
  "zh-CN": "ZH",
  "zh-TW": "ZH",  // DeepL doesn't distinguish CN/TW in free tier
};

// Same for Google (BCP-47). Most match but we normalize for safety.
const GOOGLE_LOCALE_MAP = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
};

// --- CLI argument parsing ---

function arg(name, fallback) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1] : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

const onlyLocales = arg("locales", ALL_LOCALES.join(",")).split(",").filter(Boolean);
const dryRun = flag("dry-run");
const baseDelayMs = Number(arg("delay", "1200"));
const concurrency = Math.max(1, Number(arg("concurrency", "1")));
const providerArg = arg("provider", "libretranslate");

// --- ICU placeholder handling for DeepL ---

// {varName}  ->  <x1>varName</x1>
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

// <x1>varName</x1>  ->  {varName}
function xmlTagsToIcu(text, tags) {
  let out = text;
  for (const { tag, name } of tags) {
    const re = new RegExp(`<${tag}>(.*?)</${tag}>`, "g");
    out = out.replace(re, `{$1}`);
  }
  return out;
}

// --- Providers ---

const providers = {
  // LibreTranslate (free public instances, current behavior)
  libretranslate: {
    name: "LibreTranslate",
    endpoints: [
      "https://translate.fedilab.app",
      "https://lt.blitzw.in",
      "https://libretranslate.com",
      "https://translate.terraprint.co",
    ],
    envKey: null,
    async translate(text, targetLocale) {
      for (const ep of this.endpoints) {
        try {
          const res = await fetch(ep + "/translate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              q: text,
              source: "en",
              target: targetLocale,
              format: "text",
            }),
          });
          if (res.status === 429 || res.status >= 500) continue;
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`${ep} returned ${res.status}: ${body.slice(0, 200)}`);
          }
          const json = await res.json();
          return json.translatedText ?? text;
        } catch {
          continue;
        }
      }
      throw new Error("all LibreTranslate endpoints failed");
    },
  },

  // DeepL (Pro / Free). European + ja/ko/zh, better quality.
  deepl: {
    name: "DeepL",
    envKey: "DEEPL_API_KEY",
    apiUrl: "https://api-free.deepl.com/v2/translate",
    apiUrlPro: "https://api.deepl.com/v2/translate",
    async translate(text, targetLocale) {
      const key = process.env.DEEPL_API_KEY;
      if (!key) throw new Error("DEEPL_API_KEY not set");

      const target = DEEPL_LOCALE_MAP[targetLocale] ?? targetLocale.toUpperCase();
      // Try free endpoint first; if it returns 403 (key is Pro), try the Pro URL.
      const urls = [this.apiUrl, this.apiUrlPro];
      const { out, tags } = icuToXmlTags(text);

      let lastErr = null;
      for (const url of urls) {
        try {
          const body = new URLSearchParams();
          body.append("text", out);
          body.append("source_lang", "EN");
          body.append("target_lang", target);
          body.append("tag_handling", "xml");
          // Tell DeepL which tags are non-translatable.
          for (const { tag } of tags) {
            body.append("ignore_tags", tag);
          }
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Authorization": `DeepL-Auth-Key ${key}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          });
          if (res.status === 403) { lastErr = "403 (wrong endpoint)"; continue; }
          if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            throw new Error(`DeepL ${res.status}: ${errBody.slice(0, 300)}`);
          }
          const json = await res.json();
          const translated = json.translations?.[0]?.text ?? text;
          return xmlTagsToIcu(translated, tags);
        } catch (err) {
          lastErr = err;
          continue;
        }
      }
      throw lastErr ?? new Error("DeepL request failed");
    },
  },

  // Google Cloud Translation v2 (REST + API key, no service account JSON needed).
  google: {
    name: "Google Cloud Translation",
    envKey: "GOOGLE_TRANSLATE_API_KEY",
    apiUrl: "https://translation.googleapis.com/language/translate/v2",
    async translate(text, targetLocale) {
      const key = process.env.GOOGLE_TRANSLATE_API_KEY;
      if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY not set");
      const target = GOOGLE_LOCALE_MAP[targetLocale] ?? targetLocale;
      const url = `${this.apiUrl}?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "en",
          target,
          format: "text",
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Google ${res.status}: ${errBody.slice(0, 300)}`);
      }
      const json = await res.json();
      return json.data?.translations?.[0]?.translatedText ?? text;
    },
  },

  // Mock: no real translation, just prefix to verify pipeline.
  mock: {
    name: "Mock",
    async translate(text, targetLocale) {
      return `[${targetLocale}] ${text}`;
    },
  },
};

// `auto` is a meta-provider: picks deepl/google/libretranslate per locale.
function pickProviderForLocale(locale) {
  if (DEEPL_SUPPORTED.has(locale)) {
    if (process.env.DEEPL_API_KEY) return providers.deepl;
  }
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return providers.google;
  return providers.libretranslate;
}

// --- Translation engine (provider-agnostic) ---

async function translateWithRetry(text, targetLocale, attempt = 1) {
  if (!text || !text.trim()) return text;
  const provider = providerArg === "auto"
    ? pickProviderForLocale(targetLocale)
    : providers[providerArg];
  if (!provider) throw new Error(`unknown provider: ${providerArg}`);

  try {
    return await provider.translate(text, targetLocale);
  } catch (err) {
    if (attempt < 3) {
      const wait = Math.min(2000 * 2 ** attempt, 30000);
      console.warn(
        `  ! ${targetLocale}/${provider.name}: "${text.slice(0, 40)}…" ` +
        `failed (${err.message}); retrying in ${wait}ms`
      );
      await new Promise((r) => setTimeout(r, wait));
      return translateWithRetry(text, targetLocale, attempt + 1);
    }
    console.warn(
      `  ! ${targetLocale}/${provider.name}: giving up on ` +
      `"${text.slice(0, 40)}…", keeping English`
    );
    return text;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function translateLocale(targetLocale) {
  console.log(`\n→ ${targetLocale}`);
  const provider = providerArg === "auto"
    ? pickProviderForLocale(targetLocale)
    : providers[providerArg];
  console.log(`  provider: ${provider.name}`);

  const src = JSON.parse(readFileSync(join(MSG_DIR, "en.json"), "utf8"));
  const flat = flattenStrings(src);
  console.log(`  ${flat.length} strings to translate`);

  let out = {};
  try {
    out = JSON.parse(readFileSync(join(MSG_DIR, `${targetLocale}.json`), "utf8"));
  } catch {}

  let translated = 0;
  let skipped = 0;
  const start = Date.now();

  for (let i = 0; i < flat.length; i++) {
    const { path, value } = flat[i];

    const existing = path.split(".").reduce((o, k) => (o ? o[k] : undefined), out);
    if (typeof existing === "string" && existing !== value) {
      skipped++;
      continue;
    }

    const translatedStr = await translateWithRetry(value, targetLocale);
    out = setPath(out, path, translatedStr);
    translated++;

    if (translated % 20 === 0) {
      if (!dryRun) {
        writeFileSync(join(MSG_DIR, `${targetLocale}.json`), JSON.stringify(out, null, 2) + "\n");
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ${translated}/${flat.length} (${skipped} skipped, ${elapsed}s)`);
    }

    if (concurrency === 1) await sleep(baseDelayMs);
  }

  if (!dryRun) {
    writeFileSync(join(MSG_DIR, `${targetLocale}.json`), JSON.stringify(out, null, 2) + "\n");
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ✓ ${targetLocale} done: ${translated} translated, ${skipped} skipped, ${elapsed}s`);
}

async function main() {
  if (!providers[providerArg] && providerArg !== "auto") {
    console.error(`Unknown --provider=${providerArg}. Valid: ${Object.keys(providers).join(", ")}, auto`);
    process.exit(1);
  }
  const en = JSON.parse(readFileSync(join(MSG_DIR, "en.json"), "utf8"));
  const total = flattenStrings(en).length;
  console.log(`en.json: ${total} strings to translate across ${onlyLocales.length} locales`);
  console.log(`Provider: ${providerArg}`);
  if (providerArg === "deepl" || (providerArg === "auto" && process.env.DEEPL_API_KEY)) {
    if (!process.env.DEEPL_API_KEY) {
      console.error("DEEPL_API_KEY is not set. Get one at https://www.deepl.com/pro-api");
      process.exit(1);
    }
  }
  if (providerArg === "google" || (providerArg === "auto" && !process.env.DEEPL_API_KEY)) {
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.error("GOOGLE_TRANSLATE_API_KEY is not set. Get one at https://console.cloud.google.com/apis/credentials");
      process.exit(1);
    }
  }
  console.log(`Delay: ${baseDelayMs}ms per call; ${concurrency} concurrent; ${dryRun ? "DRY RUN" : "writing files"}`);

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
