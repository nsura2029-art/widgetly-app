# AGENTS.md — Operations

Owns pnpm scripts, common command sequences, deploy workflow, and troubleshooting.

> **DOX scope.** This is a child of the root [`AGENTS.md`](../../AGENTS.md). **Read the root first** for the Core DOX contract (Read Before Editing, Update After Editing, Closeout). The root's Child DOX Index lists this file as the owner of pnpm scripts and operational workflows. The "Ownership" section below enumerates which surfaces this child contract governs. When you add or change a script or workflow, update this file.

---

## Purpose

- Document every `pnpm <script>` so the right command is obvious for the right task.
- Codify common multi-step workflows (push + merge + deploy) so they're reproducible.
- Capture troubleshooting steps for known failure modes.

---

## Ownership

| Surface            | File                                       |
| ------------------ | ------------------------------------------ |
| Script definitions | `package.json` `scripts` block             |
| CI workflow        | `.github/workflows/deploy.yml`             |
| wrangler config    | `wrangler.toml`                            |
| OpenNext adapter   | `open-next.config.ts`                      |
| Next.js config     | `next.config.ts`                           |
| Build wrapper      | `run-build.sh` (sandbox-side, not in repo) |

---

## Local Contracts

### Scripts must be idempotent

- Re-running `pnpm db:migrate:local` after no new migrations should be a no-op (exit 0).
- `pnpm setup:secrets` should overwrite, not duplicate.
- `pnpm deploy` (if invoked locally) should not leave half-deployed state on failure.

### Scripts must not require interactivity

- No `read -p` prompts. No `confirm()` calls.
- If a script needs input, fail fast with a clear error pointing to env vars.

### Cross-platform

- Scripts run on macOS, Linux, and Windows (PowerShell).
- Avoid bashisms. Use `node -e` for inline JS when needed.
- Use `path.resolve` not string concat for paths.

---

## Work Guidance

### pnpm scripts (canonical list)

#### Local dev

| Script         | Purpose                                                              | When to use                          |
| -------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `pnpm install` | Install deps from `pnpm-lock.yaml`. Uses corepack shims.             | After clone, after pulling new deps. |
| `pnpm dev`     | Start Next.js dev server with Turbopack.                             | Day-to-day feature work.             |
| `pnpm build`   | Run `next build` (production bundle, no Worker).                     | Quick local check before deploy.     |
| `pnpm preview` | `opennextjs-cloudflare build` + `wrangler dev`. Full Worker preview. | Final smoke test before push.        |

#### Code quality

| Script             | Purpose                                                              | When to use                                                                       |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm type-check`  | `tsc --noEmit`. No file output.                                      | Before commit, before PR.                                                         |
| `pnpm lint`        | `eslint .` (whole project).                                          | Run with `NODE_OPTIONS="--max-old-space-size=8192"` to avoid OOM on big projects. |
| `pnpm lint <path>` | Lint specific files.                                                 | Faster than full lint.                                                            |
| `pnpm test`        | Run Vitest unit/component tests once.                                | Before committing feature logic with validation or UI state.                      |
| `pnpm format`      | Prettier write.                                                      | Optional, mostly automatic via editor.                                            |
| `pnpm ship`        | Local DOD gate (lint + type-check + test). Calls `scripts/ship.mjs`. | Before push. Same code path the husky pre-push hook runs.                         |
| `pnpm ship:build`  | `pnpm ship` + `opennextjs-cloudflare build`.                         | Before merge to `develop` / `main`. Slow — CI also runs it.                       |

#### Secrets

| Script               | Purpose                                                                | When to use                              |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| `pnpm setup:secrets` | Read `.env.local`, push each `KEY=value` to Cloudflare Worker secrets. | After adding new secret to `.env.local`. |
| `pnpm secrets:list`  | List current Worker secret names (no values).                          | Audit.                                   |

#### Database

See `docs/database/AGENTS.md` for the full table. Quick reference:

- `pnpm db:create`
- `pnpm db:migrate:local`
- `pnpm db:migrate:remote`
- `pnpm db:info`
- `pnpm db:console:local`
- `pnpm db:console:remote`

#### Deploy

| Script                                  | Purpose                                           | When to use                      |
| --------------------------------------- | ------------------------------------------------- | -------------------------------- |
| `pnpm exec opennextjs-cloudflare build` | Build the Worker bundle (`.open-next/worker.js`). | Sandbox-side, before deploy.     |
| `pnpm exec wrangler deploy`             | Push the bundle to Cloudflare.                    | Manual deploy from local (rare). |

---

### Common workflows

#### 1. Push + merge + deploy (sandbox-side, Mavis-driven)

```bash
# 1. Type-check and lint
pnpm type-check
NODE_OPTIONS="--max-old-space-size=8192" npx eslint <changed-paths>

