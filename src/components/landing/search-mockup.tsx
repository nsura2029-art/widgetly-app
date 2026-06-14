"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  ArrowUp,
  Sparkles,
  FileText,
  BookOpen,
  Calculator,
  Wand2,
  Shuffle,
} from "lucide-react";
import { HERO_SEARCH_PLACEHOLDERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PLACEHOLDER_ICONS = [FileText, BookOpen, Calculator, Wand2, Shuffle, Sparkles] as const;

/**
 * Hero search bar.
 *
 * Renders a real <input> (not a simulated animation) so the cursor lands
 * here on page load and users can start typing immediately. The placeholder
 * cycles through `HERO_SEARCH_PLACEHOLDERS` as a subtle visual cue, and
 * stops cycling once the user types so it doesn't crowd their input.
 *
 * Suggestion chips are now buttons that pre-fill the input.
 */
export function SearchMockup() {
  const [index, setIndex] = React.useState(0);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on mount: cursor lands in the search box as soon as the
  // homepage is interactive. No SSR/CSR mismatch — focus is a client-only
  // side effect that runs after hydration.
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cycle the placeholder example. Stops once the user types so the
  // moving placeholder doesn't fight with their input.
  React.useEffect(() => {
    if (value) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SEARCH_PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [value]);

  const ActiveIcon = PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length] ?? Sparkles;
  const placeholder = value ? "" : (HERO_SEARCH_PLACEHOLDERS[index] ?? "");

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
        className="bg-brand-gradient absolute -inset-6 -z-10 rounded-[2rem] opacity-20 blur-3xl"
      />

      <div className="border-border/80 shadow-soft-lg relative overflow-hidden rounded-2xl border bg-white/90 p-2 backdrop-blur-xl">
        <form
          // Demo form — prevent implicit submission from reloading the page.
          onSubmit={(e) => e.preventDefault()}
          className="shadow-soft flex items-center gap-2 rounded-xl bg-white px-4 py-3"
        >
          <Search className="text-muted h-5 w-5 shrink-0" aria-hidden="true" />
          <ActiveIcon className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label="Search Widgetly"
            autoComplete="off"
            spellCheck={false}
            className="text-foreground placeholder:text-muted w-full min-w-0 flex-1 bg-transparent text-sm outline-none sm:text-base"
          />
          <kbd
            aria-hidden="true"
            className="border-border bg-muted/5 text-muted hidden h-7 items-center gap-1 rounded-md border px-2 font-mono text-xs select-none sm:inline-flex"
          >
            <span className="text-xs">⌘</span>K
          </kbd>
          <button
            type="submit"
            aria-label="Search"
            className="bg-brand-gradient shadow-glow-sm inline-flex h-9 w-9 items-center justify-center rounded-lg text-white transition-transform hover:scale-105"
          >
            <ArrowUp className="h-4 w-4 rotate-45" />
          </button>
        </form>

        {/* Suggestion row */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-2 pb-1.5">
          <span className="text-muted text-xs">Try:</span>
          {HERO_SEARCH_PLACEHOLDERS.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                inputRef.current?.focus();
              }}
              className={cn(
                "border-border/80 text-muted rounded-full border bg-white px-2.5 py-1 text-xs transition-colors",
                "hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Floating chip cards */}
      <FloatingChip className="-top-6 -left-6 hidden sm:flex" label="AI Powered" delay={0.6} />
      <FloatingChip className="top-12 -right-4 hidden sm:flex" label="500+ Tools" delay={0.8} />
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
        "border-border/80 text-foreground shadow-soft absolute z-10 items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </motion.div>
  );
}
