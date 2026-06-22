# AGENTS.md — Admin dashboard

Owns the `/admin/**` pages, the `/api/admin/**` API routes, the admin authentication layer, the admin D1 helpers, and the D1 schema migrations that back them.

> **DOX scope.** This is a child of the root [`AGENTS.md`](../../AGENTS.md). **Read the root first** for the Core DOX contract (Read Before Editing, Update After Editing, Closeout). The root's Child DOX Index lists this file as the owner of the admin surface. The API surface (request/response shapes, error codes) is documented in [`docs/api/AGENTS.md`](../api/AGENTS.md) — this file owns the pages, auth library, D1 schema, and operational scripts. The "Ownership" section below enumerates which files and folders this child contract governs.

---

## Purpose

- Give the Widgetly team a self-hosted control panel for the public tool catalog: who can sign in, what tools exist, what each tool's status is, and how status changes flow into the public menu.
- The admin is the **canonical source of truth** for the public tools menu. The static catalog in `src/lib/tools-categories.ts` is only the seed source and a fallback for the migration window between "table created" and "table seeded."
- Auth is hardened: bcrypt cost 12, constant-time responses on no-such-user, server-side session store in D1 (revocable), CSRF tokens on every state-changing call, sliding-window rate limit on `/auth/login`.
- Sign-in pages are publicly reachable (no auth required). Everything under `/admin/**` past the sign-in page requires a valid session.

---

## Ownership

