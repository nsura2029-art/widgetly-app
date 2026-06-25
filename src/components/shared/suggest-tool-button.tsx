"use client";

/**
 * SuggestToolButton — the "Suggest a Tool" CTA used in the hero
 * (and any other spot on the site that wants the same
 * playground-style treatment).
 *
 * Visual behaviour
 * ----------------
 * On hover, the button acts as the spout of a small fountain.
 * Each `mousemove` over the BUTTON spawns a cluster of 2-4
 * tool-category icons that burst upward in a ±55° cone, drift to
 * 180-280 px from the button's top edge, and fade out. Particles
 * render ABOVE the button (z-index 20) so the icons visibly
 * originate from inside the pill, not behind it.
 *
 * Why a fixed icon pool, not random per spawn?
 *   A small static pool of 28 category + sub-tool icons (defined
 *   in `ICON_POOL` below) keeps the visual identity consistent
 *   with the rest of the site — we never get a random Lucide
 *   glyph that doesn't relate to anything on Widgetly. The pool
 *   is the same 11 categories the mega-menu banner uses, with
 *   sub-tools from `TOOLS_SUBGROUPS` mixed in for variety.
 *
 * Performance
 * -----------
 * - The mousemove handler is throttled to one spawn every
 *   `SPAWN_THROTTLE_MS` ms (default 45 ms). A real human mouse
 *   moves through the button in 50-150 ms, so this still gives
 *   3-10 clusters per pass and never overwhelms the renderer.
 * - The active-particle cap (`MAX_PARTICLES = 80`) drops the
 *   oldest particles when exceeded. With a 0.7-1.1 s lifetime
 *   the cap is well above what the throttler produces even on
 *   jittery mice, but the cap means we never grow unbounded.
 * - All animation runs in transform / opacity only — no layout
 *   thrash, no repaints of the parent.
 * - `prefers-reduced-motion` short-circuits the entire system:
 *   the button renders as a plain CTA with no particles.
 */

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles as SparklesIcon, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOOLS_CATEGORIES } from "@/lib/tools-categories";
import { TOOLS_SUBGROUPS } from "@/lib/tools-subgroups";
import { getIcon } from "@/lib/icons";

/* ------------------------------------------------------------------ */
/* Particle pool                                                       */
/* ------------------------------------------------------------------ */

/** Color tokens for the particle tiles. Mirrors the mega-menu
 *  accent palette so the burst feels like a mini version of the
 *  site nav rather than a random rainbow. */
const ACCENT_TOKENS = {
  primary: { bg: "var(--color-primary)", fg: "var(--color-primary-foreground)" },
  secondary: { bg: "var(--color-secondary)", fg: "var(--color-primary-foreground)" },
  accent: { bg: "var(--color-accent)", fg: "var(--color-primary-foreground)" },
} as const;

/** Sub-tool accent color map. Mirrors `AccentColor` in
 *  `tools-subgroups.ts` but kept local so this file has no
 *  upstream coupling beyond the data the burst actually needs. */
const SUB_ACCENT_BG: Record<string, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#a855f7",
  orange: "#f97316",
  pink: "#ec4899",
  teal: "#14b8a6",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

type ParticleKind = "category" | "subtool" | "sparkle";

type PoolEntry = {
  id: string;
  /** Lucide icon name (kept for debugging / data-attributes). */
  icon: string;
  /**
   * Resolved Lucide icon component. Pre-resolved at module
   * load so the ParticleView can render it directly without
   * looking it up on every frame (and so the
   * `react-hooks/static-components` lint rule sees a stable
   * component identity across renders).
   */
  Icon: LucideIcon;
  /** Background color (CSS color value). */
  bg: string;
  /** Foreground color for the icon glyph. */
  fg: string;
  /** Visual variant — category tiles are square, sub-tool tiles
   *  are slightly rounded, sparkles have no tile. */
  kind: ParticleKind;
};

