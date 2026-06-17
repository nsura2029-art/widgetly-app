import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical page-content wrapper.
 *
 * Every non-landing page should render its body inside `<PageShell>` so the
 * horizontal alignment (Tailwind's `.container`, 1280px max) matches the
 * sticky header and the breadcrumb band — both of which also span the full
 * container width. The container is the single source of truth for
 * "what horizontal edge content sits at" on the site.
 *
 * The inner content is LEFT-ALIGNED at the container's left edge (no
 * `mx-auto`). Inner max-widths come from the `width` prop:
 *  - default: prose/forms/legal (max-w-3xl content card, ~768px)
 *  - wide:    lists/grid pages (max-w-5xl content, ~1024px)
 *  - narrow:  single-column form pages (max-w-2xl content card, ~672px)
 *  - full:    no inner max-w — spans the full container width
 *
 * Why left-align instead of centered? Because the user perceives the
 * header (logo at container left) and breadcrumb (trail at container left)
 * as the visual anchor. Centering page content under them creates an
 * offset that reads as misalignment. Left-aligning content under a
 * left-aligned header matches how the home page's landing sections are
 * laid out (Hero, Features, Categories, etc., all start at container
 * left).
 *
 * Pages that want a centered column on top of the container can still
 * do that internally — e.g. a centered hero header, a centered prose
 * card on a wider page — by wrapping their content in
 * `<div className="mx-auto max-w-2xl">` themselves. PageShell doesn't
 * force one or the other globally.
 *
 * Notes:
 *  - The root <main> is provided by the layout; do NOT wrap children in
 *    another <main>.
 *  - The layout already reserves `pt-16` to clear the sticky header. The
 *    breadcrumb lives between the header and <main>, so it scrolls under
 *    the sticky header normally.
 *  - Vertical padding is asymmetric: smaller on top (the breadcrumb
 *    band already provides the visual break — adding 80px more felt
 *    like dead space), larger on the bottom for separation before the
 *    footer / next section. Tuned to feel tight under the breadcrumb
 *    and breathing before what comes next.
 */
export type PageShellWidth = "default" | "wide" | "narrow" | "full";

const WIDTH_CLASS: Record<PageShellWidth, string> = {
  // Default reads comfortably on phones and desktop; used for prose
  // content (blog post articles, etc.) where 60-80 chars per line is
  // the readability sweet spot.
  default: "max-w-3xl",
  // Wide now spans the full container width (max-w-7xl == container max
  // of 80rem). Pages that need a card grid, hero + grid combo, or
  // anything that fills the screen flow naturally use this. Previously
  // this was max-w-5xl which left a 256px gap on the right vs the
  // Join Waitlist button — felt misaligned. Pages that want a
  // narrower-than-full inner column should use width="default" or
  // wrap their content in mx-auto max-w-3xl themselves.
  wide: "max-w-7xl",
  // Contact, suggest — single-column form pages. 2xl = 672px, leaves
  // a visible right gutter on wide screens so the form doesn't look
  // like it's stretched.
  narrow: "max-w-2xl",
  // Explicit "no inner cap". Same as "wide" — kept for clarity at
  // call sites that want to express intent ("this page is intentionally
  // full-width, not narrow").
  full: "",
};

export type PageShellProps = {
  children: React.ReactNode;
  /**
   * Inner content max-width. Defaults to `"default"` (max-w-3xl).
   */
  width?: PageShellWidth;
  /**
   * Extra classes for the outer `.container` wrapper. Use sparingly —
   * alignment should come from `width` and the default padding.
   */
  className?: string;
  /**
   * Extra classes for the inner max-w wrapper. Use to add a background
   * card, rounded border, etc.
   */
  innerClassName?: string;
  /**
   * Render an `<article>` instead of a `<div>` for the inner wrapper.
   * Useful for content pages where semantic article/heading order
   * matters for crawlers.
   */
  asArticle?: boolean;
};

export function PageShell({
  children,
  width = "default",
  className,
  innerClassName,
  asArticle = false,
}: PageShellProps) {
  const InnerTag = asArticle ? "article" : "div";
  const innerMaxW = WIDTH_CLASS[width];

  return (
    <div
      className={cn(
        // Tailwind v4's `.container` is 100% width with horizontal padding
        // that scales with the viewport (1rem -> 2rem). It caps at 80rem.
        //
        // Vertical padding is split: pt-* (smaller, breadcrumb already
        // provides visual separation) + pb-* (larger, breathing room
        // before footer / next section). Tuned to match the gap above
        // the breadcrumb (pt-6 on the parent <main>) so the rhythm is
        // consistent across the page: header | gap | breadcrumb |
        // gap | content | ... | footer.
        "container pt-6 pb-12 sm:pt-6 sm:pb-16 md:pt-6 md:pb-20",
        className
      )}
    >
      <InnerTag className={cn("w-full", innerMaxW, innerClassName)}>{children}</InnerTag>
    </div>
  );
}