# 2. Commit (with Mavis identity, used for AI-authored commits)
cd widgetly-app
git add <paths>
git -c user.name="Mavis" -c user.email="Mavis@local" commit -m "fix(...): <summary>"

# 3. Push to feature branch
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/nsura2029-art/widgetly-app.git" chore/post-deploy-verification
git remote set-url origin "https://github.com/nsura2029-art/widgetly-app.git"

# 4. Merge to develop via API
curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/merges" \
  -d '{"base":"develop","head":"chore/post-deploy-verification","commit_message":"merge: <summary>"}'

# 5. Dispatch deploy workflow
curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/actions/workflows/deploy.yml/dispatches" \
  -d '{"ref":"develop"}'
```

#### 2. Add a new env var end-to-end

```bash
# 1. Add to local .env.local
echo "NEW_VAR=value" >> widgetly-app/.env.local

# 2. Push to Worker
pnpm setup:secrets

# 3. Add to GitHub Actions Secrets if needed in CI
#    (via repo Settings UI — cannot be done from CLI)

# 4. Verify
pnpm exec wrangler secret list
```

#### 3. Add a new D1 migration

```bash
# 1. Create migration file
cat > widgetly-app/migrations/0002_add_locale.sql <<'SQL'
ALTER TABLE waitlist ADD COLUMN locale TEXT;
SQL

# 2. Apply locally
pnpm db:migrate:local

# 3. Verify locally
pnpm db:console:local
> .schema waitlist
> .quit

# 4. Deploy (push + merge + dispatch as in workflow 1)

