# Cloudflare Optimization Plan

> Analysis and recommended migration path for the Widgetly stack,
> prepared in response to recurring **Error 1102 — Worker exceeded
> resource limits** on the **Free** plan. Updated 2026-06-18.

---

## 1. The problem we're solving

The Widgetly site runs on **Cloudflare Workers (Free)** via
`@opennextjs/cloudflare`. We've started seeing Error 1102 randomly —
sometimes on first request after deploy, sometimes on `/api/*`,
sometimes on marketing pages. Root cause is structural: **Workers
Free is too tight for what we're doing**.

### Current Cloudflare Workers Free limits (2026)

| Limit                 | Free            | Paid ($5/mo)                | Why it matters for us                                         |
| --------------------- | --------------- | --------------------------- | ------------------------------------------------------------- |
| CPU time / request    | **10 ms**       | 30 s default, 5 min max     | Next.js SSR with RSC, i18n, framer-motion can blow past 10 ms |
| Requests / day        | 100,000         | 10 M included, then $0.30/M | We're at ~25K/day and growing — Free ceiling in sight         |
| Memory / isolate      | 128 MB          | 128 MB                      | Same on both — not the lever                                  |
| Worker size           | 3 MB compressed | 10 MB compressed            | Next.js bundle is ~5 MB — **already over the Free cap**       |
| Subrequests / request | 50              | 1,000                       | Limits fan-out per render                                     |
| Workers per account   | 100             | 500                         | Not an issue                                                  |

**Error 1102** triggers in two cases:

