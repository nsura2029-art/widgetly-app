#!/usr/bin/env bash
# scripts/verify-counts.sh
#
# Verifies that every `count` in src/lib/tools-categories.ts and
# src/lib/constants.ts matches the actual tool data:
#   - Categories with TOOLS_SUBGROUPS entries → sum of items
#     across all subgroups
#   - Categories without subgroups → length of `examples` array
#
# The mega menu, /tools cards, home page cards, and JSON-LD all
# read from these counts. If they drift from reality, users see
# "37 tools" in a category that only has 12 real ones.
#
# Run anytime:
#   bash scripts/verify-counts.sh
# Or as part of the ship cycle:
#   pnpm ship    # auto-runs this in the local DOD gate

set -euo pipefail

cd "$(dirname -- "$0")/.."

# Normalize CRLF -> LF. The data files in this repo are tracked with
# mixed line endings (some LF, some CRLF) depending on which editor
# last touched them. Bash's `[[ $line =~ $regex ]]` anchors with `$`
# match end-of-line but NOT end-of-string, so a trailing `\r` makes
# `\[$` (end-of-line `[`) silently fail. Stripping `\r` from every
# line keeps the regex happy and the script portable.
crlf_to_lf() {
  sed 's/\r$//'
}

# ---------------------------------------------------------------------------
# Parse TOOLS_SUBGROUPS — count items per category.
# Each category block looks like:
#   slug: [
#     { title: "...", accent: "...", items: [
#       { name: "...", icon: "..." },
#       { name: "...", icon: "..." },
#     ] },
#     ...
#   ],
# We count "name:" entries inside each block (each item has exactly one).
# ---------------------------------------------------------------------------
declare -A ACTUAL_COUNTS

current_cat=""
in_subgroups=false
in_examples=false

