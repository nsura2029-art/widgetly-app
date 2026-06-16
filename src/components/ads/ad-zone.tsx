"use client";

import * as React from "react";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual placeholder for ad slots.
 *
 * Renders a clearly-labelled zone in dev / pre-launch builds so designers and
 * SEO reviewers can see the slot dimensions and placement. When ads are wired
 * up later, this component renders the provider script and falls back to the
 * labelled placeholder if the slot is empty.
 *
 * The slot is `aria-hidden` from the perspective of content indexing — ad
 * zones must NEVER block crawlable content, and Google penalises pages where
 * ads push primary content below the fold.
 */

export type AdSlot = "header" | "in-content" | "sidebar" | "footer";

const SLOT_DIMENSIONS: Record<AdSlot, string> = {
  header: "h-24 w-full max-w-7xl",
  "in-content": "h-28 w-full max-w-3xl",
  sidebar: "h-96 w-full max-w-xs",
  footer: "h-20 w-full max-w-5xl",
};

const SLOT_LABELS: Record<AdSlot, string> = {
  header: "Sponsored — Header",
  "in-content": "Sponsored — In-content",
  sidebar: "Sponsored — Sidebar",
  footer: "Sponsored — Footer",
};

export function AdZone({
  slot,
  className,
  visible = true,
}: {
  slot: AdSlot;
  className?: string;
  /** When false, renders nothing (useful in dev or pre-monetization). */
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <aside
      role="complementary"
      aria-label={SLOT_LABELS[slot]}
      data-ad-slot={slot}
      className={cn(
        "border-border/80 bg-muted/5 text-muted mx-auto my-6 flex items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs font-medium tracking-wider uppercase",
        SLOT_DIMENSIONS[slot],
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{SLOT_LABELS[slot]}</span>
      </div>
    </aside>
  );
}
