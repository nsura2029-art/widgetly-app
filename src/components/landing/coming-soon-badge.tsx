"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCountdown, padTwo } from "@/hooks/use-countdown";
import { LAUNCH_DATE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Small animated "Launching Soon" pill with a live countdown.
 * SSR-stable: shows zeroed digits until mounted, then animates to real values.
 */
export function ComingSoonBadge() {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(
    LAUNCH_DATE
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-soft backdrop-blur"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Sparkles className="h-3 w-3 text-primary" />
      <span>Launching Soon</span>
      <span aria-hidden="true" className="h-3 w-px bg-border" />
      <span
        className="font-mono tabular-nums text-muted"
        suppressHydrationWarning
      >
        {isExpired ? (
          "We are live!"
        ) : (
          <>
            {padTwo(days)}d {padTwo(hours)}h {padTwo(minutes)}m {padTwo(seconds)}s
          </>
        )}
      </span>
    </motion.div>
  );
}

/**
 * Larger, four-cell countdown block (Days / Hours / Minutes / Seconds).
 * Used in the hero area for a more dramatic display.
 */
export function CountdownBlock({ className }: { className?: string }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(
    LAUNCH_DATE
  );

  const cells = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ] as const;

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-2 sm:gap-3",
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label="Time until launch"
    >
      {cells.map((cell, i) => (
        <motion.div
          key={cell.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-white/70 p-3 text-center shadow-soft backdrop-blur sm:p-4"
        >
          <div
            className="font-mono text-2xl font-semibold tabular-nums text-foreground sm:text-3xl"
            suppressHydrationWarning
          >
            {isExpired ? "00" : padTwo(cell.value)}
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted sm:text-xs">
            {cell.label}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </motion.div>
      ))}
    </div>
  );
}
