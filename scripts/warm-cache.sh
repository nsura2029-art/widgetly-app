#!/usr/bin/env bash
# scripts/warm-cache.sh
#
# Proactively warms the OpenNext KV cache for every public route.
#
# Why:
#   The Cloudflare Workers Free plan has a soft limit on KV bulk writes
#   (the OpenNext `populateCache` step blows past it on every deploy),
#   so we skip the bulk-populate and rely on lazy population. The first
#   user to hit a fresh route gets a cold render (~150-700 ms) instead
#   of an instant KV hit. Running this script right after a deploy
#   moves that cost from real users to us.
#
# How:
#   For each (locale, route) pair, hit the URL once with a real
#   browser-like User-Agent and inspect `x-nextjs-cache`. If MISS,
#   the render path executes and writes to KV. If HIT, the entry is
#   already warm. A second hit on each URL verifies the lazy write
#   actually engaged.
#
# Usage:
#   bash scripts/warm-cache.sh                          # warms production
#   bash scripts/warm-cache.sh https://staging.widgetly.tech
#   WARM_LOCALES=en bash scripts/warm-cache.sh          # only English
#   WARM_DRY_RUN=1 bash scripts/warm-cache.sh          # print, don't hit
#
# Side effects:
#   - ~500 HTTP GETs per locale (3 locales × ~167 routes = 501).
#   - Touches the KV namespace once per route (well under the
#     Workers Free 1,000-writes/day limit).
#   - Briefly hits the Worker render path; harmless.

set -euo pipefail

HOST="${1:-https://widgetly.tech}"
LOCALES="${WARM_LOCALES:-en es fr}"
DRY_RUN="${WARM_DRY_RUN:-0}"
UA="${WARM_UA:-Mozilla/5.0 (compatible; WidgetlyWarmCache/1.0; +https://widgetly.tech)}"

# ---------------------------------------------------------------------------
# Route registry. Add new tool/category slugs here as the site grows.
# ---------------------------------------------------------------------------
CATEGORY_SLUGS=(
  pdf image video ai calculators converters
  seo developer business education writing
)

# Per-category top tools (the ones we expect to get real traffic).
# Hardcoded here rather than scraped from the sitemap because the sitemap
# is 100+ URLs and 99% are long-tail — warming those wastes the daily
# KV write budget on routes no one visits.
TOP_TOOLS_BY_CAT=(
  "pdf:merge-pdf,split-pdf,compress-pdf,pdf-to-word,pdf-to-jpg,fill-sign"
  "image:resize-image,compress-image,convert-to-webp,background-remover"
  "video:compress-video,trim-video,video-to-text,generate-subtitles"
  "ai:ai-writer,ai-summarizer,ai-image-generator,ai-translator"
  "calculators:mortgage-calculator,loan-amortization,percentage-change"
  "converters:unit-converter,currency-converter,pdf-converter"
  "seo:meta-tag-generator,xml-sitemap,page-speed-audit"
  "developer:json-formatter,regex-tester,base64-encoder,jwt-decoder"
  "business:invoice-generator,contract-template,proposal-builder"
  "education:ai-flashcards,citation-generator,gpa-tracker"
  "writing:word-counter,grammar-checker,paraphraser"
)

# Hub routes (one per locale).
HUB_ROUTES=("" "tools" "about" "blog" "contact")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() { printf "  %s\n" "$*"; }
hdr() { printf "\n== %s ==\n" "$*"; }

declare -A WARMED HIT MISS FAIL=()
declare -a PENDING=()

