# AGENTS.md — Operations

Owns pnpm scripts, common command sequences, deploy workflow, and troubleshooting.

> **DOX scope.** This is a child of the root [`AGENTS.md`](../../AGENTS.md). **Read the root first** for the Core DOX contract (Read Before Editing, Update After Editing, Closeout). The root's Child DOX Index lists this file as the owner of pnpm scripts and operational workflows. The "Ownership" section below enumerates which surfaces this child contract governs. When you add or change a script or workflow, update this file.

---

## Purpose

- Document every `pnpm <script>` so the right command is obvious for the right task.
- Codify common multi-step workflows (push + merge + deploy) so they're reproducible.
- Capture troubleshooting steps for known failure modes.

---

## Ownership

| Surface            | File                                       |
| ------------------ | ------------------------------------------ |
| Script definitions | `package.json` `scripts` block             |
| CI workflow        | `.github/workflows/deploy.yml`             |
| wrangler config    | `wrangler.toml`                            |
| OpenNext adapter   | `open-next.config.ts`                      |
| Next.js config     | `next.config.ts`                           |
| Build wrapper      | `run-build.sh` (sandbox-side, not in repo) |

---

## Local Contracts

### Scripts must be idempotent

- Re-running `pnpm db:migrate:local` after no new migrations should be a no-op (exit 0).
- `pnpm setup:secrets` should overwrite, not duplicate.
- `pnpm deploy` (if invoked locally) should not leave half-deployed state on failure.

### Scripts must not require interactivity

- No `read -p` prompts. No `confirm()` calls.
- If a script needs input, fail fast with a clear error pointing to env vars.

### Cross-platform

- Scripts run on macOS, Linux, and Windows (PowerShell).
- Avoid bashisms. Use `node -e` for inline JS when needed.
- Use `path.resolve` not string concat for paths.

---

## Work Guidance

### pnpm scripts (canonical list)

#### Local dev

| Script         | Purpose                                                              | When to use                          |
| -------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `pnpm install` | Install deps from `pnpm-lock.yaml`. Uses corepack shims.             | After clone, after pulling new deps. |
| `pnpm dev`     | Start Next.js dev server with Turbopack.                             | Day-to-day feature work.             |
| `pnpm build`   | Run `next build` (production bundle, no Worker).                     | Quick local check before deploy.     |
| `pnpm preview` | `opennextjs-cloudflare build` + `wrangler dev`. Full Worker preview. | Final smoke test before push.        |

#### Code quality

| Script             | Purpose                         | When to use                                                                       |
| ------------------ | ------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm type-check`  | `tsc --noEmit`. No file output. | Before commit, before PR.                                                         |
| `pnpm lint`        | `eslint .` (whole project).     | Run with `NODE_OPTIONS="--max-old-space-size=8192"` to avoid OOM on big projects. |
| `pnpm lint <path>` | Lint specific files.            | Faster than full lint.                                                            |
| `pnpm format`      | Prettier write.                 | Optional, mostly automatic via editor.                                            |

#### Secrets

| Script               | Purpose                                                                | When to use                              |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| `pnpm setup:secrets` | Read `.env.local`, push each `KEY=value` to Cloudflare Worker secrets. | After adding new secret to `.env.local`. |
| `pnpm secrets:list`  | List current Worker secret names (no values).                          | Audit.                                   |

#### Database

See `docs/database/AGENTS.md` for the full table. Quick reference:

- `pnpm db:create`
- `pnpm db:migrate:local`
- `pnpm db:migrate:remote`
- `pnpm db:info`
- `pnpm db:console:local`
- `pnpm db:console:remote`

#### Deploy

| Script                                  | Purpose                                           | When to use                      |
| --------------------------------------- | ------------------------------------------------- | -------------------------------- |
| `pnpm exec opennextjs-cloudflare build` | Build the Worker bundle (`.open-next/worker.js`). | Sandbox-side, before deploy.     |
| `pnpm exec wrangler deploy`             | Push the bundle to Cloudflare.                    | Manual deploy from local (rare). |

---

### Common workflows

#### 1. Push + merge + deploy (sandbox-side, Mavis-driven)

```bash
# 1. Type-check and lint
pnpm type-check
NODE_OPTIONS="--max-old-space-size=8192" npx eslint <changed-paths>

# 2. Commit (with Mavis identity, used for AI-authored commits)
cd widgetly-app
git add <paths>
git -c user.name="Mavis" -c user.email="Mavis@local" commit -m "fix(...): <summary>"

# 3. Push to feature branch
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/nsura2029-art/widgetly-app.git" chore/post-deploy-verification
git remote set-url origin "https://github.com/nsura2029-art/widgetly-app.git"

# 4. Merge to develop via API
curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/merges" \
  -d '{"base":"develop","head":"chore/post-deploy-verification","commit_message":"merge: <summary>"}'

