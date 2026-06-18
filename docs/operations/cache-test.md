# Cache Test Runbook — widgetly

> **Use this doc when:**
>
> - Verifying cache behavior on a specific page or region
> - Investigating a cache-related bug report
> - Pre-launch smoke test for a global rollout
> - Handing off to Cloudflare support or a Cloudflare Solutions Engineer
> - Onboarding a new team member to the caching stack

**Related docs:**

- [`cloudflare-optimization.md`](./cloudflare-optimization.md) — architecture
  analysis, tier comparison, and the original 1102 fix.
- [`../AGENTS.md`](../../AGENTS.md) — root work contract.
- [`.skills/widgetly-cloudflare-cache/SKILL.md`](../../../.skills/widgetly-cloudflare-cache/SKILL.md)
  — portable troubleshooting skill.
- [`scripts/verify-cache.sh`](../../scripts/verify-cache.sh) — automated 10-check
  verification. Run that FIRST before manual probes.

---

## 0. Sanity baseline (run before any deeper testing)

One command. If this passes, the system is healthy at a top level.

```bash
bash scripts/verify-cache.sh
```

Expected: **10/10 passed, p50 TTFB < 500 ms**, exit code 0.

If this fails, see the failure output directly — the script labels
each check with `✓` / `⚠` / `✗`. Don't run manual probes until the
automated ones pass.

---

## 1. The three cache layers — quick reference

Every HTTP response to widgetly.tech goes through (at most) three
caching layers. Knowing which one is responsible for a given response
is the first step to debugging.

```
Browser
  │
  ▼
Cloudflare edge POP              (e.g. IAD, FRA, NRT)
  │  cf-cache-status: HIT | MISS | BYPASS | DYNAMIC
  │  Caches: static files only (/robots.txt, /_next/static/*, /sitemap.xml, /favicon.svg)
  │  Does NOT cache HTML from the Worker.
  ▼
OpenNext KV incremental cache     (Worker colocated with the KV namespace)
  │  x-nextjs-cache: HIT | MISS
  │  Caches: prerendered HTML for force-static routes (~327 pages)
  │  Backing store: NEXT_INC_CACHE_KV namespace.
  │  This is the cache that matters for HTML.
  ▼
Cloudflare Worker render          (Node.js runtime, 10ms CPU / 30s on Paid)
  │  Runs Next.js SSR/SSG, reads D1/KV for dynamic routes.
  │  Free plan: 10 ms CPU. Going over → Error 1102.
  ▼
D1 / KV                          (data plane)
```

**Rule of thumb:** if a page is prerendered (`force-static`), the
OpenNext KV cache should engage. If not, the Worker renders fresh
each time. See the table in §3 for which routes do what.

---

## 2. Manual probes by scenario

### 2.1 — Is the KV incremental cache engaging on a specific URL?

```bash
# Replace with the URL you want to test.
URL="https://widgetly.tech/en/tools/pdf/split-pdf"

curl -sI "$URL" | grep -iE 'x-nextjs-cache|cache-control|cf-ray'
```

**Expected output:**

```
cache-control: s-maxage=N, stale-while-revalidate=2592000
x-nextjs-cache: HIT
cf-ray: <some-ray-id>
```

The `s-maxage` value counts down from a few hundred seconds toward
zero (then refreshes). That's the cache age.

**What "HIT" means:** OpenNext read the page from KV. The Worker did
NOT run the full Next.js render. CPU usage = ~5 ms (just the KV
read).

**What "MISS" means:** KV didn't have this entry (or it had expired).
The Worker ran the full render and wrote to KV. This is fine on
first visit per region; not fine if it happens repeatedly on a
"prerendered" route.

### 2.2 — Is the edge cache serving static files?

```bash
curl -sI "https://widgetly.tech/robots.txt" | grep -iE 'cf-cache-status|cache-control'
```

**Expected output:**

```
cf-cache-status: HIT
cache-control: public, max-age=0, must-revalidate
```

If you see `cf-cache-status: DYNAMIC` instead: the URL isn't being
served from Cloudflare's edge cache. Check that
`public/_headers` has the right rules (or, for dynamic routes, that
the Cache Rule in the dashboard is correctly configured).

