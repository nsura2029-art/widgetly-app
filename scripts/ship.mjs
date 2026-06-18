#!/usr/bin/env node
// scripts/ship.mjs
//
// Single source of truth for the LOCAL portion of the Ship Cycle / DOD
// (see root AGENTS.md § "Ship Cycle / Definition of Done"). The pre-push
// husky hook calls this script so the hook body and the manual `pnpm ship`
// command can never drift.
//
// What it does:
//   1. Lint (pnpm lint)
//   2. Type-check (pnpm type-check)
//   3. Test (if `pnpm test` is defined; otherwise skip with a notice)
//   4. Build (pnpm exec opennextjs-cloudflare build) — only when --build
//      is passed, because the build is expensive and the pre-push gate
//      deliberately stops at type-check + lint + test for fast feedback.
//
// Usage:
//   node scripts/ship.mjs                  # lint + type-check + test
//   node scripts/ship.mjs --build         # + build (slow; use before merge)
//   node scripts/ship.mjs --skip-build     # explicit skip
//   pnpm ship                              # the canonical alias

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const wantBuild = args.has("--build");
const skipBuild = args.has("--skip-build") || args.has("--no-build");
const verbose = args.has("--verbose") || process.env.SHIP_VERBOSE === "1";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function log(level, msg) {
  const prefix =
    {
      info: `${BLUE}▶${RESET}`,
      ok: `${GREEN}✓${RESET}`,
      warn: `${YELLOW}⚠${RESET}`,
      err: `${RED}✗${RESET}`,
      dim: `${DIM}·${RESET}`,
    }[level] ?? "·";
  console.log(`${prefix} ship: ${msg}`);
}

function hasScript(name) {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  return Boolean(pkg.scripts?.[name]);
}

function run(label, cmd, cmdArgs, opts = {}) {
  log("info", `${label} …`);
  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: verbose ? "inherit" : "pipe",
    env: { ...process.env, ...(opts.env ?? {}) },
    shell: false,
  });
  if (result.error) {
    log("err", `${label} failed to start: ${result.error.message}`);
    process.exit(2);
  }
  if (result.status !== 0) {
    log("err", `${label} exited ${result.status}`);
    if (!verbose && result.stdout) process.stdout.write(result.stdout);
    if (!verbose && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  log("ok", `${label} passed`);
}

const pm = (process.env.npm_command ?? "pnpm").trim() || "pnpm";
const runner = existsSync(resolve(ROOT, "pnpm-lock.yaml")) ? "pnpm" : pm;

log("info", `runner=${runner} root=${ROOT}`);

// Phase 2 — Test
run("lint", runner, ["run", "lint"], {
  env: { NODE_OPTIONS: "--max-old-space-size=8192" },
});
run("type-check", runner, ["run", "type-check"]);

if (hasScript("test")) {
  run("test", runner, ["run", "test"]);
} else {
  log("warn", "no `test` script defined — skipping (DOD checklist will note this)");
}

// Phase 3 — Build (opt-in by default; CI is the source of truth for prod builds)
if (wantBuild) {
  run("build", runner, ["exec", "opennextjs-cloudflare", "build"]);
  const workerJs = resolve(ROOT, ".open-next", "worker.js");
  if (!existsSync(workerJs)) {
    log("err", `build said success but ${workerJs} is missing`);
    process.exit(3);
  }
  log("ok", `.open-next/worker.js present`);
} else if (!skipBuild) {
  log("dim", "build skipped (pass --build to include; CI runs it on every PR)");
}

log("ok", "local DOD gate passed");
console.log(
  `${DIM}  next: merge → develop → wait for preview → merge → main → wait for prod → verify live (see AGENTS.md § Ship Cycle)${RESET}`,
);
