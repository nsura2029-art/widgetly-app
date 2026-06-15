"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Component-level error boundary for the [locale] segment.
 *
 * Catches errors thrown by:
 *  - Any page.tsx in the [locale] tree (including the home page)
 *  - Any nested client component (Hero, Features, WaitlistForm, etc.)
 *
 * Sibling to `global-error.tsx`. Difference:
 *  - `error.tsx`  fires for component-level crashes. The root layout
 *    stays mounted, so the header, footer, theme, and i18n provider
 *    keep working. This is the COMMON case and the one users see most.
 *  - `global-error.tsx`  fires only when the root layout itself
 *    crashed (or no error.tsx in the segment caught the error).
 *    Renders a fresh <html>/<body> — the bare-nuclear option.
 *
 * Both are needed: without `error.tsx`, every component crash
 * bubbles to `global-error.tsx` and the user loses the whole chrome
 * (header, footer, locale switcher) along with their context.
 */

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Pipe to console so Cloudflare Workers logs surface the cause.
    // The `digest` is a stable, log-searchable id Cloudflare attaches
    // to the error — match it against your worker logs.
    console.error("[locale] error boundary caught:", error);
  }, [error]);

  return (
    <section className="container py-16 sm:py-24">
      <div
        role="alert"
        aria-live="assertive"
        className="border-border/60 bg-background mx-auto max-w-xl rounded-2xl border p-8 text-center shadow-sm"
      >
        <p className="text-muted text-xs font-semibold tracking-[0.15em] uppercase">Error</p>
        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Something went wrong on this page
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-md text-base leading-relaxed">
          We hit an unexpected error rendering this section. The rest of the site is still working —
          you can retry, head back to the homepage, or report the problem if it keeps happening.
        </p>

        {error.digest ? (
          <p className="text-muted mt-5 text-xs">
            Error ID:{" "}
            <code className="bg-muted/40 rounded px-1.5 py-0.5 font-mono text-[11px]">
              {error.digest}
            </code>
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-foreground text-background rounded-md px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-border hover:bg-muted/40 rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Go to home
          </Link>
        </div>
      </div>
    </section>
  );
}