### 2.3 — Is the page actually being served by our Worker?

Look for the `server: cloudflare` header. If it's missing, the
request never reached Cloudflare's network.

```bash
curl -sI "https://widgetly.tech/en" | grep -iE '^server:'
# Expected: server: cloudflare
```

### 2.4 — TTFB (Time To First Byte) check

```bash
# Cold cache (after Cloudflare purge):
curl -s -o /dev/null -w "cold TTFB: %{time_starttransfer}s | total: %{time_total}s\n" \
  "https://widgetly.tech/en/tools/pdf/split-pdf"

# Warm cache (2nd request, ~1 sec later):
curl -s -o /dev/null -w "warm TTFB: %{time_starttransfer}s | total: %{time_total}s\n" \
  "https://widgetly.tech/en/tools/pdf/split-pdf"
```

**Expected:**

- Cold: 100–600 ms (Worker renders + writes to KV)
- Warm: 50–200 ms (KV read)
- If warm > 500 ms: KV isn't engaging; check § 2.1.

### 2.5 — Returning-user cookie behavior

```bash
# All 3 cookies set → response should have NO Set-Cookie.
curl -sI "https://widgetly.tech/en" \
  -H "Cookie: NEXT_LOCALE=en; wly_locale=en; wly_anon=some-uuid-here" \
  | grep -iE 'set-cookie|x-nextjs-cache'
```

**Expected output:**

```
x-nextjs-cache: HIT
# (no set-cookie lines)
```

If you see `set-cookie` headers in the response, the middleware
isn't stripping them for returning users. Check
`src/middleware.ts` — the `response.headers.delete("set-cookie")`
call should fire when all 3 cookies are present.

### 2.6 — First-visit cookie behavior

```bash
# No cookies sent → response SHOULD set all 3 cookies.
curl -sI "https://widgetly.tech/en" | grep -i 'set-cookie'
```

**Expected output:** three `set-cookie` headers:

```
set-cookie: NEXT_LOCALE=en; Path=/; SameSite=lax
set-cookie: wly_locale=en; ...; Secure; SameSite=lax
set-cookie: wly_anon=<some-uuid>; ...; HttpOnly; SameSite=lax
```

If you don't see all 3, the middleware is broken for first-time
visitors.

---

## 3. By route type

| Route                              | Expected `x-nextjs-cache` | Expected `cf-cache-status` | Notes                                       |
| ---------------------------------- | ------------------------- | -------------------------- | ------------------------------------------- |
| `/`                                | n/a (307 redirect to /en) | DYNAMIC                    | next-intl locale redirect                   |
| `/en`                              | HIT                       | (not set)                  | force-static prerendered                    |
| `/en/tools`                        | HIT                       | (not set)                  | force-static                                |
| `/en/tools/pdf`                    | HIT                       | (not set)                  | force-static                                |
| `/en/tools/pdf/split-pdf`          | HIT                       | (not set)                  | force-static prerendered per tool           |
| `/en/tools/pdf/split-pdf?_rsc=...` | HIT                       | (not set)                  | Static RSC payload served by Worker         |
| `/en/about`                        | HIT                       | (not set)                  | force-static                                |
| `/en/blog`                         | HIT                       | (not set)                  | force-static                                |
| `/en/blog/<slug>`                  | HIT                       | (not set)                  | force-static (with generateStaticParams)    |
| `/api/region`                      | n/a (no cache header)     | (not set)                  | Dynamic; uses headers(); reads cf-ipcountry |
| `/api/locale`                      | n/a                       | (not set)                  | Dynamic; reads/writes cookies + KV          |
| `/api/waitlist`                    | n/a                       | (not set)                  | Dynamic; writes to D1                       |
| `/api/suggest`                     | n/a                       | (not set)                  | Dynamic; reads/writes D1                    |
| `/api/openapi.json`                | n/a                       | (not set)                  | Dynamic; serves spec                        |
| `/api/diag/*`                      | n/a                       | (not set)                  | Blocked in production (404)                 |
| `/robots.txt`                      | n/a                       | **HIT**                    | Served by `[assets]` binding                |
| `/sitemap.xml`                     | n/a                       | **HIT**                    | Cached at edge                              |
| `/_next/static/*`                  | n/a                       | **HIT**                    | Cached at edge (1 year immutable)           |
| `/en/nonexistent`                  | n/a                       | varies                     | Triggers Next.js 404                        |

