import type { OpenNextConfig } from "@opennextjs/cloudflare";

// KV-backed incremental cache. The class is exported by OpenNext's Cloudflare
// adapter — we import it and pass it as a function reference (not the string
// "cloudflare-kv-incremental-cache", which the validator rejects).
//
// The KV namespace binding is `NEXT_INC_CACHE_KV` (the adapter's default —
// matches our [[kv_namespaces]] block in wrangler.toml).
//
// `tagCache: "dummy"` — we don't use tag-based revalidation. Deploy-time
// cache population is enough; the build replaces the whole cache implicitly.
// Adding KV tag caching would require a SECOND KV namespace (`NEXT_TAG_CACHE_KV`)
// and was deemed not worth the complexity for widgetly.
import kvIncrementalCache from "@opennextjs/cloudflare/api/overrides/incremental-cache/kv-incremental-cache";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: kvIncrementalCache,
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  // edgeExternals: list Node built-ins the Worker should bundle from
  // Node compat (nodejs_compat flag in wrangler.toml).
  edgeExternals: ["node:crypto"],
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: kvIncrementalCache,
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
