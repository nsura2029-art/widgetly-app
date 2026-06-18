# Future Work

A living list of suggestions, technical debt, security items, and
feature ideas for the Widgetly app. This is **not** a roadmap —
it's a parking lot. Items here are not committed-to; they're
"someone thought this was a good idea, file it so we don't
re-litigate it later."

Each item is tagged:

- 🔴 **Action required** — actively bleeding, fix before
  launch or do it now.
- 🟡 **Should do** — known gap with a clear path forward.
- 🟢 **Nice to have** — only after the things above.
- ⚠️ **Security** — leak, exposure, or hardening item.

The list is reverse-chronological: newest at the top. The date
in brackets is when the item was filed.

---

## 🔴 Cloudflare edge-cache plan + Error 1102 fix [2026-06-18]

Random Error 1102s ("Worker exceeded resource limits") are coming
from the **Workers Free** 10 ms CPU budget. Root cause is structural
— Next.js SSR + i18n + middleware can't reliably finish in 10 ms,
and our Worker bundle is over the 3 MB Free limit anyway.

Full analysis + tier recommendation + 10-item priority list lives
in [`docs/operations/cloudflare-optimization.md`](./docs/operations/cloudflare-optimization.md).
TL;DR:

1. **Cache HTML at the edge** with `Cache-Control: public,
s-maxage=300, stale-while-revalidate=86400` — added to
   `public/_headers` for all `/en/*`, `/es/*`, `/fr/*` routes.
