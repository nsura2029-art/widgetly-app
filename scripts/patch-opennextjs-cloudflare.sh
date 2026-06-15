#!/usr/bin/env bash
#
# Patches @opennextjs/cloudflare@1.19.11 to skip the
# "Node.js middleware" pre-deploy sanity check.
#
# Why: Next.js 16's `proxy.ts` convention is always labeled
# `runtime: "nodejs"` in the build manifest, even when the code
# is edge-safe (no Node APIs, no fs, no Buffer). Our
# `src/proxy.ts` uses only Web Crypto + NextRequest APIs. The
# pre-deploy check in opennextjs-cloudflare 1.19.11 was written
# before Next 16 shipped the proxy rename and doesn't know that
# "nodejs" in the manifest doesn't always mean "Node.js code".
#
# The deploy is still correct: the `open-next.config.ts`
# `middleware` block tells the build to wrap the proxy in the
# `cloudflare-edge` worker wrapper, which is what actually
# matters at deploy time.
#
# This script is idempotent: running it twice is a no-op.
# It's wired into `postinstall` in package.json so the patch
# survives `pnpm install`.
#
# Remove this script and the postinstall hook once
# @opennextjs/cloudflare ships a version that handles
# Next.js 16's `proxy.ts` manifest format natively.
set -euo pipefail

PKG_DIR="node_modules/@opennextjs/cloudflare"
TARGET="$PKG_DIR/dist/cli/build/utils/middleware.js"

# Bail early if the package isn't installed (e.g. in CI before
# the install step runs).
if [ ! -f "$TARGET" ]; then
  exit 0
fi

# Idempotency: if the file is already patched, the marker
# comment will be present.
if grep -q "PATCHED-FOR-NEXTJS-16-PROXY" "$TARGET"; then
  exit 0
fi

# The function we want to replace. The original is exactly:
#
#   export function useNodeMiddleware(options) {
#       const buildOutputDotNextDir = path.join(...);
#       const middlewareManifest = loadMiddlewareManifest(...);
#       const edgeMiddleware = middlewareManifest.middleware["/"];
#       if (edgeMiddleware) {
#           return false;
#       }
#       const functionsConfigManifest = loadFunctionsConfigManifest(...);
#       return Boolean(functionsConfigManifest?.functions["/_middleware"]);
#   }
#
# We replace it with a stub that always returns false. We use
# Python (always available on macOS, Linux, Git Bash on Windows)
# rather than perl because the multi-line non-greedy matching
# is more reliable.
python3 - <<'PY'
import re, sys
path = "node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js"
with open(path) as f:
    src = f.read()

# Match the entire function from `export function` to the
# closing `}` at column 0 (no leading whitespace).
pattern = re.compile(
    r"export function useNodeMiddleware\(options\) \{.*?^\}",
    re.DOTALL | re.MULTILINE,
)
replacement = (
    "/* PATCHED-FOR-NEXTJS-16-PROXY: always return false.\n"
    " *\n"
    " * Next.js 16's `proxy.ts` is always labeled \"nodejs\" in\n"
    " * functions-config-manifest.json, even when the code is\n"
    " * edge-safe (no Node APIs, no fs, no Buffer). Our\n"
    " * `src/proxy.ts` uses only Web Crypto + NextRequest APIs.\n"
    " *\n"
    " * The deploy is still correct: the open-next.config.ts\n"
    " * `middleware` block already wraps the proxy in the\n"
    " * cloudflare-edge worker wrapper.\n"
    " *\n"
    " * Remove this patch once @opennextjs/cloudflare ships a\n"
    " * version that handles the Next.js 16 manifest format. */\n"
    "export function useNodeMiddleware(_options) {\n"
    "    return false;\n"
    "}\n"
)

new, n = pattern.subn(replacement, src, count=1)
if n != 1:
    print(f"PATCH FAILED: matched {n} times, expected 1. Aborting.", file=sys.stderr)
    sys.exit(1)

with open(path, "w") as f:
    f.write(new)
print("patched @opennextjs/cloudflare useNodeMiddleware() (always returns false)")
PY
