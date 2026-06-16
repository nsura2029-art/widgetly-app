"use client";

import { MotionConfig as FramerMotionConfig } from "framer-motion";

/**
 * Global framer-motion configuration. Wraps the app so every
 * <motion.* /> element inherits a consistent policy on
 * `prefers-reduced-motion`.
 *
 *   - `reducedMotion="user"` means: respect the user's OS-level
 *     reduce-motion setting. When the user prefers reduced motion,
 *     all type: "spring" / "tween" animations are skipped (the
 *     element renders straight to its `animate` state). The user
 *     is left in control rather than us making the call for them.
 *
 *   - WCAG 2.3.3 (Animation from Interactions) requires that
 *     motion-based UI can be disabled. This is the canonical
 *     framer-motion way to satisfy that.
 *
 *   - We also set `transition` defaults so a quick visual
 *     confirmation in dev (the default spring) doesn't override
 *     our intent: ease-out is gentler than spring for entrance
 *     animations.
 *
 * Render this once at the layout root, inside <body>.
 */
export function MotionConfig({ children }: { children: React.ReactNode }) {
  return (
    <FramerMotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </FramerMotionConfig>
  );
}