**Curl template** (replace the URL):

```bash
URL="https://widgetly.tech/en/tools/pdf/split-pdf"
curl -sI "$URL" | grep -iE 'http/|x-nextjs-cache|cache-control|cf-cache-status|set-cookie'
```

---

## 4. By region (global rollout smoke test)

The three layers are globally distributed differently:

- **Cloudflare edge POPs:** 300+ locations worldwide. From your
  terminal, `cf-ray` tells you which POP served the request (the
  3-letter airport code at the end: `IAD` = Washington DC, `FRA` =
  Frankfurt, `NRT` = Tokyo Narita, `SIN` = Singapore, etc.).
- **Worker:** runs in the POP that received the request. KV reads
  are served from the same POP.
- **D1:** primary read replica is in a single region; the Worker
  reads from the local replica if available, falls back to the
  primary with ~30-100 ms added latency.

To test from a specific region, you need to be IN that region (or
use a network measurement service). Here are practical options:

### 4.1 — Use a remote-VPN / cloud shell

```bash
# Example: spin up a small VM in each region and curl from there.
# (Most cloud providers offer free trial credits.)

# AWS lightsail in Frankfurt
ssh ubuntu@<fra-vm> "curl -sI https://widgetly.tech/en | grep -iE 'cf-ray|x-nextjs-cache'"

# GCP free tier in Tokyo
gcloud compute ssh widgetly-test-tokyo -- "curl -sI https://widgetly.tech/en | grep -iE 'cf-ray|x-nextjs-cache'"
```

### 4.2 — Use a synthetic-monitoring service

Paid: Datadog, Catchpoint, Pingdom, ThousandEyes, Checkly.
Free / cheap: uptimerobot, betteruptime.com, checkly (free tier).

These run probes from 30+ global locations on a schedule and alert
when TTFB or status code is bad. Recommended for ongoing monitoring.

### 4.3 — Manual probe from your current location

If you're testing from one region, the `cf-ray` header tells you
which POP served you:

```bash
curl -sI "https://widgetly.tech/en" | grep -i cf-ray
# cf-ray: a0d79694ce0391d2-IAD   ← served from Washington DC POP
```

Use a VPN (Proton, Mullvad, Cloudflare WARP) to simulate other
regions if you don't have cloud shell access.

### 4.4 — What to look for

| Symptom in a specific region                  | Likely cause                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| TTFB > 1 s on first hit, then < 200 ms        | Cold cache for that POP — normal on a fresh deploy                     |
| TTFB > 500 ms consistently                    | KV read is slow from that POP, or D1 read replica is far               |
| `x-nextjs-cache: MISS` on force-static routes | KV namespace lookup failure in that POP — check Cloudflare status page |
| Different content between regions             | Build hasn't fully propagated; check deploy status                     |

---

## 5. By traffic pattern

### 5.1 — Single request

Already covered in §2. The expected flow: MISS → KV write → HIT on
subsequent requests from any POP.

### 5.2 — Burst (parallel requests)

```bash
# 10 parallel requests
for i in {1..10}; do
  curl -s -o /dev/null -w "req $i: HTTP %{http_code} | ttfb %{time_starttransfer}s\n" \
    "https://widgetly.tech/en/tools/pdf/split-pdf" &
done
wait
```

**Expected:** 10 × 200, TTFB 50-200 ms each. KV cache is shared, so all
10 hit the cache.

If you see any 5xx or 1102: the Worker is rendering on some of these.
Either the KV cache isn't engaging, or the route is dynamic.

### 5.3 — Cold cache (after Cloudflare purge)

```bash
# Purge everything via the Cloudflare dashboard:
#   Caching → Cache Rules → Purge Cache → "Purge Everything"
# Then immediately:
curl -sI "https://widgetly.tech/en" | grep -iE 'x-nextjs-cache|cache-control'
```

