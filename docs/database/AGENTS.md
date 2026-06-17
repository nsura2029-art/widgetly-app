# AGENTS.md — Database

Owns the Cloudflare D1 persistence layer for Widgetly: schema, migrations, query helpers, and operational CLI.

---

## Purpose

- Store user-submitted data (waitlist signups, tool suggestions) in a low-latency edge database.
- Use Cloudflare D1 (SQLite at the edge, 5-20ms reads vs 100-300ms for Supabase round-trip).
- Keep the schema simple: two tables (`waitlist`, `suggestions`), one view (`top_suggestions`).
- Expose typed query helpers from `src/lib/d1/` so route handlers never write raw SQL.

---

## Ownership

| Surface                   | File                                                                      |
| ------------------------- | ------------------------------------------------------------------------- |
| D1 binding                | `wrangler.toml` `[[d1_databases]]` block                                  |
| Schema migrations         | `migrations/0001_init.sql`, `migrations/000N_<name>.sql`                  |
| Query helpers             | `src/lib/d1/{server,waitlist,suggestions}.ts`                             |
| TypeScript types          | inline in `src/lib/d1/server.ts` (avoids `@cloudflare/workers-types` dep) |
| Routes that read/write D1 | `src/app/api/{waitlist,suggest,diag/d1}/route.ts`                         |
| Operational CLI           | `pnpm db:*` scripts in `package.json`                                     |

---

## Local Contracts

### D1 binding

- Binding name in `wrangler.toml`: `DB` (uppercase).
- Database ID: `64cbb0d4-af76-46cf-a742-cf78902f1dc3` (public config — committed).
- Database name: `widgetly`. Region: ENAM.
- API token used for D1 ops must have `D1:Edit` scope.

### Schema

- Two tables: `waitlist` and `suggestions`.
- Primary keys: `INTEGER PRIMARY KEY AUTOINCREMENT` for `waitlist.id` (used as user-visible position).
- For `suggestions.id`: `TEXT PRIMARY KEY` (slug or generated ULID).
- Columns: `email` / `slug` columns use `COLLATE NOCASE` for case-insensitive uniqueness.
- No triggers. No RLS. Atomic dedup via `INSERT ... ON CONFLICT(...) DO NOTHING RETURNING ...`.
- A single `top_suggestions` view exposes the top-N accepted suggestions.

### Reading the binding

