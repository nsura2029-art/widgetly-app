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

## What's in this change

| Surface                      | Change                                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/tools`               | Now renders the catalog grouped by category (collapsible sections, per-category status counts, search + filter, bulk status changes, delete). Was a flat paginated table.                                                                                         |
| `/tools/[category]` (public) | The right-rail menu is now driven by `admin_tools WHERE status='live'` for the category — DB is the source of truth. Falls back to the static catalog with a visible "Static catalog" badge when D1 is empty, so the page is never broken during the seed window. |
| `/api/public/tools`          | `limit` default raised from 100 → 200, hard cap raised from 200 → 500. Added `format=count` for `{ category, count: number }`.                                                                                                                                    |
| `src/lib/admin/tools.ts`     | New helper `listToolsGroupedByCategory()` — server-side bucketed read used by the new admin page. Excludes the long text columns (`long_description`, `notes`) to keep the catalog payload under 50 KB.                                                           |
| DOX                          | `docs/api/AGENTS.md` (admin + public tools endpoints), `docs/database/AGENTS.md` (helpers), `docs/secrets/AGENTS.md` (ADMIN_SESSION_SECRET), new `docs/admin/AGENTS.md` (owning the admin surface). Root `AGENTS.md` Child DOX Index + role registry updated.     |

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

PowerShell (Windows / Mavis sandbox):

```powershell
cd widgetly-app
$env:CLOUDFLARE_API_TOKEN  = (secret get --name=CLOUDFLARE_API_TOKEN).value
$env:CLOUDFLARE_ACCOUNT_ID = (secret get --name=CLOUDFLARE_ACCOUNT_ID).value
$env:ADMIN_PASSWORD        = "ResetPwd@2026"
pnpm seed:admin:remote
```

bash / zsh (macOS / Linux):

```bash
cd widgetly-app
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
ADMIN_PASSWORD="ResetPwd@2026" pnpm seed:admin:remote
```

This populates `admin_tools` with every tool from `src/lib/tools-categories.ts` as `status='live'`, plus creates the initial admin user (`admin` / `ResetPwd@2026`) if `admin_users` is empty. It does NOT rotate the existing admin password.

> **Why the explicit env vars:** the script translates `D1_BINDING=remote` / `--remote` into the wrangler `--remote` flag. The Cloudflare token + account ID are read by `wrangler` itself from the env (or from `wrangler login`); the script never sees them. If you have `wrangler login` cached in the sandbox, the env-var step can be skipped.

## Stage verification

```bash
# 1. Public menu now shows live tools (not the static catalog)
curl -s 'https://beta.widgetly.tech/api/public/tools?category=pdf' | jq '.total, .tools[0:3]'
# Expect: 7 (Merge PDF, Split PDF, Compress PDF, ...)

# 2. Per-category counts across the whole catalog
curl -s 'https://beta.widgetly.tech/api/public/tools' | jq '.counts'
# Expect: { "pdf": 7, "image": 7, "video": 7, ... }

# 3. Admin grouped dashboard renders (needs a session)
curl -i -X POST -H "content-type: application/json" \
  -d '{"username":"stage-admin","password":"ResetPwd@2026"}' \
  -c /tmp/wly_admin.txt \
  https://beta.widgetly.tech/api/admin/auth/login
# Expect: 200, Set-Cookie: wly_admin=...

curl -i -b /tmp/wly_admin.txt \
  -c /tmp/wly_admin_csrf.txt \
  https://beta.widgetly.tech/api/admin/csrf-token
# Expect: 200, Set-Cookie: wly_admin_csrf=...

CSRF=$(grep wly_admin_csrf /tmp/wly_admin_csrf.txt | awk '{print $7}')

curl -sL -b /tmp/wly_admin.txt -H "x-csrf-token: $CSRF" \
  https://beta.widgetly.tech/admin/tools | grep -E '<h2' | head -15
# Expect: one <h2> per category, ordered alphabetically

# 4. Public category page shows the badge or the live list
curl -sL 'https://beta.widgetly.tech/en/tools/pdf' | grep -E 'tools in PDF tools|Static catalog'
# Expect: "7+ tools in pdf tools" (no "Static catalog" badge)
```

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
