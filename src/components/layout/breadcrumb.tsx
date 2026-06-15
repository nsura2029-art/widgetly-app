"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBreadcrumbs, generateBreadcrumbSchema, type Crumb } from "@/lib/breadcrumbs";

/**
 * Breadcrumb navigation. Server-rendered on the initial request (Next.js
 * SSRs client components) so the visible nav and the JSON-LD are both in
 * the initial HTML for crawlers. The first item ("Home") is always
 * present; remove it via `hideHome`. The current page's last crumb is
 * rendered as a non-interactive `<span>` with `aria-current="page"`.
 * Intermediate items are real `<Link>`s (Next/Link → crawlable, prefetched).
 *
 * Pass `items` to skip path-based generation (e.g. when the visible
 * trail is not derivable from the URL alone).
 */
export type BreadcrumbProps = {
  /** The current path. Defaults to whatever the layout passes; pass explicitly in tests. */
  path?: string;
  /** Override the auto-generated trail. */
  items?: Crumb[];
  /** Override the auto-generated label for a given segment. */
  customLabels?: Record<string, string>;
  /** Drop the leading "Home" crumb. */
  hideHome?: boolean;
  /** Extra classes for the outer `<nav>`. */
  className?: string;
  /**
   * Render the trailing JSON-LD script. Defaults to true. Disable if the
   * page already emits breadcrumb schema (e.g. blog index) and you want
   * to avoid duplication.
   */
  withSchema?: boolean;
};

export function Breadcrumb({
  path = "/",
  items,
  customLabels,
  hideHome = false,
  className,
  withSchema = true,
}: BreadcrumbProps) {
  // Memoize the trail so the JSON-LD and the visible nav stay in sync
  // and re-renders are cheap.
  const crumbs = React.useMemo(
    () => (items ? items : generateBreadcrumbs(path, { customLabels, hideHome })),
    [items, path, customLabels, hideHome]
  );
  const schema = React.useMemo(
    () => (withSchema ? generateBreadcrumbSchema(crumbs) : null),
    [crumbs, withSchema]
  );

  // No trail → render nothing.
  if (crumbs.length === 0) return null;

  const lastIndex = crumbs.length - 1;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className={cn(
          // Stable visual band under the sticky header. Background, border,
          // and vertical rhythm are fixed so the breadcrumb does not shift
          // shape between pages. The top padding gives a small breathing
          // gap between the sticky header and the breadcrumb (matches the
          // py-4 rhythm used by adjacent content bands so the breadcrumb
          // doesn't feel pinned to the header).
          "border-border/60 border-b bg-white/70 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          className
        )}
      >
        <div className="container">
          <ol
            itemScope
            itemType="https://schema.org/BreadcrumbList"
            className="text-muted flex flex-wrap items-center gap-y-1 py-3 text-sm"
          >
            {crumbs.map((crumb, i) => {
              const isLast = i === lastIndex;
              const position = i + 1;
              return (
                <li
                  key={`${crumb.href}-${i}`}
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                  className="flex max-w-full min-w-0 items-center gap-1.5 sm:gap-2"
                >
                  <meta itemProp="position" content={String(position)} />

                  {isLast ? (
                    <span
                      itemProp="name"
                      aria-current="page"
                      className="text-foreground min-w-0 truncate font-semibold"
                      title={crumb.label}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      itemProp="item"
                      className={cn(
                        "inline-flex max-w-[12rem] min-w-0 items-center gap-1 truncate rounded-md px-1 py-0.5",
                        "hover:text-foreground focus-visible:text-foreground transition-colors",
                        "sm:max-w-[16rem]"
                      )}
                      title={crumb.label}
                    >
                      {i === 0 && !hideHome ? (
                        <Home aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      ) : null}
                      <span itemProp="name" className="truncate">
                        {crumb.label}
                      </span>
                    </Link>
                  )}

                  {!isLast ? (
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted/70 h-3.5 w-3.5 shrink-0"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      {schema ? (
        <script
          type="application/ld+json"
          // No user input; safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ) : null}
    </>
  );
}