2. **Add a Cloudflare Cache Rule** in the dashboard that bypasses
   `/api/*`, `/_next/*`, `/diag/*` and caches everything else for
   5 min edge TTL. (Dashboard step, can't be done from the repo.)
3. **Rewrite `sitemap.ts`** to import tool data statically so it
   can be `force-static` instead of `force-dynamic`.
4. **Strip middleware cookie writes** off cache-miss paths only, OR
   move `wly_locale` / `wly_anon` to a client-side script.
5. **Move `/api/openapi.json`** from a route handler to a static
   file under `public/`.
6. **Pre-generate OG images** at build time so `opengraph-image.tsx`
   stops costing CPU per share preview.
7. **If 1102 persists**, upgrade to **Workers Paid** ($5/mo) — 30 s
   CPU + 10 MB Worker size + 10M req/mo. Decision rule: upgrade when
   traffic hits ~50K req/day sustained OR after the next 1102 from
   a real user, whichever comes first.

## 🟡 Cloudflare tier — current vs next [2026-06-18]

| Tier               | Cost      | CPU/req                 | Req cap         | Worker size | Worth it?                                    |
| ------------------ | --------- | ----------------------- | --------------- | ----------- | -------------------------------------------- |
| Workers Free       | $0        | 10 ms                   | 100K/day        | 3 MB        | ⚠️ we're here, 1102s prove it's too tight    |
| Workers Paid       | **$5/mo** | 30 s default, 5 min max | 10M/mo included | 10 MB       | ✅ recommended next step                     |
| Cloudflare Pro     | $25/mo    | (same as Paid)          | (same)          | (same)      | 🟡 post-launch, when uptime SLA / WAF matter |
| Workers Enterprise | custom    | (same)                  | (same)          | (same)      | 🟢 not yet                                   |

Cloudflare Pro adds: WAF managed rules, Bot Fight Mode, advanced
DDoS, Image Resizing/Polish/Mirage, 100% SLA, priority support.
None of those raise Workers limits. The "Workers Paid" upgrade is
**separate** from the "Cloudflare Pro" site-plan upgrade.

## 🟢 Cloudflare features we don't use yet [2026-06-18]

Things available on our current or next tier that would help
specific workloads — file for later:

- **KV** — eventually-consistent key-value store. Commented out in
  `wrangler.toml`. Re-enable when we need per-user preference
  storage beyond cookies (e.g. saved tool collections).
- **R2** — S3-compatible object storage with zero egress. Useful
  when we host our own tool icons / images instead of pulling from
  external CDNs.
- **Queues** — async job queue ($0.40/M msgs on Paid). Useful for
  webhook delivery, exports, batch notifications.
- **Smart Placement** — multi-region Worker routing. Useful if
  TTFB to EU/Asia becomes a complaint.
- **Hyperdrive** — Postgres accelerator. Useful if we add a
  relational DB (Turso, Neon, Supabase Postgres) for non-edge data.
- **Durable Objects** — stateful coordination. Useful for real-time
  collab (e.g. shared tool workspaces).
- **Image Resizing / Polish / Mirage** — only on Cloudflare Pro.
  Useful when we have many tool icons to serve at many sizes with
  best-in-class compression.
- **Logpush** — stream Worker logs to S3/BigQuery. Useful for
  compliance + debugging at scale.
- **Web Analytics** — already enabled via `ANALYTICS_TOKEN`.

---

## ⚠️ Security — GitHub PAT leak [2026-06-15]

A GitHub personal access token (PAT) was pasted into chat
multiple times across this session. Every push during the session
came from that token. **Revoke it at
github.com → Settings → Developer settings → Personal access
tokens → Tokens (classic)** and mint a new one. Move it to
`GITHUB_TOKEN` in a `.env` file you `source` before running
`git push` — never paste it into chat.

## ⚠️ Security — Supabase secret in git history [2026-06-15]

A `5bba304` commit included a real `SUPABASE_SERVICE_ROLE_KEY`
in `.env.example` (which is committed). The file has been
corrected in `7759868`, but the secret is **still in git
history** and reachable via `git log -p`. Two consequences:

1. **Rotate the key** in the Supabase dashboard → Settings →
   API → "Generate new secret key" → put the new value in
   `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` for each
   environment.
2. (Optional) The old key is also the **wrong type**: the
   user's `.env.local` has an `sb_publishable_*` value, but
   the service role slot should hold an `sb_secret_*` value
   from the same dashboard. The error surfaces as 401s on
   `/api/waitlist` and `/api/suggest`.

## 🔴 Supabase env: publishable vs secret key [2026-06-15]

`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is set to an
`sb_publishable_*` value, but the variable name implies the
service role. Either rename the variable to
`SUPABASE_PUBLISHABLE_KEY` (and use the publishable key for
client-side reads) or paste a real `sb_secret_*` value into the
service role slot. The anon publishable key bypasses RLS only
on `select`; any `insert`/`update`/`delete` on behalf of the
server needs the service role.

## 🔴 opennextjs-cloudflare: Next 16 proxy.ts workaround

[2026-06-15]

`@opennextjs/cloudflare@1.19.11` predates Next.js 16's
`proxy.ts` convention. The build's pre-check trips on
`functions-config-manifest.json` because Next 16 always
labels the proxy as `"runtime": "nodejs"` in that manifest,
even though the file is edge-safe (Web Crypto + NextRequest
APIs only — no Node APIs, no fs, no Buffer).

The deploy is correct regardless: `open-next.config.ts`'s
`middleware` block wraps the proxy in the `cloudflare-edge`
worker wrapper, which is what actually matters at deploy
time.

**Workaround** in place:

- `scripts/patch-opennextjs-cloudflare.sh` rewrites the
  `useNodeMiddleware()` function in
  `node_modules/@opennextjs/cloudflare/dist/cli/build/utils/middleware.js`
  to always return `false`. Idempotent (checks for a marker
  comment before re-applying).
- `postinstall` in `package.json` runs the script after
  every `pnpm install`, so the patch survives reinstalls.
- `src/proxy.ts` is the standard Next 16 convention — no
  changes needed.

**When to remove:** when `@opennextjs/cloudflare` ships a
version that recognizes the Next 16 `proxy.ts` manifest
format natively. Check the opennextjs-cloudflare CHANGELOG
on each minor release. The patch script's comment block
documents the rationale, so the next maintainer knows why
it's there.

**Symptom if the patch doesn't run:** `pnpm deploy` errors
with `Node.js middleware is not currently supported.
Consider switching to Edge Middleware.` and exits before
reaching `next build`.

## 🔴 Pre-commit hook: `.env.example` must not contain real

values [2026-06-15]

`5bba304` committed real Supabase credentials into
`.env.example`. We fixed the file in `7759868` but there's no
guardrail preventing the next leak. Add a `lint-staged` check
that greps `.env*` files for `sb_publishable_*` / `sb_secret_*`
patterns and rejects the commit. Two approaches:

- A 10-line Node script in `scripts/check-no-real-secrets.mjs`
  that runs on `.env*` files and exits non-zero on a hit.
- A `gitleaks` hook (`pnpm add -D gitleaks`) with a tiny
  custom ruleset that catches the Supabase key shape.

## 🟡 Lawyer review of legal docs [2026-06-15]

`src/content/legal/{privacy,terms,cookies}-policy.tsx` were
filled to a developer's checklist (CCPA opt-out, GDPR
versioning, consent flow, third-party list). Real compliance
language gets reviewed by counsel. Treat the current text as
v0; have a privacy lawyer do a 1-2 hour review before public
launch and again on any schema-level change. The lastUpdated
dates should be touched whenever the content changes.

## 🟡 Consent feature: `functional` category

[2026-06-15]

The current consent categories are `essential`, `analytics`,
`advertising`. The first is locked on; the latter two default
off. A `functional` category is needed when any feature wants
to:

- Remember a user choice across sessions (e.g. tool
  preferences, theme, recently visited list when used for
  cross-session personalization).
- Load a feature-flagged third-party SDK that is not strictly
  necessary.

Adding the category:

1. Extend `ConsentCategory` in `src/lib/consent/types.ts`.
2. Add the boolean field to `ConsentState` +
   `DEFAULT_CONSENT`.
3. Bump `CONSENT_VERSION` to force a re-prompt.
4. Add a `<ConsentRow>` in `ConsentPreferencesModal.tsx`.
5. Add `consent.categories.functional.*` to en/es/fr.
6. Update `src/content/legal/cookies-policy.tsx`.

The recently-visited feature shipped as "strictly necessary"
for v1 (short list, device-local, no personalization). Move
it to `functional` if you ever start ranking/personalizing
based on it.

## 🟡 History feature: per-tool tracking

[2026-06-15]

`src/lib/history.ts` records **category** visits today. The
example tools on each category page are `<li>` anchors, not
real routes. When individual tool routes ship
(`/tools/pdf/merge`, etc.):

1. Extend `HistoryItem` with an optional `toolSlug` field.
2. Add a `recordToolVisit(category, toolSlug, name)` that
   records the tool entry.
3. Update the pill UI in `RecentlyVisited.tsx` to show the
   tool name and link to `/tools/<category>/<toolSlug>`.
4. Decide whether to keep category visits too (probably yes,
   for the `/tools` grid Continue strip).

## 🟡 History feature: server-side sync

[2026-06-15]

When accounts ship, the local `wly_history` can be merged into
the user row in Supabase on first sign-in. After that, the
client can drop the local list and read from the server. The
`removeFromHistory` function already exists for selective
removal.

## 🟢 History feature: on the homepage

[2026-06-15]

`<RecentlyVisited />` is layout-agnostic. Drop it into
`src/app/[locale]/page.tsx` between the hero and the features
section to surface it on the homepage. Empty state is still
hidden (no sad box).

## 🟢 History feature: relative-time labels in user's

locale [2026-06-15]

`relativeTime()` in `recently-visited.tsx` returns English
strings (`"just now"`, `"2h ago"`, `"yesterday"`). Wrap these
in `useTranslations("history.time")` for i18n. The Spanish and
French translations need to be added to the three message
files.

## 🟡 Region detection: locale fallback for client

[2026-06-15]

`regionFromLocale()` exists for client-side use but is not
called anywhere yet. The banner reads the region from
`useConsent().region` (set server-side from cf-ipcountry).
If the banner is ever rendered on a client-only path (e.g.
inside a modal that lives on a different page), call
`regionFromLocale(navigator.language)` as a fallback.

## 🟢 Cloudflare Web Analytics token [2026-06-15]

The wrangler.toml references an `ANALYTICS_TOKEN` env var for
Cloudflare Web Analytics (privacy-respecting, no cookies).
Once that's wired up, add the script tag to the layout (it's
currently not in `src/app/[locale]/layout.tsx`). Set the token
with `wrangler secret put ANALYTICS_TOKEN` — it goes in the
`<head>` via a small script.

## 🟢 Add a `<ConsentGate category="analytics">` test

harness [2026-06-15]

There's no automated test that confirms a `<ConsentGate>` block
does NOT render until the user consents. Adding a Playwright
probe for the gate behavior (when one is wired up) would
prevent regressions.

## 🟢 Pre-commit hook: lint-staged runs prettier on

JSON [2026-06-15]

The i18n message files occasionally get hand-edited with
trailing commas or wrong indentation. Add `prettier --check
src/i18n/messages/*.json` to the `lint-staged` config. Already
runs `tsc --noEmit` on pre-push; consider adding `prettier
--check .` to the same step for the whole tree.

## 🟢 `Home` and `FAQ` collapse-icons warning

[2026-06-15]

`Each child in a list should have a unique "key" prop. Check
the render method of SocialProof` / `Footer` shows up on
every page render. It's a pre-existing warning (not from this
session's code), but it would be nice to fix. Likely culprits
are the social-proof icons list and the footer column link
lists. Add explicit `key={...}` props.

## 🟢 `key` prop missing on

`src/components/landing/social-proof.tsx` [2026-06-15]

Specifically: the inline `<lucide-twitter>` and similar SVG
icons inside the footer social links are missing keys. Add
`key={icon.name}` to the map callback.

## ⚠️ Security: rotate Supabase project URL

[2026-06-15]

The Supabase project URL `https://fqrdpxudkwxxnxoknkxw.supabase.co`
is in `.env.example` (and in git history). Project URLs aren't
secret per se, but the project ref is enumerable and an
attacker who finds a leaked secret can use the URL to map
keys to projects. Consider whether the existing rotation is
sufficient; if not, spin up a new Supabase project and migrate.

## 🟢 Migrate to Cloudflare D1 + R2 for self-hosted

waitlist [2026-06-15]

Currently the waitlist / suggest endpoints POST to Supabase.
Two reasons to migrate later: (a) Supabase adds a
per-row-storage cost that doesn't scale, (b) the waitlist
data is read-once at launch and never joined to anything. A
D1 table (or even better, a Cloudflare Worker that forwards
to a Discord webhook directly) is simpler and cheaper. See
`WAITLIST_WEBHOOK_URL` in `wrangler.toml` — it's already an
optional fallback path.

## 🟢 Add `not-found.tsx` and `error.tsx` for every

locale [2026-06-15]

`src/app/[locale]/error.tsx` exists (caught the
`Maximum update depth exceeded` during the history-feature
debug). `not-found.tsx` may be missing. Verify both exist
in the locale subtree and don't fall back to a generic
non-branded page.

## 🟢 Test against real mobile devices [2026-06-15]

The Playwright probes run in headless Chromium. Use
BrowserStack / a real iPhone + Android to spot-check the
consent banner, the recently-visited strip, and the
form-submission flows on actual mobile. Emulator ≠ real
device for the consent-store / localStorage behavior on
private-browsing modes (Safari iOS, in particular, evicts
localStorage under memory pressure).

## 🟢 Lighthouse + a11y audit [2026-06-15]

Run `pnpm build && pnpm start` and Lighthouse against
`/en`, `/en/tools`, `/en/privacy-policy`, `/en/cookies-policy`.
Target: Performance 90+, Accessibility 95+, Best Practices
95+, SEO 100. Pay particular attention to:

- Color contrast on the consent banner's primary button
  (it uses the brand gradient).
- Tap targets on the consent-modal switches (44px minimum).
- LCP on the homepage (hero + first mascot).

## 🟢 Playwright probe for the waitlist / suggest

endpoints [2026-06-15]

There's no end-to-end probe for the public API. Adding
`/workspace/probe-api.js` (similar shape to
`probe-consent.js` / `probe-history.js`) that posts a
waitlist email and a tool suggestion, then verifies the
Supabase row appears, would close the last un-tested
integration. Block on Supabase env working first.

## 🟢 Restore the dev / preview parity check

[2026-06-15]

The dev server (Turbopack + Node) and the deployed preview
(Cloudflare Workers + opennextjs-cloudflare) have different
runtimes. The diag endpoints have a `process.env.NODE_ENV
=== "production"` check; a corresponding `if (cf-context)`
helper would let us opt-into runtime-specific branches
cleanly. Today we're relying on `runtime = "edge"` in route
files. Consider a shared `lib/env.ts` that surfaces
`isDev / isPreview / isProduction` for cleaner branching.

---

## How to use this file

- **Adding**: append to the top under the appropriate tag.
- **Resolving**: delete the item. If the resolution is
  interesting (e.g. a non-obvious gotcha), move the
  takeaway to a code comment in the relevant source file
  instead.
- **Reviewing**: skim the 🔴 + ⚠️ items at the start of
  every week. Promote the ones that still apply to a
  GitHub issue if they need tracking; close the rest.
