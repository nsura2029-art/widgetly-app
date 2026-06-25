"use client";

/**
 * SuggestToolButton — the "Suggest a Tool" CTA used in the hero
 * (and any other spot on the site that wants the same
 * playground-style treatment).
 *
 * Visual behaviour
 * ----------------
 * While the cursor is over the button, the button spawns a
 * continuous 360° fountain of category emojis at the
 * mouse position. Each particle drifts outward with light
 * physics (initial velocity + drag + slight gravity), spins
 * slowly as it travels, and fades based on DISTANCE traveled
 * (not elapsed time) so icons that travel further from the
 * spawn point disappear first — fully visible at birth,
 * invisible by the time they've drifted ~150 px.
 *
 * When the mouse leaves (or the touch ends) spawning stops
 * instantly; any in-flight particles finish their own fade
 * out naturally. The RAF loop self-terminates when nothing
 * is alive.
 *
 * Why a fixed emoji pool, not random per spawn?
 *   A static pool of 12 hand-picked category emojis keeps
 *   the visual identity consistent — we never get a random
 *   Unicode glyph that doesn't relate to anything on
 *   Widgetly. Each emoji carries a brand color that drives
 *   both the tile background and a soft, layered
 *   `box-shadow` glow halo.
 *
 * Why a manual RAF loop instead of framer-motion?
 *   The fountain runs at ~60 physics ticks per second with
 *   up to ~80 live particles. Putting that through React
 *   reconciliation each frame would mean thousands of prop
 *   diffs per second. We render the DOM elements once via
 *   React and then mutate their `transform`/`opacity`
 *   inline each frame; React only re-renders when particles
 *   are added or removed (which is at most a handful of
 *   times per second).
 *
 * Performance
 * -----------
 * - Particle state lives in a `useRef<Map>` (no React render
 *   on physics ticks).
 * - DOM updates are inline `style.transform` / `style.opacity`
 *   writes on refs (the browser composites the rest).
 * - `MAX_PARTICLES = 180` caps the live pool; oldest particles
 *   are dropped first if we ever exceed it. Raised from 80 so
 *   arcs can complete their full ~150 px trajectory before
 *   being evicted — gives the fountain its discrete-arcs look
 *   rather than a tight particle cloud.
 * - `prefers-reduced-motion` short-circuits the entire system:
 *   the button renders as a plain CTA with no particles.
 *
 * Touch support
 * -------------
 * `onTouchStart` / `onTouchMove` / `onTouchEnd` mirror the
 * mouse handlers (using `touches[0].clientX/Y`) so the
 * fountain fires on mobile too. A tap-and-hold yields a
 * short burst; the standard navigation click still works.
 *
 * Coordinate system
 * -----------------
 * Particles use **viewport** coordinates (`event.clientX/Y`)
 * because the particle container is `position: fixed` and
 * fills the viewport. This keeps the math identical to the
 * vanilla reference and avoids any `getBoundingClientRect`
 * conversion on every spawn.
 */

import * as React from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Particle pool — 12 hand-picked category emojis, each tied to a     */
/* brand color that drives both the tile background and a soft,       */
/* layered box-shadow glow halo. Static (not derived from the          */
/* categories data) so the fountain's visual identity stays stable    */
/* across deploys and the brand team can tweak colors without         */
/* touching the renderer.                                             */
/* ------------------------------------------------------------------ */

type PoolEntry = {
  id: string;
  /** Unicode emoji rendered inside the tile. */
  emoji: string;
  /** Brand color (hex). Drives both the tile background and the
   *  pre-computed `box-shadow` glow. */
  color: string;
  /** Pre-computed `box-shadow` value for the per-category glow.
   *  Two layered halos (12 px tight, 28 px wide) keep the
   *  effect subtle but legible against any hero background. */
  glow: string;
};

/** Helper: build a two-layer glow string from a hex color and
 *  the two alpha stops we want for the inner/outer halo. We
 *  convert hex → rgba once at module load so the per-frame
 *  RAF tick never spends time parsing colors. */
function glowFor(hex: string, innerA: number, outerA: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `0 0 12px rgba(${r}, ${g}, ${b}, ${innerA}), 0 0 28px rgba(${r}, ${g}, ${b}, ${outerA})`;
}

