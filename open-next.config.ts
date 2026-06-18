import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

/**
 * OpenNext configuration for Cloudflare Workers.
 *
 * History of this file (it's been a journey):
 *
 *   1. Early versions: `OpenNextConfig` typed directly with
 *      `incrementalCache: "dummy"` — vanilla SSR, no edge cache,
 *      random Error 1102s under load.
 *
 *   2. cb9d728: bumped to `incrementalCache: "cloudflare-kv-incremental-cache"`
 *      as a STRING literal. This works AT RUNTIME because the
 *      ensureCloudflareConfig validator was bypassed via
 *      `cloudflare.dangerousDisableConfigValidation: true` (commit
 *      77f0ba6). But TypeScript rejects the string because
 *      `Override<T> = "dummy" | T | LazyLoadedOverride<T>` — neither
 *      `"dummy"` nor a function. So `pnpm type-check` (which CI
 *      runs) fails on this file. **This is the bug we're fixing
 *      now.**
 *
 *   3. This version: use `defineCloudflareConfig()` helper, which
 *      accepts the cache as a function instance (not a string).
 *      The helper wraps it in `() => value` internally so the
 *      validator sees `typeof === "function"` and passes.
 *
 *   4. `tagCache: "dummy"` — see FUTURE_WORK.md 🟡 entry for the
 *      tag-cache upgrade path when we add on-demand revalidation.
 *
 * KV backing namespace binding:
 *   The `NEXT_INC_CACHE_KV` binding is declared in wrangler.toml.
 *   The default name matches the OpenNext adapter's expectation;
 *   if you rename the binding, also set `kvBinding: "YOUR_NAME"`
 *   in the helper options (passed as the second arg).
 *
 * Why `defineCloudflareConfig` instead of raw `OpenNextConfig`:
 *   - The helper resolves string / instance / function inputs to
 *     the same runtime shape, so the same config source works
 *     whether you're using an "included" cache ("dummy") or an
 *     instance override (our KV cache).
 *   - It centralizes the `cloudflare.useWorkerdCondition: true`
 *     and `node:crypto` edgeExternal — both required for our
 *     deployment and easy to forget when writing the raw config
 *     by hand.
 *   - It wires up the middleware block correctly (external: true
 *     with the proper override), which is what the validator
 *     wants. Doing this by hand is fragile (we found that the
 *     hard way in commit bc21b82 / ff84bde / e7ce5c8).
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: "dummy",
});