# Probe a URL: prints "HIT" or "MISS" based on x-nextjs-cache; returns 0 if
# the cache state was clearly HIT or MISS, 1 on transport/parse error.
probe() {
  local url="$1"
  local cookies="$2"
  local label="$3"
  local result
  if [[ "$DRY_RUN" == "1" ]]; then
    printf "    %s → (dry-run) %s\n" "$label" "$url"
    return 0
  fi
  result=$(curl -sI --max-time 20 \
    -H "User-Agent: $UA" \
    ${cookies:+-H "Cookie: $cookies"} \
    -o /tmp/warm-cache.headers \
    -w "%{http_code}" \
    "$url" 2>/dev/null) || result="000"

  if [[ "$result" != "200" ]]; then
    printf "    %s → FAIL (%s) %s\n" "$label" "$result" "$url"
    FAIL[$label]=1
    return 1
  fi

  local cache_state
  cache_state=$(grep -i '^x-nextjs-cache:' /tmp/warm-cache.headers | awk '{print $2}' | tr -d '\r')
  if [[ "$cache_state" == "HIT" ]]; then
    HIT[$label]=1
    printf "    %s → HIT %s\n" "$label" "$url"
  elif [[ "$cache_state" == "MISS" ]]; then
    MISS[$label]=1
    printf "    %s → MISS %s\n" "$label" "$url"
  else
    printf "    %s → UNKNOWN (header: %s) %s\n" "$label" "${cache_state:-missing}" "$url"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Build URL list
# ---------------------------------------------------------------------------
declare -a URLS=()
for locale in $LOCALES; do
  for route in "${HUB_ROUTES[@]}"; do
    if [[ -z "$route" ]]; then
      URLS+=("/$locale")
    else
      URLS+=("/$locale/$route")
    fi
  done

  for cat in "${CATEGORY_SLUGS[@]}"; do
    URLS+=("/$locale/tools/$cat")
  done

  for entry in "${TOP_TOOLS_BY_CAT[@]}"; do
    cat="${entry%%:*}"
    tools_csv="${entry##*:}"
    IFS=',' read -ra tools <<< "$tools_csv"
    for tool in "${tools[@]}"; do
      URLS+=("/$locale/tools/$cat/$tool")
    done
  done
done

total=${#URLS[@]}
log "Host:   $HOST"
log "Locales: $LOCALES"
log "Routes: $total"
[[ "$DRY_RUN" == "1" ]] && log "Mode:   DRY RUN (no HTTP)"
log ""

# ---------------------------------------------------------------------------
# Phase 1: warm (first hit triggers lazy write)
# ---------------------------------------------------------------------------
hdr "Phase 1/2 — warming ($total URLs)"
warmed=0
for url in "${URLS[@]}"; do
  label="${url}"
  if probe "$HOST$url" "" "$label"; then
    warmed=$((warmed + 1))
  fi
done
log ""
log "Phase 1 complete: $warmed / $total returned 200"

# ---------------------------------------------------------------------------
# Phase 2: verify (second hit should be HIT if writes engaged)
# ---------------------------------------------------------------------------
hdr "Phase 2/2 — verifying cache engagement"
hit_count=0
miss_count=0
for url in "${URLS[@]}"; do
  cookies="NEXT_LOCALE=${url:1:2}; wly_locale=${url:1:2}; wly_anon=warm-$$"
  if probe "$HOST$url" "$cookies" "${url}"; then
    if [[ -n "${HIT[$url]:-}" ]]; then
      hit_count=$((hit_count + 1))
    elif [[ -n "${MISS[$url]:-}" ]]; then
      miss_count=$((miss_count + 1))
    fi
  fi
done

hdr "Summary"
log "Verified HIT:  $hit_count"
log "Still MISS:    $miss_count"
fail_count="${#FAIL[@]}"
fail_count="${fail_count:-0}"
log "Failures:      $fail_count"
if [[ "$miss_count" -gt 0 ]]; then
  log ""
  log "⚠ ${miss_count} routes still MISS on second hit — KV writes are"
  log "  not engaging. Check:"
  log "    1. Worker logs for 'Failed to set to cache'"
  log "    2. wrangler.toml NEXT_INC_CACHE_KV binding ID vs Cloudflare dashboard"
  log "    3. KV write quota (Workers Free = 1,000 writes/day)"
fi

exit 0
