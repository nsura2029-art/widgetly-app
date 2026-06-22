# Stage environment setup

This doc covers the one-time setup of `beta.widgetly.tech` and the
ongoing workflow for keeping it in sync with `widgetly.tech`.

## Overview

| Environment | Domain               | Worker name      | Branch    | D1 database      | KV namespace                |
| ----------- | -------------------- | ---------------- | --------- | ---------------- | --------------------------- |
| Production  | `widgetly.tech`      | `widgetly`       | `main`    | `widgetly`       | `NEXT_INC_CACHE_KV` (prod)  |
| Stage       | `beta.widgetly.tech` | `widgetly-stage` | `develop` | `widgetly-stage` | `NEXT_INC_CACHE_KV` (stage) |

Deploys:

- **develop** → stage (`.github/workflows/deploy-stage.yml`)
- **main** → production (`.github/workflows/deploy.yml`)

## One-time setup (do these in order)

### 1. Create the stage D1 database

```bash
wrangler d1 create widgetly-stage
```

The command prints a `database_id`. Copy it into
`wrangler.toml` under `[env.stage.d1_databases]`,
replacing `REPLACE_WITH_STAGE_D1_ID`.

### 2. Create the stage KV namespace

```bash
wrangler kv namespace create NEXT_INC_CACHE_KV --env stage
wrangler kv namespace create NEXT_INC_CACHE_KV --env stage --preview
```

Copy the printed `id` and `preview_id` into `wrangler.toml`
under `[env.stage.kv_namespaces]`, replacing
`REPLACE_WITH_STAGE_KV_ID` and `REPLACE_WITH_STAGE_KV_PREVIEW_ID`.

### 3. Apply D1 migrations to stage

```bash
pnpm db:migrate:stage
```

This runs every migration in `migrations/` against
`widgetly-stage`. The same idempotency rules as production apply
(only new ones run).

### 4. Deploy the stage Worker for the first time

```bash
pnpm deploy:stage
```

This deploys the current code with the `[env.stage]` config from
`wrangler.toml`. After this, the `widgetly-stage` Worker exists.

### 5. Attach the custom domain

In the Cloudflare dashboard:

1. Go to **Workers & Pages** → `widgetly-stage`.
2. **Settings** → **Triggers** → **Custom Domains** → **Add Custom Domain**.
3. Enter `beta.widgetly.tech`.
4. Cloudflare will create the DNS record automatically.

Wait ~30 s for the certificate to provision.

### 6. Set the stage secrets

Anything that's a secret in production should be a secret in stage
too (with the same value), plus one new one:

```bash
# Same values as production:
echo "$SUPABASE_URL"              | wrangler secret put SUPABASE_URL              --env stage
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env stage
echo "$WAITLIST_WEBHOOK_URL"      | wrangler secret put WAITLIST_WEBHOOK_URL      --env stage
echo "$SUGGEST_WEBHOOK_URL"       | wrangler secret put SUGGEST_WEBHOOK_URL       --env stage
echo "$NEXT_PUBLIC_ANALYTICS_TOKEN" | wrangler secret put NEXT_PUBLIC_ANALYTICS_TOKEN --env stage

# Different value from production (a token minted in one env shouldn't
# be valid in the other):
openssl rand -hex 32 | wrangler secret put ADMIN_SESSION_SECRET --env stage
```

The deploy workflow also pushes these automatically on every push to
`develop`, as long as the matching GH secret exists.

### 7. Seed the stage admin user

```bash
ADMIN_USERNAME=stage-admin \
ADMIN_PASSWORD='a-strong-password-you-can-share-with-the-team' \
D1_BINDING=remote \
pnpm seed:admin:remote \
  --remote \
  --db=widgetly-stage
```

(The current `seed-admin.mjs` targets the default D1; the easiest
path until we wire stage DB into the script is to manually run
the same INSERT against `widgetly-stage` — see `docs/operations/seed-admin.md`
once that doc lands.)

## Daily workflow

```bash
# Make changes on a feature branch
git checkout -b feat/something
# ... edit, commit, push ...
# Open PR against develop. CI runs (lint, type-check, test, format).

# After review, squash-merge to develop.
# This triggers .github/workflows/deploy-stage.yml:
#   - pnpm install
#   - sync secrets
#   - pnpm exec wrangler deploy --env stage
#   - pnpm exec wrangler d1 migrations apply widgetly-stage --remote --env stage
#   - bash scripts/warm-cache.sh https://beta.widgetly.tech

# After the stage deploy, verify at https://beta.widgetly.tech
# (and https://beta.widgetly.tech/admin for the dashboard).

# Once stage is green, open a release PR (develop → main). When that
# merges, the production deploy workflow fires.
```

## Troubleshooting

**`wrangler deploy --env stage` fails with "d1_databases[0] is
missing the required field `id`"** — you didn't replace
`REPLACE_WITH_STAGE_D1_ID` in `wrangler.toml` after running
`wrangler d1 create`.

**`pnpm db:migrate:stage` says "Database not found"** — the
worker hasn't been deployed yet, or the `database_name` in
`wrangler.toml` doesn't match the one you created.

**Stage site shows Error 1102** — KV cache binding is missing or
the ID in `wrangler.toml` is wrong. Check `wrangler kv namespace
list` and paste the correct ID.

**Stage admin can't sign in even with right password** — the
`admin_users` table on stage D1 doesn't have the user. Seed it
manually or run the seed script.

## Notes

- Stage shares the Cloudflare account with production but is a
  fully separate Worker + D1 + KV. Dropping stage data has zero
  effect on production.
- Stage deploys **don't** auto-promote to production. Production
  releases still go through the manual `develop → main` PR flow.
- Destructive migrations (DROP TABLE, etc.) should be tested on
  stage first — same as before, just with a different target.