**Expected:** `x-nextjs-cache: MISS` on the first request, then `HIT`
on the second. The first request renders + writes to KV; subsequent
reads are fast.

> **Note:** "Purge Everything" only clears the Cloudflare edge cache.
> It does NOT clear the OpenNext KV namespace. The KV cache will
> still serve from KV after a Cloudflare purge. If you want to clear
> the KV cache too, you need a deploy (which overwrites the build
> timestamp key).

### 5.4 — Sustained traffic (soak test)

For a real-world load test, use a tool like `wrk` or `k6`. But be
careful — Workers Free is rate-limited and you'll likely hit 1102
deliberately if you push too hard.

```bash
# Light load test (under Free tier limits):
wrk -t4 -c20 -d30s "https://widgetly.tech/en/tools/pdf/split-pdf"
# 4 threads, 20 connections, 30 seconds
```

**Expected:** p99 < 500 ms, 0 errors. If p99 > 1 s or any errors, KV
isn't keeping up with the read rate, or the Worker is being invoked
for some requests.

---

## 6. Error scenario probes

### 6.1 — Detect Error 1102 in response body

```bash
# Sample 10 routes. Any 1102 detection is a regression.
ROUTES=("/" "/en" "/es" "/fr" "/en/tools" "/en/tools/pdf/split-pdf" \
        "/en/tools/pdf/merge-pdf" "/en/tools/ai/ai-summarizer" \
        "/en/about" "/en/blog")
for r in "${ROUTES[@]}"; do
  if curl -s --max-time 10 "https://widgetly.tech$r" | grep -qi 'Error 1102\|exceeded resource limits\|cf-error-code'; then
    echo "✗ 1102 on $r"
  else
    echo "✓ ok on $r"
  fi
done
```

### 6.2 — Detect 5xx responses

```bash
# Sample 20 routes
for r in $(curl -s https://widgetly.tech/sitemap.xml | grep -oE '<loc>[^<]+</loc>' | head -20 | sed 's|<loc>https://widgetly.tech||;s|</loc>||'); do
  STATUS=$(curl -sL -o /dev/null --max-time 10 -w "%{http_code}" "https://widgetly.tech$r")
  if [[ "$STATUS" =~ ^5 ]]; then
    echo "✗ $STATUS on $r"
  fi
done
# Expected: no output (no 5xx found)
```

### 6.3 — API route error check

```bash
# /api/region should always return 200 with country code
curl -s "https://widgetly.tech/api/region" | head -c 200
echo ""
# /api/openapi.json should return 200 with the spec
curl -s "https://widgetly.tech/api/openapi.json" | head -c 200
echo ""
# /api/diag/* should 404 in production
curl -sI "https://widgetly.tech/api/diag/d1" | head -3
# Expected: HTTP/2 404
```

---

## 7. Engaging Cloudflare support / Solutions Engineers

When you need to escalate, send the following packet. It's structured
the way Cloudflare support wants it, so the first response is faster.

### 7.1 — Account & zone info (gather once)

```bash
# Account ID — from Cloudflare dashboard URL
# https://dash.cloudflare.com/<ACCOUNT_ID>/<ZONE>/...
# Or via API:
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts" | jq '.result[] | {id, name}'

# Zone info
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=widgetly.tech" \
  | jq '.result[] | {id, name, status, plan: .plan.name}'
```

Note these down:

- **Account ID:** `_________________`
- **Zone ID:** `_________________`
- **Zone plan:** Free (currently)
- **Domain:** widgetly.tech

### 7.2 — Worker info

```bash
# Worker name
echo "Worker name: widgetly"

# Get Worker ID (from Cloudflare dashboard → Workers & Pages → widgetly → Settings)

# Recent deploys (last 5):
gh run list --workflow=deploy.yml --limit 5 --json databaseId,conclusion,createdAt,headBranch

# Or via API:
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/widgetly" \
  | jq '.result | {id, created_on, modified_on, etag}'
```

### 7.3 — KV namespace info

