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

echo "▶ Creating production KV namespace 'NEXT_INC_CACHE_KV'..."
PROD_OUT=$(pnpm wrangler kv:namespace create NEXT_INC_CACHE_KV 2>&1 | tee /dev/stderr)
PROD_ID=$(echo "$PROD_OUT" | grep -oE 'id = "[a-f0-9]{32}"' | head -1 | grep -oE '[a-f0-9]{32}')

echo ""
echo "▶ Creating preview KV namespace 'NEXT_INC_CACHE_KV' (preview)..."
PREV_OUT=$(pnpm wrangler kv:namespace create NEXT_INC_CACHE_KV --preview 2>&1 | tee /dev/stderr)
PREV_ID=$(echo "$PREV_OUT" | grep -oE 'id = "[a-f0-9]{32}"' | head -1 | grep -oE '[a-f0-9]{32}')

if [[ -z "$PROD_ID" || -z "$PREV_ID" ]]; then
  echo "✗ Could not parse IDs from wrangler output." >&2
  echo "  Look above for the printed IDs and paste them manually." >&2
  exit 1
fi

echo ""
echo "✓ Got IDs:"
echo "  Production: $PROD_ID"
echo "  Preview:    $PREV_ID"

# Update wrangler.toml in place
sed -i.bak \
  -e "s/^id = \"REPLACE_WITH_KV_NAMESPACE_ID\"$/id = \"$PROD_ID\"/" \
  -e "s/^preview_id = \"REPLACE_WITH_PREVIEW_KV_NAMESPACE_ID\"$/preview_id = \"$PREV_ID\"/" \
  wrangler.toml
rm -f wrangler.toml.bak

echo ""
echo "✓ wrangler.toml updated. Diff:"
git diff wrangler.toml
