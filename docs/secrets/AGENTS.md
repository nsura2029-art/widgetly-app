# AGENTS.md — Secrets

Owns how secrets are created, stored, rotated, and consumed across local dev, CI, and Cloudflare Workers.

> **DOX scope.** This is a child of the root [`AGENTS.md`](../../AGENTS.md). **Read the root first** for the Core DOX contract (Read Before Editing, Update After Editing, Closeout). The root's Child DOX Index lists this file as the owner of the secrets lifecycle. The "Ownership" section below enumerates which files and tools this child contract governs. When you add, rotate, or remove any secret, update this file's Secret registry.

---

## Purpose

- Never commit plaintext secrets to git.
- Centralize secret lifecycle: create → use → rotate → revoke.
- Distinguish between **config** (UUIDs, non-secret identifiers — safe to commit) and **secrets** (tokens, keys — never commit).

---

## Ownership

| Surface                                     | Tool                                                              |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Local `.env.local` (gitignored)             | `widgetly-app/.env.local`                                         |
| Cloudflare Worker secrets                   | `wrangler secret put` (via `pnpm setup:secrets`)                  |
| Platform encrypted secret store             | `secret` CLI (sandbox-side; values exposed as `${NAME}` env vars) |
| wrangler.toml bindings (config, not secret) | `widgetly-app/wrangler.toml`                                      |
| CI secrets                                  | GitHub repo Settings → Secrets and variables → Actions            |

---

## Local Contracts

### What is config (safe to commit)

- D1 `database_id` UUID in `wrangler.toml` — public identifier, not a credential.
- Cloudflare account ID — public identifier.
- Public env vars prefixed with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_VERIFICATION`) — exposed to the browser by design.

### What is a secret (never commit)

- API tokens (Cloudflare, GitHub, OpenAI, etc.).
- Service role keys (Supabase — now deprecated for D1).
- Webhook signing secrets.
- OAuth client secrets.

### Storage rules

- **Local dev:** `.env.local` (gitignored). Format: `KEY=value` per line, UTF-8, no quoting unless value contains spaces.
- **CI:** GitHub Actions Secrets. Read in workflows as `${{ secrets.NAME }}`.
- **Worker runtime:** Cloudflare Worker secrets, set via `wrangler secret put NAME`. The Worker code reads them via `getCloudflareContext().env.NAME`.
- **Sandbox shell:** platform `secret` tool. Read as `${NAME}` in any command.

---

## Work Guidance

### Loading secrets into the Worker (one-shot, from local .env.local)

The `pnpm setup:secrets` script reads `.env.local` and pushes each `KEY=value` to Cloudflare Worker secrets via `wrangler secret put`.

```bash
# Edit .env.local with new entries:
cat >> widgetly-app/.env.local <<EOF
SOME_NEW_SECRET=value-from-somewhere
EOF

# Push to Cloudflare:
pnpm setup:secrets

# Verify (will list secret NAMES only, never values):
pnpm exec wrangler secret list
```

The script:

- Reads `.env.local` as UTF-8 text.
- Skips empty lines and comments.
- Pipes each value via stdin (not `--text`, which doesn't exist in wrangler 4.100.0).
- Resolves the wrangler binary path cross-platform (`wrangler.cmd` on Windows).
- Handles Buffer→String correctly (Buffer has no `.split`).

### Adding a new secret

1. Decide: is it config or secret? If config → commit to `wrangler.toml` or use `NEXT_PUBLIC_*`. If secret → continue.
2. Add the value to local `.env.local`:
   ```bash
   echo "NEW_SECRET=value" >> widgetly-app/.env.local
   ```
3. Add the env var name to `.env.example` (if it exists) so other devs know about it.
4. Run `pnpm setup:secrets` to push to Worker.
5. If the secret is needed at build time, also add it to GitHub repo Secrets so CI workflows can access it.
6. Document the secret in this file (see "Secret registry" below).

### Using a secret in Worker code

```ts
// Server-side, in a route handler or RSC:
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  const apiKey = env.SOME_API_KEY; // bound from Worker secret
  // ...
}
```

The `env` object exposes every secret set via `wrangler secret put` plus every `var` from `wrangler.toml`.

### Using a secret in a workflow

```yaml
# .github/workflows/<name>.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Sync secrets to Worker
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
        run: |
          echo "$WEBHOOK_SECRET" | pnpm exec wrangler secret put WEBHOOK_SECRET
