# Widgetly API Reference

The Widgetly public HTTP API. Three POST endpoints, all on the
Cloudflare Workers edge runtime, all returning JSON, all
requiring no authentication.

> **Live docs:** [widgetly.app/docs](https://widgetly.app/docs) — interactive
> Swagger UI, generated from the OpenAPI 3.0 spec below.
>
> **Spec (JSON):** [widgetly.app/api/openapi.json](https://widgetly.app/api/openapi.json)
> — hand-maintained in [`src/lib/api/openapi.ts`](../src/lib/api/openapi.ts).

---

## Conventions

- **Base URL:** `https://widgetly.app` (production) /
  `https://staging.widgetly.app` (staging) /
  `http://localhost:3000` (local dev).
- **Content type:** `application/json; charset=utf-8`. Form-encoded
  bodies are not accepted.
- **Authentication:** none. All endpoints are public. (Reserved
  `bearerAuth` security scheme in the spec for future use.)
- **Rate limit:** not enforced today. Soft cap of ~60 req/min per
  IP; add a Cloudflare WAF rule when traffic warrants it.
- **Versioning:** the URL path is the version. Today: `/api/*`. A
  v2 introduces `/api/v2/*` with deprecation headers on v1.
- **CORS:** not configured. The endpoints are same-origin only;
  cross-origin requests get no CORS headers and the browser
  blocks them. Add `Access-Control-Allow-Origin` when there's a
  cross-origin consumer.

## Response envelope

**Success** — `2xx` with a typed body:

```json
{
  "ok": true,
  "id": "sg_a1b2c3d4e5",
  "slug": "pdf-summarizer",
  "status": "pending_review",
  "message": "Got it — your idea is in the queue."
}
```

**Error** — `4xx`/`5xx` with a uniform envelope:

```json
{
  "ok": false,
  "error": {
    "code": "validation_error",
    "message": "Some fields didn't pass validation.",
    "fields": [{ "path": "email", "message": "Please enter a valid email address." }]
  }
}
```

| `code`               | HTTP | Meaning                                                                  |
| -------------------- | ---- | ------------------------------------------------------------------------ |
| `validation_error`   | 400  | One or more input fields failed Zod validation. `fields` lists each one. |
| `method_not_allowed` | 405  | The endpoint doesn't support this HTTP verb.                             |
| `internal_error`     | 500  | Server fault. Retry with exponential backoff. We log to console.         |

All error messages are safe to surface directly to end users — no
internal jargon, no stack traces.

## Endpoints

### `POST /api/waitlist`

Add an email to the launch waitlist.

**Request:**

```json
{
  "email": "founder@acme.com",
  "source": "home"
}
```

| Field    | Type   | Required | Notes                                                               |
| -------- | ------ | -------- | ------------------------------------------------------------------- |
| `email`  | string | yes      | RFC 5322 email, lowercased server-side, max 254 chars               |
| `source` | enum   | no       | `home` \| `footer` \| `blog` \| `tools` \| `other`. Default `other` |

**Response (200):**

```json
{
  "ok": true,
  "position": 8421,
  "message": "You're on the list!"
}
```

`position` is a synthetic estimate until the WAITLIST KV binding
is enabled; see [DEPLOYMENT.md](./DEPLOYMENT.md#waitlist-persistence).

**cURL:**

```bash
curl -X POST https://widgetly.app/api/waitlist \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","source":"home"}'
```

---

### `POST /api/suggest`

Submit a tool suggestion.

**Request:**

```json
{
  "name": "PDF Summarizer",
  "description": "Drop in a PDF, get a 5-bullet summary. Useful for long reports and contracts.",
  "category": "Writing",
  "email": "founder@acme.com",
  "source": "form",
  "idempotencyKey": "client-7f8a9b2c"
}
```

| Field            | Type   | Required | Notes                                                                                        |
| ---------------- | ------ | -------- | -------------------------------------------------------------------------------------------- |
| `name`           | string | yes      | 1–80 chars. Becomes the slug for `/suggest/{slug}`.                                          |
| `description`    | string | yes      | 1–2000 chars. What the tool does and why it's useful.                                        |
| `category`       | string | no       | 1–40 chars, free-form.                                                                       |
| `email`          | string | no       | Follow-up email. We never share it.                                                          |
| `source`         | enum   | no       | `form` \| `homepage_widget` \| `footer` \| `other`. Default `form`.                          |
| `idempotencyKey` | string | no       | 8–64 chars, URL-safe (`A-Za-z0-9_-`). Re-posting the same key returns the original response. |

**Response (200):**

```json
{
  "ok": true,
  "id": "sg_a1b2c3d4e5",
  "slug": "pdf-summarizer",
  "status": "pending_review",
  "message": "Got it — your idea is in the queue. We'll review it within one business day."
}
```

**cURL:**

```bash
curl -X POST https://widgetly.app/api/suggest \
  -H "content-type: application/json" \
  -d '{
    "name":"Markdown → PDF",
    "description":"Convert a markdown file into a styled PDF with custom fonts.",
    "email":"you@example.com"
  }'
```

---

### `POST /api/contact`

Send a contact-form message.

**Request:**

```json
{
  "name": "Jane Doe",
  "email": "jane@acme.com",
  "message": "Hi — evaluating Widgetly for a 12-person team. Can we schedule a call?",
  "referrer": "https://widgetly.app/about"
}
```

| Field      | Type   | Required | Notes                                        |
| ---------- | ------ | -------- | -------------------------------------------- |
| `name`     | string | yes      | 1–80 chars.                                  |
| `email`    | string | yes      | RFC 5322 email.                              |
| `message`  | string | yes      | 10–2000 chars.                               |
| `referrer` | string | no       | URL the user was on. Useful for attribution. |

**Response (200):**

```json
{
  "ok": true,
  "id": "ct_z9y8x7w6v5",
  "ticket": "WID-1042",
  "message": "Thanks — your message is in. We'll reply within one business day."
}
```

`ticket` is a 4-digit reference the user can quote in follow-up
email. The id is the server-side key.

**cURL:**

```bash
curl -X POST https://widgetly.app/api/contact \
  -H "content-type: application/json" \
  -d '{
    "name":"Jane Doe",
    "email":"jane@acme.com",
    "message":"Hi — evaluating Widgetly for a 12-person team. Can we schedule a call?"
  }'
```

---

### `GET /api/openapi.json`

The OpenAPI 3.0 specification, served as JSON. Cache-controlled
to 5 minutes. Self-describing; the same document drives the
Swagger UI at `/docs`.

### `GET /docs`

The interactive Swagger UI. HTML, fully bookmarkable, has its
own canonical URL and OG tags for SEO.

---

## Error codes

| HTTP | `code`               | When                                                             | Retry?                |
| ---- | -------------------- | ---------------------------------------------------------------- | --------------------- |
| 400  | `validation_error`   | A field failed Zod validation. See `error.fields` for which one. | No — fix the request. |
| 405  | `method_not_allowed` | Wrong verb for the endpoint (e.g. `GET /api/suggest`).           | No.                   |
| 500  | `internal_error`     | Unhandled server fault. Logged to Cloudflare Workers `console`.  | Yes — with backoff.   |

## What happens to submissions

Today, all three endpoints forward their validated payload to a
configurable webhook URL — see [DEPLOYMENT.md](./DEPLOYMENT.md#configuring-the-webhook-forwarder).
The webhook is the durable record. The API itself doesn't write
to any persistent storage; if the webhook is unset, submissions
are accepted and dropped (with a `console.log` line so you can see
them in the worker logs).

When the persistence layer is wired up (Cloudflare D1, Workers
KV, or an external service), the route's only change is one write
call before the webhook forward.

## Edge-runtime notes

Every route file uses `export const runtime = "edge"`. The shared
helpers in `src/lib/api/responses.ts` use only:

- The standard `fetch` (for the webhook forward).
- Web Crypto via `crypto.getRandomValues` (for IDs and ticket
  numbers).
- The `Request` / `Response` / `NextResponse` types from Next.js.

No `fs`, no `crypto` from Node, no `Buffer`, no long-lived
connections. The build passes the OpenNext edge bundler without
warnings.

## Adding a new endpoint

1. Define the request/response Zod schemas in
   `src/lib/api/schemas.ts` (single source of truth for runtime
   validation).
2. Add the route in `src/app/api/<name>/route.ts`, importing
   `parseJson`, `withErrorHandling`, `jsonOk`, `forwardToWebhook`
   from `@/lib/api/responses`.
3. Add the operation to `src/lib/api/openapi.ts`. Mirror the Zod
   schema in the OpenAPI schema; add an example; add a `tags`
   entry.
4. The Swagger UI at `/docs` picks it up on the next deploy
   (the spec is served fresh on every request).
5. If it's a write endpoint, add the matching `*_WEBHOOK_URL`
   env var to the Cloudflare dashboard.