while IFS= read -r line; do
  # New category block at indentation 2 (e.g. "  pdf: [")
  if [[ "$line" =~ ^[[:space:]]{2}([a-z]+):[[:space:]]*\[$ ]]; then
    current_cat="${BASH_REMATCH[1]}"
    ACTUAL_COUNTS["$current_cat"]=0
    in_subgroups=true
    in_examples=false
    continue
  fi
  # End of an array at indentation 2 (e.g. "  ],")
  if [[ "$line" =~ ^[[:space:]]{2}\],?$ ]]; then
    current_cat=""
    in_subgroups=false
    in_examples=false
    continue
  fi
  # Inside a TOOLS_SUBGROUPS category block, count `name: "..."` entries
  if [[ "$in_subgroups" == "true" && -n "$current_cat" && "$line" =~ name:[[:space:]]*\" ]]; then
    ACTUAL_COUNTS["$current_cat"]=$(( ${ACTUAL_COUNTS["$current_cat"]} + 1 ))
  fi
done < <(crlf_to_lf < src/lib/tools-subgroups.ts)

# ---------------------------------------------------------------------------
# Parse TOOLS_CATEGORIES — for non-featured categories (no subgroups),
# count items in the `examples` array. Featured categories' counts
# come from subgroups above (skip them).
# ---------------------------------------------------------------------------
in_cat=false
in_examples=false
current_cat=""
declare -A EXAMPLES_COUNT
in_examples_block=false
examples_quote_count=0
examples_for=""

while IFS= read -r line; do
  if [[ "$line" =~ ^[[:space:]]*slug:[[:space:]]*\"([a-z]+)\" ]]; then
    current_cat="${BASH_REMATCH[1]}"
    in_cat=true
    in_examples=false
    examples_quote_count=0
    continue
  fi
  if [[ "$line" =~ ^[[:space:]]*examples:[[:space:]]*\[ ]]; then
    in_examples=true
    examples_for="$current_cat"
    examples_quote_count=0
    continue
  fi
  if [[ "$in_examples" == "true" && "$line" =~ ^[[:space:]]*\],?[[:space:]]*$ ]]; then
    # Each string in the array is wrapped in 2 quote chars; the count
    # is the number of strings, not the number of quote chars.
    EXAMPLES_COUNT["$examples_for"]=$(( examples_quote_count / 2 ))
    in_examples=false
    continue
  fi
  if [[ "$in_examples" == "true" ]]; then
    n=$(echo "$line" | grep -o '"' | wc -l | tr -d ' ')
    examples_quote_count=$(( examples_quote_count + n ))
  fi
done < <(crlf_to_lf < src/lib/tools-categories.ts)

# Use examples count for categories that don't have subgroups
for slug in "${!EXAMPLES_COUNT[@]}"; do
  if [[ -z "${ACTUAL_COUNTS[$slug]:-}" ]] || [[ "${ACTUAL_COUNTS[$slug]}" == "0" ]]; then
    ACTUAL_COUNTS["$slug"]="${EXAMPLES_COUNT[$slug]}"
  fi
done

# ---------------------------------------------------------------------------
# Parse declared counts in both files and compare.
# ---------------------------------------------------------------------------
declare -A DECLARED_CATEGORIES
declare -A DECLARED_CONSTANTS

current_slug=""
in_count_for=""
while IFS= read -r line; do
  if [[ "$line" =~ ^[[:space:]]*slug:[[:space:]]*\"([a-z]+)\" ]]; then
    current_slug="${BASH_REMATCH[1]}"
    continue
  fi
  if [[ "$line" =~ ^[[:space:]]*count:[[:space:]]*([0-9]+) ]]; then
    if [[ -n "$current_slug" ]]; then
      DECLARED_CATEGORIES["$current_slug"]="${BASH_REMATCH[1]}"
      current_slug=""
    fi
  fi
done < <(crlf_to_lf < src/lib/tools-categories.ts)

current_slug=""
while IFS= read -r line; do
  if [[ "$line" =~ ^[[:space:]]*slug:[[:space:]]*\"([a-z]+)\" ]]; then
    current_slug="${BASH_REMATCH[1]}"
    continue
  fi
  if [[ "$line" =~ ^[[:space:]]*count:[[:space:]]*([0-9]+) ]]; then
    if [[ -n "$current_slug" ]]; then
      DECLARED_CONSTANTS["$current_slug"]="${BASH_REMATCH[1]}"
      current_slug=""
    fi
  fi
done < <(crlf_to_lf < src/lib/constants.ts)

# ---------------------------------------------------------------------------
# Compare and report
# ---------------------------------------------------------------------------
fail=0
echo "=== Tool counts: declared vs actual ==="
printf "%-15s %-12s %-10s %-10s %s\n" "category" "categories.ts" "constants.ts" "actual" "status"

# Union of all slugs
all_slugs=$(printf "%s\n%s\n%s\n" \
  "$(echo "${!DECLARED_CATEGORIES[@]}" | tr ' ' '\n')" \
  "$(echo "${!DECLARED_CONSTANTS[@]}" | tr ' ' '\n')" \
  "$(echo "${!ACTUAL_COUNTS[@]}" | tr ' ' '\n')" \
  | sort -u)

for slug in $all_slugs; do
  cat_n="${DECLARED_CATEGORIES[$slug]:-MISSING}"
  const_n="${DECLARED_CONSTANTS[$slug]:-MISSING}"
  actual_n="${ACTUAL_COUNTS[$slug]:-MISSING}"

  status="ok"
  if [[ "$cat_n" != "$actual_n" ]]; then status="FAIL (categories.ts)"; fail=$((fail+1)); fi
  if [[ "$const_n" != "$actual_n" ]]; then status="$status + FAIL (constants.ts)"; fail=$((fail+1)); fi

  printf "%-15s %-12s %-10s %-10s %s\n" "$slug" "$cat_n" "$const_n" "$actual_n" "$status"
done

echo
if [[ "$fail" -gt 0 ]]; then
  echo "✗ $fail count(s) out of sync with actual tool data."
  echo ""
  echo "Fix by updating the count to match the actual:"
  echo "  1. Add the tool to TOOLS_SUBGROUPS (featured) or examples (non-featured)"
  echo "  2. Update the count in both src/lib/tools-categories.ts and src/lib/constants.ts"
  exit 1
fi

echo "✓ All counts match. ($fail mismatches)"