# 5. Dispatch deploy workflow
curl -s -m 10 -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
  -X POST "https://api.github.com/repos/nsura2029-art/widgetly-app/actions/workflows/deploy.yml/dispatches" \
  -d '{"ref":"develop"}'
```

#### 2. Add a new env var end-to-end

```bash
# 1. Add to local .env.local
echo "NEW_VAR=value" >> widgetly-app/.env.local

# 2. Push to Worker
pnpm setup:secrets

# 3. Add to GitHub Actions Secrets if needed in CI
#    (via repo Settings UI — cannot be done from CLI)

# 4. Verify
pnpm exec wrangler secret list
```

#### 3. Add a new D1 migration

```bash
# 1. Create migration file
cat > widgetly-app/migrations/0002_add_locale.sql <<'SQL'
ALTER TABLE waitlist ADD COLUMN locale TEXT;
SQL

# 2. Apply locally
pnpm db:migrate:local

# 3. Verify locally
pnpm db:console:local
> .schema waitlist
> .quit

# 4. Deploy (push + merge + dispatch as in workflow 1)

# 5. Apply to production AFTER deploy succeeds
pnpm db:migrate:remote
```

#### 4. Rotate a secret

See `docs/secrets/AGENTS.md` "Rotating a secret". TL;DR: update `.env.local`, `pnpm setup:secrets`, revoke at source.

#### 5. Submit URLs to IndexNow (after deploy)

```bash
KEY=$(cat widgetly-app/public/$(ls widgetly-app/public/*.txt | head -1 | xargs basename) 2>/dev/null)
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"widgetly.tech\",
    \"key\": \"$KEY\",
    \"urlList\": [
      \"https://widgetly.tech/tools/pdf/merge-pdf\",
      \"https://widgetly.tech/tools/pdf/split-pdf\"
    ]
  }"
```

---

### Troubleshooting

#### `pnpm install` fails with "command not found"

- Cause: corepack shims not on PATH.
- Fix: `export PATH="/usr/local/lib/node_modules/corepack/shims:$PATH"` (sandbox-side) or `corepack enable pnpm` (local).

#### `pnpm lint` OOM-kills

- Cause: ESLint with Next.js config can spike to 4-8 GB.
- Fix: `NODE_OPTIONS="--max-old-space-size=8192" npx eslint <path>` to scope the lint run.

#### TypeScript error `Type 'string | undefined' is not assignable to type 'string'`

- Cause: `noUncheckedIndexedAccess: true` in `tsconfig.json` makes array/object indexing return `T | undefined`.
- Fix: explicit fallback: `arr[i] ?? defaultValue` or type annotation: `const x: string = arr[i] ?? "default"`.

#### Wrangler auth fails with `code: 10000`

- Cause: API token missing required scope.
- Fix: regenerate the token at https://dash.cloudflare.com/profile/api-tokens with the right scopes (D1:Edit, Workers Scripts:Edit, Account Settings:Read).

#### GitHub API returns `401 Bad credentials`

- Cause: the `GITHUB_TOKEN` env var has been revoked.
- Fix: get a fresh PAT, store it via the platform's secret CLI, update `GITHUB_TOKEN` entry. See `docs/secrets/AGENTS.md`.

#### Deploy workflow fails on `if: ${{ secrets.X }}`

- Cause: GH Actions bans `secrets.X` in `if:` expressions (security — prevents secret leakage in logs).
- Fix: use `env.X` (set in the workflow's `env:` block) and reference `if: ${{ env.X != '' }}`.

#### `wrangler secret put --text` errors

- Cause: `--text` flag doesn't exist in wrangler 4.100.0.
- Fix: pipe via stdin instead: `echo "value" | wrangler secret put NAME`.

#### OpenNext build emits "Generating bundle" forever

- Cause: usually a syntax error or import cycle. Check `.open-next/` output for stack traces.
- Fix: run `pnpm type-check` first. If clean, check for circular imports in changed files.

---

## Verification

| Check           | Command                                                                      | Pass criterion                  |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| Scripts present | `cat package.json \| jq .scripts`                                            | shows expected list             |
| pnpm resolves   | `pnpm --version`                                                             | ≥ 9.15.9                        |
| Type-check      | `pnpm type-check`                                                            | exit 0                          |
| Lint (scoped)   | `NODE_OPTIONS="--max-old-space-size=8192" npx eslint <path>`                 | exit 0                          |
| Build           | `pnpm exec opennextjs-cloudflare build`                                      | produces `.open-next/worker.js` |
| Deploy          | `gh workflow run deploy.yml --ref develop` (or sandbox-side curl equivalent) | run completes `success`         |

---

## Child DOX Index

_No children. Operations is a leaf domain — pnpm scripts and workflows live entirely in this AGENTS.md._
