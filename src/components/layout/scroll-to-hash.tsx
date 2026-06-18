"use client";

import * as React from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Renders nothing. Watches the URL hash and scrolls the matching
 * element into view on navigation. Fixes a Next.js App Router
 * quirk where hash links (`<Link href="/#features">`) work for
 * same-page hash changes (the browser handles it natively) but
 * fail for cross-page soft navigation.
 *
 * Why this exists
 * ===============
 * With `<Link href="/#features">` clicked from a different page
 * (e.g. `/en/tools/pdf/merge-pdf`), Next.js does a soft RSC
 * navigation: it fetches the home page payload, swaps the DOM,
 * and updates the URL. The browser's native hash-scroll behavior
 * only fires on:
 *   1. Initial page load with a hash in the URL
 *   2. The `hashchange` event
 *   3. A full page reload
 *
 * A soft navigation does NONE of these. The URL changes to
 * `/en#features` but the viewport stays at the top of the
 * (now-rendered) home page. The user sees the page reload but
 * no scroll to the section.
 *
 * Same-page hash changes still work natively (the browser's
 * `hashchange` event fires), so this component only kicks in
 * for cross-page navigation. It does nothing if the hash is
 * empty or the target element doesn't exist.
 *
 * Retry logic
 * ===========
 * On a soft navigation, the target element may not be in the
 * DOM yet when the effect fires (the RSC payload is still being
 * streamed in). We retry a few times with `requestAnimationFrame`
 * to catch the case where the element mounts a frame or two
 * after the URL change.
 *
 * Why `behavior: "auto"` not `"smooth"`
 * =====================================
 * Matches the browser's native hash-scroll behavior (instant).
 * Smooth scrolling on a soft navigation feels laggy because
 * the page content is still rendering — the smooth animation
 * fights the layout shifts.
 */
export function ScrollToHash() {
  const pathname = usePathname();

  React.useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const id = hash.slice(1);

    // Try to scroll. The element might not be in the DOM yet on
    // a soft navigation — retry across a few animation frames.
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    const tryScroll = () => {
      if (cancelled) return;
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
      attempts += 1;
      if (attempts < MAX_ATTEMPTS) {
        requestAnimationFrame(tryScroll);
      }
    };

    // Wait one frame for the new page to mount, then start trying.
    requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
