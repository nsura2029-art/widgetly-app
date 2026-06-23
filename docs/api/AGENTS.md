# AGENTS.md — API

Owns every route under `src/app/api/`: endpoints, request/response shapes, error codes, runtime notes.

> **DOX scope.** This is a child of the root [`AGENTS.md`](../../AGENTS.md). **Read the root first** for the Core DOX contract (Read Before Editing, Update After Editing, Closeout). The root's Child DOX Index lists this file as the owner of the API surface. The "Ownership" section below enumerates which routes and supporting files this child contract governs. When you add or change an endpoint, update this file's Endpoint reference + OpenAPI spec + Postman collection.

---

## Purpose

- Define the HTTP surface that powers widgetly.tech.
- Keep the runtime consistent: all routes run on Node.js (not Edge) to avoid `app-edge-has-no-entrypoint` in Next 16.
- Keep response shapes stable so the frontend and any external consumers can rely on them.
- Surface an OpenAPI 3.0 spec at `/api/openapi.json` for third-party clients and Postman.

---

## Ownership

| Surface              | File                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| API routes           | `src/app/api/**/route.ts`                                            |
| OpenAPI spec builder | `src/app/api/openapi.json/route.ts` (returns `openapi-types` shape)  |
| Schemas              | inline Zod (where used) + TypeScript types in `src/lib/`             |
| Postman collection   | `postman/widgetly-api.postman_collection.json`                       |
| Postman env presets  | `postman/environments/{local,prod,staging}.postman_environment.json` |
| Diagnostics          | `src/app/api/diag/{d1,consent}/route.ts` (dev-only, 404 in prod)     |

---

## Local Contracts

### Runtime

- Every `route.ts` MUST export `runtime = "nodejs"`. Edge runtime emits `app-edge-has-no-entrypoint` in Next 16.2 + Turbopack.
- Static export (`force-static`) only for `sitemap.ts` and `robots.ts`. API routes are always dynamic.

### Method handling

- Export named functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- `OPTIONS` is automatic in Next.js App Router — don't define it unless custom CORS is needed.
- Validate input via Zod or inline guards. Reject early with 400.

### Response shape

Every JSON response follows:

```ts
// Success:
{ ok: true, ...data }

// Error:
{ ok: false, error: "<machine-readable code>", message: "<human-readable>" }
```

Status codes:

- `200` — success.
- `400` — invalid input.
- `404` — resource not found (also used for dev-only routes in prod).
- `405` — wrong method (Next.js default).
- `409` — conflict (e.g., duplicate email).
- `429` — rate limit.
- `500` — unhandled error. Always log server-side, never expose internals.
- `503` — backing service unavailable (e.g., D1 not configured).

### Content-Type

- All POST endpoints accept `application/json`.
- All GET endpoints return `application/json`.
- File upload endpoints (if added) accept `multipart/form-data` with size cap (default: 1MB; configure in `next.config.ts`).

### CORS

- Same-origin only by default.
- For cross-origin consumption (e.g., Postman via tunnel), set explicit `Access-Control-Allow-Origin` headers per route. Don't blanket-allow.

---

## Work Guidance

### Adding a new endpoint

1. Create `src/app/api/<name>/route.ts`:

   ```ts
   import { NextResponse } from "next/server";

   export const runtime = "nodejs";

   export async function POST(req: Request) {
     const body = await req.json();
     // validate body, do work...
     return NextResponse.json({ ok: true, ...data });
   }
   ```

2. Add the endpoint to the OpenAPI spec at `src/app/api/openapi.json/route.ts`.
3. Add a request/response example to the Postman collection under `postman/`.
4. Document the endpoint in this AGENTS.md (add a row to the table below).

### Error handling pattern