1. **Exceeded CPU time.** Worker Free gives 10 ms of CPU per request.
   That's _incredibly_ tight. A bare-bones React Server Component
   render with i18n message loading + JSON-LD generation already
   uses 4–8 ms. Adding middleware (locale cookie write, anon UUID
   generation) eats another 1–2 ms. **First cold-start render often
   exceeds 10 ms.** This is the [opennextjs-cloudflare#598 bug][1]
   pattern.

2. **Exceeded memory (128 MB).** Less likely at our scale but
   possible on tool-page renders with all 11 category landing pages
   inlined into JSON-LD.

The **3 MB compressed Worker size limit** is also a quiet threat.
`@opennextjs/cloudflare` builds typically land between 4–8 MB.
Once we're over 3 MB the deploy _succeeds_ on the dashboard but
the Worker refuses to start at runtime — also surfacing as a 5xx,
sometimes as 1102.

[1]: https://github.com/opennextjs/opennextjs-cloudflare/issues/598

### What 1102 actually looks like in the wild

Symptoms seen on `widgetly.tech` between 2026-06-15 and 2026-06-18:

- **First request after deploy** — Worker cold-start renders the
  home page, hits 1102 because the isolate just initialized.
  Subsequent requests succeed.
- **Random hits on `/api/waitlist` / `/api/suggest`** — these hit
  D1, do JSON parsing, and write a small response. On Free, the
  10 ms budget is consumed by `headers()` + D1 round-trip + JSON
  encoding. ~3% of writes fail with 1102.
- **Tool pages with `force-static` working OK**, but the home page
  has subtle dynamic opt-ins (the cookie banner consults `cookies()`
  on first render) — sometimes 1102 on cold.

### What it isn't

It's not a code bug per se. The Next.js renderer is doing exactly
what it's told. The budget is just wrong for the workload.

---

## 2. The architectural fix: cache static at the edge, Worker only for `/api/*`

The whole point of a CDN is to serve the same bytes 10,000 times
without re-running the program. Today we're re-running the program
(SSR) for every request and then _also_ spending Worker CPU on
middleware. That's backwards.

The fix has three layers, applied in order:

### Layer A — Eliminate dynamic rendering everywhere we can

Audit the app and remove anything that opts a page into dynamic
rendering. Goal: **every marketing/content page is `force-static`
and prerendered at build time**.

| Surface                                       | Today                                                               | Target                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/[locale]/layout.tsx`                        | Already static; removed `headers()` call.                           | ✅ keep                                                                     |
| `/[locale]/page.tsx` (home)                   | Was `force-dynamic`; now default-static.                            | ✅ keep                                                                     |
| `/[locale]/tools/[category]/[tool]/page.tsx`  | `force-static`, prerendered for 109 tools × 3 locales = 327 pages   | ✅ keep                                                                     |
| `/[locale]/blog/[slug]/page.tsx`              | `force-static`                                                      | ✅ keep                                                                     |
| `/[locale]/sitemap.ts`                        | `force-dynamic` (reads site config + tool list at request time)     | 🔴 rewrite to import tool data statically at build time                     |
| `/[locale]/robots.ts`                         | `force-dynamic`                                                     | 🟡 probably fine to keep dynamic — robots.txt is small + rarely-hit         |
| `/[locale]/suggest/page.tsx`                  | `force-dynamic` (reads D1)                                          | 🔴 keep dynamic OR remove the `/suggest/` UI and only expose `/api/suggest` |
| `/[locale]/opengraph-image.tsx` (and similar) | Server-side image generation; counts as CPU                         | 🔴 pre-generate OG images at build time using `next/og` + a build step      |
| Middleware                                    | Sets `wly_locale` + `wly_anon` cookies, runs `next-intl` middleware | 🟡 see Layer C — skip middleware when the page is cacheable                 |

### Layer B — Aggressive edge caching with `Cache-Control` + Cache Rules

Set `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`
on every prerendered route. Use a **Cloudflare Cache Rule** to:

- Cache HTML at the edge with the matching `s-maxage`.
- Bypass the cache for `/api/*`, `/_next/*`, `*.json` (already
  excluded), and any route that sets its own `Cache-Control:
no-store`.

> **Important gotcha** — `public/_headers` on a Cloudflare Workers
> (OpenNext) deployment **only applies to files served from the
> Worker's `[assets]` binding** (i.e. the `.open-next/assets/`
> directory). It does NOT apply to dynamic HTML responses from
> Next.js SSR. Cache-Control for dynamic routes MUST be set via
> `next.config.ts → headers()`. We learned this the hard way when
> the first deploy showed `/en` still returning the default
> `s-maxage=31536000` (from Next's own defaults) instead of our
> intended `s-maxage=300`. The `_headers` rules for HTML routes
> were silently ignored.

Then 99% of HTML requests never hit the Worker at all. They hit
Cloudflare's edge cache (which is essentially free and unlimited),
and the bytes fly out at <30 ms TTFB globally.

The trick: **don't run the middleware on cached HTML**. Two ways:

1. **Cloudflare Cache Rule** that bypasses the Worker for cached
   GETs that already have a hit. (Workers are bypassed when a
   Cache Rule serves from cache _and_ the page is a static asset
   match — but for HTML, the Worker still runs by default.)
2. **Move cookie-setting out of middleware.** Instead, set
   `wly_locale` from a client-side script on first visit (or from
   the API route that already exists). The middleware only runs
   for non-cached requests, which is fine.

The cleanest implementation: a Cloudflare Cache Rule with the
expression

```
(http.host eq "widgetly.tech" and http.request.method eq "GET"
 and not starts_with(http.request.uri.path, "/api/")
 and not starts_with(http.request.uri.path, "/_next/")
 and not starts_with(http.request.uri.path, "/diag"))
```

…set to **Cache eligible status codes** (200, 203, 204, 300–399,
404, 408, 410, 418, 451) with **Edge TTL = respect existing
headers** and **Browser TTL = Bypass cache** (Cloudflare does
not set `max-age` for the browser; CDN revalidation handles
freshness).

#### Layer B dashboard walkthrough (Cache Rules form)

The actual Cache Rules form (verified 2026-06-18 against the live
dashboard) has **only the radio + 6 expandable settings**, no
"Eligible status codes" checkboxes section. Every setting is
gated behind a `+ Add setting` button that reveals its controls.
Walk through:

**Step 1 — Rule name** (top of the form, plain text field):
`Cache HTML pages at edge`

**Step 2 — Match expression** (next section):
Click **Edit expression**, switch to **Expression Editor**, paste:

```
(http.host eq "widgetly.tech" and http.request.method eq "GET"
 and not starts_with(http.request.uri.path, "/api/")
 and not starts_with(http.request.uri.path, "/_next/")
 and not starts_with(http.request.uri.path, "/diag/"))
```

**Step 3 — Cache eligibility** (radio buttons):
Pick **Eligible for cache** (not Bypass cache).

**Step 4 — Add the settings you need** (each is `+ Add setting`):

| Setting                                    | What to pick                                                                                                                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edge TTL**                               | Click `+ Add setting`. Form has **3 radio buttons** for the base mode + a separate **Status code TTL** table below for per-range overrides. Pick radio #1 + fill in the table (see below). | This is the bulletproof setup — the radio handles the common case (respect origin), and the Status code TTL table explicitly defends against 5xx caching.                                                                                                                                                                                                                                                                              |
| **Browser TTL**                            | Click `+ Add setting`, then pick **Bypass cache** (NOT "Override and use this TTL")                                                                                                        | The dropdown has 3 options: **Bypass cache**, **Respect origin TTL**, **Override and use this TTL**. We pick Bypass because (a) `next.config.ts` sets only `s-maxage`, not `max-age`, so browsers would fall back to heuristic caching with "Respect"; (b) "Override" forces a minimum of 2 hours which is too long for HTML; (c) Bypass means Cloudflare doesn't add browser cache headers → browsers always revalidate with the CDN. |
| **Cache key**                              | Leave **NOT** added (defaults are fine)                                                                                                                                                    | Adding this exposes include/exclude fields. Defaults already exclude cookies.                                                                                                                                                                                                                                                                                                                                                          |
| **Serve stale content while revalidating** | Click `+ Add setting`, **flip the toggle ON**, then set duration to **86400** seconds (1 day)                                                                                              | The default state is **OFF** with text "Do not serve stale content while updating". You must click the toggle/radio to switch to ON. When ON, a duration field appears.                                                                                                                                                                                                                                                                |
| **Respect strong ETags**                   | Click `+ Add setting`, toggle **ON**                                                                                                                                                       | More reliable revalidation.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Origin error page pass-through**         | Click `+ Add setting`, toggle **ON**                                                                                                                                                       | So our custom 404 stays a 404, not Cloudflare's generic error.                                                                                                                                                                                                                                                                                                                                                                         |

##### Edge TTL form layout (verified 2026-06-18)

When you click **+ Add setting** on the Edge TTL row, the form
expands to show:

```
Edge TTL (optional)
Specify if and how long Cloudflare should cache the response,
depending on if a cache-control header is present on the origin
response. If you need to modify your origin's cache-control
directives, create a cache response transform rule.

(•) Use cache-control header if present, bypass cache if not    ← RADIO 1
( ) Use cache-control header if present, cache request with
    Cloudflare's default TTL for the response status if not     ← RADIO 2
( ) Ignore cache-control header and use this TTL                ← RADIO 3

Input time-to-live (TTL)                                        ← Only relevant for RADIO 3
[ Select or add a duration in seconds ▼ ]                       ← grayed out for radios 1/2

Status code TTL
Specify how long Cloudflare should cache the response based on
the status code from the origin.
Scope          Status code     Duration
Single code ▼  Select ▼        Select ▼                        [×]
[+ Add status code setting]
```

So the form has **3 radios** (not 4) and a **separate Status code
TTL table below**. The table is always shown, regardless of which
radio you pick. The recommended setup combines both:

##### Step-by-step Edge TTL config

**Step 1 — Pick the base mode** (radio):

- ✅ Pick **"Use cache-control header if present, bypass cache if not"**
- Why: when our origin sends Cache-Control, Cloudflare follows it.
  When it doesn't, Cloudflare doesn't cache at all. Safe default.

**Step 2 — Ignore the "Input time-to-live (TTL)" field**:
It's only used by Radio 3 (Override). Leave it blank.

**Step 3 — Fill in the Status code TTL table**.
Click **+ Add status code setting** once per row. Each row has 3
dropdowns: **Scope**, **Status code**, **Duration**.

**Scope dropdown** has 4 options (verified 2026-06-18):

- `Single code`
- `Greater than or equal to`
- `Less than or equal to`
- `Range` (then a second `Status code` field appears for the upper bound)

**Duration dropdown** is **preset values only** (no free-form
seconds input). Verified options:

- `No store` (don't store the response at all)
- `No cache` (store but always revalidate)
- `30 seconds`, `1 minute`, `2 minutes`, `5 minutes`, `10 minutes`,
  `15 minutes`, `30 minutes`
- `1 hour`, `2 hours`, `3 hours`, `4 hours`, `6 hours`, `12 hours`
- `1 day`, `1 week`, `1 month`, `1 year`

##### Rows to add (using exact dropdown labels)

**Critical rows** — add these two:

| #   | Scope   | Status code    | Duration   |
| --- | ------- | -------------- | ---------- |
| 1   | `Range` | `200` to `299` | `1 day`    |
| 2   | `Range` | `500` to `599` | `No store` |

> ⚠️ **Why `Range` and not `Greater than or equal to`?** Using
> "Greater than or equal to 200" matches every code from 200
> upward INFINITELY — so it overlaps with "Greater than or
> equal to 500" at 500-599. Cloudflare rejects overlapping
> ranges at deploy time with the error
> **"status_code ranges should not overlap"**. Use `Range`
> with explicit `from` and `to` to avoid this trap.

The `500-599 → No store` row is the most important — it makes it
**impossible** to cache 5xx responses, even if origin sends
Cache-Control on an error.

**Optional refinements** — add if you want fine-grained control:

| Scope         | Status code    | Duration    |
| ------------- | -------------- | ----------- |
| `Range`       | `300` to `399` | `1 day`     |
| `Range`       | `400` to `499` | `1 minute`  |
| `Single code` | `404`          | `5 minutes` |

> ⚠️ **Use `No store` (not `No cache`) for the 5xx row.** They
> sound similar but `No cache` still STORES the response and
> revalidates it on the next request — a brief 503 could still
> serve stale errors to subsequent users during the revalidation.
> `No store` blocks storage entirely.

##### How the table interacts with the radio

The Status code TTL rows **override** the base radio mode for the
matched status code. So:

- A 200 response from our origin has `Cache-Control:
public, s-maxage=300, SWR=86400` from `next.config.ts`.
- The radio says "respect cache-control" → cache for 300s.
- The Status code TTL table says `200+ → 1 day`.
- **Which wins?** With "respect_origin" semantics: Cloudflare
  uses the **shorter** of (origin's `s-maxage`, rule's TTL).
  Origin's `s-maxage=300` wins → cached for 5 min.
- A 500 response with no Cache-Control header from origin.
- The radio says "bypass if not" → don't cache.
- The Status code TTL table says `500+ → 0` → don't cache.
- Either way: never cached. Belt + suspenders.

If you want the rule's TTL to **strictly override** the origin's
header (so 200 always caches for 1 day regardless of
`s-maxage=300`), pick **"Ignore cache-control header and use this
TTL"** as the base radio. We don't want that for widgetly because
it would discard our carefully-tuned `s-maxage=300`.

##### API equivalent (for reference; the dashboard form does this for you)

```json
"edge_ttl": {
  "mode": "respect_origin",
  "status_code_ttl": [
    { "status_code_range": { "from": 200, "to": 299 }, "value": 86400 },
    { "status_code_range": { "from": 300, "to": 399 }, "value": 86400 },
    { "status_code_range": { "from": 400, "to": 499 }, "value": 60 },
    { "status_code_range": { "status_code": 404 }, "value": 300 },
    { "status_code_range": { "from": 500 }, "value": -1 }
  ]
}
```

The `mode: "respect_origin"` is what the radio "Use cache-control
header if present, bypass cache if not" maps to. The `value: -1`
is the API representation of the dashboard's `No store` option.

**About "Eligible status codes"** — this is NOT a separate section
on the form. Status-code filtering is handled **by the Status
code TTL section above** (the `200-299 → 86400`, `500-599 → 0`
rows). Every status code that's not in your mapping falls back
to the Edge TTL mode (we use `respect_origin`, so it falls back
to honoring origin's Cache-Control).

**Step 5 — Deploy**. Click the blue **Deploy** button at the
bottom right.

**Verify**:

```bash
# First request: cache miss
curl -sI https://widgetly.tech/en | grep -iE 'cf-cache-status|cache-control'
#  → cf-cache-status: MISS
#  → cache-control: public, s-maxage=300, stale-while-revalidate=86400

# Second request: cache hit (rule is working)
curl -sI https://widgetly.tech/en | grep -i cf-cache-status
#  → cf-cache-status: HIT

# /api/* should be bypassed (not in our expression)
curl -sI https://widgetly.tech/api/region | grep -iE 'cf-cache-status|cache-control'
#  → cf-cache-status: BYPASS
#  → cache-control: no-store, no-cache, must-revalidate
```

### Layer C — Strip the dynamic API surface down to what's actually needed

Today we have 6 API routes (`contact`, `diag/consent`, `diag/d1`,
`locale`, `openapi.json`, `region`, `suggest`, `waitlist`). Each
runs as a Worker invocation. With the Free 10 ms budget:

- `/api/region` — reads `cf-ipcountry` header. ~1 ms CPU.
  ✅ fine.
- `/api/diag/*` — dev-only, blocked in prod.
  ✅ fine.
- `/api/openapi.json` — serves a static spec file.
  🔴 should be a static asset, not a route.
- `/api/locale` — reads cookies + writes KV.
  🟡 fine; KV write is fast.
- `/api/contact`, `/api/waitlist`, `/api/suggest` — write to D1.
  🔴 most likely 1102 source. Optimize the D1 round-trip path.

### Layer D — Bundle size and cold-start improvements

Even on Paid, smaller is faster. Three things help:

1. **Disable production source maps** — already done (`productionBrowserSourceMaps: false`).
2. **Mark dynamic-only packages as external** — `lucide-react`,
   `framer-motion` are already in `optimizePackageImports`. Add
   `@supabase/supabase-js` if it's still bundled.
3. **Audit the Workers bundle.** Run `pnpm exec wrangler deploy
--dry-run --outdir=dist` and inspect `dist/worker.js`. Anything
   over 5 MB is a warning sign on Free.

---

## 3. Plan / next Cloudflare tier

### Stay on Free (current): $0/mo

- ✅ Works for prerendered static marketing site
- ❌ 10 ms CPU too tight for SSR
- ❌ 3 MB Worker size too tight for OpenNext bundle
- ❌ 100K req/day ceiling in sight at current growth

### Recommended: **Workers Paid** at $5/mo

- ✅ **30 s CPU default per request** (5 min max) — SSR runs without 1102.
- ✅ **10 M requests/mo included**, then $0.30/M. We're at ~25K/day
  = ~750K/mo — fits comfortably.
- ✅ **10 MB Worker size** — fits OpenNext bundle.
- ✅ **1,000 subrequests** per request — D1 fan-out is fine.
- ✅ **No daily request cap** — no more worrying about traffic spikes.
- ✅ **Same dashboard**, instant upgrade, no migration needed.
- ❌ Minimum $5/mo charge even if site is idle.

**Decision rule:** upgrade as soon as we hit either (a) ~50K req/day
sustained or (b) the next 1102 incident from a real user, whichever
comes first. Until then, the cache-first optimization (Layer B)
should suppress 1102 on marketing pages even on Free.

### When to consider the next tier ($25/mo Pro)

`Workers Paid` is the developer-platform plan. The site-level
**Cloudflare Pro** ($25/mo) is a separate upgrade that adds:

- ✅ WAF managed rules + Bot Fight Mode (security)
- ✅ Advanced DDoS protection
- ✅ Polish: 100% uptime SLA, priority support
- ✅ Image Resizing, Polish (image optimization)
- ❌ Does NOT raise Workers limits (still uses Workers Paid sub-$$)

**Decision rule:** upgrade to Pro when we care about uptime SLA
and/or when security becomes a board-level concern. For a pre-launch
catalog site, Pro is premature.

### When to consider **Workers Enterprise** (custom)

- 5-minute cron triggers
- Logpush to S3/BigQuery
- Multi-region Smart Placement
- Higher concurrent connection limits

Not relevant until we have paying customers or compliance needs.

---

## 4. Concrete action list (in priority order)

| #   | Tag | Action                                                                                                                                                                                                                                  | Why                                                                         |
| --- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | 🔴  | Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` to all `force-static` pages via `public/_headers` (Cloudflare convention)                                                                                       | Edge-caches 99% of HTML at <30 ms TTFB; Worker not invoked                  |
| 2   | 🔴  | Create a Cloudflare Cache Rule for `widgetly.tech` matching `(host eq "widgetly.tech") and (method eq "GET") and not (path starts with "/api/" or "/_next/" or "/diag")` — set edge TTL = respect existing headers, browser TTL = 0     | Belt-and-suspenders with #1; catches static assets too                      |
| 3   | 🔴  | Rewrite `sitemap.ts` to import tool list statically so it can be `force-static` and prerendered at build                                                                                                                                | Avoids 1 dynamic render per sitemap fetch                                   |
| 4   | 🟡  | Move `wly_locale` / `wly_anon` cookie writes out of `src/middleware.ts` into the client-side `useConsent` script that already exists, OR keep them but make them conditional on `Cache-Control: no-store` (i.e. only run on cache miss) | Saves ~1–2 ms CPU per request on cached pages                               |
| 5   | 🟡  | Move `/api/openapi.json` from a route handler to a static file under `public/`                                                                                                                                                          | Eliminates an entire Worker invocation per request                          |
| 6   | 🟡  | Pre-generate OG images at build time (currently server-rendered per request, hits 10 ms budget)                                                                                                                                         | Eliminates image-render CPU on first-share preview                          |
| 7   | 🟡  | Add `Cache-Control: public, max-age=31536000, immutable` to `/_next/static/*` and `/icons/*` via `_headers`                                                                                                                             | Already cached by Cloudflare by default; make it explicit                   |
| 8   | 🟡  | Audit `wrangler deploy --dry-run` output — if Worker > 5 MB, switch to `nodejs_compat_v2` + drop `global_fetch_strictly_public` if unused                                                                                               | Keeps bundle under Free limit if we stay on Free                            |
| 9   | 🟢  | Switch `/api/contact`, `/api/waitlist`, `/api/suggest` to use `caches.default` (Workers Cache API) keyed by request body for idempotent reads                                                                                           | Caches duplicate POSTs — relevant once we're on Paid with bigger CPU budget |
| 10  | 🟢  | When 1102 persists despite #1–#8, upgrade to **Workers Paid** ($5/mo). 30 s CPU makes the whole class of issues disappear                                                                                                               | Insurance policy                                                            |

---

## 5. Feature / advantage matrix

| Cloudflare feature                      | Free (current)        | Workers Paid ($5)  | Cloudflare Pro ($25) | Worth it for Widgetly?                                   |
| --------------------------------------- | --------------------- | ------------------ | -------------------- | -------------------------------------------------------- |
| Edge cache (HTML, JS, CSS, images)      | ✅ unlimited          | ✅ unlimited       | ✅ unlimited         | Yes — primary perf lever                                 |
| 100K requests/day cap                   | ⚠️ tight              | ✅ 10M/mo included | same as Workers Paid | Yes — upgrading removes the ceiling                      |
| 10 ms CPU / request                     | ⚠️ tight              | ✅ 30 s default    | same as Workers Paid | Yes — eliminating 1102                                   |
| 3 MB Worker size                        | ⚠️ tight              | ✅ 10 MB           | same as Workers Paid | Yes — OpenNext bundles are 5–8 MB                        |
| D1 (SQLite at edge)                     | ✅ 5 GB, 5M reads/day | ✅ 5 GB included   | same                 | Already using for waitlist + suggestions                 |
| KV (key-value, eventually consistent)   | ✅ 100K reads/day     | ✅ 10M reads/mo    | same                 | Commented out in wrangler.toml — re-enable if needed     |
| R2 (object storage)                     | ✅ 10 GB, 1M reads/mo | ✅ 10 GB included  | same                 | Future: when we host tool assets / images                |
| Image Resizing                          | ❌                    | ❌                 | ✅ unlimited         | When we have many tool icons to serve in many sizes      |
| Polish (lossless image compression)     | ❌                    | ❌                 | ✅                   | Same as above                                            |
| Mirage (mobile-optimized images)        | ❌                    | ❌                 | ✅                   | Probably overkill                                        |
| Web Analytics (privacy-friendly)        | ✅ free               | ✅ free            | ✅ enhanced          | Already enabled via ANALYTICS_TOKEN                      |
| WAF Managed Rules                       | ❌                    | ❌                 | ✅                   | Post-launch, before we have user traffic worth attacking |
| Bot Fight Mode                          | ❌                    | ❌                 | ✅                   | Post-launch                                              |
| DDoS protection                         | ✅ basic              | ✅ basic           | ✅ advanced          | Always on (free), advanced only matters under attack     |
| 100% uptime SLA                         | ❌                    | ❌                 | ✅                   | When we have paying customers                            |
| Priority email support                  | ❌                    | ❌                 | ✅                   | When we depend on Cloudflare for revenue                 |
| Logpush                                 | ❌                    | ❌                 | ✅ ($)               | When compliance / debugging at scale matters             |
| Smart Placement (multi-region)          | ❌                    | ✅                 | ✅                   | If TTFB to EU/Asia becomes a complaint                   |
| Queues (async jobs)                     | ❌                    | ✅ $0.40/M msgs    | same                 | When we have background work (notifications, exports)    |
| Durable Objects (stateful coordination) | ❌                    | ✅                 | same                 | When we need real-time collab features                   |
| Hyperdrive (DB accelerator)             | ❌                    | ✅ $0.02/query     | same                 | If we add Postgres / Turso for relational workloads      |

---

## 6. What "Worker only for API" actually looks like

After #1–#7 are in, the request flow for a typical homepage visit:

```
Browser GET /en
   │
   ▼
Cloudflare edge (POP nearest user, ~300 globally)
   │
   ├─ Cache hit? ──── yes ──→ serve cached HTML bytes directly
   │                          (no Worker invocation, no CPU used)
   │                          TTFB: ~10–30 ms
   │
   └─ Cache miss ───→ invoke Worker
                       │
                       ├─ Run middleware (locale detect)
                       ├─ Run Next.js SSR for /[locale]
                       ├─ Render JSON-LD
                       ├─ Return HTML + Cache-Control header
                       │
                       ▼
                     Cloudflare caches the response (s-maxage=300)
                     Next request is a cache hit
```

For `/api/waitlist` (POST):

```
Browser POST /api/waitlist
   │
   ▼
Cloudflare edge
   │
   └─ Cache Rule bypasses /api/* ──→ invoke Worker (every time)
                                      │
                                      ├─ Read body (Zod validate)
                                      ├─ INSERT INTO D1
                                      ├─ Return { ok: true }
                                      │
                                      ▼
                                     Response back to client
                                     TTFB: ~50–150 ms (D1 + Worker)
```

That's the model: **HTML = free at edge, API = paid in Workers**.
It matches the user's instinct and matches the Cloudflare design.

---

## 7. Verification

After each layer is implemented, re-verify against:

| Check                               | Command / URL                                                      | Pass criterion                          |
| ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| Prerendered routes stay prerendered | `pnpm build` log                                                   | `● /[locale]/tools/...` (filled circle) |
| Worker bundle size                  | `pnpm exec wrangler deploy --dry-run`                              | < 10 MB compressed                      |
| Edge cache hit rate                 | Cloudflare dashboard → Analytics → Cache                           | > 90% on `/[locale]/...` routes         |
| Error 1102 rate                     | Cloudflare dashboard → Workers → Errors                            | < 0.1% of invocations                   |
| Worker CPU time p95                 | Same                                                               | < 5 ms on cached routes                 |
| HTML TTFB (warm cache)              | `curl -w "%{time_starttransfer}" https://widgetly.tech/en`         | < 50 ms                                 |
| HTML TTFB (cold cache)              | Same after cache purge                                             | < 500 ms                                |
| API response time                   | `curl -w "%{time_starttransfer}" https://widgetly.tech/api/region` | < 200 ms                                |

When all rows are green, the 1102 class of issues is over.

---

## 8. References

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/about/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Error 1102 troubleshooting](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/)
- [Cloudflare Cache Rules](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [OpenNext for Cloudflare caching](https://opennext.js.org/cloudflare/caching)
- [opennextjs-cloudflare#598 — first-load 1102](https://github.com/opennextjs/opennextjs-cloudflare/issues/598)

---

## 9. OpenNext incremental cache (KV-backed)

### Why this section exists

The Cloudflare Cache Rule on its own **cannot engage Cloudflare's
edge cache for HTML responses served by OpenNext Workers**. Edge
cache works for static files (`/robots.txt`, `/_next/static/*.js`,
sitemap.xml) but Worker-served HTML bypasses it by default.

OpenNext has its own caching layer via the Workers Cache API and
KV. The previous config had `incrementalCache: "dummy"` in
`open-next.config.ts`, which meant **no caching at all** — every
request invoked the full Next.js render path, which is what caused
the random Error 1102s.

### What we set up (2026-06-18)

KV-backed incremental cache. The prerendered HTML for every
`force-static` route gets stored in a KV namespace at build time
and read on each request.

**Files changed:**

- [`wrangler.toml`](../../wrangler.toml) — added
  `[[kv_namespaces]]` block with `binding = "NEXT_INC_CACHE_KV"`.
- [`open-next.config.ts`](../../open-next.config.ts) — changed
  `incrementalCache: "dummy"` to
  `"cloudflare-kv-incremental-cache"`, and `tagCache` to the same.

### Setup (one-time, per environment)

```bash
# 1. Create the production KV namespace
pnpm wrangler kv:namespace create NEXT_INC_CACHE_KV

# 2. Create the preview KV namespace
pnpm wrangler kv:namespace create NEXT_INC_CACHE_KV --preview

# 3. Copy the printed IDs into wrangler.toml:
#    [[kv_namespaces]]
#    binding = "NEXT_INC_CACHE_KV"
#    id = "<production-id-from-step-1>"
#    preview_id = "<preview-id-from-step-2>"

# 4. Commit + push the updated wrangler.toml. Deploy will succeed.
```

After the first deploy, the Worker reads from KV on every cached
request and writes to KV at build time.

### What to expect after deploy

| Before (no cache)                         | After (KV cache)                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `x-nextjs-cache: MISS` on every request   | `x-nextjs-cache: HIT` on cached requests                                                                |
| Every request invokes full Next.js render | Cached requests bypass the render path                                                                  |
| Random 1102 errors under traffic          | No 1102 because the Worker doesn't run the render                                                       |
| TTFB ~150-700 ms for HTML                 | TTFB ~30-100 ms (KV read)                                                                               |
| `cf-cache-status` missing on HTML         | Still missing — that's expected. KV cache is INSIDE the Worker; Cloudflare's edge cache doesn't see it. |

### Trade-offs vs edge cache

|                              | Edge cache (`cf-cache-status: HIT`)  | KV cache (`x-nextjs-cache: HIT`)                                         |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| **Latency**                  | ~5-30 ms (Cloudflare global network) | ~30-100 ms (single KV read at the Worker colocated with KV)              |
| **Where it lives**           | 300+ Cloudflare POPs globally        | Single KV namespace, replicated globally but read from the local replica |
| **Available on Free plan**   | Yes                                  | Yes (100K reads/day included)                                            |
| **Bypasses Worker entirely** | Yes (Worker doesn't run)             | No (Worker still runs, but skips render)                                 |

KV cache is faster than no cache but slower than true edge cache.
For widgetly's traffic (~25K requests/day), the Workers Free KV
quota (100K reads/day) is comfortable. If we ever exceed it, upgrade
to Workers Paid ($5/mo) which raises the quota to 10M reads/day.

### What the Cloudflare Cache Rule still does

The Cache Rule we built earlier remains useful for:

- Static files (`/robots.txt`, `/_next/static/*.js`, sitemap.xml)
  that Cloudflare's edge cache DOES serve directly.
- Caching `Cache-Control`-eligible responses from any future
  Worker routes we add.

But for HTML from OpenNext, the KV cache is now the primary cache
layer. The Cache Rule is a defense-in-depth measure, not the
primary defense.

### If you see 1102 again after this change

- Check `x-nextjs-cache: HIT` — if it's still MISS, KV isn't
  engaging. Verify the binding ID in `wrangler.toml` matches the
  actual KV namespace ID in Cloudflare.
- Check Cloudflare dashboard → Workers → Logs for KV errors
  ("binding not found", "namespace not found", etc.).
- Verify OpenNext wrote to KV at build time: Cloudflare dashboard
  → Workers → KV → NEXT_INC_CACHE_KV → should have keys for each
  prerendered route.
