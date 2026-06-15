#!/usr/bin/env node
/**
 * sync-swagger-assets.mjs
 *
 * Copies the static Swagger UI assets from `node_modules/swagger-ui-dist/`
 * into `public/api-docs/` so they can be served from the same origin
 * as the docs page. Run automatically as a `prebuild` step; can also
 * be invoked manually with `node scripts/sync-swagger-assets.mjs`.
 *
 * Why not import these from a CDN? Self-hosting means:
 *  - No third-party content-security-policy whitelisting.
 *  - No third-party availability dependency.
 *  - One less egress cost.
 *  - Same-origin requests for the assets, so no CORS preflight.
 *
 * The Swagger UI bundle is ~1.5MB of JS, gzipped down to ~500KB.
 * It only loads on /docs, so the cost is paid by readers of the
 * API reference, not by every visitor of the marketing site.
 */
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "node_modules", "swagger-ui-dist");
const DST = join(ROOT, "public", "api-docs");

const ASSETS = [
  "swagger-ui.css",
  "index.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "favicon-32x32.png",
  "favicon-16x16.png",
];

async function main() {
  // Verify the source exists; if not, install deps first.
  try {
    await stat(SRC);
  } catch {
    console.error(
      `[sync-swagger-assets] ${SRC} not found. Run \`pnpm install\` first.`
    );
    process.exit(1);
  }

  await mkdir(DST, { recursive: true });

  for (const file of ASSETS) {
    const from = join(SRC, file);
    const to = join(DST, file);
    try {
      await copyFile(from, to);
      console.log(`[sync-swagger-assets] ${file} → public/api-docs/${file}`);
    } catch (err) {
      console.error(`[sync-swagger-assets] failed to copy ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log("[sync-swagger-assets] done.");
}

main().catch((err) => {
  console.error("[sync-swagger-assets] unexpected error:", err);
  process.exit(1);
});
