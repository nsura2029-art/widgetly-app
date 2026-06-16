"use client";

import * as React from "react";
import { ThumbsUp, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Optimistic upvote button for a `/suggest/[slug]` page.
 *
 * Storage: localStorage. The vote is "soft" — it bumps the display
 * count and remembers the user's choice on this device, but
 * there's no backend. When a real upvote API is wired up, the
 * fetch call below is the integration point. The shape of the
 * `POST /api/suggest/[slug]/upvote` body and response is documented
 * in `docs/API.md` (to be added with the real API).
 *
 * The hook stores votes under the key
 *   `widgetly:upvote:<slug>` = "1" | "0"
 * so a logged-in / cookie-based version of the same UI can read it.
 */
export function UpvoteButton({
  slug,
  initialCount,
  className,
}: {
  slug: string;
  initialCount: number;
  className?: string;
}) {
  const [count, setCount] = React.useState(initialCount);
  // Restore vote state from localStorage on mount. Read it lazily
  // during initialization (not in an effect) so the first render
  // is already correct and we avoid the cascading-render lint.
  const [voted, setVoted] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey(slug)) === "1";
    } catch {
      // localStorage blocked (private mode, etc.) — start fresh.
      return false;
    }
  });
  const [pending, setPending] = React.useState(false);

  // The slug is stable for a given mounted page (SSG routes don't
  // switch slugs without a navigation), so we deliberately omit the
  // re-read effect. If we ever need to re-sync on slug change, key
  // the component on slug at the call site instead.

  async function handleClick() {
    if (pending) return;
    const next = !voted;
    setPending(true);
    // Optimistic update first so the UI never feels laggy.
    setVoted(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      window.localStorage.setItem(storageKey(slug), next ? "1" : "0");
    } catch {
      // Ignore storage failures; the in-memory state still updates.
    }
    // Placeholder for the real API call. The shape will be:
    //   await fetch(`/api/suggest/${slug}/upvote`, {
    //     method: next ? "POST" : "DELETE",
    //     headers: { "content-type": "application/json" },
    //   });
    // For now we no-op so the UI is honest about the optimistic
    // behavior (no fake 200 from a non-existent endpoint).
    await new Promise((r) => setTimeout(r, 120));
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={voted}
      aria-label={
        voted ? `Remove your upvote (${count} total)` : `Upvote this suggestion (${count} total)`
      }
      className={cn(
        "group inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium transition-all",
        "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
        voted
          ? "border-primary bg-primary/5 text-foreground shadow-glow-sm"
          : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5 bg-white",
        "disabled:cursor-wait",
        className
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
          voted
            ? "bg-primary text-white"
            : "bg-muted/5 text-muted group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : voted ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-sm font-semibold">
          {voted ? "You upvoted this" : "Upvote this idea"}
        </span>
        <span className="text-muted text-xs tabular-nums">
          {count.toLocaleString()} {count === 1 ? "vote" : "votes"}
        </span>
      </span>
    </button>
  );
}

function storageKey(slug: string): string {
  return `widgetly:upvote:${slug}`;
}
