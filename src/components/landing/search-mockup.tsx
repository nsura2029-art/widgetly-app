"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
 * On first paint the bar shows a typewriter animation cycling through
 * `HERO_SEARCH_PLACEHOLDERS` — each example is typed char-by-char, the
 * matching icon appears, the cursor blinks, and after a short hold the
 * next example starts. The instant the user focuses (clicks/tabs into)
 * the real input, the animation yields: the overlay disappears and the
 * user types into a fully functional `<input>`. If the user blurs with
 * an empty value, the typewriter resumes from the next example so the
 * hero never feels dead.
 *
 * Why a real input and not a div? The original (pre-`5cb13bb`) version
 * was a simulated mockup with no actual input — pretty, but the search
 * box on the homepage didn't work. The post-`51c227a` version replaced
 * the animation with a real input that auto-focused on mount. This
 * version is the hybrid: a real, working input + the typewriter on top
 * while it's empty AND untouched.
 */
export function SearchMockup() {
  const [index, setIndex] = React.useState(0);
  const [typed, setTyped] = React.useState("");
  const [value, setValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Drive the typewriter. Runs only when the input is empty and the
  // user has not focused it — the moment either of those becomes true,
  // the effect short-circuits and the cleanup clears the interval.
  React.useEffect(() => {
    if (isFocused || value) return;
    const target = HERO_SEARCH_PLACEHOLDERS[index] ?? "";
    let i = 0;
    // Reset the visible text the moment the placeholder changes. The
    // interval below starts appending on the next tick; without this
    // reset the previous placeholder's tail would flash for ~55ms.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTyped("");
    const id = window.setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(id);
      }
    }, 55);
    return () => window.clearInterval(id);
  }, [index, isFocused, value]);

  // After the current example finishes typing, hold briefly, then
  // advance to the next one. Skipped when the user is engaged.
  React.useEffect(() => {
    if (isFocused || value) return;
    const target = HERO_SEARCH_PLACEHOLDERS[index] ?? "";
    if (typed.length === 0 || typed.length < target.length) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % HERO_SEARCH_PLACEHOLDERS.length);
    }, 1800);
    return () => window.clearTimeout(id);
  }, [typed, index, isFocused, value]);

  const ActiveIcon = PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length] ?? Sparkles;
  const showTypewriter = !isFocused && value.length === 0;

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

          {/* Field shell: typewriter overlay (absolutely positioned) + the
              real input underneath. The overlay only paints when the user
              hasn't engaged; the input is what actually receives keystrokes. */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder=""
              aria-label="Search Widgetly"
              autoComplete="off"
              spellCheck={false}
              // Empty placeholder so the native placeholder attribute
              // doesn't fight with the typewriter overlay.
              className="text-foreground w-full min-w-0 bg-transparent text-sm outline-none sm:text-base"
            />

            {showTypewriter && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center gap-2"
              >
                <ActiveIcon className="text-primary h-4 w-4 shrink-0" />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="text-muted flex items-center text-sm sm:text-base"
                  >
                    {typed}
                    <span className="bg-primary ml-0.5 inline-block h-4 w-[2px] w-px translate-y-0.5 animate-pulse" />
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>

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
