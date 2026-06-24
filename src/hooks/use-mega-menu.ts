"use client";

/**
 * useMegaMenu — small state machine for one (or many) header
 * mega-menu trigger + panel pairs.
 *
 * ## Why one hook for both `HeaderMegaPanel` and `ToolsBanner` chips
 *
 * Both surfaces want identical UX:
 *   - hover the trigger ⇒ open
 *   - leave the trigger OR the panel ⇒ schedule close (120ms later)
 *   - re-enter (trigger OR panel) before the timer fires ⇒ cancel close
 *   - click the trigger ⇒ toggle
 *   - press Escape ⇒ close immediately
 *   - resize past `md` (768px) ⇒ close (the header collapses the
 *     desktop chrome in favor of the mobile sheet)
 *   - route change ⇒ close
 *
 * The 300ms close delay is the "hover-tolerance" pattern: it gives
 * the cursor enough time to traverse the small gap between the
 * trigger button and the panel (the panel is anchored right below
 * row 1, so the gap is ~16px). 120ms is too tight for many users —
 * they were losing the panel mid-traversal and getting a flicker.
 * 300ms is the standard mega-menu value (Linear, Vercel, Stripe).
 *
 * ## Multi-slug design
 *
 * The hook is slug-keyed so the same state machine can drive N
 * trigger / panel pairs (e.g. the `ToolsBanner` has 11 chips, each
 * with its own mega panel — although the header itself only ever
 * opens one). Each consumer passes a unique slug.
 *
 * Returned `openSlug` is the slug of the currently-open panel, or
 * `null` if all panels are closed. Only one panel can be open at a
 * time — `open()` and `toggle()` automatically close any other.
 */

import * as React from "react";

const CLOSE_DELAY_MS = 300;

export type UseMegaMenu = {
  /** The slug of the currently-open panel, or null. */
  openSlug: string | null;
  /** Open the panel for `slug`, closing any other. */
  open: (slug: string) => void;
  /** Close whatever is open. */
  close: () => void;
  /** Toggle the panel for `slug`. */
  toggle: (slug: string) => void;
  /**
   * Schedule a close in `CLOSE_DELAY_MS`. Call on `mouseleave` /
   * `focusout` from the trigger OR the panel. If the user re-enters
   * before the timer fires, call `cancelClose()`.
   */
  scheduleClose: () => void;
  /** Cancel a pending close. Call on `mouseenter` / `focusin`. */
  cancelClose: () => void;
};

export function useMegaMenu(): UseMegaMenu {
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending close timer on unmount so we don't try to
  // call setState on an unmounted component.
  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const cancelTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    cancelTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpenSlug(null);
    }, CLOSE_DELAY_MS);
  }, [cancelTimer]);

  const cancelClose = React.useCallback(() => {
    cancelTimer();
  }, [cancelTimer]);

  const open = React.useCallback((slug: string) => {
    cancelTimer();
    setOpenSlug((current) => (current === slug ? current : slug));
  }, [cancelTimer]);

  const close = React.useCallback(() => {
    cancelTimer();
    setOpenSlug(null);
  }, [cancelTimer]);

  const toggle = React.useCallback((slug: string) => {
    cancelTimer();
    setOpenSlug((current) => (current === slug ? null : slug));
  }, [cancelTimer]);

  return { openSlug, open, close, toggle, scheduleClose, cancelClose };
}