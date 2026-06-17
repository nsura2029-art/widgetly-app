# Postman collection — Widgetly API

A Postman v2.1 collection for the public Widgetly HTTP API. Use it to smoke-test a deploy, reproduce a bug, or explore the API surface.

## Files

| File                                               | What it is                                                                                                                                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `widgetly-api.postman_collection.json`             | The collection — one folder per resource, plus happy-path and negative-path test variants per endpoint. Every request has a description; most have automated Postman tests that assert the response shape. |
| `widgetly-api.production.postman_environment.json` | Environment preset pointing at `https://widgetly.tech`. Import this to test prod.                                                                                                                          |
| `widgetly-api.local.postman_environment.json`      | Environment preset pointing at `http://localhost:8787`. Use this after running `pnpm preview` locally.                                                                                                     |

## Quick start

1. **Import the collection** in Postman: `File → Import → upload files → select widgetly-api.postman_collection.json`.
2. **Import an environment** the same way. Pick `production` or `local` depending on what you want to hit.
3. **Select the environment** in the environment dropdown (top right of Postman) so the `{{baseUrl}}` variable resolves.
4. **Run the collection** with `Collection Runner` to execute all requests in order and see the test results.

## What the collection covers

| Folder                 | Requests                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAPI Spec           | `GET /api/openapi.json` — checks the spec itself, useful as a deploy smoke-test.                                                                                   |
| Locale                 | `GET /api/locale` (current state), `POST` (set), `POST` invalid locale, `DELETE` (reset).                                                                          |
| Waitlist               | `POST` happy path, `POST` resubmit (same email — proves dedup works when Supabase is configured), `POST` invalid email.                                            |
| Tool Suggestion        | `POST` full payload, `POST` minimal (name + description only), `POST` missing required fields.                                                                     |
| Contact                | `POST` happy path, `POST` message too short.                                                                                                                       |
| Diagnostics (dev-only) | `GET /api/diag/supabase`, `GET /api/diag/consent`. These return **404 in production** by design (NODE_ENV guard inside the route); the tests handle both branches. |

## Variables you can override

The collection defines three variables on the active environment:

| Variable    | Default                                                          | Override if…                                                     |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `baseUrl`   | `https://widgetly.tech` (prod) / `http://localhost:8787` (local) | you're testing a preview deploy                                  |
| `locale`    | `es`                                                             | you want to test a different supported locale (`en`, `es`, `fr`) |
| `testEmail` | `postman-...@example.com`                                        | you don't want to spam the same address on prod                  |

## Syncing with the API

The collection mirrors `src/lib/api/schemas.ts` and `src/app/api/*/route.ts`. When you change a Zod schema or add a route:

1. Update the collection to match (request body, expected fields, test assertions).
2. Update `src/lib/api/openapi.ts` similarly — the Swagger UI at `/docs` reads from there.

If you change one but not the other, the Postman tests will catch the drift quickly.

## Why the tests are in the collection, not in the route code

Postman tests are end-to-end: they hit the live HTTP boundary the way a real client would. The Zod schemas inside the route are unit-level. Both are useful — keep them in sync.

## Common gotchas

- **`baseUrl` must not have a trailing slash.** The collection builds paths as `{{baseUrl}}/api/...`. A trailing slash produces `//api/...` which 404s.
- **The locale variable must be lowercase.** `Klingon` won't validate. Use one of `en`, `es`, `fr`.
- **The diag endpoints will always 404 against production.** That's by design. To test them, switch to the `local` environment and run `pnpm preview` first.