const ICON_POOL: readonly PoolEntry[] = [
  { id: "pdf", emoji: "📄", color: "#ef4444", glow: glowFor("#ef4444", 0.55, 0.25) },
  { id: "image", emoji: "🖼️", color: "#3b82f6", glow: glowFor("#3b82f6", 0.55, 0.25) },
  { id: "video", emoji: "🎬", color: "#a855f7", glow: glowFor("#a855f7", 0.55, 0.25) },
  { id: "ai", emoji: "🤖", color: "#6366f1", glow: glowFor("#6366f1", 0.55, 0.25) },
  { id: "calculator", emoji: "🧮", color: "#f59e0b", glow: glowFor("#f59e0b", 0.55, 0.25) },
  { id: "converter", emoji: "🔄", color: "#14b8a6", glow: glowFor("#14b8a6", 0.55, 0.25) },
  { id: "seo", emoji: "🔍", color: "#22c55e", glow: glowFor("#22c55e", 0.55, 0.25) },
  { id: "education", emoji: "🎓", color: "#06b6d4", glow: glowFor("#06b6d4", 0.55, 0.25) },
  { id: "developer", emoji: "💻", color: "#475569", glow: glowFor("#475569", 0.55, 0.25) },
  { id: "business", emoji: "💼", color: "#f97316", glow: glowFor("#f97316", 0.55, 0.25) },
  { id: "writing", emoji: "✍️", color: "#ec4899", glow: glowFor("#ec4899", 0.55, 0.25) },
  // Sparkle: slightly stronger glow because the burst's
  // background-tile hue is the lightest in the palette and
  // needs more punch to read against the hero gradient.
  { id: "sparkle", emoji: "⭐", color: "#fbbf24", glow: glowFor("#fbbf24", 0.6, 0.3) },
];

/** Probability that any given spawn is the sparkle variant.
 *  Kept low so the burst reads as the categories, with sparkle
 *  acting as a punctuation accent. */
const SPARKLE_PROBABILITY = 0.12;

/* ------------------------------------------------------------------ */
/* Physics tuning                                                      */
/* ------------------------------------------------------------------ */

const MAX_PARTICLES = 180;
const SPAWN_PER_FRAME_MIN = 1;
const SPAWN_PER_FRAME_MAX = 2;
const SPAWN_PROBABILITY = 0.5;
const INITIAL_BURST_COUNT = 5;
const INITIAL_BURST_STAGGER_MS = 12;

/** Speed of newly spawned particles (px/s). The reference
 *  effect uses 60-180 px/s — gentle drift, not a hard burst. */
const SPEED_MIN = 60;
const SPEED_MAX = 180;

/** Per-particle drag coefficient (0-1 fraction per second
 *  removed from velocity each tick). 0.2-0.5 in the ref. */
const DRAG_MIN = 0.2;
const DRAG_MAX = 0.5;

/** Per-particle gravity (px/s²). Slight downward arc. */
const GRAVITY_MIN = 10;
const GRAVITY_MAX = 40;

/** Per-particle rotation speed (deg/s). */
const ROTATION_SPEED_MAX = 200;

/** Per-particle distance cap (px). At maxDistance the opacity
 *  is 0; particles are reaped at 1.2× that. Tightened to
 *  120-180 (mean 150) so the burst stays close to the button
 *  — per the spec, icons fade out around ~150 px from spawn. */
const MAX_DISTANCE_MIN = 120;
const MAX_DISTANCE_MAX = 180;

/** Per-particle size scale (tile size multiplier). */
const SIZE_MIN = 0.85;
const SIZE_MAX = 1.15;

/** First-frame fade-in window (seconds). Mirrors the ref. */
const FADE_IN_SECONDS = 0.1;

/* ------------------------------------------------------------------ */
/* Particle type                                                       */
/* ------------------------------------------------------------------ */

