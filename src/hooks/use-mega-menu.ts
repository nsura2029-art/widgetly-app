"use client";

/**
 * useMegaMenu — encapsulates the open/close + hover-tolerance state
 * for any mega-menu trigger (the header Tools button, the tools-banner
 * chips, a future footer mega menu, etc.).
 *
 * Extracted from the original `tools-banner.tsx` so the same state
 * machine can be reused by the new client header without duplication.
 *
 * ## State machine
 *
 *   idle  ──open(slug)──▶  open(slug)
 *   open  ──close()────▶   idle
 *   open  ──scheduleClose() + 120ms──▶  idle
 *   open  ──cancelClose()────▶  open   (mouse re-enters before timer fires)
 *
 * The 120ms close delay is intentional: the cursor has to traverse the
 * gap between the trigger and the mega panel. Without it, the panel
 * snaps shut the moment the cursor leaves the trigger button.
 *
 * Esc closes immediately (no delay). Click-outside closes immediately
 * (no delay) — see `useEffect` in the consumer.
 *
 * ## Why not Headless UI / Radix?
 *
 * The state is trivial enough that a 30-line hook beats a 50KB dep.
 * The hover-tolerance delay is the one piece of behavior that's
 * genuinely custom; everything else is `useState`.
 */

import * as React from "react";

export type MegaMenuState = {
  /** Currently open slug, or `null` if no panel is showing. */
  openSlug: string | null;
  /** Imperatively open a panel by slug. Cancels any pending close. */
  open: (slug: string) => void;
  /** Imperatively close the panel. Cancels any pending close. */
  close: () => void;
  /** Toggle a panel by slug (open if closed, close if same). */
  toggle: (slug: string) => void;
  /**
   * Schedule a close 120ms from now. If the cursor re-enters the
   * trigger or panel in that window, call `cancelClose()` and the
   * panel stays open.
   */
  scheduleClose: () => void;
  /** Cancel any pending scheduled close. */
  cancelClose: () => void;
};

const CLOSE_DELAY_MS = 120;

export function useMegaMenu(): MegaMenuState {
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = React.useCallback(
    (slug: string) => {
      cancelClose();
      setOpenSlug(slug);
    },
    [cancelClose]
  );

  const close = React.useCallback(() => {
    cancelClose();
    setOpenSlug(null);
  }, [cancelClose]);

  const toggle = React.useCallback(
    (slug: string) => {
      cancelClose();
      setOpenSlug((cur) => (cur === slug ? null : slug));
    },
    [cancelClose]
  );

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenSlug(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  // Cleanup any pending timer on unmount.
  React.useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return { openSlug, open, close, toggle, scheduleClose, cancelClose };
}
