# AGENTS.md — Widgetly

DOX hierarchy for the `widgetly-app` repository.

---

## Core DOX contract

**These instructions are binding for every agent (human or AI) that edits this repository.** If you only read one section of this document, read this one.

### Read Before Editing

1. **Read this root `AGENTS.md`.** It holds project-wide rules and the Child DOX Index.
2. **Identify every file or folder you expect to touch.** Don't start editing before you know the full surface area.
3. **Walk from the repository root to each target path.** Note every `AGENTS.md` along the way.
4. **Read every `AGENTS.md` found along each route.** Use the closest one as the local contract; parent docs hold repo-wide rules.
5. **If a parent `AGENTS.md` lists a child whose scope contains the target, read that child and continue from there.**
6. **If docs conflict, the closer doc controls local work details — but no child doc may weaken DOX itself.**
7. **Do not rely on memory.** Re-read the applicable DOX chain in the current session before editing. The docs may have changed since last time you looked.

### Update After Editing

Every meaningful change requires a DOX pass before the task is done. Update the closest owning `AGENTS.md` when a change affects any of:

- **Purpose, scope, ownership, or responsibilities** of a subtree
- **Durable structure, contracts, workflows, or operating rules** (e.g., a new `pnpm` script, a new env var, a new API route)
- **Required inputs, outputs, permissions, constraints, side effects, or artifacts**
- **User preferences** about behavior, communication, process, organization, or quality
- **AGENTS.md itself** — creation, deletion, move, rename, or Child DOX Index contents

Update **parent** docs when parent-level structure, ownership, workflow, or child index changes. Update **child** docs when parent changes alter local rules. Remove stale or contradictory text immediately.

**Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.**

### Closeout

Before reporting a task complete:

1. Re-check changed paths against the DOX chain (root → target).
2. Update nearest owning docs and any affected parents or children.
3. Refresh every affected Child DOX Index.
4. Remove stale or contradictory text.
5. Run existing verification (see "Verification" below) where relevant.
6. Report any docs intentionally left unchanged and why.

### Scope exclusions

Do not create or update DOX docs for changes confined to ignored runtime or user-state folders (`usr/`, `tmp/`, `.next/`, `.open-next/`, `node_modules/`, `.wrangler/`) unless the user explicitly asks for those folders to be documented.

---

## Purpose

Widgetly is a single-page application that surfaces a curated catalog of online tools (PDF, Image, Video, AI, Calculators, Developer, SEO, Writing, Converters, Business, Education). Each tool ships with its own landing page generated from structured data — programmatic SEO.

This AGENTS.md is the binding work contract for the whole repository. Every child `docs/*/AGENTS.md` is the binding contract for its subtree. Read the nearest one before editing anything in its scope.

---

## Ownership

- **Code:** `src/` (Next.js App Router, React 19, next-intl, OpenNext Cloudflare)
- **Persistence:** Cloudflare D1 (SQLite at the edge). See `docs/database/AGENTS.md`.
- **Build / deploy:** Cloudflare Workers via `@opennextjs/cloudflare`. See `docs/operations/AGENTS.md`.
- **Secrets:** Stored in the platform's encrypted secret store + Cloudflare Worker secrets via `pnpm setup:secrets`. Never commit plaintext tokens. See `docs/secrets/AGENTS.md`.
- **SEO surface:** `sitemap.ts`, `robots.ts`, per-page metadata, JSON-LD builders in `src/lib/seo.ts`. See `docs/seo/AGENTS.md`.
- **API:** All routes under `src/app/api/`. See `docs/api/AGENTS.md`.

---

## Local Contracts

### Branching

- `main` — production. Triggers Cloudflare deploy on push (via `.github/workflows/deploy.yml`).
- `develop` — staging. No auto-deploy; trigger manually via `workflow_dispatch`.
- Feature branches: `chore/<description>`, `feat/<description>`, `fix/<description>`.

