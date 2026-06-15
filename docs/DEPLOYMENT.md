# Deployment Guide

How to ship the Widgetly app to Cloudflare Pages + Workers.
Built for the `feature/nodejs-upgrade` branch.

---

## TL;DR

```bash
# One-time setup (per environment):
#   1. Create a Cloudflare account
#   2. Install wrangler:        pnpm add -g wrangler
#   3. Authenticate:            wrangler login
#   4. Create a project:        wrangler projects create widgetly
#   5. Bind KV / D1 in the Cloudflare dashboard if you need persistence

# Every deploy:
pnpm install --frozen-lockfile
pnpm deploy                          # build + wrangler deploy

# Or, for a preview build served locally:
pnpm preview                         # build + opennextjs-cloudflare preview
```

The deploy command is wired in `package.json`:

```json
"deploy": "opennextjs-cloudflare build && wrangler deploy"
```

---

## How the deploy works

1. **`opennextjs-cloudflare build`** transforms the Next.js
   project into a Cloudflare Workers-compatible bundle:
   `.open-next/worker.js` (the runtime) + `.open-next/assets/`
   (the static files).
2. **`wrangler deploy`** reads `wrangler.toml`, finds the
   `main` entrypoint, and uploads the bundle to the Workers
   runtime. Static assets are uploaded to the Cloudflare CDN.
3. The Worker serves all dynamic and static routes from the
   edge. No origin server, no regional replicas.

The end state: a globally distributed site served from 300+
Cloudflare PoPs, with sub-100ms cold starts.

---

## Prerequisites

- **Cloudflare account** with Workers paid plan ($5/month for
  10M requests, well over launch-week needs).
- **Wrangler 3.x** — `pnpm add -g wrangler` or use `npx wrangler`.
- **Node 22+** and **pnpm 11+** (already in `package.json` via
  `packageManager`).
- A custom domain on Cloudflare, or a `workers.dev` subdomain
  for the initial deploy.

## Environment setup

### One-time

```bash
# 1. Authenticate wrangler with your Cloudflare account.
wrangler login

# 2. Verify the project name in wrangler.toml.
#    name = "widgetly"  →  your-worker.your-subdomain.workers.dev
```

### Per-environment variables (Cloudflare dashboard)

| Variable                          | Required | Used by                       | Notes                                                                                |
| --------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `WAITLIST_WEBHOOK_URL`            | optional | `/api/waitlist`               | POST the validated email + metadata here. Discord, Slack, Resend, or a custom proxy. |
| `SUGGEST_WEBHOOK_URL`             | optional | `/api/suggest`                | POST the tool suggestion + server-minted id/slug.                                    |
| `CONTACT_WEBHOOK_URL`             | optional | `/api/contact`                | POST the contact-form message + ticket number.                                       |
| `NEXT_PUBLIC_TWITTER_HANDLE`      | optional | `Organization.sameAs` JSON-LD | Opt-in: setting this emits the Twitter URL in the Organization schema.               |
| `NEXT_PUBLIC_DISCORD_INVITE`      | optional | `Organization.sameAs` JSON-LD | Opt-in: setting this emits the Discord invite URL in the Organization schema.        |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | optional | Root `<head>` meta tag        | Paste from Google Search Console for site verification.                              |
| `NEXT_PUBLIC_BING_VERIFICATION`   | optional | Root `<head>` meta tag        | Paste from Bing Webmaster Tools.                                                     |

Webhooks are optional — the API still works without them, submissions just get logged
to the worker's `console` instead of being forwarded.

### Binding KV / D1 (optional persistence)

Edit `wrangler.toml` and uncomment the relevant block. Example
for the waitlist counter:

```toml
[[kv_namespaces]]
binding = "WAITLIST"
id = "REPLACE_WITH_KV_NAMESPACE_ID"           # from `wrangler kv:namespace create widgetly-waitlist`
preview_id = "REPLACE_WITH_PREVIEW_KV_NAMESPACE_ID"  # from the same command with --preview
```

Then in the route, swap the synthetic-position line for a real
counter:

```ts
// before
const position = Math.floor(8000 + Math.random() * 1500);

// after
const list = env.WAITLIST.list({ prefix: "email:" });
const position = (await list.keys).length + 1;
```

## Deploy steps

```bash
# 1. Make sure your branch is clean and tests pass.
pnpm install --frozen-lockfile
pnpm type-check
pnpm build                          # smoke-test the build before deploying

# 2. Deploy to Cloudflare.
pnpm deploy

# 3. Verify the production URL.
curl -I https://widgetly.app/        # expect 200
curl -I https://widgetly.app/docs    # expect 200 (Swagger UI)
curl https://widgetly.app/api/openapi.json | head -c 200
```

## Preview deployments

