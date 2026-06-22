#!/usr/bin/env bash
# scripts/smoke-test.sh
#
# Lightweight post-deploy smoke test. Hits a handful of key URLs and
# reports which returned 2xx/3xx vs which failed. Used by the deploy
# workflows to gate the "Deploy to X" job on the live site actually
# responding — green CI only proves the build worked, not that the
# Worker is serving traffic.
#
# Usage:
#   bash scripts/smoke-test.sh https://widgetly.tech
#   bash scripts/smoke-test.sh https://stage.widgetly.tech
#
# Exit codes:
#   0 — all checks passed
#   1 — at least one check failed
#
# The checks are deliberately shallow: HTTP status, no body parsing,
# no auth, no JS evaluation. We want this script to finish in <10s
# so a deploy that hangs doesn't hold up the pipeline.
#
# Format: pipe-separated <path>|<expected_status>|<description>. We use
# pipes (not spaces) because bash arrays collapse newlines to spaces,
# and a description with multiple words (e.g. "Admin sign-in (no
# Clerk)") would break a space-separated parser.

set -uo pipefail

HOST="${1:-http://localhost:3000}"
PASS=0
FAIL=0
FAILED_PATHS=()

CHECKS=(
  "/|200|Homepage"
  "/en|200|Homepage (en locale)"
  "/en/tools|200|Tools index"
  "/en/tools/pdf|200|PDF tools category"
  "/en/suggest|200|Suggestion board"
  "/en/leaderboard|200|Public leaderboard"
  "/en/about|200|About page"
  "/en/security|200|Security page"
  "/admin/sign-in|200|Admin sign-in (no Clerk)"
  "/api/public/tools|200|Public tools API"
  "/api/admin/auth/me|401|Admin auth rejects anon"
  "/robots.txt|200|robots.txt"
)

for entry in "${CHECKS[@]}"; do
  IFS='|' read -r path expected desc <<<"$entry"
  url="${HOST}${path}"
  # -o /dev/null: discard body (faster, no need to parse)
  # -w "%{http_code}": print just the status code
  # -L: follow redirects (e.g. /en → /en/ or /admin → /admin/sign-in)
  # --max-time 8: don't hang forever on a broken deploy
  # -A "smoke-test/1.0": identify ourselves in the access log
  code=$(curl -s -o /dev/null -L -w "%{http_code}" --max-time 8 -A "smoke-test/1.0" "$url" || echo "000")
  if [[ "$code" == "$expected" ]]; then
    printf "  \u2713 %-28s %-32s (HTTP %s)\n" "$path" "$desc" "$code"
    PASS=$((PASS + 1))
  else
    printf "  \u2717 %-28s %-32s (HTTP %s, expected %s)\n" "$path" "$desc" "$code" "$expected"
    FAIL=$((FAIL + 1))
    FAILED_PATHS+=("$path ($desc)")
  fi
done

echo ""
echo "Smoke test: $PASS passed, $FAIL failed"

if [[ "$FAIL" -gt 0 ]]; then
  echo "Failed paths:"
  for p in "${FAILED_PATHS[@]}"; do
    echo "  - $p"
  done
  exit 1
fi
exit 0
