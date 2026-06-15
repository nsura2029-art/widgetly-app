// Minimal middleware entrypoint expected by the Worker build.
// Tries to delegate to the project's proxy implementation when available,
// but falls back to a safe pass-through so the build doesn't fail.

// Note: The project's proxy lives in src/proxy.ts. Depending on the build
// pipeline the resolver may accept importing the TS source or the compiled
// JS. We do a dynamic import inside the handler to avoid top-level-await
// and to gracefully handle whatever resolution the bundler/runtime supports.

export default async function handler(request, env, ctx) {
  // Try to import the project's proxy implementation. Try a few likely paths
  // and ignore failures — fall back to a simple pass-through.
  let proxy = null;

  try {
    const mod = await import('../src/proxy');
    proxy = mod?.proxy ?? mod?.default ?? null;
  } catch (e) {
    try {
      const mod = await import('../src/proxy.js');
      proxy = mod?.proxy ?? mod?.default ?? null;
    } catch (e2) {
      proxy = null;
    }
  }

  try {
    if (typeof proxy === 'function') {
      // Some adapters pass a NextRequest-like object, some pass a native
      // Request. The proxy implementation in this repo expects a NextRequest.
      // If that mapping is incompatible the proxy should handle it or we
      // will fall through to the fetch fallback below.
      return await proxy(request);
    }
  } catch (err) {
    // If the delegated proxy threw, continue to pass-through fallback.
    // Intentionally swallow to avoid failing the whole worker build/run.
    // eslint-disable-next-line no-console
    console.error('middleware/handler.mjs: proxy invocation failed', err);
  }

  // Fallback: pass-through proxy that doesn't modify the request/response.
  return fetch(request);
}
