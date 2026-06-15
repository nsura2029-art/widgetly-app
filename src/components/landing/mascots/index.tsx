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
 * Picks one mascot at random on mount and renders it with the shared
 * idle animations (float, tilt, jump, blink, sparkles) defined in
 * `globals.css` under the `.wly-mascot-*` namespace.
 *
 * Defensive design choices (vs. the previous framer-motion version):
 *  - Pure CSS animations from a global stylesheet — no `<style jsx>`,
 *    no per-mount class hash that could drift between SSR and CSR.
 *  - Plain `<div>` wrapper, no `motion.div` — eliminates React 19 +
 *    framer-motion 11 hydration edge cases on the i18n branch.
 *  - The random pick happens on the client only; SSR renders a sized
 *    placeholder with the same DOM shape (one child div) so hydration
 *    never sees a structural change. A `useId`-based stable key keeps
 *    the React identity of the inner node consistent across renders.
 *  - Respects `prefers-reduced-motion: reduce` via the CSS rules.
 */
export function RandomMascot({ className = "h-32 w-32 sm:h-40 sm:w-40" }: { className?: string }) {
  // useId gives us a stable identifier that matches across server and
  // client renders, so React's reconciler doesn't see a "different
  // element at this position" during hydration.
  const reactId = React.useId();
  const [Picked, setPicked] = React.useState<MascotComponent | null>(null);

  React.useEffect(() => {
    // Picking on mount is intentional: random on the client only,
    // SSR renders the placeholder. setState after mount is the
    // documented "client-only" pattern and triggers a normal re-render.
    const next = MASCOTS[Math.floor(Math.random() * MASCOTS.length)] ?? MASCOTS[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(next);
  }, []);

  return (
    <div className={`relative mx-auto ${className}`} aria-hidden="true" data-wly-mascot={reactId}>
      <div
        // The wrapper class is what receives the CSS animations.
        // On SSR: Picked is null, the inner content is the placeholder.
        // On client first render: same.
        // After useEffect: Picked is set, the inner content becomes the
        // mascot SVG. Same number of children → no hydration mismatch.
        className="wly-mascot-float h-full w-full"
      >
        <div className="wly-mascot-jump h-full w-full">
          <div className="wly-mascot-tilt h-full w-full">
            {Picked ? <Picked /> : <div className="h-full w-full" />}
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
