"use client";

import * as React from "react";

/**
 * Side-effect-only component that injects the Swagger UI
 * stylesheet links into the document head after hydration.
 *
 * Why this dance? Next.js's App Router, when it encounters a
 * `<link rel="stylesheet">` inside a page body, hoists it to the
 * head but with `rel="preload" as="style"` instead — which
 * fetches the asset but doesn't actually apply the styles. The
 * clean fix is to put the link tags in `<head>` via the layout's
 * metadata, but per-page stylesheet links aren't supported.
 *
 * The workaround: render a no-op client component that calls
 * `document.createElement('link')` and appends it to `<head>` on
 * mount. Renders synchronously after hydration so the styles
 * arrive before Swagger UI finishes booting. De-duplicates on
 * re-render so it doesn't append the same link twice.
 */
export function SwaggerStylesheets() {
  React.useEffect(() => {
    const HEAD_LINKS: Array<{ rel: string; href: string; type?: string }> = [
      { rel: "stylesheet", href: "/api-docs/swagger-ui.css" },
      { rel: "stylesheet", href: "/api-docs/index.css" },
    ];
    const added: HTMLLinkElement[] = [];
    for (const def of HEAD_LINKS) {
      // Idempotent — skip if the head already has this stylesheet.
      const existing = document.head.querySelector<HTMLLinkElement>(
        `link[rel="${def.rel}"][href="${def.href}"]`
      );
      if (existing) continue;
      const el = document.createElement("link");
      el.rel = def.rel;
      el.href = def.href;
      if (def.type) el.type = def.type;
      document.head.appendChild(el);
      added.push(el);
    }
    return () => {
      // Clean up on unmount so the styles don't leak into the
      // next page in the same tab (unlikely, but correct).
      for (const el of added) el.remove();
    };
  }, []);

  return null;
}
