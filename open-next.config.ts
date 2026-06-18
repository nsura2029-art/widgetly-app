import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      // KV-backed incremental cache. Reads/writes prerendered HTML at the
      // edge, so the Worker doesn't re-render force-static pages on every
      // request. Replaces the previous "dummy" value that caused every
      // request to invoke the full Next.js render path (and the random
      // Error 1102s that came with it).
      //
      // The binding name "NEXT_INC_CACHE_KV" must match the `binding` field
      // in wrangler.toml's [[kv_namespaces]] block. To use a different
      // binding name, also set `kvBinding: "YOUR_NAME"` here.
      incrementalCache: "cloudflare-kv-incremental-cache",
      // Same KV namespace holds the route tags for tag-based revalidation.
      tagCache: "cloudflare-kv-incremental-cache",
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
      incrementalCache: "cloudflare-kv-incremental-cache",
      tagCache: "cloudflare-kv-incremental-cache",
      queue: "dummy",
    },
  },
};

export default config;
