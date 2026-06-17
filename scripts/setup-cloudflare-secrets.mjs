#!/usr/bin/env node
/**
 * setup-cloudflare-secrets.mjs
 *
 * One-shot setup: reads a `.env.local` file (or process.env) and pushes
 * every variable that should be a Cloudflare Worker secret to the
 * worker via `wrangler secret put`. Use this once after provisioning
 * Supabase (and whenever you rotate the service role key).
 *
 * Why this exists:
 *   - `.env.local` is the local-dev source of truth.
 *   - Cloudflare Workers don't read `.env.local`; secrets must be set
 *     per-worker with `wrangler secret put NAME`.
 *   - Doing it by hand is error-prone (typos, wrong env name, missing
 *     value). A 6-line shell snippet for each var is annoying.
 *
 * Usage:
 *   pnpm run setup:secrets                # reads .env.local, CWD-relative
 *   pnpm run setup:secrets -- --dry-run  # print what would be set, don't push
 *
 * Auth:
 *   - Reads CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN from .env.local
 *     or process.env. The token needs Workers Scripts:Edit scope.
 *   - Get one at https://dash.cloudflare.com/profile/api-tokens
 *
 * Idempotency:
 *   - `wrangler secret put` overwrites. Re-running this script with the
 *     same .env.local is safe; the secret just gets re-set to the same
 *     value. Rotating a value means editing .env.local and re-running.
 *
 * What gets pushed:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - WAITLIST_WEBHOOK_URL       (skipped if empty)
 *   - SUGGEST_WEBHOOK_URL        (skipped if empty)
 *   - NEXT_PUBLIC_ANALYTICS_TOKEN (skipped if empty; non-secret by name
 *                                  convention but treated identically by
 *                                  this script — pass an empty value in
 *                                  .env.local if you don't want it as a
 *                                  Worker secret; it'll stay a [vars]
 *                                  entry in wrangler.toml instead)
 *
 * What does NOT get pushed:
 *   - CLOUDFLARE_*               (used to authenticate wrangler itself)
 *   - WAITLIST_KV                (set in wrangler.toml, not as a secret)
 */
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const SECRETS_TO_PUSH = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WAITLIST_WEBHOOK_URL",
  "SUGGEST_WEBHOOK_URL",
  "NEXT_PUBLIC_ANALYTICS_TOKEN",
];

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Minimal .env parser — same shape Next.js loads. We don't use dotenv
 * because (a) we want zero runtime deps, (b) the format is dead simple.
 * Comments (#) and blank lines are skipped. Values are unquoted or
 * wrapped in single or double quotes; quotes are stripped.
 */
function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function loadEnvFile() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      console.log(`[setup-secrets] reading ${path}`);
      return parseEnv(readFileSync(path));
    }
  }
  console.log("[setup-secrets] no .env.local or .env found, falling back to process.env");
  return { ...process.env };
}

function pushSecret(name, value) {
  if (!value) return "skip (empty)";
  if (DRY_RUN) return "dry-run";

  // Pipe the value via stdin. wrangler reads stdin in non-interactive
  // mode (it's a TTY check). Don't use --text — that flag doesn't
  // exist on wrangler 4.100.0; it was introduced later. If you upgrade
  // wrangler and want to switch to --text for robustness, also update
  // .github/workflows/deploy.yml to match.
  const result = spawnSync("wrangler", ["secret", "put", name], {
    input: value,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
    env: { ...process.env },
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? "";
    throw new Error(
      `wrangler secret put ${name} failed (exit ${result.status}): ${stderr}`
    );
  }
  return "ok";
}

async function main() {
  const env = loadEnvFile();

  // Auth check — we need CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
  // for wrangler to authenticate. They live in the same .env.local.
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    console.error(
      "[setup-secrets] missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.\n" +
        "Add them to .env.local first. Get a token at:\n" +
        "  https://dash.cloudflare.com/profile/api-tokens\n" +
        "(needs Workers Scripts:Edit scope)"
    );
    process.exit(2);
  }

  // Mirror auth vars into process.env so the wrangler child process
  // picks them up without us re-argparsing.
  process.env.CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
  process.env.CLOUDFLARE_API_TOKEN = env.CLOUDFLARE_API_TOKEN;

  let pushed = 0;
  let skipped = 0;
  let failed = 0;

  // Show what we see in the env, before we try to push anything.
  // Helpful when debugging "why didn't this work" — if SUPABASE_URL
  // isn't in .env.local you'll see "(not set)" here instead of a
  // confusing wrangler auth error later.
  console.log("[setup-secrets] values seen:");
  for (const name of SECRETS_TO_PUSH) {
    const v = env[name];
    const display = v ? `set (length ${v.length})` : "(not set, skipping)";
    console.log(`  ${name.padEnd(28)} ${display}`);
  }
  console.log("");

  for (const name of SECRETS_TO_PUSH) {
    const value = env[name];
    try {
      const result = pushSecret(name, value);
      const display = result === "skip (empty)" ? "(empty)" : result;
      console.log(`[setup-secrets] ${name.padEnd(28)} ${display}`);
      if (result === "ok" || result === "dry-run") pushed++;
      else skipped++;
    } catch (e) {
      console.error(`[setup-secrets] ${name} FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log("");
  console.log(
    `[setup-secrets] done. pushed=${pushed} skipped=${skipped} failed=${failed} ` +
      `${DRY_RUN ? "(dry run, nothing was written)" : ""}`
  );

  if (failed > 0) process.exit(1);

  // After pushing secrets, the next `wrangler deploy` (or `pnpm deploy`)
  // will pick them up. The CI workflow also runs this same set of
  // `wrangler secret put` calls automatically when GH secrets are set,
  // so once you've done this once locally, future deploys are hands-off.
  if (!DRY_RUN && pushed > 0) {
    console.log(
      "[setup-secrets] next: run `pnpm deploy` (or merge to main for CI deploy)"
    );
  }
}

main().catch((err) => {
  console.error("[setup-secrets] unexpected error:", err);
  process.exit(1);
});