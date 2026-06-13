import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Widgetly wordmark with a custom inline-SVG "W" mark.
 * Kept inline to avoid a network round-trip on first paint.
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
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white"
        >
          <path
            d="M4 6.5L7.5 17.5L10 11.5L12.5 17.5L16 6.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="6.5" r="1.5" fill="currentColor" />
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
