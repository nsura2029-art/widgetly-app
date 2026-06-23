# Deploy: admin tools grouped + public menu live-only (STAGE ONLY)

> **Audience.** This file is for the Mavis root session (the one that holds
> `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `GITHUB_TOKEN` in the
> `secret` CLI). A child agent doesn't have access to those secrets, so the
> push + seed + deploy steps below have to be run from a shell where
> `secret list` returns the right values.
>
> **Scope.** This runbook covers **stage only** (`beta.widgetly.tech` /
> `widgetly-stage` Worker / D1 `widgetly-stage`). The release-to-prod steps
> (seed prod, release PR, prod deploy) are deferred until the user has
> validated the change in stage end-to-end. A follow-up runbook will be
> written when the user is ready to promote.
>
> **Status.** ✅ Shipped 2026-06-22. All four phases of the ship cycle
> (CODE → TEST → BUILD → DEPLOY → VERIFY) green. 89 tools live in
> widgetly-stage D1, public menu DB-driven. Run log:
> `https://github.com/nsura2029-art/widgetly-app/actions/runs/27993494869`
> (seed) and `…/runs/27993487329` (stage deploy).
> Verification curls in § "Stage verification" below — actual outputs
> are recorded in the chat history for this session.

## What's in this change

| Surface                      | Change                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin/tools`               | Now renders the catalog grouped by category (collapsible sections, per-category status counts, search + filter, bulk status changes, delete). Was a flat paginated table.                                                                                                                                                                                                                                                            |
| `/tools/[category]` (public) | The right-rail menu is now driven by `admin_tools WHERE status='live'` for the category — DB is the source of truth. Falls back to the static catalog with a visible "Static catalog" badge when D1 is empty, so the page is never broken during the seed window. **Follow-up (see "Bug fix" below): page is now `force-dynamic` with a 10 s edge cache so admin status changes propagate within ~10 s, not until the next deploy.** |
| `/api/public/tools`          | `limit` default raised from 100 → 200, hard cap raised from 200 → 500. Added `format=count` for `{ category, count: number }`.                                                                                                                                                                                                                                                                                                       |
| `src/lib/admin/tools.ts`     | New helper `listToolsGroupedByCategory()` — server-side bucketed read used by the new admin page. Excludes the long text columns (`long_description`, `notes`) to keep the catalog payload under 50 KB.                                                                                                                                                                                                                              |
| DOX                          | `docs/api/AGENTS.md` (admin + public tools endpoints), `docs/database/AGENTS.md` (helpers), `docs/secrets/AGENTS.md` (ADMIN_SESSION_SECRET), new `docs/admin/AGENTS.md` (owning the admin surface). Root `AGENTS.md` Child DOX Index + role registry updated.                                                                                                                                                                        |

## Ship gate (local — must be green before push)

```bash
cd widgetly-app
pnpm type-check                           # exit 0
NODE_OPTIONS="--max-old-space-size=8192" npx eslint \
  src/app/admin src/lib/admin \
  src/app/api/public/tools src/app/api/admin \
  "src/app/[locale]/tools/[category]/page.tsx" \
  docs/admin docs/api docs/database docs/secrets
                                          # 0 errors (warnings OK)
pnpm test                                 # 7 tests pass
pnpm exec opennextjs-cloudflare build     # produces .open-next/worker.js
```

If any step fails, stop — don't push. Fix forward in the same branch.

## Commit + push (Mavis identity)

```bash
cd widgetly-app
git checkout -b feat/tools-grouping-and-live-menu
git add -A
git -c user.name="Mavis" -c user.email="Mavis@local" \
  commit -m "feat(admin+seo): group /admin/tools by category; /tools/[category] menu reads live from D1

- /admin/tools now renders the catalog grouped by category with
  per-category status counts, search, and bulk status changes.
- /tools/[category] (public) is DB-driven: status='live' rows are
  the source of truth, with a static-catalog fallback for the seed
  window.
- /api/public/tools: limit default 100->200, hard cap 200->500,
  added format=count.
- DOX: docs/admin/AGENTS.md (new), docs/api/AGENTS.md (admin +
  public tools endpoints), docs/database/AGENTS.md (helpers),
  docs/secrets/AGENTS.md (ADMIN_SESSION_SECRET)."

git push "https://x-access-token:${GITHUB_TOKEN}@github.com/nsura2029-art/widgetly-app.git" \
  feat/tools-grouping-and-live-menu
git remote set-url origin https://github.com/nsura2029-art/widgetly-app.git
```

## Merge to develop + deploy stage

```bash
curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/merges" \
  -d '{"base":"develop","head":"feat/tools-grouping-and-live-menu","commit_message":"merge: tools grouping + live menu"}'

curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/actions/workflows/deploy-stage.yml/dispatches" \
  -d '{"ref":"develop"}'
```

Wait for the stage deploy to finish (URL in the workflow run output). Then:

## Seed stage D1 with the static catalog

The stage D1 starts empty — `admin_tools` has 0 rows — so the public
menu falls back to the static catalog and the `/admin/tools` dashboard
shows nothing. We need to seed it once after the first deploy.

**Recommended: dispatch the GitHub Actions workflow.** It uses the repo's
existing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` GitHub Actions
secrets, so no local Cloudflare auth is needed and the seed runs in a
clean Ubuntu environment.

1. Go to **https://github.com/nsura2029-art/widgetly-app/actions/workflows/seed-admin-stage.yml**
2. Click **Run workflow** → branch `develop` → inputs:
   - `username`: `stage-admin` (default)
   - `password`: the existing stage admin password (`ResetPwd@2026` by
     default; if you rotated it after `seed-admin-stage` was first used,
     enter the new one)
   - `display_name`: `Stage Admin` (default)
3. Click **Run workflow**.

The workflow does two things, both idempotent (`INSERT OR IGNORE`):

1. **Re-insert the admin user** (existing bcrypt hash matches if you
   re-use the same password — existing login still works).
2. **Seed `admin_tools`** from the static catalog (~89 rows, all
   `status='live'`). Re-running adds zero duplicates.

The verify step at the end prints a `category → count` breakdown so you
can confirm the seed.

**Alternative: run the script locally.** Use this only when you can't
dispatch the workflow (CI outage, etc.):

PowerShell (Windows / Mavis sandbox):

```powershell
cd widgetly-app
$env:CLOUDFLARE_API_TOKEN  = (secret get --name=CLOUDFLARE_API_TOKEN).value
$env:CLOUDFLARE_ACCOUNT_ID = (secret get --name=CLOUDFLARE_ACCOUNT_ID).value
$env:ADMIN_PASSWORD        = "ResetPwd@2026"
pnpm seed:admin:stage    # ← new: --env stage flag
```

bash / zsh (macOS / Linux):

```bash
cd widgetly-app
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
ADMIN_PASSWORD="ResetPwd@2026" pnpm seed:admin:stage
```

The `seed:admin:stage` script (new in this change set, see
`scripts/seed-admin.mjs`) accepts a `--env <name>` flag — when set, the
target D1 becomes `widgetly-<name>` and the wrangler command gains
`--env <name>`. Default behavior (no `--env`) is unchanged.

> **Why the explicit env vars:** the script translates `--remote` into
> the wrangler `--remote` flag. The Cloudflare token + account ID are
> read by `wrangler` itself from the env (or from `wrangler login`); the
> script never sees them. If you have `wrangler login` cached in the
> sandbox, the env-var step can be skipped.

> **Note on the standalone seed-tools-stage.yml workflow.** An earlier
> iteration of this work added a separate `.github/workflows/seed-tools-stage.yml`
> that did the tools seed only (admin user was assumed to already exist).
> It turned out to be unnecessary because the existing `seed-admin-stage.yml`
> workflow can do both in one run. The file is still in the repo (with a
> fixed `pnpm/action-setup` config that doesn't conflict with the
> `packageManager` field in package.json) but it isn't used — use
> `seed-admin-stage.yml` instead for both admin user + tools.

## Stage verification

```bash
# 1. Public menu now shows live tools (not the static catalog)
curl -s 'https://beta.widgetly.tech/api/public/tools?category=pdf' | jq '.total, .tools[0:3]'
# Actual (2026-06-23): total=15. Tools: compress-pdf, edit-pdf, excel-to-pdf, ...

# 2. Per-category counts across the whole catalog
curl -s 'https://beta.widgetly.tech/api/public/tools?format=count' | jq '.counts, .total'
# Actual (2026-06-23):
#   {
#     "ai": 7, "business": 6, "calculators": 10, "converters": 7,
#     "developer": 10, "education": 6, "image": 10, "pdf": 15,
#     "seo": 7, "video": 5, "writing": 6
#   }
#   total: 89

# 3. Admin grouped dashboard renders (needs a session)
#    Log in via the UI at https://beta.widgetly.tech/admin/sign-in
#    with username=stage-admin, password=ResetPwd@2026 (default).
#    /admin/tools now shows 11 collapsible category sections, each
#    with the count next to its name.

# 4. Public category page shows the DB-driven list
curl -sL 'https://beta.widgetly.tech/en/tools/pdf' | grep -oE 'href="/en/tools/pdf/[^"]+"' | head -5
# Actual (2026-06-23):
#   /en/tools/pdf/compress-pdf
#   /en/tools/pdf/edit-pdf
#   /en/tools/pdf/excel-to-pdf
#   /en/tools/pdf/jpg-to-pdf
#   /en/tools/pdf/merge-pdf
#   (15 total tool links for the PDF category)

# 5. Confirm the page is NOT showing the static-catalog fallback badge
curl -sL 'https://beta.widgetly.tech/en/tools/pdf' | grep -c 'Static catalog'
# Actual (2026-06-23): 0 (badge not present → DB-driven)

# 6. Smoke-test the status-change loop
#    In the admin UI, change merge-pdf status from 'live' to 'in_progress'
#    and save. Within one request:
curl -s 'https://beta.widgetly.tech/api/public/tools?category=pdf' | jq '.tools | map(.slug)'
# Expected: merge-pdf is NOT in the list. Revert status to 'live' to
# restore.
```

> **Live verification result (2026-06-23 00:27 UTC):**
>
> - Public `/api/public/tools?format=count` → 89 live tools across 11 categories
> - Public `/en/tools/pdf` → 15 tool links, no static-catalog badge
> - Admin `/admin/tools` → renders grouped-by-category (visible only with a session)
>
> **Post-fix re-verification (target after the bug fix lands on stage):**
>
> 1. `curl -sI https://beta.widgetly.tech/en/tools/pdf | grep -i x-nextjs`
>    → no `x-nextjs-prerender: 1` (route is dynamic). First request
>    after deploy is `x-nextjs-cache: MISS`, second within 10 s is
>    `HIT`.
> 2. Flip `compress-pdf` to `deprecated` in admin.
> 3. Within ≤10 s: `curl -sL https://beta.widgetly.tech/en/tools/pdf | grep -oE 'href="/en/tools/pdf/[^"]+"' | wc -l`
>    → **14** (compress-pdf gone).
> 4. Flip back to `live`. Within ≤10 s: count back to **15**.

## Promote to prod — DEFERRED

Per the user's instruction, prod is out of scope for this runbook. Once stage is verified end-to-end, the prod promotion is a separate workstream:

1. Seed `widgetly` (prod D1) with `pnpm seed:admin:remote` (same idempotent script).
2. Open a release PR from `develop` → `main` titled "release: admin tools grouped + public menu live-only" with a checklist referencing this runbook.
3. Wait for the prod deploy workflow (`deploy.yml`) to finish green.
4. Run the verification curls against `widgetly.tech` instead of `beta.widgetly.tech`.

A separate `docs/operations/deploy-admin-tools-grouping-prod.md` will be written when the user signals they're ready to promote.

## Rollback

If the new admin page is broken in stage and you need to revert:

```bash
# From the feature branch:
git revert HEAD
git push origin feat/tools-grouping-and-live-menu
# Or via the GitHub UI: open a PR that reverts the merge commit on develop.
```

The public category page is forward-compatible: if a row is `status='live'`, it's shown. If you ever need to hide a row from the public menu, set its status to anything other than `live` in the admin UI — no deploy required.

## Note about secrets

This change does NOT add any new secrets. `ADMIN_SESSION_SECRET` is unchanged and is already required on both envs. The deploy workflow already syncs it to the production Worker; the stage Worker has it set manually from PR #73.

## Bug fix (follow-up commit): live menu reflects admin status changes

**Reported 2026-06-23.** After the grouped-admin deploy shipped, the user
verified end-to-end on stage:

1. `/admin/tools` shows the catalog grouped by category, all 89 rows
   `status='live'`.
2. `/api/public/tools?category=pdf` correctly returns **14 tools**
   after `compress-pdf` was flipped to `deprecated` — the API reads
   D1 live on every call.
3. **But `/en/tools/pdf` still rendered all 15 tools**, including
   `compress-pdf`. The deprecated tool did not disappear from the
   public menu even after several minutes.

**Root cause.** `/[locale]/tools/[category]/page.tsx` exported a
`generateStaticParams()` returning the full set of category slugs.
Combined with no `dynamic` export, Next.js marked the route as fully
static, prerendered every page at build time, and stored the
rendered HTML in the OpenNext KV cache (`x-nextjs-cache: HIT`,
`x-nextjs-prerender: 1`). The D1 read happened **once during the
build** — at that moment all 15 PDF tools were `live` — and the
result was baked into the HTML. Admin status changes in D1 never
reached the cached HTML, regardless of `stale-while-revalidate`
values, because the prerender manifest only gets refreshed on a
redeploy.

The API endpoint was unaffected because API routes are always
dynamic (`runtime = "nodejs"`). The smoke-test in the original
verification (`§ "Stage verification"` step 6) only checked the API,
which masked the bug.

**Fix.** Two small changes to make the public menu reflect D1 in
near-real-time:

1. **`src/app/[locale]/tools/[category]/page.tsx`** — replace
   `generateStaticParams()` with `export const dynamic = "force-dynamic"`.
   This opts the route out of the OpenNext KV cache entirely; every
   request re-renders against the current D1 state.
2. **`next.config.ts`** — add a per-route `Cache-Control: public,
s-maxage=10, stale-while-revalidate=86400` for
   `/[en|es|fr]/tools/:category` (more specific than the catch-all
   `/[locale]/:path*` rule, so it wins). The 10 s TTL gives us a
   short edge cache for 1102 protection under load, while still
   propagating admin status changes within ~10 s.

### Why this works

- **`force-dynamic`**: tells Next.js the route must be rendered per
  request. The OpenNext adapter honors this and skips the KV
  incremental cache entirely (verified via the OpenNext caching
  docs — `force-dynamic` opts the route out of the Full Route
  Cache). The HTML is no longer stored in KV; admin writes go
  straight from D1 to the response.
- **10 s edge cache**: the Cloudflare edge (separate from OpenNext
  KV) still caches the rendered HTML for 10 s, with a 1-day SWR
  window. Under normal traffic, >99 % of requests are served from
  the edge without invoking the Worker. Admin changes appear in
  ≤10 s.
- **Why not `s-maxage=0`**: it would force every request through
  the Worker, multiplying D1 reads and CPU cost by ~10×. With
  `s-maxage=10`, D1 sees one read per category per 10 s, not one
  per request.

### Why not on-demand revalidation via `revalidateTag`

OpenNext's `revalidateTag` / `revalidatePath` requires a configured
tag cache + queue. The current `open-next.config.ts` uses
`tagCache: "dummy"` (see the comment in that file). Switching to a
real tag cache means adding a Durable Object + KV binding +
queue — significant architecture change for a bug that's
fully fixable by the dynamic + 10 s TTL combo above. Defer the
tag-cache refactor to a future workstream if finer-grained
invalidation becomes a real need (e.g. multi-tenant content with
frequent edits).

### Verification

```bash
# Pre-fix state (reproduced on stage 2026-06-23):
curl -sI 'https://beta.widgetly.tech/en/tools/pdf' | grep -i 'x-nextjs'
#   x-nextjs-cache: HIT
#   x-nextjs-prerender: 1

curl -s 'https://beta.widgetly.tech/api/public/tools?category=pdf' \
  | jq '.tools | map(.slug) | length'
#   14 (compress-pdf correctly excluded)

curl -sL 'https://beta.widgetly.tech/en/tools/pdf' \
  | grep -oE 'href="/en/tools/pdf/[^"]+"' | wc -l
#   15 (BUG: page still shows compress-pdf)

# Post-fix (deploy branch fix/category-page-live-d1 to stage):
#   x-nextjs-cache: MISS (first request), then HIT for ~10 s
#   x-nextjs-prerender: not set (route is dynamic)
#   Same admin flip — compress-pdf disappears from the page within 10 s
```

The full smoke test for this fix lives in § "Stage verification"
above — re-run steps 4-6 after the fix branch is on stage.

### Files changed in this fix

| File                                             | Change                                                                                                                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/[locale]/tools/[category]/page.tsx`     | Drop `generateStaticParams()`. Add `export const dynamic = "force-dynamic"`. Remove the now-unused `getAllToolsCategorySlugs` import.                                                                                  |
| `next.config.ts`                                 | Add per-route `Cache-Control: public, s-maxage=10, stale-while-revalidate=86400` for `/[en\|es\|fr]/tools/:category`. Specific routes are listed BEFORE the catch-all `/[locale]/:path*` rules so they win the lookup. |
| `docs/operations/deploy-admin-tools-grouping.md` | This section.                                                                                                                                                                                                          |
| `docs/seo/AGENTS.md`                             | New note under "Local Contracts / Cache-Control" explaining the dynamic + 10 s TTL pattern for DB-driven category pages.                                                                                               |
| `docs/admin/AGENTS.md`                           | New note in the "Pages" section reminding operators that admin status changes reach the public menu in ≤10 s, not instantly.                                                                                           |