```bash
# List KV namespaces
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces" \
  | jq '.result[] | {id, title}'

# For NEXT_INC_CACHE_KV specifically:
# - Namespace ID: from wrangler.toml (production: 0e35b410aaf04be18d7cb17e54bc9cfb)
# - Preview ID: d85f0da78ed64650a9502783e03f116f

# Get current size + operation count
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/storage/kv/namespaces/$KV_ID" \
  | jq '.result'
```

### 7.4 — Cache rules

```bash
# List all Cache Rules for the zone
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets?phase=cache_rules" \
  | jq '.result[] | {id, name, kind, phase, rules: .rules | length}'
```

### 7.5 — When sending a support ticket, attach

1. **Problem statement** — one sentence: "Error 1102 appears randomly
   on `widgetly.tech/en/tools/pdf/*` from US-East users since 2026-06-15."
2. **Steps to reproduce** — 3-5 bullet points. Use exact URLs.
3. **Expected vs actual** — "Expected: HTTP 200 with HTML body.
   Actual: HTTP 530 with body containing 'Error 1102 — Worker exceeded
   resource limits'."
4. **Sample request** — `cf-ray` value, full headers (use § 6.1 probes).
5. **Recent deploys** — last 3 deploy run IDs and their status.
6. **Account/zone IDs** — from § 7.1.
7. **KV namespace IDs** — from § 7.3.
8. **What you've already tried** — "Enabled KV incremental cache in
   open-next.config.ts, but the error persists on dynamic routes."

### 7.6 — When to escalate

| Trigger                                               | Action                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Error 1102 returns after KV cache is verified working | Open a ticket. Workers Free has 10 ms CPU. We may need Paid.                                              |
| KV cache MISS on a `force-static` route               | First check the binding ID in wrangler.toml. If correct, open a ticket — KV may be unhealthy in a region. |
| TTFB > 1 s for warm cache                             | First check Worker CPU in dashboard. If high, investigate render path. If low, KV is slow.                |
| Cache Rule changes don't take effect                  | Check deploy logs. Cloudflare has ~30 s propagation. If still broken after 5 min, ticket.                 |
| Workers Free quota exceeded (100K req/day)            | Upgrade to Paid. See [`cloudflare-optimization.md`](./cloudflare-optimization.md) § 3.                    |

### 7.7 — Cloudflare support channels

- **Free plan:** community forum only (https://community.cloudflare.com/)
- **Paid plan (Workers):** email + dashboard support, 24-48h response
- **Enterprise:** dedicated TAM, phone, 1h response SLA

Since we're on Free, our escalation path is the community forum +
public status page (https://www.cloudflarestatus.com/). If we hit
limits, upgrade to Workers Paid ($5/mo) unlocks proper support.

---

## 8. Quick reference card

Print this. Tape to your monitor.

```
=== Health check ===
bash scripts/verify-cache.sh                  # 10 checks, ~5 sec

=== Single URL probe ===
curl -sI URL | grep -iE 'x-nextjs-cache|cache-control|cf-cache-status|cf-ray|set-cookie'

=== 1102 sweep ===
for p in / /en /es /fr /en/tools/pdf/split-pdf /en/about; do
  curl -s "https://widgetly.tech$p" | grep -qi '1102\|exceeded' && echo "1102 on $p"
done
# Expected: no output

=== TTFB ===
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "TTFB $i: %{time_starttransfer}s\n" URL
done
# Expected: < 500ms warm

=== Headers to memorize ===
x-nextjs-cache: HIT    ← OpenNext KV cache (HTML)
cf-cache-status: HIT   ← Cloudflare edge cache (static files only)
server: cloudflare     ← We're hitting Cloudflare's network
cf-ray: <id>-<POP>     ← POP code (IAD, FRA, NRT, ...)

=== Key files ===
open-next.config.ts              ← KV cache config
wrangler.toml                    ← KV binding ID
src/middleware.ts                ← Set-Cookie stripping for returning users
next.config.ts                   ← Cache-Control headers
docs/operations/cloudflare-optimization.md  ← architecture
scripts/verify-cache.sh          ← automated verification
```

---

## 9. Change log

| Date       | Change                                             | Author |
| ---------- | -------------------------------------------------- | ------ |
| 2026-06-18 | Initial runbook, established after KV cache deploy | Mavis  |