function buildPool(): PoolEntry[] {
  const entries: PoolEntry[] = [];

  // 11 main categories. Use their brand accent as the tile bg.
  for (const cat of TOOLS_CATEGORIES) {
    entries.push({
      id: `cat-${cat.slug}`,
      icon: cat.icon,
      Icon: getIcon(cat.icon),
      bg: ACCENT_TOKENS[cat.accent].bg,
      fg: ACCENT_TOKENS[cat.accent].fg,
      kind: "category",
    });
  }

  // A curated mix of sub-tools from the categories that have
  // sub-groupings. We take up to 3 from each subgroup so the
  // pool stays small and predictable. Each sub-tool's tile
  // uses the subgroup's accent color.
  const seen = new Set<string>();
  for (const groups of Object.values(TOOLS_SUBGROUPS)) {
    for (const g of groups) {
      for (const item of g.items.slice(0, 3)) {
        const key = `${g.accent}-${item.icon}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          id: `sub-${g.accent}-${item.icon}`,
          icon: item.icon,
          Icon: getIcon(item.icon),
          bg: SUB_ACCENT_BG[g.accent] ?? ACCENT_TOKENS.primary.bg,
          fg: "#ffffff",
          kind: "subtool",
        });
        if (entries.length >= 28) break;
      }
      if (entries.length >= 28) break;
    }
    if (entries.length >= 28) break;
  }

  // Sparkle variant — uses the Sparkles icon on a soft amber
  // tile. Rendered ~18% of the time to break up the icon grid.
  entries.push({
    id: "sparkle",
    icon: "Sparkles",
    Icon: getIcon("Sparkles"),
    bg: "rgba(245, 158, 11, 0.18)",
    fg: "#f59e0b",
    kind: "sparkle",
  });

  return entries;
}

const ICON_POOL: readonly PoolEntry[] = buildPool();

/* ------------------------------------------------------------------ */
/* Particle dynamics                                                   */
/* ------------------------------------------------------------------ */

const SPAWN_THROTTLE_MS = 45;
const MAX_PARTICLES = 80;
const CLUSTER_MIN = 2;
const CLUSTER_MAX = 4;
const DISTANCE_MIN = 180;
const DISTANCE_MAX = 280;
const LIFETIME_MIN = 0.7;
const LIFETIME_MAX = 1.1;
const CONE_HALF_ANGLE_DEG = 55;
const SPARKLE_PROBABILITY = 0.18;

type Particle = {
  id: number;
  entry: PoolEntry;
  /** Target offset from the spawn point (px). */
  tx: number;
  ty: number;
  /** Lifetime in seconds. */
  lifetime: number;
  /** Slight rotation for variety (degrees). */
  rotation: number;
  /** Tile scale at spawn (0.8-1.15). */
  scale: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickEntry(): PoolEntry {
  // Sparkle takes a small share of the spawns so the burst
  // doesn't read as a uniform grid of category tiles.
  if (Math.random() < SPARKLE_PROBABILITY) {
    return ICON_POOL[ICON_POOL.length - 1]!;
  }
  // Bias the first 11 entries (the categories) slightly higher
  // so the user mostly sees the top-level brand — but mix in
  // sub-tools often enough that the burst feels rich.
  const r = Math.random();
  if (r < 0.55) {
    return ICON_POOL[Math.floor(Math.random() * 11)]!;
  }
  return ICON_POOL[Math.floor(Math.random() * (ICON_POOL.length - 1))]!;
}

function spawnCluster(): Particle[] {
  const n = Math.floor(rand(CLUSTER_MIN, CLUSTER_MAX + 0.999));
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const angleDeg = rand(-CONE_HALF_ANGLE_DEG, CONE_HALF_ANGLE_DEG);
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = rand(DISTANCE_MIN, DISTANCE_MAX);
    // CSS Y grows downward, so "up" is -cos(angle).
    out.push({
      id: Date.now() + Math.random() + i,
      entry: pickEntry(),
      tx: Math.sin(angleRad) * distance,
      ty: -Math.cos(angleRad) * distance,
      lifetime: rand(LIFETIME_MIN, LIFETIME_MAX),
      rotation: rand(-30, 30),
      scale: rand(0.8, 1.15),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface SuggestToolButtonProps {
  href: string;
  /** Visible label. */
  label: string;
  /** Optional screen-reader label override. */
  ariaLabel?: string;
  /** Button size variant, mirrors the shadcn `Button` sizes. */
  size?: "default" | "sm" | "lg" | "xl" | "icon";
  className?: string;
}

/**
 * Render the "Suggest a Tool" CTA with the fountain hover effect.
 * Visually replaces `<Button asChild><Link>...</Link></Button>`.
 */
export function SuggestToolButton({
  href,
  label,
  ariaLabel,
  size = "lg",
  className,
}: SuggestToolButtonProps) {
  const prefersReduced = useReducedMotion();
  const buttonRef = React.useRef<HTMLAnchorElement | null>(null);
  const [particles, setParticles] = React.useState<Particle[]>([]);
  const lastSpawnRef = React.useRef(0);

  // Drop the oldest particles when we exceed the cap. We track
  // this with a ref so we don't trigger a render just to count.
  const prune = React.useCallback((current: Particle[]): Particle[] => {
    if (current.length <= MAX_PARTICLES) return current;
    return current.slice(current.length - MAX_PARTICLES);
  }, []);

  const handleMove = React.useCallback(
    (_e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefersReduced) return;
      const now = performance.now();
      if (now - lastSpawnRef.current < SPAWN_THROTTLE_MS) return;
      lastSpawnRef.current = now;
      setParticles((prev) => prune([...prev, ...spawnCluster()]));
    },
    [prefersReduced, prune]
  );

  const handleLeave = React.useCallback(() => {
    // No-op: particles run their full lifetime and unmount
    // themselves, so the trail doesn't snap-cut on mouseout.
  }, []);

  // Used by the particle's `onAnimationComplete` to remove
  // itself from the state pool.
  const handleComplete = React.useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <Link
      ref={buttonRef}
      href={href}
      aria-label={ariaLabel ?? label}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        buttonVariants({ variant: "default", size }),
        // The link itself is the particle-emitter surface, so
        // position it relative and lift it above sibling layout
        // siblings — but keep overflow: visible so particles can
        // fly above the button pill.
        "relative overflow-visible",
        className
      )}
    >
      <span className="relative z-10 flex items-center">
        {label}
        <ArrowRight className="ml-2" />
      </span>

      {!prefersReduced && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence>
            {particles.map((p) => (
              <ParticleView key={p.id} particle={p} onComplete={handleComplete} />
            ))}
          </AnimatePresence>
        </span>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Particle renderer                                                   */
/* ------------------------------------------------------------------ */

function ParticleView({
  particle,
  onComplete,
}: {
  particle: Particle;
  onComplete: (id: number) => void;
}) {
  const isSparkle = particle.entry.kind === "sparkle";
  const isCategory = particle.entry.kind === "category";
  // `Icon` is resolved once at module load inside the pool, so
  // its identity is stable across re-renders — that's what
  // makes the `react-hooks/static-components` lint rule happy.
  const Icon = particle.entry.Icon;

  // Initial / animate targets for the spring. We start the
  // particle at the spawn point (translate(0,0) relative to
  // itself, with a small scale-up) and ease it out to (tx, ty)
  // while shrinking and fading.
  return (
    <motion.span
      aria-hidden="true"
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ willChange: "transform, opacity" }}
      initial={{ x: 0, y: 0, scale: 0.4, opacity: 0, rotate: 0 }}
      animate={{
        x: particle.tx,
        y: particle.ty,
        scale: particle.scale,
        opacity: [0, 1, 1, 0.85, 0],
        rotate: particle.rotation,
      }}
      transition={{
        duration: particle.lifetime,
        // Slight spring on the way out — overshoots a few
        // pixels past the target so the motion reads as
        // physical, not linear.
        ease: [0.16, 1, 0.3, 1],
        times: [0, 0.1, 0.55, 0.85, 1],
        opacity: { duration: particle.lifetime, times: [0, 0.1, 0.55, 0.85, 1] },
      }}
      onAnimationComplete={() => onComplete(particle.id)}
    >
      <span
        className={cn(
          "shadow-soft flex items-center justify-center",
          isCategory
            ? "h-7 w-7 rounded-md"
            : isSparkle
              ? "h-6 w-6 rounded-full"
              : "h-6 w-6 rounded-md",
          isCategory && "ring-1 ring-white/30"
        )}
        style={{
          background: particle.entry.bg,
          color: particle.entry.fg,
        }}
      >
        {isSparkle ? (
          <SparklesIcon className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
      </span>
    </motion.span>
  );
}