| Surface                           | File / location                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pages                             | `src/app/admin/**/page.tsx` and the `*Form` client components next to each page                                                    |
| Admin shell (auth-aware layout)   | `src/app/admin/layout.tsx`, `src/app/admin/_components/admin-shell.tsx`                                                            |
| API routes                        | `src/app/api/admin/**/route.ts` (full reference in [`docs/api/AGENTS.md` § Admin API surface](../api/AGENTS.md#admin-api-surface)) |
| Auth library                      | `src/lib/admin/auth.ts` (bcrypt, session mint/verify, CSRF, rate limit, password change/reset)                                     |
| Schemas (Zod)                     | `src/lib/admin/schemas.ts`                                                                                                         |
| CSRF fetch helper (client)        | `src/lib/admin/csrf-client.ts`                                                                                                     |
| D1 helpers (admin)                | `src/lib/admin/tools.ts` (CRUD + lifecycle + grouped read), `src/lib/d1/admin.ts` (lazy D1 binding + `safeQuery`)                  |
| D1 helpers (public catalog reads) | `src/lib/d1/public-tools.ts`                                                                                                       |
| D1 schema                         | `migrations/0004_admin.sql` (admin_users, admin_sessions, admin_login_attempts, admin_tools, admin_status_history)                 |
| Seed script                       | `scripts/seed-admin.mjs` (idempotent `INSERT OR IGNORE` for the initial admin + static catalog → admin_tools)                      |
| Login credentials                 | `stage-admin` / `admin` (see `scripts/seed-admin.mjs` for password rotation policy)                                                |

---

## Local Contracts

### Auth model

- Cookie name: `wly_admin` (HttpOnly, Secure, SameSite=Strict, Path=/, `Max-Age=SESSION_TTL_MS`).
- CSRF cookie name: `wly_admin_csrf` (non-HttpOnly so JS can read it, same flags otherwise). Read by the client and echoed in the `x-csrf-token` header on every state-changing call.
- Every API route under `/api/admin/**` MUST go through `requireAdminFromRequest()` (returns `{ user } | null`) — `null` means 401, never trust the caller otherwise.
- Every state-changing admin route MUST additionally call `requireCsrfHeader(req)` — 403 on missing/invalid.
- Login flow: `POST /api/admin/auth/login` → sets both cookies + returns the CSRF token in the body. `POST /api/admin/auth/logout` revokes the D1 session row + clears both cookies. Both routes are the only ones that may set/clear these cookies.

### Lifecycle

`AdminTool.status` is an enum with these values:

| Status         | Public menu? | Meaning                                      |
| -------------- | ------------ | -------------------------------------------- |
| `suggested`    | no           | Newly suggested. Awaiting first review.      |
| `under_review` | no           | An admin is evaluating the request.          |
| `in_progress`  | no           | Approved; being built. Not yet public.       |
| `live`         | **yes**      | Visible in the public menu immediately.      |
| `deprecated`   | no           | Hidden from the public menu; data preserved. |
| `rejected`     | no           | Not a fit. Visible to admins only.           |

Legal transitions are encoded in `canTransition` in `src/lib/admin/tools.ts`. Any other transition returns 409 from `PATCH /api/admin/tools/[id]`.

### Public menu contract

- Only rows with `status='live'` are exposed to the public site.
- Public read endpoint: `GET /api/public/tools?category=<slug>` (see [`docs/api/AGENTS.md`](../api/AGENTS.md)). The public `/tools/[category]` page reads through `getLiveToolsForCategoryPublic(category)` in `src/lib/d1/public-tools.ts`.
- The public page is the **DB source of truth**: if D1 returns any live rows, those are rendered; if D1 returns empty (or the table is unbound), the static catalog renders as a fallback with a visible "Static catalog" badge so the migration window is obvious.

### Pages

| Path                            | Auth     | Purpose                                                                                                                             |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/sign-in`                | none     | Login form. Redirects to `/admin` if already signed in.                                                                             |
| `/admin/forgot-password`        | none     | Issues a one-time reset token. Returns the URL in the response (no email channel yet).                                              |
| `/admin/reset-password?token=…` | none     | Consumes a reset token. Single-use.                                                                                                 |
| `/admin`                        | required | Dashboard home. Renders a summary card per status.                                                                                  |
| `/admin/tools`                  | required | Catalog grouped by category (collapsible sections, status filters, bulk actions, search).                                           |
| `/admin/tools/[id]`             | required | Edit a single tool (slug, name, description, long description, API endpoint, pricing tier, icon, accent color, sort order, status). |
| `/admin/account/password`       | required | Self-service password change.                                                                                                       |

### Bcrypt + rate limit

- Bcrypt cost is **12** (`passwordHash` / `passwordVerify` in `src/lib/admin/auth.ts`). Login uses `bcrypt.compare` against the stored hash; password change verifies the current password with the same call before re-hashing.
- Sliding-window rate limit: 5 attempts / IP / minute on `POST /api/admin/auth/login`. Exceeding returns 429 with `Retry-After: 60`. Implementation in `checkRateLimit`.
- Forgot-password: 3 / 10 minutes / IP.

### Public menu DB-vs-static fallback

The `/tools/[category]` page does this on every request:

1. Try `getLiveToolsForCategoryPublic(category)`.
2. If the result has any rows → render those (DB is source of truth).
3. If the result is empty (table not seeded yet or genuinely empty) → render `cat.examples` from `src/lib/tools-categories.ts` and show a visible "Static catalog" badge so the fallback is obvious in production.
4. If D1 throws (binding missing, etc.) → same fallback, no error visible to the user.

This means the public site is never broken during the seeding window, and the moment the admin marks a tool as `live` it appears in the public menu.

---

## Work Guidance

### Adding a new status value

1. Add the value to the `ToolStatus` union in `src/lib/admin/tools.ts`.
2. Update `canTransition` to allow the legal in/out edges.
3. Update `STATUS_META` in `src/app/admin/tools/_components/status-change-modal.tsx` and `src/app/admin/tools/_components/tools-grouped.tsx` (label + Tailwind tone).
4. Update `docs/admin/AGENTS.md` (this file) and `docs/api/AGENTS.md` (the Zod `ToolStatus` enum documented in `ListToolsQuery`).

### Adding a new admin page

1. Create `src/app/admin/<section>/page.tsx`. Must call `requireAdminFromRequest()` and handle the null case.
2. If the page has a form, follow the `change-password-form.tsx` pattern: client component, fetches `/api/admin/csrf-token` on mount, includes `x-csrf-token` header on submit, redirects on success.
3. Add the route to the **Pages** table above.

### Adding a new admin API route

See [`docs/api/AGENTS.md` § Admin API surface](../api/AGENTS.md#admin-api-surface) for the request/response shape contract. Use the typed helpers in `src/lib/admin/tools.ts` rather than raw SQL. Always:

- `export const runtime = "nodejs";`
- Call `requireAdminFromRequest()` and return 401 on null.
- For POST/PATCH/DELETE, call `requireCsrfHeader(req)` and return 403 on missing/invalid.
- Validate the body with the Zod schema in `src/lib/admin/schemas.ts`. On parse failure, return 400 with `{ error, issues }`.
- Never log the password (even on failure) and never echo the bcrypt hash back to the client.

### Seeding the admin_tools table

The seed script is `scripts/seed-admin.mjs`. Target is selected by a cross-platform CLI flag (preferred on Windows / PowerShell where the `KEY=value` bash idiom doesn't work) or a legacy `D1_BINDING` env var:

```bash
# Local (uses .wrangler/state/)
pnpm seed:admin:local

# Remote — whichever D1 binding is active in the current wrangler env
pnpm seed:admin:remote          # passes --remote to the script
# or directly on PowerShell:
node scripts/seed-admin.mjs --remote
```

The script is idempotent (`INSERT OR IGNORE` on the slug/category pair). It also mints the initial admin user from `ADMIN_PASSWORD` env var (default `ResetPwd@2026`) if `admin_users` is empty, and prints a clear "re-using existing admin user" line otherwise. **Re-running it does NOT rotate the admin password** — that has to be done via the `/admin/account/password` flow or a direct D1 UPDATE in the Cloudflare dashboard.

### Seeding stage vs prod

The seed script targets whichever D1 binding is active in the current wrangler env. The wrangler binding it hits is determined by `[env.production]` vs `[env.stage]` in `wrangler.toml`.

**Per the user's deploy order (stage-first, then prod):**

1. **Stage** — push the feature branch to `origin`, merge to `develop`, let the stage deploy workflow (`deploy-stage.yml`) finish green. Then run `pnpm seed:admin:remote` with the stage env active (i.e. from a shell where `wrangler` would target `widgetly-stage`). Verify the public menu and grouped admin dashboard on `beta.widgetly.tech`.
2. **Prod** — defer until stage is verified. The same script works against the production D1 binding; a separate runbook (`docs/operations/deploy-admin-tools-grouping-prod.md`) will be written when the user is ready to promote.

### Updating the schema

1. Never edit `migrations/0004_admin.sql` after it's been applied. Write a new migration (`000N_<name>.sql`) with `ALTER TABLE` statements.
2. Add the column to the `AdminTool` TypeScript type in `src/lib/admin/tools.ts`.
3. Update the `safeQuery` call sites if the new column needs handling.
4. Update this file's **Local Contracts** section if the change affects the API or auth model.

### Resolving the "invalid current password" report

If a user reports the password change form saying "invalid current password" but E2E tests against `/api/admin/account/password` succeed, the cause is client-side:

- The browser's autofill is filling the **current** field with a previously-saved value, not the password the user just typed.
- The user typed the new password into the wrong field.
- A trailing whitespace in the current password (rare but possible if the user copy-pastes).

To debug, ask the user to:

1. Open DevTools → Application → Cookies and confirm `wly_admin` is present and not expired.
2. Disable autofill for the current password field temporarily and re-type the current password from scratch.
3. Confirm the new password is entered into both `New password` and `Confirm new password` and matches.
4. If still failing, capture the Network request body for `PATCH /api/admin/account/password` (passwords will be visible — this is OK locally) and the response status + body.

The server-side `bcrypt.compare` uses the same code path as login. If login works, password change will work too (modulo CSRF and current-password correctness).

---

## Verification

| Check                   | Command                                                                                                                                               | Pass criterion                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Type-check              | `pnpm type-check`                                                                                                                                     | exit 0                                         |
| Lint admin surface      | `NODE_OPTIONS="--max-old-space-size=8192" npx eslint src/app/admin src/lib/admin src/lib/d1/admin.ts src/lib/d1/public-tools.ts`                      | exit 0                                         |
| Build                   | `pnpm exec opennextjs-cloudflare build`                                                                                                               | produces `.open-next/worker.js`                |
| Live sign-in            | `curl -i -X POST -H "content-type: application/json" -d '{"username":"admin","password":"ResetPwd@2026"}' https://widgetly.tech/api/admin/auth/login` | `200` + `Set-Cookie: wly_admin=…`              |
| Live `/me`              | `curl -i https://widgetly.tech/api/admin/auth/me -H "Cookie: wly_admin=<token>"`                                                                      | `200` + `{"user":…}`                           |
| Live public tools menu  | `curl -s 'https://widgetly.tech/api/public/tools?category=pdf' \| jq '.total'`                                                                        | `> 0` once stage is seeded                     |
| Live grouped admin page | `curl -sL -b "wly_admin=<token>" https://widgetly.tech/admin/tools`                                                                                   | renders all categories with the grouped layout |

---

## Child DOX Index

_No children. The admin surface is a leaf domain — pages, auth, and D1 helpers are all documented in this AGENTS.md._
