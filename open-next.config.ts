import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// KV-backed incremental cache. The class is exported by OpenNext's Cloudflare
// adapter — we import it and pass it to defineCloudflareConfig which handles
// the lazy-loading resolution. The KV namespace binding is `NEXT_INC_CACHE_KV`
// (the adapter's default — matches our [[kv_namespaces]] block in wrangler.toml).
//
// `tagCache: "dummy"` — we don't use tag-based revalidation. Deploy-time
// cache population is enough; the build replaces the whole cache implicitly.
// Adding KV tag caching would require a SECOND KV namespace (`NEXT_TAG_CACHE_KV`)
// and was deemed not worth the complexity for widgetly.
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: "dummy",
});