### Commits

- Author: `Mavis <Mavis@local>` for AI-authored commits. Re-author with `--author` if you need a different identity.
- Format: `<type>(<scope>): <imperative summary>`. Body explains _why_, not _what_.
- One logical change per commit. Squash locally before merging.
- **Local sandbox gotcha** (fixed 2026-06-18): the husky pre-commit
  hook calls `npx lint-staged`, which fails on Node 22 with
  `ERR_MODULE_NOT_FOUND: signal-exit/index.js`. The broken nested
  copy at `node_modules/lint-staged/node_modules/signal-exit/` has
  no `package.json` (only `dist/cjs/package.json`). Fix once per
  sandbox:
  ```bash
  rm -rf node_modules/lint-staged/node_modules/signal-exit
  ```
  After this, `git commit` runs the full lint-staged pipeline cleanly.
  The dir does NOT reappear on `pnpm install --frozen-lockfile`
  (verified). If a future sandbox shows the same error again, just
  re-run the rm. Don't paper over with `--no-verify` — the pre-commit
  gate catches real issues (prettier violations, eslint errors).
  CI uses Node 20 so it never hits this.

### Code style

- TypeScript strict + `noUncheckedIndexedAccess`. Run `pnpm type-check` before committing.
- ESLint config: `eslint-config-next`. Run `pnpm lint <path>` before committing.
- Husky pre-commit: lint + type-check are enforced. Fix before pushing.
- Tailwind v4. `container` class caps at 90rem (1440px) on wide viewports.

### Runtime

- Next.js 16.2.9 + Turbopack. API routes use `runtime = "nodejs"` (edge runtime emits `app-edge-has-no-entrypoint`).
- React 19. Server Components by default; mark `"use client"` only when needed.
- i18n: next-intl with `localePrefix: "always"` (en/es/fr). Use `Link` from `@/i18n/navigation` for all internal links.
- OpenNext Cloudflare adapter: D1 bindings exposed via `getCloudflareContext().env.DB`, not `globalThis.DB`.

### Forbidden

- Never commit plaintext secrets. `.env*` files are gitignored. Use `pnpm setup:secrets`.
- Never edit generated files (`worker-configuration.d.ts`, `.open-next/`, `.next/`).
- Never reference the old `widgetly.app` domain — use `widgetly.tech`.

---

## Agent Roles & Skill Loading

Widgetly is a multi-domain project. Most tasks touch more than one discipline (e.g., adding a tool page touches SEO + Frontend + API). The agent **must explicitly declare which role(s) it's activating** at the start of each task, log the skills and AGENTS.md files it's loading, and operate under the contracts of those roles.

### Skill-loading log format

Every reply that begins work on a task MUST start with a log block in this exact format. The user reads these logs to confirm the agent loaded the right context.

```
[AGENT LOAD]
  Task:        <one-line summary>
  Role(s):     <Role A>, <Role B>, ...
  Skills:      <skill-1>, <skill-2>, ...
  AGENTS.md:   <path-1>, <path-2>, ...
  DOX pass:    <yes | no>
  Locale:      <en | es | fr>
[/AGENT LOAD]
```

- **Task** — one-line summary of what's being done.
- **Role(s)** — from the role registry below. Multiple if cross-domain.
- **Skills** — concrete capabilities being applied (e.g., "JSON-LD schema authoring", "D1 SQL", "GitHub Actions YAML", "Tailwind v4 responsive layout"). Not skills in the sense of plugin names — actual sub-competencies.
- **AGENTS.md** — the DOX chain the agent walked and read. Include the root + every child whose scope is touched.
- **DOX pass** — `yes` if the change will require updating any AGENTS.md afterward; `no` if it's a pure code change with no contract impact (rare).
- **Locale** — target locale if i18n is touched (most tasks are `en` first).

### Role registry

Each role defines: specialty, activates when, skills to load, owns (which child AGENTS.md), and a style-of-work note.

