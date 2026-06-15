import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical page-content wrapper.
 *
 * Every non-landing page should render its body inside `<PageShell>` so the
 * horizontal alignment (Tailwind's `.container`, 1280px max), the top/bottom
 * rhythm, and the inner max-width are identical across the site. This is
 * the single source of truth for "what a content page looks like" — the
 * SEO/Google-Ads template depends on the body width being predictable.
 *
 * Variants:
 *  - default: prose/forms/legal (max-w-3xl content card)
 *  - wide:    lists/grid pages (max-w-5xl content)
 *  - narrow:  single-column form pages (max-w-2xl content card)
 *  - full:    no inner max-w (use the container only)
 *
 * Notes:
 *  - The root <main> is provided by the layout; do NOT wrap children in
 *    another <main>.
 *  - The layout already reserves `pt-16` to clear the sticky header. The
 *    breadcrumb lives between the header and <main>, so it scrolls under
 *    the sticky header normally.
 *  - Vertical padding is responsive: `py-12` on mobile, `py-20` from
 *    `md:` up. This matches the rhythm the marketing/landing sections
 *    were tuned to.
 */
export type PageShellWidth = "default" | "wide" | "narrow" | "full";

const WIDTH_CLASS: Record<PageShellWidth, string> = {
  // Default reads comfortably on phones and desktop; used for prose
  // content (about) and most other text-heavy pages.
  default: "max-w-3xl",
  // Blog index, blog post — body benefits from a touch more breathing room.
  wide: "max-w-5xl",
  // Contact, suggest — single-column form pages.
  narrow: "max-w-2xl",
  // Anything that wants the full container width (e.g. category grids).
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
        "container py-12 sm:py-16 md:py-20",
        className
      )}
    >
      <InnerTag className={cn("mx-auto w-full", innerMaxW, innerClassName)}>{children}</InnerTag>
    </div>
  );
}