```ts
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }
  // ... validate `body` shape, return 400 on failure
  try {
    const result = await doWork(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/<name>] failed", err);
    return NextResponse.json(
      { ok: false, error: "internal", message: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

### When the endpoint hits D1

- Always check `isD1Configured()` first. Return `503 d1_not_configured` if false.
- Use the typed helpers in `src/lib/d1/`, not raw SQL.
- Catch and translate unique-constraint errors to `409 conflict`.

---

## Endpoint reference

### `GET /api/openapi.json`

OpenAPI 3.0 spec for the entire API surface. Powers Postman import + any external client.

- Runtime: nodejs (dynamic).
- Response: `application/json`, full OpenAPI document.

### `GET /api/locale` | `POST /api/locale` | `DELETE /api/locale`

Reads, sets, clears the user's locale preference cookie + KV mirror.

- Runtime: nodejs.
- Cookie: `NEXT_LOCALE` (httpOnly, secure, sameSite=lax).
- `GET` returns `{ ok: true, locale: string | null }`.
- `POST` body: `{ locale: "en" | "es" | "fr" }`. Returns `{ ok: true, locale }`.
- `DELETE` clears the cookie.

### `POST /api/waitlist`

Email signup. Writes to Cloudflare D1.

- Body: `{ email: string, source?: string, locale?: string }`.
- Response (inserted): `{ ok: true, kind: "inserted", position: number, email: string }`.
- Response (duplicate): `{ ok: true, kind: "duplicate", position: number, message: "You're already on the list" }`.
- 400 on invalid email. 503 if D1 not configured.
- `position` is the row's `id` (monotonic since `INTEGER PRIMARY KEY AUTOINCREMENT`).

### `POST /api/suggest`

Legacy tool-suggestion intake. Writes to D1 through the suggestion-board helper and remains for older clients.

- Body: `{ slug: string, name: string, pitch?: string, category?: string }`.
- Response (inserted): `{ ok: true, kind: "inserted", slug }`.
- Response (duplicate): `{ ok: true, kind: "duplicate", slug, message: "Already suggested" }`.
- `slug` must match `^[a-z0-9-]{3,40}$`.

### `GET /api/suggestions`

List the public suggestion board.

- Query: `category`, `status`, `sort`, `page`.
- `status`: `in_review | building | live | rejected`.
- `sort`: `most_voted | newest | recently_built`.
- Pagination: 20 per page.
- Response: `{ ok: true, suggestions, total, page, pageSize, totalPages }`.
- Cache: `s-maxage=60`, `stale-while-revalidate=300`.

### `POST /api/suggestions`

Create a public suggestion.

- Body: `{ toolName: string, description: string, useCase: string, category: string, urgency: "low"|"medium"|"high", email: string }`.
- Validation: tool name 3-50 chars, description 50-500 chars, use case 20-300 chars, valid email, category must be a known slug (including `"Other"`).
- Rate limit: 3 suggestions per email per UTC day, tracked in D1.
- Response: `{ ok: true, suggestion }` with status `201`.
- 429 on rate limit. 503 if D1 is not configured.
- **Validation error shape**: 400 responses include `error.fields[]` where each item is `{ path, message }`. The `message` value is a **stable, locale-independent code** from `SUGGESTION_ERROR_CODES` in `src/lib/suggestions/validation.ts` (e.g. `"toolNameMin"`, `"emailInvalid"`), **not** a human-readable string. Clients translate codes via `useTranslations("suggest.formNew.errors")` from `next-intl`. This decouples the API contract from any specific locale.

### `GET /api/suggestions/[id]`

Read one public suggestion by numeric `id` or URL `slug`.

- Response: `{ ok: true, suggestion }`.
- 404 if the suggestion does not exist.

### `POST /api/suggestions/[id]/upvote`

Add an upvote.

- Anonymous voters are tracked by hashed IP + `wly_suggest_session` cookie.
- Registered vote support is reserved via `x-widgetly-user-id`; those votes count as weight 2.
- Response: `{ ok: true, upvotes, voted: true }`.

### `DELETE /api/suggestions/[id]/upvote`

Remove an upvote for the current anonymous session or registered user.

- Response: `{ ok: true, upvotes, voted: false }`.

### `GET /api/public/tools`

Public read-only access to the live tool catalog (no auth, no rate limit). Mirrors the data rendered in `/tools/[category]` for callers that want a machine-readable source.

- Query params:
  - `category` (optional) — slug of a single category. When present, returns the live tools in that category ordered by `sort_order ASC`.
  - `limit` (optional, default 200, max 500) — cap on the result list.
  - `format` (optional, default `json`) — one of:
    - `json` — `{ tools: PublicTool[], total: number, category?: string }`
    - `jsonl` — newline-delimited JSON, one tool per line
    - `count` — `{ category: string, count: number }` (only meaningful with `category`)
    - `grouped` (only meaningful when `category` is omitted) — `{ categories: Record<category, { slug, name }[]>, total: number }`. Lightweight summary used by the header mega-menu; only slug + name per tool to keep the payload small. Cached at the edge with `s-maxage=10, stale-while-revalidate=86400` so admin status changes propagate within ~10s.
- When `category` is omitted and `format` is not `grouped`, returns aggregated counts: `{ counts: Record<category, number>, total: number }`.
- `PublicTool` shape: `{ id, slug, category, name, description, pricing_tier, icon_url, accent_color, sort_order, status, live_at }`.
- Returns 500 with `{ tools: [], total: 0, error: "internal" }` if D1 throws.
- The endpoint always returns `status='live'` rows only; the DB is the source of truth for the public menu.

### `POST /api/contact`

Contact form submission. Forwards to webhook or D1.

- Body: `{ name: string, email: string, subject: string, message: string }`.
- Response: `{ ok: true, message: "Thanks, we'll get back to you within 48h" }`.
- Rate-limited (10 / hour / IP).

### `GET /api/diag/d1`

**Dev-only.** Returns `{ ok, configured, count }` after pinging D1. Returns 404 in production (`NODE_ENV === "production"`).

- Runtime: nodejs (force-static won't work — it's dynamic).
- Don't expose any internal details beyond `{ count }`.

### `GET /api/diag/consent`

**Dev-only.** Returns the current cookie consent state. 404 in production.

---

## Admin API surface

All admin routes are under `/api/admin/`. They all run on Node.js and require a valid `wly_admin` session cookie unless explicitly noted. State-changing routes (`POST`/`PATCH`/`DELETE`) additionally require a valid `x-csrf-token` header that matches the `wly_admin_csrf` cookie. The auth flow:

1. `POST /api/admin/auth/login` → sets `wly_admin` (HttpOnly, SameSite=Strict) and `wly_admin_csrf` (non-HttpOnly so JS can read it) cookies.
2. Client reads `csrfToken = document.cookie` or `GET /api/admin/csrf-token`, then sends `x-csrf-token: <value>` on every subsequent state-changing call.
3. `POST /api/admin/auth/logout` revokes the D1 session row and clears both cookies.

### `POST /api/admin/auth/login`

- Body: `{ username: string, password: string }`.
- Hardening: bcrypt cost 12, 5 attempts / IP / minute sliding window, constant-time response on no-such-user, never reveals which of username/password was wrong.
- Response 200: `{ user: { id, username, display_name, must_change_password, csrf_token } }`. Sets `wly_admin` + `wly_admin_csrf` cookies.
- Response 400: invalid body. 401: bad credentials. 403: account disabled. 429: rate limited.

### `POST /api/admin/auth/logout`

- Auth: not required (idempotent — stale tabs can always sign out).
- Revokes the current D1 session row, clears both cookies, audits the event into `admin_login_attempts` with `success=1 reason='logout'`.
- Always 200.

### `GET /api/admin/auth/me`

- Auth: required.
- Response 200: `{ user: { id, username, display_name, must_change_password } }`.
- 401 if no valid session.

### `GET /api/admin/auth/session`

- Auth: required.
- Lightweight probe used by the admin layout. 200 on valid session, 401 otherwise. No body.

### `GET /api/admin/csrf-token`

- Auth: not required.
- Returns `{ token: string }` (read from the `wly_admin_csrf` cookie). If the cookie is absent, a fresh token is minted and the cookie is set in the response.
- Used to prime the client before the first state-changing call.

### `POST /api/admin/account/forgot-password`

- Auth: not required.
- Body: `{ username: string }`.
- Rate limit: 3 / 10 minutes / IP.
- Issues a one-time reset token. Response is the same shape regardless of whether the username exists; `reset_url` is only present when the user exists. (No email channel yet — token is returned in the response so the requester can copy it. When email is added, send via email and remove `reset_url`.)
- 400 on bad body. 200 on success.

### `POST /api/admin/account/reset-password`

- Auth: not required (token is the entire proof of identity).
- Body: `{ token: string, new_password: string, confirm_password: string }`.
- Single-use: the token row is marked `used_at`. Sets new bcrypt hash, clears `must_change_password`.
- 410 Gone for expired/used tokens. 400 for other validation errors. 200 on success.

### `PATCH /api/admin/account/password`

- Auth: required (session + CSRF header).
- Body: `{ current_password: string, new_password: string, confirm_password: string }`.
- Updates the authenticated admin's password. Clears `must_change_password`. Does **not** invalidate other sessions.
- 400 on bad body or `result.error` from the bcrypt compare. 403 on missing/invalid CSRF. 401 on no session. 200 on success.

### `GET /api/admin/tools`

- Auth: required.
- Query params (all optional, validated by Zod `ListToolsQuery`): `status` (`all | suggested | under_review | in_progress | live | deprecated | rejected`), `category`, `q` (substring match against name/description/slug), `sort` (`live_first | newest | oldest | alpha`), `limit` (≤200, default 50), `offset` (default 0), `page` (1-indexed).
- Response: `{ rows: AdminTool[], total: number }`.
- Used by the admin tools page; the new grouped dashboard prefers the bucketed helper `listToolsGroupedByCategory()` from `src/lib/admin/tools.ts` (see [docs/admin/AGENTS.md](../admin/AGENTS.md)) and falls back to this route via the same auth context.

### `POST /api/admin/tools`

- Auth: required + CSRF.
- Body: validated by Zod `CreateToolBody`. `slug` must match `^[a-z0-9-]{3,80}$`, `category` must be a known slug, `name` 3-100 chars, `pricing_tier` ∈ `{free, freemium, paid}`, `status` defaults to `suggested`.
- Creates a tool. 201 on success with `{ tool: AdminTool }`. 400 on bad body. 409 if the slug already exists in this category.

### `GET /api/admin/tools/[id]`

- Auth: required.
- Response: `{ tool: AdminTool, history: AdminStatusHistory[] }`. 404 if not found.

### `PATCH /api/admin/tools/[id]`

- Auth: required + CSRF.
- Body: validated by Zod `UpdateToolBody`. Supports partial updates of any field plus a `notes` string appended to the audit history.
- Status transitions are validated by `canTransition` (see `src/lib/admin/tools.ts`); illegal transitions return 409. Not-found returns 404. 200 on success with `{ tool: AdminTool }`.

### `DELETE /api/admin/tools/[id]`

- Auth: required + CSRF.
- Hard-deletes a tool. Audit log rows are preserved. 200 with `{ ok: true }`.

---

---

## Verification

| Check                              | Command                                                                                                                 | Pass criterion                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| OpenAPI spec valid                 | `curl https://widgetly.tech/api/openapi.json \| jq .openapi`                                                            | returns `"3.0.x"`                                       |
| All routes return JSON             | `curl -H "Accept: application/json" <url>`                                                                              | `Content-Type: application/json`                        |
| D1 endpoint works                  | `curl -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com"}' https://widgetly.tech/api/waitlist` | returns `{ ok: true, kind: "inserted", position: <n> }` |
| Dev-only routes 404 in prod        | `curl https://widgetly.tech/api/diag/d1` (prod URL)                                                                     | `404`                                                   |
| Postman collection imports cleanly | Postman → Import → `postman/widgetly-api.postman_collection.json`                                                       | no parse errors                                         |