Always use the helper — never read `globalThis.DB` (it's always undefined):

```ts
import { getD1, isD1Configured } from "@/lib/d1/server";

if (!isD1Configured()) {
  return Response.json({ ok: false, error: "d1 not configured" }, { status: 503 });
}
const db = getD1();
const row = await db.prepare("SELECT * FROM waitlist WHERE id = ?").bind(1).first();
```

### Query helpers (public API)

```ts
// src/lib/d1/waitlist.ts
recordWaitlist(input: { email: string; source?: string; locale?: string }):
  Promise<{ kind: "inserted" | "duplicate" | "error"; position?: number; id?: number; email?: string; message?: string }>

// src/lib/d1/suggestions.ts
recordSuggestion(input: { slug: string; name: string; pitch?: string; category?: string }):
  Promise<{ kind: "inserted" | "duplicate" | "error"; ... }>

readTopSuggestions(limit: number): Promise<Suggestion[]>
```

### Migrations

- One file per change. Prefix: `NNNN_<short_name>.sql` (zero-padded 4-digit counter).
- Forward-only. Never edit a committed migration — write a new one.
- Migrations are applied via `wrangler d1 migrations apply <DB_NAME>`.

---

## Work Guidance

### Adding a new column to an existing table

1. Create `migrations/0002_<name>.sql`:
   ```sql
   ALTER TABLE waitlist ADD COLUMN locale TEXT;
   ```
2. Apply locally: `pnpm db:migrate:local`.
3. Apply to production: `pnpm db:migrate:remote` (after deploy).
4. Update `src/lib/d1/waitlist.ts` to read/write the new column.
5. Update this AGENTS.md "Schema" section.

### Adding a new table

1. Create `migrations/000N_<name>.sql` with `CREATE TABLE`.
2. Apply locally first to verify.
3. Add a typed query helper in `src/lib/d1/<table>.ts`.
4. Update the inline `D1Database` type in `src/lib/d1/server.ts` if you use new methods.

### Inspecting data

```bash
# Local (uses `.wrangler/state/v3/d1/`):
pnpm db:console:local

# Production (reads from remote D1):
pnpm db:console:remote
```

Inside the console:

```sql
SELECT * FROM waitlist ORDER BY id DESC LIMIT 10;
SELECT COUNT(*) FROM suggestions WHERE status = 'accepted';
SELECT * FROM top_suggestions LIMIT 20;
```

### Backing up before a destructive change

```bash
# Dump current state:
pnpm exec wrangler d1 export widgetly --output=backups/widgetly-$(date +%Y%m%d).sql
```

There is no automatic backup — D1 is durable but point-in-time snapshots require manual export.

---

## Verification

| Check                     | Command                                                                | Pass criterion                                                                                 |
| ------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Local binding works       | `pnpm dev` + `curl /api/diag/d1`                                       | returns `{ ok: true, configured: true, count: <n> }`                                           |
| Local schema applied      | `pnpm db:console:local` then `.schema`                                 | shows current schema                                                                           |
| Production binding works  | `curl https://widgetly.tech/api/diag/d1` (dev-only route; 404 in prod) | configured + count > 0                                                                         |
| Production schema applied | `pnpm db:console:remote` then `.schema`                                | matches local                                                                                  |
| Migrations in sync        | `pnpm exec wrangler d1 migrations list widgetly --remote`              | all migrations show `Applied`                                                                  |
| Dedup works               | POST `/api/waitlist` twice with same email                             | first returns `position: N, kind: "inserted"`; second returns `position: N, kind: "duplicate"` |

---

## Operational CLI

All scripts are wired in `package.json` and available via `pnpm <name>`:

| Script                   | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `pnpm db:create`         | Create the D1 database. Idempotent if already created.              |
| `pnpm db:migrate:local`  | Apply pending migrations to the local D1 (uses `.wrangler/state/`). |
| `pnpm db:migrate:remote` | Apply pending migrations to the production D1. Run after deploy.    |
| `pnpm db:info`           | Show database name, ID, region, version.                            |
| `pnpm db:console:local`  | Open an interactive SQLite console against the local DB.            |
| `pnpm db:console:remote` | Open an interactive SQLite console against the production DB.       |

Prerequisites:

- `wrangler` ≥ 4.100.0 (no `--text` flag; uses stdin for secret values).
- `CLOUDFLARE_API_TOKEN` with `D1:Edit` scope (and `Account Settings:Read` for `db:info`).
- `CLOUDFLARE_ACCOUNT_ID` set in env or `.env.local`.

---

## Common pitfalls

- **"D1 binding not configured" at runtime:** `getD1()` returned null. Check that `wrangler.toml` has the `[[d1_databases]]` block AND that `getCloudflareContext().env.DB` resolves. In OpenNext Cloudflare, never read `globalThis.DB` — it's always undefined.
- **Migration applied locally but not remotely:** run `pnpm db:migrate:remote`. The two environments are independent.
- **Duplicate-key errors on insert:** the `ON CONFLICT DO NOTHING RETURNING` pattern returns an empty result set on conflict — check for `result.success` before treating it as success.
- **`text` vs `BLOB` confusion:** D1 stores strings as TEXT. Pass strings, not buffers. If you have a Buffer, decode it via `new TextDecoder().decode(buf)`.
- **Time zones:** SQLite has no timezone-aware type. Store all timestamps as ISO 8601 strings (`new Date().toISOString()`).

---

## Child DOX Index

_No children. This AGENTS.md owns D1 entirely._