`pnpm preview` runs the OpenNext preview server locally — useful
for testing edge behavior before pushing:

```bash
pnpm preview
# → opennextjs-cloudflare build && opennextjs-cloudflare preview
# → .open-next/worker.js served at http://localhost:8787
```

For PR previews on the actual Cloudflare infrastructure, use
[Cloudflare Pages PR previews](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
or deploy to a staging worker (`wrangler deploy --env staging`)
if you've configured multi-environment in `wrangler.toml`.

## Cloudflare Pages vs Cloudflare Workers

The project ships on **Workers via OpenNext** (the `main` field in
`wrangler.toml` points at the OpenNext-emitted worker). For most
Next.js apps this is the right answer because:

- Workers handle dynamic + static in one runtime.
- The OpenNext adapter handles the SSR-to-Worker translation.
- No `/api`-vs-static split; everything is one edge runtime.

Use **Cloudflare Pages** if you specifically need:

- Cloudflare Access (Zero Trust) integration
- Pages Functions alongside static files (separate runtime)
- The legacy Pages SSR mode (`_worker.js`)

If you want to switch to Pages, the change is:

1. Move the OpenNext output to a Pages project.
2. Update `wrangler.toml` (or remove it in favor of Pages
   config).
3. Set up the Pages build command: `pnpm opennextjs-cloudflare
build && cp -r .open-next/assets ./dist/assets`.

For now, stay on Workers — the OpenNext adapter is the simpler path.

## CI/CD

A minimal GitHub Actions workflow to deploy on every push to
`main`:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 11 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

`CLOUDFLARE_API_TOKEN` is a Cloudflare API token with the
`Workers Scripts:Edit` + `Workers KV Storage:Edit` + `Workers
Routes:Edit` permissions, scoped to the `widgetly` worker.

## Rollback

Cloudflare Workers keeps the last 100 deployments. Roll back
from the dashboard (Workers → widgetly → Deployments → click a
previous version → _Rollback to this deploy_) or via wrangler:

```bash
wrangler rollback --message "Revert bad release"
```

## Monitoring

The `[observability]` block in `wrangler.toml` is enabled by
default. Logs are at [dash.cloudflare.com](https://dash.cloudflare.com)
→ Workers & Pages → widgetly → Logs. Each request shows:

- Request method, path, status, duration.
- Any `console.log` / `console.error` from the route.
- The worker invocation ID for cross-referencing.

For application-level metrics (submission counts, success rates),
add a small log-aggregator step or pipe `console.log` lines into
Cloudflare Logpush → your warehouse.

## Common deploy issues

| Symptom                                                  | Cause                                                                                                         | Fix                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `wrangler deploy` fails with "Could not resolve"`        | `pnpm install` wasn't run, or the lockfile is out of sync                                                     | `pnpm install --frozen-lockfile`                                                                  |
| API returns 500 with `internal_error` in the worker logs | Unhandled error in a route handler. Most common cause: a missing env var.                                     | Check the worker logs in the Cloudflare dashboard.                                                |
| `pnpm deploy` succeeds but `/docs` is unstyled           | The build output doesn't include `/api-docs/*`.                                                               | Verify the `cp` step that copies swagger-ui-dist assets to `public/api-docs/` ran during install. |
| `next/image` returns 404                                 | `images.unoptimized: true` is set; raster images need a Cloudflare Image Resizing binding.                    | Either move to Cloudflare Image Resizing or self-host the assets.                                 |
| Routes 308-redirect in a loop                            | `next.config.ts` redirects are checked before the route handler; double-check the source/destination pattern. | `wrangler tail` to see the redirect chain.                                                        |

## Pre-launch checklist

Before the public launch, walk through this list:

- [ ] Custom domain configured in `wrangler.toml` and
      Cloudflare dashboard.
- [ ] DNS records proxied through Cloudflare (orange-cloud
      enabled).
- [ ] HTTPS forced (Cloudflare does this by default).
- [ ] All `*_WEBHOOK_URL` env vars set in the dashboard.
- [ ] `[observability]` enabled in `wrangler.toml`.
- [ ] Cloudflare Web Analytics token set in the dashboard
      (`NEXT_PUBLIC_ANALYTICS_TOKEN`, not yet wired in this branch).
- [ ] `NEXT_PUBLIC_SITE_LIVE=true` set so the form success
      states fire (see [LAUNCH_INDEXABILITY.md](./LAUNCH_INDEXABILITY.md)).
- [ ] Lighthouse run against the production URL: target SEO 100,
      Performance 90+, A11y 95+, Best Practices 95+.
- [ ] One end-to-end test against production: submit the
      waitlist, suggest, and contact forms; confirm webhooks fire.
- [ ] Sitemap.xml fetched and validated.
- [ ] robots.txt and OpenAPI spec fetched and validated.
