"use client";

import * as React from "react";
import { SearchMascot } from "./search";
import { CalculatorMascot } from "./calculator";
import { ImageMascot } from "./image";
import { PdfMascot } from "./pdf";
import { WrenchMascot } from "./wrench";

/**
 * All available mascots. Add/remove entries here to change the pool
 * the random picker draws from. Each entry must render a single `<svg>`.
 */
const MASCOTS = [SearchMascot, CalculatorMascot, ImageMascot, PdfMascot, WrenchMascot] as const;

type MascotComponent = (typeof MASCOTS)[number];

/**
 * Stable hash of a string. FNV-1a-ish, 32-bit, good enough to spread
 * a small array of entries across the index range without a crypto
 * dependency. We only need it to pick a mascot, not for security.
 */
function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Picks one mascot per component instance and renders it with the
 * shared idle animations (float, tilt, jump, blink, sparkles) defined
 * in `globals.css` under the `.wly-mascot-*` namespace.
 *
 * Defensive design choices (vs. the previous framer-motion version):
 *  - Pure CSS animations from a global stylesheet — no `<style jsx>`,
 *    no per-mount class hash that could drift between SSR and CSR.
 *  - Plain `<div>` wrapper, no `motion.div` — eliminates React 19 +
 *    framer-motion 11 hydration edge cases on the i18n branch.
 *  - The pick is derived from `useId()`, which is stable across SSR
 *    and CSR. That means:
 *      a) the SSR HTML and the client first render show the SAME
 *         mascot (no hydration mismatch, no useState/useEffect swap),
 *      b) different instances of `<RandomMascot>` get different
 *         picks (each page load feels random to the visitor),
 *      c) no placeholder element is needed, so the swap from
 *         placeholder → component that broke React 19's reconciler
 *         in the previous version never happens.
 *  - Respects `prefers-reduced-motion: reduce` via the CSS rules.
 */
export function RandomMascot({ className = "h-32 w-32 sm:h-40 sm:w-40" }: { className?: string }) {
  const reactId = React.useId();
  const Picked: MascotComponent = MASCOTS[stableHash(reactId) % MASCOTS.length] ?? MASCOTS[0];

  return (
    <div className={`relative mx-auto ${className}`} aria-hidden="true" data-wly-mascot={reactId}>
      <div className="wly-mascot-float h-full w-full">
        <div className="wly-mascot-jump h-full w-full">
          <div className="wly-mascot-tilt h-full w-full">
            <Picked />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Re-export individual mascots in case anyone wants a deterministic pick */
export { SearchMascot } from "./search";
export { CalculatorMascot } from "./calculator";
export { ImageMascot } from "./image";
export { PdfMascot } from "./pdf";
export { WrenchMascot } from "./wrench";
