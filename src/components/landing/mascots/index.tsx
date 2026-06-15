"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
 * idle animations (float, tilt, jump, blink, sparkles).
 *
 * The pick happens client-side via `useEffect` so SSR markup is empty —
 * this avoids hydration mismatches and a momentary blank on first paint.
 * The framer-motion entry still plays on mount for a smooth reveal.
 *
 * Use:
 *   import { RandomMascot } from "@/components/landing/mascots";
 *   <RandomMascot className="h-32 w-32" />
 */
export function RandomMascot({ className = "h-32 w-32 sm:h-40 sm:w-40" }: { className?: string }) {
  const [Picked, setPicked] = React.useState<MascotComponent | null>(null);

  React.useEffect(() => {
    // Picking on mount is intentional: we need the random index to resolve
    // on the client to avoid SSR/hydration mismatch. The setState fires
    // exactly once per mount and only triggers one extra render.
    const next = MASCOTS[Math.floor(Math.random() * MASCOTS.length)] ?? MASCOTS[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(next);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative mx-auto ${className}`}
      aria-hidden="true"
    >
      {Picked ? (
        <div className="mascot-float h-full w-full">
          <div className="mascot-jump h-full w-full">
            <div className="mascot-tilt h-full w-full">{Picked()}</div>
          </div>
        </div>
      ) : (
        // Sized placeholder so the layout is stable before the pick resolves.
        <div className="h-full w-full" />
      )}

      <style jsx>{`
        /* --- Outer float: gentle bob up & down --- */
        .mascot-float {
          animation: mascot-float 3.6s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes mascot-float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-6px) rotate(0deg);
          }
        }

        /* --- Occasional jump: bigger hop + slight squash --- */
        .mascot-jump {
          animation: mascot-jump 4.8s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }
        @keyframes mascot-jump {
          0%,
          78%,
          100% {
            transform: translateY(0) scaleY(1);
          }
          84% {
            transform: translateY(-14px) scaleY(1.04);
          }
          92% {
            transform: translateY(0) scaleY(0.94);
          }
          96% {
            transform: translateY(-3px) scaleY(1.02);
          }
        }

        /* --- Soft sway / tilt, layered with the float --- */
        .mascot-tilt {
          animation: mascot-tilt 5.2s ease-in-out infinite;
        }
        @keyframes mascot-tilt {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        /* --- Shadow pulses with the jump --- */
        .mascot-shadow {
          transform-box: fill-box;
          transform-origin: center;
          animation: mascot-shadow 4.8s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }
        @keyframes mascot-shadow {
          0%,
          78%,
          100% {
            transform: scaleX(1);
            opacity: 0.55;
          }
          84% {
            transform: scaleX(0.7);
            opacity: 0.35;
          }
          92% {
            transform: scaleX(1.1);
            opacity: 0.65;
          }
        }

        /* --- Blink: collapse eye height briefly --- */
        .mascot-eyes {
          transform-box: fill-box;
          transform-origin: center;
          animation: mascot-blink 5s ease-in-out infinite;
        }
        @keyframes mascot-blink {
          0%,
          92%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
          97% {
            transform: scaleY(1);
          }
        }

        /* --- Per-mascot accent (used for the magnifying glass, etc.) --- */
        .mascot-mag {
          transform-box: fill-box;
          transform-origin: center;
          animation: mascot-mag 4s ease-in-out infinite;
        }
        @keyframes mascot-mag {
          0%,
          100% {
            transform: rotate(-6deg) translate(0, 0);
          }
          50% {
            transform: rotate(6deg) translate(2px, -2px);
          }
        }

        /* --- Sparkles: twinkle in and out --- */
        .sparkle {
          transform-box: fill-box;
          transform-origin: center;
        }
        .sparkle-a {
          animation: mascot-twinkle 2.4s ease-in-out infinite;
        }
        .sparkle-b {
          animation: mascot-twinkle 2.4s ease-in-out infinite 0.8s;
        }
        .sparkle-c {
          animation: mascot-twinkle 2.4s ease-in-out infinite 1.6s;
        }
        @keyframes mascot-twinkle {
          0%,
          100% {
            transform: scale(0.6);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mascot-float,
          .mascot-jump,
          .mascot-tilt,
          .mascot-shadow,
          .mascot-eyes,
          .mascot-mag,
          .sparkle {
            animation: none !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

/* Re-export individual mascots in case anyone wants a deterministic pick */
export { SearchMascot } from "./search";
export { CalculatorMascot } from "./calculator";
export { ImageMascot } from "./image";
export { PdfMascot } from "./pdf";
export { WrenchMascot } from "./wrench";
