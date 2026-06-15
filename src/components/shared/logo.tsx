import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Widgetly wordmark with a custom inline-SVG "W" mark.
 * Kept inline to avoid a network round-trip on first paint.
 *
 * The W is drawn with a filled path (not a stroked one) so it stays
 * crisp at every size. The viewBox is 32x32; the W path uses
 * the central 28x22 area, with a 3-unit margin on all sides so
 * the gradient background and any focus ring don't crowd the letter.
 * The original mark had a small dot at (20, 6.5) to suggest an
 * "i" -- removed in this iteration because it read as a typo at
 * small sizes; the W stands alone and is unambiguous.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground",
        className
      )}
      aria-label="Widgetly"
    >
      <span
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm ring-1 ring-white/10"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-white"
          aria-hidden="true"
        >
          {/* Bold filled W. Path: outer outline of a thick 'W' letter.
              Top-left (3,7) down to mid-bottom (16,25) up to top-right (29,7).
              Slight overshoot on the outer strokes for visual weight. */}
          <path
            d="M3 6.5 L7 6.5 L12.5 21 L16 12 L19.5 21 L25 6.5 L29 6.5 L21.5 25.5 L18 25.5 L16 19.5 L14 25.5 L10.5 25.5 Z"
            fill="currentColor"
          />
        </svg>
        <span className="absolute -inset-1 -z-10 rounded-2xl bg-brand-gradient opacity-30 blur-md" />
      </span>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight">
          Widgetly
        </span>
      )}
    </span>
  );
}