# 5. Apply to production AFTER deploy succeeds
pnpm db:migrate:remote
```

#### 4. Rotate a secret

See `docs/secrets/AGENTS.md` "Rotating a secret". TL;DR: update `.env.local`, `pnpm setup:secrets`, revoke at source.

#### 5. Submit URLs to IndexNow (after deploy)

```bash
KEY=$(cat widgetly-app/public/$(ls widgetly-app/public/*.txt | head -1 | xargs basename) 2>/dev/null)
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"widgetly.tech\",
    \"key\": \"$KEY\",
    \"urlList\": [
      \"https://widgetly.tech/tools/pdf/merge-pdf\",
      \"https://widgetly.tech/tools/pdf/split-pdf\"
    ]
  }"
```

---

### Troubleshooting

#### `pnpm install` fails with "command not found"

- Cause: corepack shims not on PATH.
- Fix: `export PATH="/usr/local/lib/node_modules/corepack/shims:$PATH"` (sandbox-side) or `corepack enable pnpm` (local).

#### `pnpm lint` OOM-kills

- Cause: ESLint with Next.js config can spike to 4-8 GB.
- Fix: `NODE_OPTIONS="--max-old-space-size=8192" npx eslint <path>` to scope the lint run.

#### TypeScript error `Type 'string | undefined' is not assignable to type 'string'`

- Cause: `noUncheckedIndexedAccess: true` in `tsconfig.json` makes array/object indexing return `T | undefined`.
- Fix: explicit fallback: `arr[i] ?? defaultValue` or type annotation: `const x: string = arr[i] ?? "default"`.

#### Wrangler auth fails with `code: 10000`

- Cause: API token missing required scope.
- Fix: regenerate the token at https://dash.cloudflare.com/profile/api-tokens with the right scopes (D1:Edit, Workers Scripts:Edit, Account Settings:Read).

#### GitHub API returns `401 Bad credentials`

- Cause: the `GITHUB_TOKEN` env var has been revoked.
- Fix: get a fresh PAT, store it via the platform's secret CLI, update `GITHUB_TOKEN` entry. See `docs/secrets/AGENTS.md`.

#### Deploy workflow fails on `if: ${{ secrets.X }}`

- Cause: GH Actions bans `secrets.X` in `if:` expressions (security — prevents secret leakage in logs).
- Fix: use `env.X` (set in the workflow's `env:` block) and reference `if: ${{ env.X != '' }}`.

#### `wrangler secret put --text` errors

- Cause: `--text` flag doesn't exist in wrangler 4.100.0.
- Fix: pipe via stdin instead: `echo "value" | wrangler secret put NAME`.

#### OpenNext build emits "Generating bundle" forever

- Cause: usually a syntax error or import cycle. Check `.open-next/` output for stack traces.
- Fix: run `pnpm type-check` first. If clean, check for circular imports in changed files.

#### Cloudflare Error 1102: Worker exceeded resource limits

- Symptom: live site shows "Error 1102 — Worker exceeded resource limits" with a Ray ID. Pages intermittently return the error instead of HTML.
- Cause: the route is being SSR'd on every request (CPU/memory budget per request), and a traffic spike or slow render pushes the Worker over its budget.
- Two common sources of accidental dynamic rendering in Next.js 15+:
  1. **Explicit `export const dynamic = "force-dynamic"`** on a route. Set only when you have a real per-request data need (live API call, random per-visit value, etc.).
  2. **Implicit**: `headers()` or `cookies()` called in a server component. These APIs force every page using them into dynamic rendering at the framework level — you cannot opt out.
- Detection:
  - Build log shows `├ ƒ /[route]` (ƒ = Dynamic) when it should be `├ ● /[route]` (● = Static, prerendered).
  - Prerender manifest (`.next/prerender-manifest.json`) does NOT contain the route.
  - Live TTFB on the affected page is significantly higher than other prerendered pages.
- Fix:
  1. Remove `headers()` / `cookies()` from server components wherever possible. Move the read to middleware (which sets a header or cookie), or to the client side via a fetch.
  2. Remove `force-dynamic` if you don't actually need per-request variation. For random-per-visit values, generate them client-side after mount (or accept the same value for every visitor).
  3. For routes that genuinely need to read request headers (e.g., region detection from cf-ipcountry), create a small dedicated API endpoint (e.g., `/api/region`) that's edge-cached. Call it client-side. The endpoint is the only dynamic route per page load — everything else stays static.
- Verification: build log shows `●` for the affected route. Prerender manifest includes the route. TTFB drops to <50ms warm (served from edge cache, not Worker SSR).

---

## Verification

| Check             | Command                                                                      | Pass criterion                  |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Scripts present   | `cat package.json \| jq .scripts`                                            | shows expected list             |
| pnpm resolves     | `pnpm --version`                                                             | ≥ 9.15.9                        |
| Type-check        | `pnpm type-check`                                                            | exit 0                          |
| Lint (scoped)     | `NODE_OPTIONS="--max-old-space-size=8192" npx eslint <path>`                 | exit 0                          |
| Build             | `pnpm exec opennextjs-cloudflare build`                                      | produces `.open-next/worker.js` |
| Deploy            | `gh workflow run deploy.yml --ref develop` (or sandbox-side curl equivalent) | run completes `success`         |
| **Cache healthy** | `bash scripts/verify-cache.sh`                                               | exit 0 (10/10 checks pass)      |

> The full ship-cycle gate (local lint + type-check + test + build, plus
> remote merge + deploy + live verify) lives in the root
> [`AGENTS.md`](../../AGENTS.md) § "Ship Cycle / Definition of Done".
> This table is the local subset. `pnpm ship` runs the local subset via
> `scripts/ship.mjs`; that script is the same body the husky pre-push hook
> calls — they cannot drift.

### Cache verification (`scripts/verify-cache.sh`)

The script runs 10 checks across the three caching layers:

1. **OpenNext KV incremental cache** — `x-nextjs-cache: HIT` on the 2nd
   request to the same URL. This is the headline check; if it fails,
   the Worker is re-rendering HTML on every request and Error 1102
   will return under load.
2. **Static-file edge cache** — `cf-cache-status: HIT` on `/robots.txt`.
3. **1102 sweep** — fetches 10 routes and confirms none contain
   "Error 1102" / "exceeded resource limits" / `cf-error-code`.
4. **TTFB profile** — 5 sequential requests with returning-user
   cookies. p50 should be < 500 ms.
5. **Tool page spot-check** — samples 5 tool URLs from the sitemap
   and confirms they return 200.

Run anytime to sanity-check the cache after a config change:

```bash
bash scripts/verify-cache.sh
```

Exit code is `0` if all checks pass, `1` otherwise. Override the host:

```bash
bash scripts/verify-cache.sh https://staging.widgetly.tech
```

For **manual probes by route, region, or traffic pattern** — or to
gather a Cloudflare support escalation packet — see
[`cache-test.md`](./cache-test.md).

### Manual cache probes

| Probe                      | Command                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KV cache status            | `curl -sI https://widgetly.tech/en/tools/pdf/split-pdf \| grep -iE 'x-nextjs-cache\|cache-control'`                                                                                    |
| Edge cache status (static) | `curl -sI https://widgetly.tech/robots.txt \| grep -i cf-cache-status`                                                                                                                 |
| 1102 sweep                 | `bash -c 'for p in / /en /es /fr /en/tools/pdf/split-pdf; do curl -s "https://widgetly.tech$p" \| grep -qi "1102\|exceeded resource" && echo "1102 on $p" \|\| echo "ok on $p"; done'` |
| KV namespace contents      | Cloudflare dashboard → Workers → KV → NEXT_INC_CACHE_KV → should have one key per prerendered route                                                                                    |

---

## Developer-tools troubleshooting

#### React DevTools Profiler: "Profiling not supported"

- Symptom: open Chrome DevTools → Profiler tab → click Record →
  banner says **"Profiling not supported. Profiling support requires
  either a development or profiling build of React v16.5+"**.
- Cause: production React builds strip the Profiling API. The
  Profiler tab only works against (a) dev mode (`pnpm dev`) or
  (b) a production build compiled with `--profile`. Next.js
  production builds do **not** ship a profiling build by default.
- Our React version: `react@19.2.0`, `react-dom@19.2.0` (see
  `package.json` dependencies). This is already the latest
  React major — upgrading to a newer React will not fix the
  Profiler; the issue is the build flavor, not the version.
- Impact of upgrading to React latest anyway (when a new major
  ships, e.g. React 20 if/when it lands):
  - **Bundle size**: minor. React 19's compiled output is ~6 KB
    gzipped for the core; a major bump usually shifts a few KB.
  - **Concurrent features**: progressive. We already use Server
    Components, `useTransition`, and `<Suspense>`. Nothing in the
    current widgetly surface relies on private React APIs.
  - **Breaking changes**: each major historically renames or
    removes a couple of APIs. Quick check via
    `pnpm exec next-codemod@latest next-16-react-19-upgrade`
    catches most of them.
  - **Cost**: ~1 day of work for the upgrade itself + ~1 day
    of regression testing (we have no automated browser tests
    yet, so the regression pass is manual).
- Practical fix for Profiler: run `pnpm dev` locally, navigate to
  the page under test, then start recording in the Profiler tab.
  The dev server compiles with the Profiling API enabled. If
  you need Profiler data against production, install the
  [React DevTools Profiling build extension](https://react.dev/learn/react-developer-tools)
  (currently in preview) which can attach to production
  bundles — or temporarily set `__PROFILE__` in your local
  Next.js fork and rebuild.
- Related: if Profiler fires many synthetic events, you may see
  RSC prefetches 503. See "503 on tool pages during Profiler
  recording" below.

#### 503 on tool pages during Profiler recording

- Symptom: Chrome DevTools Network tab shows `?_rsc=1_xxx`
  requests to `/en/tools/[category]/[tool]` returning **503
  Service Unavailable**, often 6+ in parallel. Trigger is the
  React DevTools Profiler recording synthetic events (mouseovers)
  which cause every visible Next.js `<Link>` to prefetch its
  RSC payload.
- Cause: Cloudflare Workers Free has a 10 ms CPU / request
  budget and a tight per-isolate concurrent capacity. 6+
  parallel prerender requests blow past the budget on the
  losing requests.
- Fix: every `<Link>` to a `/tools/[category]` or
  `/tools/[category]/[tool]` route already has `prefetch={false}`
  (these are all `force-static` pages — see
  [`tools-banner.tsx`](../../src/components/layout/tools-banner.tsx)
  for the rationale). If you see this error after adding new
  tool Links, make sure `prefetch={false}` is set on them too.
  See [`AGENTS.md`](../../AGENTS.md) § "Ship Cycle / Definition
  of Done" and the "anti-pattern" table.
- Note: the user-facing navigation is NOT broken — Next.js
  falls back to a full HTML load when RSC prefetch fails. The
  503s are visible only in the Network tab (and to the
  Profiler).

#### Edge cache not engaging — `cf-cache-status` header missing

- Symptom: Cache Rule is deployed, Edge TTL is set to "Use
  cache-control header if present", origin returns
  `Cache-Control: public, s-maxage=300, ...`, but no
  `cf-cache-status` header appears on responses. Curl shows:
  ```
  cache-control: public, s-maxage=300, stale-while-revalidate=86400
  set-cookie: NEXT_LOCALE=en; Path=/; SameSite=lax
  set-cookie: wly_locale=en; ...
  set-cookie: wly_anon=...; ...
  ```
- Cause: Cloudflare's `bypass_by_default` Edge TTL mode bypasses
  cache for responses with `Set-Cookie` headers, regardless of
  Cache-Control. The Cache Rule "Eligible for cache" eligibility
  enables the rule but doesn't override the Set-Cookie bypass in
  this mode.
- Fix (architecture): make the middleware skip Set-Cookie for
  returning users. See
  [`src/middleware.ts`](../../src/middleware.ts) — `wly_locale`
  is now only set if the request cookie is missing or differs
  from the resolved locale; `wly_anon` was already conditional;
  `NEXT_LOCALE` (set by next-intl internally) is stripped from
  the response when the request cookie already matches. Result:
  returning users get a no-Set-Cookie response, which is
  cacheable.
- Fix (config, less ideal): switch the Edge TTL mode to
  "Ignore cache-control and use this TTL" and set the Input TTL
  dropdown explicitly. This forces caching despite Set-Cookie
  but discards the `s-maxage=300` from `next.config.ts`.
- Verification: after deploying the middleware fix, curl twice:
  `curl -sI https://widgetly.tech/en | grep -i cf-cache-status`
  → 1st: `MISS`, 2nd: `HIT`.

---

## Site-wide layout: max-width 1600px

The site's content rail is capped at **1600px** on wide viewports. Updated 2026-06 from 1440px. The new breakpoint in `src/app/globals.css` is `1760px` (the responsive `min-width: 1760px` media query applies `max-width: 1600px` to the `.container` utility).

- **Why 1600px**: the tool-category grids (3-col on desktop) and the leaderboard / suggest boards are wider than the previous 1440 cap could comfortably accommodate at 1920px viewports. 1600px leaves a balanced gutter (~160px per side at 1920px, ~480px at 2560px) while keeping line lengths readable.
- **What changed**: `.container` `@utility` definition in `src/app/globals.css`, the `--container-2xl: 1600px` token, the `max-w-[1600px]` cap in the `ToolsBanner` mega panel, and the `// Tailwind's .container, 1600px max` comment in `PageShell`.
- **What didn't change**: per-route `max-w-3xl` / `max-w-2xl` content caps (the inner content cards stay narrow — only the outer rail widened). The mobile-first breakpoints (640/768/1024/1280px) are unchanged.
- **Verification**: `curl -s https://stage.widgetly.tech/en | grep 'mx-auto'` and confirm the inner container still has `max-width: 1600px` style. Visual check on a 1920x1080 display: the hero, content cards, and footer should all share the same horizontal edges with ~160px gutters on either side.

---

## Sticky chrome layering

The site has three sticky bands, layered top-to-bottom with explicit `z-index` values to prevent z-fighting:

| Layer        | z-index | Top offset                         | Component                      |
| ------------ | ------- | ---------------------------------- | ------------------------------ |
| Brand header | `z-50`  | `top-0`                            | `ClientHeader` (logo + nav)    |
| Tools banner | `z-40`  | `top-16` (under header, h-16)      | `ToolsBanner` (category chips) |
| Breadcrumb   | `z-30`  | `top-24` mobile / `top-28` desktop | `Breadcrumb` (page trail)      |

Updated 2026-06 — both the tools banner and the breadcrumb are now **sticky** (previously non-sticky by design). Rationale: users navigating long tool / suggest lists reported losing their orientation when the category chips and the breadcrumb scrolled away. Pinning them keeps a context anchor always visible.

- `top-16` = 4rem (header height) — the banner sits directly under the header.
- `top-24` / `top-28` = 6rem / 7rem (header + banner stack) — the breadcrumb sits under the banner, with a small visual gap so the chrome doesn't blur into one band.
- `scroll-margin-top` in `globals.css` is set to `calc(var(--wly-header-height) + 1.5rem)` so anchored headings (e.g. `/#features`) still clear the brand header. The sticky banner and breadcrumb naturally sit above the heading when you scroll.
- The mega-menu panel (when open) renders at `z-40` and is anchored `absolute top-full` to the banner — same layer as the banner, so it opens flush with the band's bottom edge.

---

## /suggest status semantics

The `/suggest` board and the `/leaderboard` page both treat `in_review` as the public-facing **"Suggested"** state:

- **DB value**: `in_review` (no migration; the value is internal).
- **Public UI label**: `Suggested` everywhere a user sees the status (board cards, detail page, leaderboard card, filter dropdown).
- **Why split**: the user mental model for a fresh submission is "I just suggested a tool", not "Widgetly is reviewing my tool". Showing "In review" implied internal action that may not have happened yet, and made the suggest button feel disconnected from the public board. Splitting the value from the label keeps the rest of the pipeline (`setSuggestionStatus` admin updates, email templates, internal reports) using the precise `in_review` value while showing visitors a more natural "Suggested" tag.

The `suggestionStatusLabel()` helper in `src/lib/d1/suggestions.ts` is the single source of truth for the public label. The i18n bundle keys (`en/es/fr` under `suggest.filters.statusSuggested`) override it in the filter dropdown so the locale-appropriate translation flows through.

---

## Suggestion form: category is mandatory

Updated 2026-06 — the `category` field on `/suggest/new` is now required. The form starts with `category = ""` (empty string) and the Zod schema in `src/lib/suggestions/validation.ts` rejects empty values with "Please choose a category."

- A "Select a category…" placeholder option (`<option value="" disabled>`) is the first option in the dropdown so the empty value is visible to the user instead of silently picking a default.
- The dropdown now includes an **"Other"** option as the catch-all bucket for tools that don't fit any of the 11 defined categories (PDF, Image, SEO, Dev, AI, Video, Calculators, Converters, Writing, Business, Education).
- `normalizeCategory()` in `src/lib/d1/suggestions.ts` now maps unknown / empty values to `"Other"` instead of the previous silent default of `"AI"`. This was a real bug: any suggestion that didn't fuzzy-match a known category got re-bucketed into AI.
- The form's submit button stays disabled until `validateSuggestionForm(form)` returns `success` — the disabled state is bound to the validation result, so an empty / invalid category prevents submission.

---

## /suggest?status=live — union of suggestions and admin catalog

Updated 2026-06 — `/suggest?status=live` now shows the **union** of:

1. `suggestions` rows where `status='live'` (community ideas that have been promoted to shipped).
2. `admin_tools` rows where `status='live'` (curated catalog of live tools, regardless of whether they originated from a user suggestion).

The two queries run in parallel; results are merged and de-duplicated by `slug` so a tool that exists in both the suggestions board and the admin catalog only shows up once.

- The new `listLiveToolsFromAdminCatalog()` helper in `src/lib/d1/suggestions.ts` reads from `admin_tools` and shapes the result as `SuggestionRecord` so the page doesn't need any view-specific code.
- The merge is conditional: only when `?status=live` is set. Other status filters (`in_review`, `building`, `rejected`) still read exclusively from `suggestions`.
- Negative IDs (`-row.id`) are used for admin-catalog rows so any downstream join / dedup can tell them apart from user-submitted suggestions. Public-facing UIs never surface the ID.

---

## /leaderboard — "Top suggestions" section

Updated 2026-06 — the leaderboard page now has a "Top suggestions" section between the featured creator and the contributor tab bar. It shows the top 6 user-submitted suggestions ranked by upvotes (excluding rejected rows).

- The new `listTopSuggestions(limit)` helper in `src/lib/d1/suggestions.ts` reads the top N suggestions directly from D1.
- The new `TopSuggestionCard` component in `src/app/[locale]/leaderboard/page.tsx` renders each row with vote count, name, category, status pill, and a link to the detail page.
- This is **independent of the contributor leaderboard** below it — the contributor tab bar still ranks `users` by `contributions` table entries. The two surfaces don't share data; they share a page.

---

## Hero CTA: "Join waitlist" removed

Updated 2026-06 — the hero CTA row on the landing page used to be:

```
[Suggest a tool]  [Join waitlist →]
```

It now is:

```
[Suggest a tool]  [Browse tools →]
```

The "Join waitlist" button has been removed and the `Waitlist` section is no longer rendered. The `/api/waitlist` endpoint and the `waitlist` D1 table remain in place — we may re-enable the section for a future beta program. The endpoint is still wired in case other surfaces (footer, blog) want to add a waitlist capture later.

## Child DOX Index

| Subtree                                          | Owns                                                                                                                                                                                                                                                        | AGENTS.md                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/operations/cloudflare-optimization.md`     | Cloudflare plan/tier analysis, edge-cache strategy, Error 1102 fix roadmap, Free vs Paid vs Pro feature matrix. Architecture + design.                                                                                                                      | [`docs/operations/cloudflare-optimization.md`](./cloudflare-optimization.md)         |
| `docs/operations/cache-test.md`                  | Manual cache testing runbook: probes by URL, by route type, by region (global rollout), by traffic pattern (burst/soak/cold), 1102/5xx sweeps, and a Cloudflare support escalation packet (account/zone/Worker/KV IDs, when to escalate, support channels). | [`docs/operations/cache-test.md`](./cache-test.md)                                   |
| `docs/operations/deploy-admin-tools-grouping.md` | One-off runbook for shipping the admin-tools-grouping + public-menu-live-only change: ship gate, commit, push, stage seed, stage verify, prod seed, prod verify, rollback.                                                                                  | [`docs/operations/deploy-admin-tools-grouping.md`](./deploy-admin-tools-grouping.md) |

_Other than the above, Operations is a leaf domain — pnpm scripts and workflows live entirely in this AGENTS.md._
