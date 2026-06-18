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
headers** and **Browser TTL = 0**.

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
