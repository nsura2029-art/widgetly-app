#!/usr/bin/env bash
# scripts/setup-kv-cache.sh
#
# One-shot setup for the OpenNext incremental cache KV namespace.
# Run this once per Cloudflare account. Outputs the IDs you need to
# paste into wrangler.toml.
#
# Requires: pnpm (for wrangler), CLOUDFLARE_API_TOKEN env var or
# `wrangler login` already done on this machine.

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f wrangler.toml ]]; then
  echo "✗ wrangler.toml not found. Run from repo root." >&2
  exit 1
fi

# wrangler 3.x uses space-separated subcommands. The colon form
# (`wrangler kv:namespace create`) was deprecated and produces
# "Unknown arguments" errors on newer versions.
WRANGLER_KV_CREATE_PROD="kv namespace create NEXT_INC_CACHE_KV"
WRANGLER_KV_CREATE_PREV="kv namespace create NEXT_INC_CACHE_KV --preview"

echo "▶ Creating production KV namespace 'NEXT_INC_CACHE_KV'..."
PROD_OUT=$(pnpm wrangler $WRANGLER_KV_CREATE_PROD 2>&1 | tee /dev/stderr)
PROD_ID=$(echo "$PROD_OUT" | grep -oE 'id\s*=\s*"[a-f0-9]{32}"' | head -1 | grep -oE '[a-f0-9]{32}')

echo ""
echo "▶ Creating preview KV namespace 'NEXT_INC_CACHE_KV' (preview)..."
PREV_OUT=$(pnpm wrangler $WRANGLER_KV_CREATE_PREV 2>&1 | tee /dev/stderr)
PREV_ID=$(echo "$PREV_OUT" | grep -oE 'id\s*=\s*"[a-f0-9]{32}"' | head -1 | grep -oE '[a-f0-9]{32}')

if [[ -z "$PROD_ID" || -z "$PREV_ID" ]]; then
  echo ""
  echo "✗ Could not parse IDs from wrangler output." >&2
  echo "  Look above for the printed IDs and paste them manually into wrangler.toml." >&2
  echo "" >&2
  echo "  The lines to update:" >&2
  echo "    id          = \"REPLACE_WITH_KV_NAMESPACE_ID\"     →  id          = \"<production-id>\"" >&2
  echo "    preview_id  = \"REPLACE_WITH_PREVIEW_KV_NAMESPACE_ID\"  →  preview_id  = \"<preview-id>\"" >&2
  exit 1
fi

echo ""
echo "✓ Got IDs:"
echo "  Production: $PROD_ID"
echo "  Preview:    $PREV_ID"

# Update wrangler.toml in place. Use a temp file for portability
# (sed -i behaves differently on macOS vs Linux).
python3 - <<PYEOF
import re

path = "wrangler.toml"
with open(path) as f:
    content = f.read()

prod = "$PROD_ID"
prev = "$PREV_ID"

# Replace the NEXT_INC_CACHE_KV binding block.
new = re.sub(
    r'(\[\[kv_namespaces\]\]\s*\nbinding = "NEXT_INC_CACHE_KV"\s*\n)id = "[^"]*"(\s*\npreview_id = )"[^"]*"',
    rf'\1id = "{prod}"\2"{prev}"',
    content,
)
if new == content:
    print("✗ Could not find NEXT_INC_CACHE_KV binding block to update", flush=True)
    raise SystemExit(1)

with open(path, "w") as f:
    f.write(new)

print("✓ wrangler.toml updated.")
PYEOF

echo ""
echo "✓ Diff:"
git diff wrangler.toml || echo "(wrangler.toml not yet staged, but updated locally)"