# AGENTS.md — Widgetly

DOX hierarchy for the `widgetly-app` repository.

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

### Code style

- TypeScript strict + `noUncheckedIndexedAccess`. Run `pnpm type-check` before committing.
- ESLint config: `eslint-config-next`. Run `pnpm lint <path>` before committing.
- Husky pre-commit: lint + type-check are enforced. Fix before pushing.
- Tailwind v4. `container` class caps at 80rem (1280px) on wide viewports.

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

## Verification

| Check      | Command                                    | Pass criterion                  |
| ---------- | ------------------------------------------ | ------------------------------- |
| TypeScript | `pnpm type-check`                          | exit 0, no errors               |
| Lint       | `pnpm lint <path>`                         | exit 0, no errors (warnings ok) |
| Build      | `pnpm exec opennextjs-cloudflare build`    | produces `.open-next/worker.js` |
| D1 schema  | `pnpm db:info`                             | shows current migration applied |
| Deploy     | `gh workflow run deploy.yml --ref develop` | run completes `success`         |

---

## Child DOX Index

| Subtree            | Owns                                                                                                      | AGENTS.md                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/seo/`        | SEO surface — sitemap, robots, metadata, JSON-LD schema, programmatic SEO, manual outreach checklist      | [`docs/seo/AGENTS.md`](./docs/seo/AGENTS.md)               |
| `docs/secrets/`    | Secrets management — local `.env.local`, Cloudflare Worker secrets, `pnpm setup:secrets`, rotation policy | [`docs/secrets/AGENTS.md`](./docs/secrets/AGENTS.md)       |
| `docs/database/`   | Cloudflare D1 persistence — schema migrations, query helpers, wrangler CLI, backup/restore                | [`docs/database/AGENTS.md`](./docs/database/AGENTS.md)     |
| `docs/operations/` | pnpm scripts, common command sequences, deploy workflow, troubleshooting                                  | [`docs/operations/AGENTS.md`](./docs/operations/AGENTS.md) |
| `docs/api/`        | API routes — endpoints, request/response shapes, error codes, runtime notes                               | [`docs/api/AGENTS.md`](./docs/api/AGENTS.md)               |

### Legacy docs (not yet migrated to DOX shape — superseded by their child AGENTS.md above where overlap exists)

- `docs/DEPLOYMENT.md` — covered by `docs/operations/AGENTS.md`
- `docs/CONSENT.md` — cookie consent + GDPR notes
- `docs/FRONTEND.md` — component architecture notes
- `docs/LAUNCH_INDEXABILITY.md` — pre-launch SEO checklist (mostly covered by `docs/seo/AGENTS.md`)
- `docs/i18n-translation.md` — translation workflow
- `docs/API.md` — superseded by `docs/api/AGENTS.md`