#### 1. SEO Expert

- **Specialty:** Search visibility — crawling, indexing, ranking, structured data, programmatic SEO, outreach.
- **Activates when:** task touches `sitemap.ts`, `robots.ts`, per-page metadata, JSON-LD, content targeting a query, Google/Bing search console, IndexNow, backlinks, schema validators, page-speed verification.
- **Skills:** technical SEO (canonical, hreflang, robots, sitemap, OpenGraph, Twitter cards), JSON-LD schema authoring (WebSite, Organization, SoftwareApplication, WebApplication, BreadcrumbList, ItemList, FAQPage, HowTo), keyword research and clustering, pSEO architecture, IndexNow + Bing Webmaster + GSC workflows, Core Web Vitals, Core update recovery, thin-content audit.
- **Owns:** `docs/seo/AGENTS.md`.
- **Style:** cite the DOX contract first; verify schema at https://validator.schema.org/ before claiming done; never stuff keywords at the expense of readability; treat thin-content as a P0 risk once we cross ~100 tool pages.

#### 2. Frontend UI/UX Designer

- **Specialty:** Visual design, interaction design, accessibility, responsive layout, motion, design system consistency.
- **Activates when:** task touches components under `src/components/`, layout primitives (PageShell, header, banner, breadcrumb), styling, framer-motion animations, responsive breakpoints, focus management, color/contrast, typography.
- **Skills:** Tailwind v4 (container cap at 90rem / 1440px on wide viewports, no `tailwindcss-animate` plugin — use the project's own `.animate-fade-in` etc.), design tokens via globals.css `@theme`, framer-motion, WCAG 2.2 AA (focus rings, color contrast, semantic HTML, ARIA), responsive design (mobile-first, breakpoints `sm`/`md`/`lg`/`xl`), micro-interaction choreography, l10n text length tolerance (es/fr are ~30% longer than en).
- **Owns:** `docs/FRONTEND.md` (legacy; future migration to DOX child).
- **Style:** every UI change is checked at 320px / 768px / 1280px / 1920px before declaring done; prefer building blocks (`<Link>` from `@/i18n/navigation`, `PageShell`, `Badge`) over raw HTML; ship the empty state, the loading state, and the error state in one commit; hover and focus states must be visible.

#### 3. API Architect

- **Specialty:** HTTP API design — REST/JSON contracts, status codes, error shapes, idempotency, OpenAPI documentation, runtime correctness.
- **Activates when:** task touches any file under `src/app/api/`, the OpenAPI spec at `/api/openapi.json`, the Postman collection, request validation, error handling, or new endpoint addition.
- **Skills:** REST contract design (resource modeling, verb choice, idempotency keys), Next.js App Router route handlers (must export `runtime = "nodejs"` — edge runtime emits `app-edge-has-no-entrypoint` in Next 16), response envelope `{ ok: true|false, ... }`, status-code semantics (400/404/409/429/500/503), OpenAPI 3.0 authoring, Zod input validation, JSON-LD emission alongside API responses when relevant, dev-only diagnostic routes (404 in production).
- **Owns:** `docs/api/AGENTS.md`.
- **Style:** validate input at the boundary; never trust upstream; return machine-readable `error` codes (not just `message`); cap response size; log server-side, never expose internals; ship the OpenAPI + Postman updates in the same commit as the endpoint.

#### 4. Cloudflare Architect

- **Specialty:** Edge runtime, D1 persistence, KV (incremental cache + future tag cache), OpenNext Cloudflare adapter, wrangler CLI, regional routing.
- **Activates when:** task touches `wrangler.toml`, `open-next.config.ts`, anything under `src/lib/d1/`, D1 migrations under `migrations/`, the Worker bundle output (`.open-next/`), runtime env access via `getCloudflareContext()`.
- **Skills:** Cloudflare Workers runtime model (V8 isolates, no Node built-ins unless `nodejs_*` compat), D1 SQL (SQLite dialect: `INTEGER PRIMARY KEY AUTOINCREMENT`, `COLLATE NOCASE`, `INSERT ... ON CONFLICT(...) DO NOTHING RETURNING`), KV (eventually-consistent; used by OpenNext for incremental cache via `NEXT_INC_CACHE_KV` binding), OpenNext Cloudflare adapter patterns (`getCloudflareContext().env.DB` — never `globalThis.DB`), the three-layer caching model (Cloudflare edge → OpenNext KV → Worker render) and what each layer can/can't cache, wrangler 4.x CLI (no `--text` flag, use stdin for secret values; modern `kv namespace create` space-separated syntax — colon form `kv:namespace` is deprecated), Cloudflare Pages vs Workers vs R2 tradeoffs, edge caching headers (`Cache-Control`, `CDN-Cache-Control`).
- **Reference:** [`docs/operations/cloudflare-optimization.md`](./docs/operations/cloudflare-optimization.md) — full architecture analysis, deployment plan, and 1102 fix roadmap. [`scripts/verify-cache.sh`](./scripts/verify-cache.sh) is the one-command verification. [`docs/operations/cache-test.md`](./docs/operations/cache-test.md) is the manual testing runbook (by route, by region, by traffic pattern, with a Cloudflare support escalation packet).
- **Owns:** `docs/database/AGENTS.md` + `docs/operations/AGENTS.md` (deploy parts).
- **Style:** never read `globalThis.DB`; always use the OpenNext helper; write migrations forward-only; coordinate schema changes with the API Architect before merging; smoke-test on the preview Worker before production.

#### 5. DevOps Expert (GitHub Actions)

- **Specialty:** CI/CD, workflow automation, secret handling in CI, deployment pipelines, matrix builds, caching.
- **Activates when:** task touches `.github/workflows/*.yml`, deploy orchestration, CI caching, environment protection rules, branch policies, GitHub API integrations (for auto-merge, dispatch, status checks).
- **Skills:** GitHub Actions YAML syntax, `workflow_dispatch` triggers with typed inputs, `if:` expressions (banned on `secrets.X` — use `env.X` instead), reusable workflows, composite actions, secret scope per environment, concurrency control to cancel superseded deploys, artifact upload/download, OpenID Connect for Cloudflare (avoiding long-lived API tokens in CI), Dependabot/Renovate config.
- **Owns:** `.github/workflows/`, deploy parts of `docs/operations/AGENTS.md`.
- **Style:** every workflow has a timeout, a concurrency group, and an explicit `permissions:` block (least-privilege); secrets only flow via `secrets.X` inside `run:` blocks, never via `if:`; one workflow per concern (deploy.yml, ci.yml, indexnow.yml — not a mega-workflow).

#### 6. i18n Specialist

- **Specialty:** Locale management, translation workflow, locale-prefixed routing, hreflang, RTL readiness.
- **Activates when:** task touches any file under `src/i18n/`, `messages/*.json` (next-intl uses `src/i18n/messages/{en,es,fr}.json`), locale-prefixed routing (`localePrefix: "always"`), `Link` from `@/i18n/navigation`, locale-aware metadata.
- **Skills:** next-intl 3.x APIs (`useTranslations`, `getTranslations`, `setRequestLocale`, message file loading), ICU MessageFormat for plurals/genders, locale-prefixed URL strategy (en/es/fr), hreflang alternates, l10n text length tolerance (es ~25% longer, fr ~20% longer than en — UI must accommodate), translation memory + glossary consistency, fallback strategy when a key is missing in a locale.
- **Owns:** `docs/i18n-translation.md` (legacy; future migration to DOX child).
- **Style:** never hardcode English strings in components — always `useTranslations`; every new string gets added to all three locale files in the same commit; UI strings must accommodate the longest locale's expansion; numeric/date formatting uses `Intl.*` (never hand-rolled).

### Multi-role tasks

When a task spans multiple domains (the common case), activate multiple roles and load the union of their skills. Examples:

| Task                      | Roles                                                | Why                                           |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Add a new tool page       | SEO Expert + Frontend UI/UX Designer                 | Metadata + page rendering                     |
| Add a new API route       | API Architect + Cloudflare Architect                 | Endpoint contract + D1 binding                |
| Change deploy flow        | DevOps Expert + Cloudflare Architect                 | Workflow + Worker runtime                     |
| Add a new locale string   | i18n Specialist + Frontend UI/UX Designer            | Translation + layout tolerance                |
| Migrate persistence layer | Cloudflare Architect + API Architect + DevOps Expert | D1 schema + route handlers + migration deploy |

### Verification of role activation

After any task, the agent's reply MUST include the closing log block:

```
[AGENT CLOSE]
  Roles used:  <list>
  DOX updated: <yes/no, which files>
  Verified:    <commands run or external URL checks>
  Skipped:     <anything intentionally not done, with reason>
[/AGENT CLOSE]
```

The user can scan these blocks to confirm the agent activated the right roles and didn't drop work.

---

## Work Guidance

### When you change code in `src/lib/d1/`

- Update `docs/database/AGENTS.md` "Local Contracts" if the public API changes.
- Add a migration file under `migrations/` for any schema change. Increment the prefix.
- Run `pnpm db:migrate:remote` after deploy to apply.

### When you add a new API route

- Add the route under `src/app/api/<name>/route.ts`.
- Update `docs/api/AGENTS.md` with the new endpoint.
- Emit a structured JSON response shape documented in the API doc.

### When you change SEO surface (metadata, JSON-LD, sitemap)

- Update `docs/seo/AGENTS.md` if the contract changes.
- Validate the new JSON-LD at https://validator.schema.org/ before merging.
- Submit affected URLs to IndexNow after deploy (see `docs/seo/AGENTS.md`).

### When you add a new pnpm script

- Update `docs/operations/AGENTS.md` with the script name + purpose + when to use it.
- Keep scripts idempotent. They should be safe to re-run.

### When you add or rotate a secret

- Update `docs/secrets/AGENTS.md` with the secret name + source + rotation policy.
- Rotate, never reuse. Revoke the old value at the source.

---

## Ship Cycle / Definition of Done

> **Why this section exists.** A change is _not_ "done" when it lands on `main`.
> It is done when the change **is built, deployed, and verified live** — and
> any docs / contracts that the change touched have been updated. The
> previous workflow treated "git push succeeded" as the finish line, which
> shipped changes that were appended but never built or deployed. This
> section is the fix.

### The five-phase ship cycle

Every change follows this loop. Skipping a phase is a defect, not a
shortcut. The pre-push hook, the CI workflow, the deploy workflow, and the
`pnpm ship` script are all designed to enforce it.

```
   ┌─────────┐   ┌──────┐   ┌──────┐   ┌────────┐   ┌──────────┐
   │ 1. CODE │ → │ 2.   │ → │ 3.   │ → │ 4.     │ → │ 5.       │
   │  + DOX  │   │ TEST │   │BUILD │   │ DEPLOY │   │ VERIFY   │
   └─────────┘   └──────┘   └──────┘   └────────┘   └──────────┘
        ↑                                              │
        └──────────── fix & re-enter phase ────────────┘
```

1. **Code + DOX.** Implement the change. Update the owning AGENTS.md (root
   or child) before you commit — see "Update After Editing" above. Commit
   with the project's author identity (`Mavis <Mavis@local>` for AI work).
2. **Test.** `pnpm lint`, `pnpm type-check`, and any tests under the changed
   scope must pass. The local pre-push hook runs the same gate; CI runs the
   full version. **No push out of a red gate.**
3. **Build.** `pnpm exec opennextjs-cloudflare build` must produce a clean
   `.open-next/worker.js`. A build that emits warnings you can't explain is
   not a build you can ship.
4. **Deploy.** Merge to `develop` (preview), then to `main` (production).
   Each merge triggers the deploy workflow (`.github/workflows/deploy.yml`).
   Wait for `success`. Capture the run URL.
5. **Verify.** Hit the live URL. Confirm the change is observably present
   (curl, browser, sitemap fetch, JSON-LD validator, Lighthouse — whichever
   matches the surface touched). For SEO changes, also submit affected URLs
   to IndexNow (see `docs/seo/AGENTS.md`).

### Definition of Done (DOD) checklist

A change is **done** only when **every box below** can be ticked. Paste
this block into the PR description; do not merge while any box is unchecked.

- [ ] **Code complete.** Feature/fix implemented, no `// TODO`s left behind,
      no commented-out blocks, no debug `console.log`s.
- [ ] **DOX updated.** Every owning AGENTS.md (root + child) reflects the
      change. Stale text removed. Child DOX Index refreshed if needed.
- [ ] **Pre-commit hook passed.** `npx lint-staged` ran on staged files
      with no errors.
- [ ] **Pre-push hook passed.** `pnpm lint && pnpm type-check` exit 0.
      (Equivalent to CI's `quality` job.)
- [ ] **Build succeeded.** `pnpm exec opennextjs-cloudflare build` exits 0
      and produces `.open-next/worker.js`.
- [ ] **Merged to `develop`.** PR merged (or fast-forward push) with a
      conventional commit message.
- [ ] **Preview deploy green.** Deploy workflow run on `develop` ends in
      `success`. Run URL captured.
- [ ] **Merged to `main`.** PR merged to `main` (production branch).
- [ ] **Production deploy green.** Deploy workflow run on `main` ends in
      `success`. Run URL captured.
- [ ] **Live verification.** The deployed URL exhibits the expected
      change — not a stale cache, not a 502, not "Error 1102".
- [ ] **Indexes notified (if SEO surface touched).** IndexNow submission
      for affected URLs; sitemap regenerated; canonical URL unchanged
      unless that was the change.
- [ ] **Secrets rotated (if any leaked).** See `docs/secrets/AGENTS.md`.
- [ ] **Post-deploy observation window.** Watch the change for ≥ 30
      minutes live (cf-ray logs, error rate, search console crawl stats).
      If anything regresses, hotfix or revert immediately.

### `pnpm ship` — one command that runs the local portion

The local pre-push gate is wrapped in a single script so humans and agents
can run it the same way:

```bash
pnpm ship   # runs: lint + type-check + (test) + build, with colored output
```

The script lives at `scripts/ship.mjs` and is the source of truth for what
"the local DOD gate" actually means. The pre-push hook calls it instead of
inlining commands, so the hook and the manual command can never drift.

### What "shipped but not deployed" looks like (anti-patterns)

Recognize these. They are the failure modes this section is here to prevent.

| Anti-pattern                          | Symptom                                                      | Fix                                                                                       |
| ------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Appended but not built**            | Commit on `main`, no deploy workflow run triggered.          | Push again or re-run via `workflow_dispatch`. Check the workflow's `on:` trigger.         |
| **Built but not deployed**            | `.open-next/worker.js` exists locally, but Worker still old. | The deploy step needs the bundle _uploaded_ — `wrangler deploy`, not just `next build`.   |
| **Deployed but not verified**         | Run shows `success`, but live URL still old.                 | Cache: purge Cloudflare cache. Or wait for stale-while-revalidate. Or check route prefix. |
| **Verified once, then regressed**     | Change works at 10:00, broken at 10:30 from a later deploy.  | Pin the deploy SHA; never re-deploy `main` head without testing the diff.                 |
| **DOX not updated**                   | Next agent can't find the new script / endpoint / env var.   | Stop. Update owning AGENTS.md. Then merge.                                                |
| **IndexNow skipped after SEO change** | New tool page not crawled for weeks.                         | Submit affected URLs the same day as deploy. `docs/seo/AGENTS.md`.                        |

### When a phase fails

Failures are signals, not blockers. The right move:

1. **Stop the cycle.** Don't push past a red phase. Don't merge past a
   failed deploy.
2. **Diagnose.** The troubleshooting table in `docs/operations/AGENTS.md`
   covers the common cases (1102, OOM lint, wrangler auth, secrets drift).
3. **Fix in the same branch.** Don't `git revert` and re-merge later —
   that loses the diagnosis. Add the fix as a new commit on the branch.
4. **Re-enter the cycle from the failed phase.** Not from phase 1 — the
   code + DOX didn't change.
5. **Note it.** If the failure mode was new, append it to the
   troubleshooting table so the next agent doesn't re-discover it.

### Scope exclusions

The ship cycle does **not** apply to:

- Pure documentation edits under `docs/**/AGENTS.md` (no code, no build,
  no deploy — but still requires the DOX closeout pass).
- Changes under ignored runtime folders (`usr/`, `tmp/`, `.next/`,
  `.open-next/`, `node_modules/`, `.wrangler/`) — see "Scope exclusions"
  in the Core DOX contract.

If you're unsure whether the cycle applies, run it. A wasted build is
cheaper than a half-shipped change.

---

## Child DOX Index

| Subtree            | Owns                                                                                                          | AGENTS.md                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/seo/`        | SEO surface — sitemap, robots, metadata, JSON-LD schema, programmatic SEO, manual outreach checklist          | [`docs/seo/AGENTS.md`](./docs/seo/AGENTS.md)                                                                                                                                                                                   |
| `docs/secrets/`    | Secrets management — local `.env.local`, Cloudflare Worker secrets, `pnpm setup:secrets`, rotation policy     | [`docs/secrets/AGENTS.md`](./docs/secrets/AGENTS.md)                                                                                                                                                                           |
| `docs/database/`   | Cloudflare D1 persistence — schema migrations, query helpers, wrangler CLI, backup/restore                    | [`docs/database/AGENTS.md`](./docs/database/AGENTS.md)                                                                                                                                                                         |
| `docs/operations/` | pnpm scripts, common command sequences, deploy workflow, troubleshooting, Cloudflare performance/caching plan | [`docs/operations/AGENTS.md`](./docs/operations/AGENTS.md) + [`docs/operations/cloudflare-optimization.md`](./docs/operations/cloudflare-optimization.md) + [`docs/operations/cache-test.md`](./docs/operations/cache-test.md) |
| `docs/api/`        | API routes — endpoints, request/response shapes, error codes, runtime notes                                   | [`docs/api/AGENTS.md`](./docs/api/AGENTS.md)                                                                                                                                                                                   |

### Legacy docs (not yet migrated to DOX shape — superseded by their child AGENTS.md above where overlap exists)

- `docs/DEPLOYMENT.md` — covered by `docs/operations/AGENTS.md`
- `docs/CONSENT.md` — cookie consent + GDPR notes
- `docs/FRONTEND.md` — component architecture notes
- `docs/LAUNCH_INDEXABILITY.md` — pre-launch SEO checklist (mostly covered by `docs/seo/AGENTS.md`)
- `docs/i18n-translation.md` — translation workflow
- `docs/API.md` — superseded by `docs/api/AGENTS.md`
- `docs/operations/cloudflare-optimization.md` — Cloudflare plan/tier + edge-cache + KV incremental cache + 1102 fix (active reference; supersedes the loose notes this branch originally added)
- `docs/operations/cache-test.md` — Manual cache testing runbook (by route, by region, by traffic pattern, Cloudflare support escalation packet). Use for global rollout verification, ad-hoc debugging, or when handing off to Cloudflare experts.