---

## OpenAPI spec

The OpenAPI document is built at runtime by `src/app/api/openapi.json/route.ts`. It aggregates every endpoint schema by statically importing this AGENTS.md and parsing the endpoint reference table above (future improvement — currently hand-maintained).

When you add an endpoint, update both:

1. The endpoint row in this AGENTS.md (for humans).
2. The OpenAPI builder (for machines).

---

## Postman collection

`postman/widgetly-api.postman_collection.json` — 15 requests across 6 folders (Auth, Locale, Waitlist, Suggest, Contact, Diag). Import into Postman → select environment preset → run.

Environments:

- `postman/environments/local.postman_environment.json` — `http://127.0.0.1:8787` (matches `wrangler dev` default).
- `postman/environments/prod.postman_environment.json` — `https://widgetly.tech`.

Each folder has automated shape tests (response is JSON, `ok` field present, expected keys).

---

## Child DOX Index

| Subtree                    | Owns                                                                                                                                                                                                                           | AGENTS.md                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Admin pages and D1 surface | Pages under `src/app/admin/**` + the admin D1 helpers in `src/lib/admin/**` and `src/lib/d1/admin.ts` + the `admin_*` tables in `migrations/0004_admin.sql`. Cross-references the admin API endpoints documented in this file. | [`docs/admin/AGENTS.md`](../admin/AGENTS.md) |