type Particle = {
  id: number;
  entry: PoolEntry;
  /** Current viewport x (px). */
  x: number;
  /** Current viewport y (px). */
  y: number;
  /** Spawn point (viewport coords). Distance fade is measured
   *  from here. */
  startX: number;
  startY: number;
  /** Velocity (px/s). */
  vx: number;
  vy: number;
  /** Gravity (px/s²). Applied each frame. */
  gravity: number;
  /** Drag (0-1 fraction/sec). Multiplicatively bleeds velocity. */
  drag: number;
  /** Current rotation (deg). */
  rotation: number;
  /** Rotation speed (deg/s). */
  rotationSpeed: number;
  /** Distance at which opacity reaches 0 (px). */
  maxDistance: number;
  /** Per-particle tile size multiplier. */
  size: number;
  /** Age in seconds (for first-frame fade-in only — fade is
   *  distance-based thereafter). */
  age: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickEntry(): PoolEntry {
  // Sparkle takes a small share of spawns so the burst
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

function makeParticle(spawnX: number, spawnY: number, id: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = rand(SPEED_MIN, SPEED_MAX);
  return {
    id,
    entry: pickEntry(),
    x: spawnX,
    y: spawnY,
    startX: spawnX,
    startY: spawnY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gravity: rand(GRAVITY_MIN, GRAVITY_MAX),
    drag: rand(DRAG_MIN, DRAG_MAX),
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 2 * ROTATION_SPEED_MAX,
    maxDistance: rand(MAX_DISTANCE_MIN, MAX_DISTANCE_MAX),
    size: rand(SIZE_MIN, SIZE_MAX),
    age: 0,
  };
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
 * Render the "Suggest a Tool" CTA with the 360° fountain
 * hover effect. Visually replaces
 * `<Button asChild><Link>...</Link></Button>`.
 */
export function SuggestToolButton({
  href,
  label,
  ariaLabel,
  size = "lg",
  className,
}: SuggestToolButtonProps) {
  const prefersReduced = useReducedMotion();
  const linkRef = React.useRef<HTMLAnchorElement | null>(null);

  // React state — list of live particles. We keep the entry
  // (icon, colors, kind) in state so the JSX renderer can
  // produce a tile without ever reading from `particlesRef`
  // during render (which would break the React rules of
  // refs-in-render lint). Physics state (x/y/vx/vy/...) stays
  // in the ref and is mutated directly per frame.
  const [liveParticles, setLiveParticles] = React.useState<Array<{ id: number; entry: PoolEntry }>>(
    []
  );
  const particlesRef = React.useRef<Map<number, Particle>>(new Map());
  const elementRefs = React.useRef<Map<number, HTMLSpanElement | null>>(new Map());

  // Last cursor position in viewport coords. Updated by the
  // mouse handlers; read by the RAF tick to decide where to
  // spawn new particles.
  const cursorRef = React.useRef({ x: 0, y: 0 });

  // Hover-gated spawn gate. Read by the RAF tick.
  const isHoveringRef = React.useRef(false);

  // Monotonic id source. Using a ref + timestamp avoids React
  // reconciliation churn.
  const nextIdRef = React.useRef(0);

  // RAF bookkeeping.
  const rafRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef(0);

  // Mirror of the latest `tick` function so handlers can
  // schedule frames without holding a stale closure. Updated
  // in an effect below once `tick` is defined.
  const tickRef = React.useRef<((timestamp: number) => void) | null>(null);

  /* ----- spawning -------------------------------------------------- */

  const spawnAtCursor = React.useCallback(() => {
    const id = nextIdRef.current++;
    const p = makeParticle(cursorRef.current.x, cursorRef.current.y, id);
    particlesRef.current.set(id, p);

    setLiveParticles((prev) => {
      const next = prev.length >= MAX_PARTICLES ? prev.slice(1) : prev.slice();
      next.push({ id, entry: p.entry });
      return next;
    });
  }, []);

  /* ----- mouse + touch handlers ------------------------------------ */

  /** Begin the fountain at a viewport-coordinate spawn point.
   *  Used by `onMouseEnter` (with `e.clientX/Y`) and by
   *  `onTouchStart` (with `e.touches[0].clientX/Y`) so the
   *  same burst + RAF bootstrap runs on desktop and mobile. */
  const beginHover = React.useCallback(
    (p: { x: number; y: number }) => {
      if (prefersReduced) return;
      isHoveringRef.current = true;
      cursorRef.current = p;
      // Initial burst — staggered like the reference.
      for (let i = 0; i < INITIAL_BURST_COUNT; i++) {
        setTimeout(spawnAtCursor, i * INITIAL_BURST_STAGGER_MS);
      }
      // Start RAF if not running. We go through `tickRef` so
      // this handler doesn't have to declare `tick` as a
      // dependency (which would force a re-render whenever
      // the tick callback changes) and never calls a stale
      // `tick` from a previous render.
      if (rafRef.current == null) {
        lastTimeRef.current = 0;
        const fn = tickRef.current;
        if (fn) rafRef.current = requestAnimationFrame(fn);
      }
    },
    [prefersReduced, spawnAtCursor]
  );

  /** Update the spawn point without restarting the burst —
   *  fires on every mouse-move and touch-move while the
   *  pointer is over the button. */
  const updateCursor = React.useCallback((p: { x: number; y: number }) => {
    cursorRef.current = p;
  }, []);

  const handleLeave = React.useCallback(() => {
    // Don't kill the RAF — let in-flight particles finish
    // their fade. The tick self-stops when nothing is alive.
    isHoveringRef.current = false;
  }, []);

  /* ----- RAF loop -------------------------------------------------- */

  const tick = React.useCallback(
    (timestamp: number) => {
      const dt = lastTimeRef.current
        ? Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
        : 0.016;
      lastTimeRef.current = timestamp;

      // ---- physics step ----
      const dead: number[] = [];

      particlesRef.current.forEach((p, id) => {
        p.age += dt;
        p.vy += p.gravity * dt;
        const dragFactor = 1 - p.drag * dt;
        p.vx *= dragFactor;
        p.vy *= dragFactor;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        // Distance-based fade.
        const dx = p.x - p.startX;
        const dy = p.y - p.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let opacity = 1 - distance / p.maxDistance;
        if (opacity < 0) opacity = 0;
        if (opacity > 1) opacity = 1;
        // First-frame fade-in window.
        if (p.age < FADE_IN_SECONDS) {
          opacity *= p.age / FADE_IN_SECONDS;
        }

        // Scale curve — matches the reference: grow fast,
        // pulse at midpoint, then shrink as the icon leaves.
        let scale = 1;
        const distProgress = distance / p.maxDistance;
        if (distProgress < 0.1) {
          scale = 0.3 + (distProgress / 0.1) * 0.7;
        } else if (distProgress > 0.7) {
          scale = 1 - ((distProgress - 0.7) / 0.3) * 0.6;
        } else {
          scale = 1 + Math.sin(distProgress * Math.PI) * 0.1;
        }

        // Direct DOM mutation — no React render per particle
        // per frame.
        const el = elementRefs.current.get(id);
        if (el) {
          el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) rotate(${p.rotation}deg) scale(${
            p.size * scale
          })`;
          el.style.opacity = opacity.toFixed(3);
        }

        if (opacity <= 0.01 || distance > p.maxDistance * 1.2) {
          dead.push(id);
        }
      });

      // ---- reap dead particles (one React render per batch) ----
      if (dead.length > 0) {
        dead.forEach((id) => {
          particlesRef.current.delete(id);
          elementRefs.current.delete(id);
        });
        const deadSet = new Set(dead);
        setLiveParticles((prev) => prev.filter((p) => !deadSet.has(p.id)));
      }

      // ---- spawn new ones if still hovering ----
      if (isHoveringRef.current) {
        const spawnCount =
          Math.floor(Math.random() * (SPAWN_PER_FRAME_MAX - SPAWN_PER_FRAME_MIN + 1)) +
          SPAWN_PER_FRAME_MIN;
        for (let i = 0; i < spawnCount; i++) {
          if (Math.random() < SPAWN_PROBABILITY) spawnAtCursor();
        }
      }

      // ---- schedule next frame, or self-stop ----
      if (particlesRef.current.size > 0 || isHoveringRef.current) {
        const fn = tickRef.current;
        if (fn) rafRef.current = requestAnimationFrame(fn);
      } else {
        rafRef.current = null;
        lastTimeRef.current = 0;
      }
    },
    [spawnAtCursor]
  );

  // Mirror the latest `tick` into `tickRef` so handlers can
  // always call the freshest version. `tick` itself is defined
  // just above; the ref is read by `handleEnter` before
  // `requestAnimationFrame` is scheduled.
  React.useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // Cancel RAF on unmount.
  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      tickRef.current = null;
    };
  }, []);

  /* ----- render --------------------------------------------------- */

  return (
    <Link
      ref={linkRef}
      href={href}
      aria-label={ariaLabel ?? label}
      onMouseEnter={(e) => beginHover({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => updateCursor({ x: e.clientX, y: e.clientY })}
      onMouseLeave={handleLeave}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) beginHover({ x: t.clientX, y: t.clientY });
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) updateCursor({ x: t.clientX, y: t.clientY });
      }}
      onTouchEnd={handleLeave}
      className={cn(
        buttonVariants({ variant: "default", size }),
        // Pill shape — `rounded-full` wins over the shadcn
        // default (`rounded-md`) because both have the same
        // Tailwind specificity and `rounded-full` is later
        // in the generated CSS.
        "rounded-full",
        // The link is the particle-emitter surface. We
        // position it relative so the absolutely-positioned
        // children (button content + particle overlay) are
        // scoped to it, and keep overflow: visible so the
        // (fixed) particle overlay can extend anywhere on
        // the viewport.
        "relative overflow-visible",
        className
      )}
    >
      <span className="relative z-10 flex items-center">
        {label}
        <ArrowRight className="ml-2" />
      </span>

      {/* Particle overlay — fixed to the viewport so particles
       *  can fly in any direction from the cursor without
       *  hitting the hero section's overflow-hidden clip.
       *
       * We render each particle at (0, 0) on first mount and
       * let the RAF tick write the real position to the DOM on
       * the next frame; the one-frame at-origin flash is below
       * 16ms and unnoticeable, and keeps the render body free
       * of any ref reads (which the React refs-in-render rule
       * forbids). */}
      {!prefersReduced && (
        <span aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
          {liveParticles.map((p) => {
            const entry = p.entry;
            return (
              <span
                key={p.id}
                ref={(el) => {
                  elementRefs.current.set(p.id, el);
                }}
                className="absolute top-0 left-0 block will-change-transform"
                style={{
                  transform: "translate3d(0, 0, 0) translate(-50%, -50%)",
                  opacity: 0,
                }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: entry.color,
                    boxShadow: entry.glow,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 20,
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {entry.emoji}
                  </span>
                </span>
              </span>
            );
          })}
        </span>
      )}
    </Link>
  );
}