```

Workflows use `secrets.X` only inside `run:` blocks. The `if:` expression cannot reference `secrets.X` (GH Actions rule) — use `env.X` instead.

### Rotating a secret

1. Generate the new value at the source (GitHub PAT page, Cloudflare dashboard, etc.).
2. Update local `.env.local` with the new value.
3. Run `pnpm setup:secrets` — overwrites the old Worker secret.
4. **Revoke the old value at the source.** This is the step most people skip — the secret still works in the old form until you actively revoke it.
5. If the source is GitHub, go to https://github.com/settings/tokens → revoke.

### Sharing a secret with the AI sandbox

**Don't paste it in chat.** Use the platform's secret CLI:

```bash
# Sandbox shell (Mavis has access):
secret create --name=GITHUB_TOKEN --value=ghp_xxx
secret update --name=GITHUB_TOKEN --value=ghp_new_value
secret list        # names + metadata only, never values
```

Reference secrets in commands as `${SECRET_NAME}` — the shell expands at execution time, so the plaintext never crosses chat.

---

## Verification

| Check                       | Command                                                                                                | Pass criterion              |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------- |
| `.env.local` gitignored     | `git check-ignore widgetly-app/.env.local`                                                             | exit 0                      |
| No secrets in tracked files | `git grep -nE 'ghp_[a-zA-Z0-9]{36}\|sk-[a-zA-Z0-9]{20,}\|AIza[0-9A-Za-z\-_]{35}'` (run from repo root) | no matches                  |
| Worker secrets list         | `pnpm exec wrangler secret list`                                                                       | shows expected secret names |
| Secret works at runtime     | `curl -H "Authorization: Bearer ${GITHUB_TOKEN}" https://api.github.com/user`                          | HTTP 200                    |

---

## Secret registry

| Name                              | Source                                                                                                | Where used                                             | Rotation policy                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `GITHUB_TOKEN`                    | https://github.com/settings/tokens (classic, `repo` + `workflow`)                                     | Sandbox shell: git push, merge API, deploy dispatch    | Per-session. After every chat-paste of a PAT, revoke at source. |
| `CLOUDFLARE_API_TOKEN`            | https://dash.cloudflare.com/profile/api-tokens (D1:Edit, Workers Scripts:Edit, Account Settings:Read) | `pnpm setup:secrets`, `wrangler d1`, `wrangler deploy` | Quarterly. Include D1:Edit scope for D1 operations.             |
| `CLOUDFLARE_ACCOUNT_ID`           | Cloudflare dashboard (public config, not a secret, but stored as secret for convenience)              | All `wrangler` commands                                | Never changes for a given account.                              |
| `WEBHOOK_SECRET`                  | Generated locally (e.g. `openssl rand -hex 32`)                                                       | HMAC signing of outbound webhooks                      | Annually or on suspected leak.                                  |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console → URL prefix → HTML tag meta                                                    | `<meta name="google-site-verification">` in `<head>`   | Never (verification meta tag, not a credential).                |
| `NEXT_PUBLIC_BING_VERIFICATION`   | Bing Webmaster Tools → Add site → HTML meta tag                                                       | `<meta name="msvalidate.01">` in `<head>`              | Never.                                                          |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`   | https://analytics.google.com → Admin → Data streams                                                   | `gtag.js` config                                       | Never (public measurement ID).                                  |
| `GEMINI_CRED`                     | Google AI Studio                                                                                      | (Reserved; auth model TBD)                             | Confirm intended use before relying on this.                    |

---

## Child DOX Index

_No children. This AGENTS.md owns secrets entirely._
