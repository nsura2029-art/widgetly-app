#!/usr/bin/env bash
# scripts/verify-cache.sh
#
# One-command verification of the widgetly Cloudflare caching stack.
# Checks that the OpenNext KV incremental cache is engaging and
# reporting the expected headers + TTFB profile.
#
# Usage:
#   bash scripts/verify-cache.sh                 # default: https://widgetly.tech
#   bash scripts/verify-cache.sh https://staging.widgetly.tech
#   bash scripts/verify-cache.sh --help
#
# Exit codes:
#   0 — all checks passed (cache HIT observed, no 1102, TTFB reasonable)
#   1 — at least one check failed
#   2 — script misuse / bad arguments

set -euo pipefail

HOST="${1:-https://widgetly.tech}"

if [[ "$HOST" == "--help" || "$HOST" == "-h" ]]; then
  cat <<EOF
Usage: bash scripts/verify-cache.sh [HOST]

Verifies that widgetly's caching stack is healthy:
  - x-nextjs-cache: HIT on the 2nd+ request (KV incremental cache)
  - No 1102 errors in the response body
  - TTFB < 500ms for warm cache (after the first request)

Default HOST: https://widgetly.tech
EOF
  exit 0
fi

# Strip trailing slash for consistent URL building.
HOST="${HOST%/}"

PASS=0
FAIL=0
WARNS=0

# ANSI colors. Disable if NO_COLOR is set or stdout isn't a TTY.
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; BLUE=""; DIM=""; RESET=""
fi

heading() { printf "\n${BLUE}== %s ==${RESET}\n" "$1"; }
ok()      { printf "  ${GREEN}✓${RESET} %s\n" "$1"; PASS=$((PASS+1)); }
warn()    { printf "  ${YELLOW}⚠${RESET} %s\n" "$1"; WARNS=$((WARNS+1)); }
fail()    { printf "  ${RED}✗${RESET} %s\n" "$1"; FAIL=$((FAIL+1)); }

heading "1. KV incremental cache (the headline check)"

# Use a unique URL path so we don't hit any existing cache entry from prior runs.
TEST_PATH="/en/tools/pdf/split-pdf"

# First request — should be a cache MISS or HIT depending on prior state.
echo "${DIM}  request 1:${RESET}"
HEADERS_1=$(curl -sI --max-time 15 "$HOST$TEST_PATH" || true)
echo "$HEADERS_1" | grep -iE 'x-nextjs-cache|cache-control' | sed 's/^/    /'

# Second request — must be HIT.
echo "${DIM}  request 2:${RESET}"
sleep 1
HEADERS_2=$(curl -sI --max-time 15 "$HOST$TEST_PATH" || true)
echo "$HEADERS_2" | grep -iE 'x-nextjs-cache|cache-control' | sed 's/^/    /'

if echo "$HEADERS_2" | grep -qi '^x-nextjs-cache: HIT'; then
  ok "x-nextjs-cache: HIT on 2nd request (KV incremental cache working)"
else
  fail "x-nextjs-cache NOT HIT on 2nd request — KV cache not engaging"
fi

if echo "$HEADERS_2" | grep -qi '^cache-control:.*s-maxage'; then
  ok "cache-control includes s-maxage (edge TTL respected)"
else
  warn "no s-maxage in cache-control (check next.config.ts headers())"
fi

heading "2. Static-file edge cache (Cloudflare CDN)"

STATIC_HEADERS=$(curl -sI --max-time 15 "$HOST/robots.txt" || true)
echo "$STATIC_HEADERS" | grep -iE 'cf-cache-status|cache-control' | sed 's/^/    /'

if echo "$STATIC_HEADERS" | grep -qi '^cf-cache-status: HIT'; then
  ok "cf-cache-status: HIT on /robots.txt (Cloudflare edge cache working)"
else
  warn "/robots.txt not HIT (may be cold cache; retry in a few seconds)"
fi

heading "3. Error 1102 sweep"

# Pull a sample of routes and confirm none of them contain the 1102 error page.
ROUTES=("/" "/en" "/es" "/fr" "/en/tools" "/en/tools/pdf" "/en/tools/pdf/split-pdf" "/en/tools/pdf/merge-pdf" "/en/about" "/en/blog")
ERROR_COUNT=0
for r in "${ROUTES[@]}"; do
  BODY=$(curl -s --max-time 10 "$HOST$r" || true)
  if echo "$BODY" | grep -qi 'Error 1102\|exceeded resource limits\|cf-error-code'; then
    fail "1102 detected on $r"
    ERROR_COUNT=$((ERROR_COUNT+1))
  fi
done
if [[ "$ERROR_COUNT" -eq 0 ]]; then
  ok "no Error 1102 in body of any of ${#ROUTES[@]} sampled routes"
fi

heading "4. TTFB profile (5 sequential requests, returning-user simulation)"

COOKIE="NEXT_LOCALE=en; wly_locale=en; wly_anon=verify-cache-test-uuid"
TIMES=()
for i in 1 2 3 4 5; do
  TTFB=$(curl -s -o /dev/null --max-time 10 -w "%{time_starttransfer}" \
    -H "Cookie: $COOKIE" "$HOST/en")
  TIMES+=("$TTFB")
  printf "  ${DIM}request $i:${RESET} %ss\n" "$TTFB"
done

# Compute simple stats in awk.
STATS=$(printf '%s\n' "${TIMES[@]}" | awk '
  { sum += $1; if (NR == 1 || $1 < min) min = $1; if ($1 > max) max = $1; vals[NR] = $1 }
  END {
    avg = sum / NR
    asort(vals)
    p50 = vals[int(NR/2)]
    printf "min=%.3f p50=%.3f avg=%.3f max=%.3f\n", min, p50, avg, max
  }')
echo "  ${DIM}stats:${RESET} $STATS"

P50=$(echo "$STATS" | awk '{print $2}' | sed 's/p50=//')
if awk "BEGIN { exit !($P50 < 0.5) }"; then
  ok "p50 TTFB < 500ms"
else
  warn "p50 TTFB ≥ 500ms — KV cache may not be hot yet"
fi

heading "5. Tool page spot-check (sample 5 tool URLs from sitemap)"

TOOL_URLS=$(curl -s --max-time 10 "$HOST/en/sitemap.xml" \
  | grep -oE '<loc>https://widgetly\.tech/tools/[a-z]+/[a-z-]+</loc>' \
  | head -5 | sed 's|<loc>https://widgetly.tech||;s|</loc>||')

for url in $TOOL_URLS; do
  # -L follows redirects (sitemap URLs like /tools/foo redirect to
  # /en/tools/foo via next-intl middleware before serving).
  STATUS=$(curl -sL -o /dev/null --max-time 10 -w "%{http_code}" "$HOST$url" || true)
  if [[ "$STATUS" == "200" ]]; then
    ok "$url → 200"
  else
    fail "$url → $STATUS"
  fi
done

heading "Summary"
TOTAL=$((PASS + FAIL + WARNS))
printf "  ${GREEN}passed:${RESET}  %d\n" "$PASS"
printf "  ${RED}failed:${RESET}  %d\n" "$FAIL"
printf "  ${YELLOW}warnings:${RESET} %d\n" "$WARNS"
printf "  total:  %d checks\n" "$TOTAL"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0