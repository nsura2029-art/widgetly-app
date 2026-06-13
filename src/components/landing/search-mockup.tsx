"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUp, Sparkles, FileText, BookOpen, Calculator, Wand2, Shuffle } from "lucide-react";
import { HERO_SEARCH_PLACEHOLDERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PLACEHOLDER_ICONS = [FileText, BookOpen, Calculator, Wand2, Shuffle, Sparkles] as const;

/**
 * Animated search-bar mockup shown in the hero. Cycles through a list of
 * example queries with a soft crossfade + cursor blink to feel alive.
 */
export function SearchMockup() {
  const [index, setIndex] = React.useState(0);
  const [typed, setTyped] = React.useState("");

  // Cycle the active example.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SEARCH_PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  // Typewriter effect for the active placeholder.
  React.useEffect(() => {
    const target = HERO_SEARCH_PLACEHOLDERS[index] ?? "";
    let i = 0;
    setTyped("");
    const id = window.setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(id);
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [index]);

  const ActiveIcon = PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length] ?? Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-2xl"
    >
      {/* Glow behind */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-gradient opacity-20 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/90 p-2 shadow-soft-lg backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-soft">
          <Search className="h-5 w-5 shrink-0 text-muted" />
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 text-sm sm:text-base"
              >
                <ActiveIcon className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  {typed}
                  <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-primary" />
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
          <kbd
            aria-hidden="true"
            className="hidden h-7 select-none items-center gap-1 rounded-md border border-border bg-muted/5 px-2 font-mono text-xs text-muted sm:inline-flex"
          >
            <span className="text-xs">⌘</span>K
          </kbd>
          <button
            type="button"
            aria-label="Search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow-sm transition-transform hover:scale-105"
          >
            <ArrowUp className="h-4 w-4 rotate-45" />
          </button>
        </div>

        {/* Suggestion row */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2 pb-1.5">
          <span className="text-xs text-muted">Try:</span>
          {HERO_SEARCH_PLACEHOLDERS.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "rounded-full border border-border/80 bg-white px-2.5 py-1 text-xs text-muted transition-colors",
                "hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Floating chip cards */}
      <FloatingChip
        className="-left-6 -top-6 hidden sm:flex"
        label="AI Powered"
        delay={0.6}
      />
      <FloatingChip
        className="-right-4 top-12 hidden sm:flex"
        label="500+ Tools"
        delay={0.8}
      />
      <FloatingChip
        className="-bottom-4 left-8 hidden sm:flex"
        label="Lightning Fast"
        delay={1.0}
      />
    </motion.div>
  );
}

function FloatingChip({
  className,
  label,
  delay = 0,
}: {
  className?: string;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "absolute z-10 items-center gap-1.5 rounded-full border border-border/80 bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-soft",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </motion.div>
  );
}
