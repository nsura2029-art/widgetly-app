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
//   3. Tool count verification (bash scripts/verify-counts.sh) — keeps
//      `count` fields in sync with actual TOOLS_SUBGROUPS + examples data
//   4. Test (if `pnpm test` is defined; otherwise skip with a notice)
//   5. Build (pnpm exec opennextjs-cloudflare build) — only when --build
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
  // On Windows we have to spawn through a shell because:
  //   - the `corepack` shim is `corepack.cmd` and Node's `shell: false`
  //     mode does not resolve `.cmd` extensions (Windows `CreateProcessW`
  //     expects you to either pass the full path with the extension OR
  //     go through cmd.exe);
  //   - the absolute path we resolved above contains a space
  //     (`C:\Program Files\nodejs\corepack.cmd`), and Node refuses to
  //     spawn paths-with-spaces that end in `.cmd` via `shell: false`
  //     (it returns `EINVAL` rather than risk the silent no-op).
  // `shell: true` on *nix is also fine — the bare command is in PATH
  // and `cmd` is `corepack` (not a shell built-in), so cmd.exe
  // dispatches to the same binary.
  //
  // When going through a shell we have to quote the command if the
  // path contains spaces; Node does NOT do that for us when shell:true
  // (it just concatenates `cmd + " " + args` and hands the string to
  // cmd.exe, which then tokenizes by whitespace and chokes on
  // `C:\Program`).
  const useShell = needsShell || /[ "]/.test(cmd);
  const finalCmd = useShell && cmd.includes(" ") ? `"${cmd}"` : cmd;
  const result = spawnSync(finalCmd, cmdArgs, {
    cwd: ROOT,
    stdio: verbose ? "inherit" : "pipe",
    env: { ...process.env, ...(opts.env ?? {}) },
    shell: useShell,
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

// Whether we have to spawn through a shell. On Windows: yes (see run()
// for the full rationale). On *nix: only when the command path has a
// space (rare; most commands are bare names from PATH).
const needsShell = process.platform === "win32";

const pm = (process.env.npm_command ?? "pnpm").trim() || "pnpm";
// Always invoke pnpm through `corepack` so this works in environments
// where pnpm is not on the bare PATH (e.g. the husky pre-push hook,
// which inherits a minimal PATH that excludes the corepack shims at
// /usr/local/lib/node_modules/corepack/shims/). `corepack` is bundled
// with Node.js and lives in /usr/local/bin/, which IS in the standard
// PATH on every dev machine and in every CI runner. Corepack reads
// the `packageManager` field in package.json and dispatches to the
// correct pnpm version transparently.
//
// Cost: one extra process hop per command (~5-15ms). Negligible vs.
// the 30+ seconds lint + type-check take anyway.
let runner = "corepack";
const pnpmArgs = ["pnpm"];

// Windows fix: `corepack` is installed as `corepack.cmd` next to
// `node.exe`. Node's `spawnSync(..., { shell: false })` will not resolve
// the `.cmd` shim on Windows even when `C:\Program Files\nodejs` is on
// PATH — `shell: false` calls `CreateProcessW` directly which doesn't
// look up PATHEXT. Without this, the husky pre-push hook on Windows
// fails with `spawnSync corepack ENOENT` even though `corepack` is
// installed. We resolve the absolute path of the `corepack.cmd` shim
// once at startup and pass it to every spawn.
if (process.platform === "win32") {
  const path = await import("node:path");
  const { existsSync } = await import("node:fs");
  const nodeDir = path.dirname(process.execPath);
  const candidates = [path.join(nodeDir, "corepack.cmd"), path.join(nodeDir, "corepack")];
  const found = candidates.find((p) => existsSync(p));
  if (found) runner = found;
}

log("info", `runner=${runner} (via corepack) root=${ROOT}`);

// Phase 2 — Test
run("lint", runner, [...pnpmArgs, "run", "lint"], {
  env: { NODE_OPTIONS: "--max-old-space-size=8192" },
});
run("type-check", runner, [...pnpmArgs, "run", "type-check"]);

// Tool count verification. The mega menu, /tools cards, and home page
// all read counts from `tools-categories.ts` and `constants.ts`. If
// those drift from the actual TOOLS_SUBGROUPS / examples data, the UI
// shows wrong numbers ("37 tools" in a category with only 12). Catching
// it here means it can't slip into a deploy.
// Tool count verification. The mega menu, /tools cards, home page cards,
// and JSON-LD all read counts from `tools-categories.ts` and
// `constants.ts`. If those drift from the actual TOOLS_SUBGROUPS /
// examples data, the UI shows wrong numbers ("37 tools" in a category
// with only 12). Catching it here means it can't slip into a deploy.
//
// This is a bash script. On *nix the bare `bash` is on PATH. On Windows
// we look for git-bash (Git for Windows) at the canonical install paths.
// If we can't find bash on a Windows dev box we skip with a clear
// notice (the user can install Git for Windows to enable the check
// locally); CI on Ubuntu always runs it.
let bashBin = null;
const bashProbe = spawnSync("bash", ["--version"], { shell: needsShell, stdio: "pipe" });
if (bashProbe.status === 0) {
  bashBin = "bash";
} else if (process.platform === "win32") {
  const fs = await import("node:fs");
  const candidates = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        bashBin = p;
        break;
      }
    } catch {
      // ignore
    }
  }
}
if (bashBin) {
  run("verify-counts", bashBin, [resolve(ROOT, "scripts/verify-counts.sh")]);
} else {
  log(
    "warn",
    "verify-counts skipped: bash not available. Install Git for Windows or run it manually: bash scripts/verify-counts.sh"
  );
}

if (hasScript("test")) {
  run("test", runner, [...pnpmArgs, "run", "test"]);
} else {
  log("warn", "no `test` script defined — skipping (DOD checklist will note this)");
}

// Phase 3 — Build (opt-in by default; CI is the source of truth for prod builds)
if (wantBuild) {
  run("build", runner, [...pnpmArgs, "exec", "opennextjs-cloudflare", "build"]);
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
