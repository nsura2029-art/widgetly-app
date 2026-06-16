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
  const { days, hours, minutes, seconds, isExpired } = useCountdown(LAUNCH_DATE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-border/80 text-foreground shadow-soft inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <Sparkles className="text-primary h-3 w-3" />
      <span>Launching Soon</span>
      <span aria-hidden="true" className="bg-border h-3 w-px" />
      <span className="text-muted font-mono tabular-nums" suppressHydrationWarning>
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
  const { days, hours, minutes, seconds, isExpired } = useCountdown(LAUNCH_DATE);

  const cells = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ] as const;

  return (
    <div
      className={cn("grid grid-cols-4 gap-2 sm:gap-3", className)}
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
          className="border-border/60 shadow-soft relative overflow-hidden rounded-2xl border bg-white/70 p-3 text-center backdrop-blur sm:p-4"
        >
          <div
            className="text-foreground font-mono text-2xl font-semibold tabular-nums sm:text-3xl"
            suppressHydrationWarning
          >
            {isExpired ? "00" : padTwo(cell.value)}
          </div>
          <div className="text-muted mt-0.5 text-[10px] font-medium tracking-wider uppercase sm:text-xs">
            {cell.label}
          </div>
          <div
            aria-hidden="true"
            className="via-primary/40 pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent to-transparent"
          />
        </motion.div>
      ))}
    </div>
  );
}
