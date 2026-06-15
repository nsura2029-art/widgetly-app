"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Hash, ArrowRight, MessageCircle, Lightbulb, Mail } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";

type TocItem = { id: string; label: string };

/**
 * Legal-page chrome shared by Privacy / Terms / Cookies / Security.
 *
 * Layout
 *   ┌─ sticky reading-progress bar (1.5px under the header) ─────┐
 *   │                                                            │
 *   │   ┌─ TOC ─────────┐   ┌─ Header (badge / h1 / subtitle) ─┐│
 *   │   │  On this page  │   │  Privacy Policy                  ││
 *   │   │  • Intro  ●    │   │  Learn how Widgetly ...          ││
 *   │   │  • Section 2   │   │  Last updated: 2026-06-12        ││
 *   │   │  • Section 3   │   └──────────────────────────────────┘│
 *   │   │  Last updated  │   ┌─ Plain-English summary box ─────┐│
 *   │   │  Was helpful?  │   │  The 30-second version.          ││
 *   │   │                │   └──────────────────────────────────┘│
 *   │   │                │   ┌─ Article body ───────────────────┐│
 *   │   │                │   │  ## Section 1                   ││
 *   │   │                │   │  ...                            ││
 *   │   │                │   └──────────────────────────────────┘│
 *   │   │                │   ┌─ Bottom CTA ─────────────────────┐│
 *   │   │                │   │  Questions?  [Contact] [Suggest] ││
 *   │   │                │   └──────────────────────────────────┘│
 *   └────────────────────────────────────────────────────────────┘
 *
 * Behaviour
 *  - The TOC tracks which section is currently in view using
 *    IntersectionObserver; the active link gets a colored dot.
 *  - The reading progress bar is a fixed 1.5px line at the top of
 *    the content area that fills as the article scrolls.
 *  - The bottom CTA uses CSS grid (not flex with sm:flex-row) so
 *    the two action buttons never wrap awkwardly on small screens.
 *  - The page body never grows past 70ch on desktop, which is the
 *    documented comfortable reading line length.
 */
export default function LegalLayout({
  title,
  subtitle,
  toc = [],
  children,
  lastUpdated,
  plainEnglish,
  related,
  width = "wide",
}: {
  title: string;
  subtitle?: string;
  toc?: TocItem[];
  children: React.ReactNode;
  lastUpdated?: string;
  /**
   * Optional "plain English" summary block rendered above the
   * legal body. This is the 30-second version of the document;
   * it lives in a tinted callout so readers who don't want the
   * legalese can still get the gist.
   */
  plainEnglish?: string;
  /**
   * Other legal documents a reader is likely to want next.
   * Rendered as a small "Related" rail at the bottom of the page.
   */
  related?: ReadonlyArray<{ label: string; href: string; description?: string }>;
  /**
   * Width of the page shell wrapper. Defaults to `"wide"` because
   * legal pages pair a sidebar TOC with a wide article body and
   * the default 768px cap is too tight once the sidebar is taken
   * out. Pass `"default"` only if you really want the narrow
   * single-column look.
   */
  width?: "default" | "wide" | "narrow" | "full";
}) {
  const articleRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(toc[0]?.id ?? null);

  // Reading-progress bar. Counts pixels scrolled past the top of
  // the article, capped at the article height, against the
  // viewport height. Result is a 0-100 percentage.
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = rect.height - viewH;
      if (total <= 0) {
        setProgress(100);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(Math.round((scrolled / total) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Active-section tracking. IntersectionObserver watches every
  // <h2 id> in the article; whichever is closest to the top of
  // the viewport (and at least 20% in view) becomes the active
  // TOC entry. The article element scopes the query so we don't
  // accidentally pick up h2s in the header/CTA.
  useEffect(() => {
    if (!articleRef.current || toc.length === 0) return;
    const headings = Array.from(articleRef.current.querySelectorAll<HTMLHeadingElement>("h2[id]"));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0, 0.2, 0.5, 1],
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc.length, children]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    // Smooth scroll, with a small offset for the sticky header.
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
  }

  return (
    <div className="legal-page relative">
      {/* Reading-progress line. Fixed under the header (64px), full
          width, gradient fill driven by `progress` (0-100). Slightly
          thicker than the previous 1px so it's actually visible. */}
      <div
        className="bg-muted/30 fixed top-16 right-0 left-0 z-40 h-[2px] overflow-hidden"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-brand-gradient h-full transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <PageShell width={width}>
        <div className="lg:flex lg:items-start lg:gap-12">
          {/* ============== Left rail: TOC + meta ============== */}
          <aside className="hidden lg:block lg:w-64 lg:shrink-0">
            <nav
              aria-label="On this page"
              className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1"
            >
              <div className="border-border/60 shadow-soft rounded-2xl border bg-white p-4">
                <div className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  <Hash className="h-3 w-3" aria-hidden="true" />
                  On this page
                </div>
                <ol className="mt-3 space-y-0.5">
                  {toc.map((t, i) => {
                    const active = t.id === activeId;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => jumpTo(t.id)}
                          className={cn(
                            "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            active
                              ? "text-foreground bg-primary/5 font-medium"
                              : "text-muted hover:text-foreground hover:bg-muted/5"
                          )}
                          aria-current={active ? "location" : undefined}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                              active ? "bg-primary" : "bg-border group-hover:bg-muted-foreground/50"
                            )}
                          />
                          <span className="flex-1">
                            <span className="text-muted-foreground/70 mr-1.5 text-xs tabular-nums">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {t.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {lastUpdated && (
                <div className="text-muted mt-3 flex items-center gap-1.5 px-2 text-xs">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>Last updated {lastUpdated}</span>
                </div>
              )}
            </nav>
          </aside>

          {/* ============== Main column ============== */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <header className="border-border/60 shadow-soft rounded-2xl border bg-white p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase">
                  <Hash className="h-3 w-3" aria-hidden="true" />
                  Widgetly Legal
                </span>
                {lastUpdated && (
                  <span className="text-muted inline-flex items-center gap-1 text-xs sm:hidden">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Updated {lastUpdated}
                  </span>
                )}
              </div>
              <h1 className="text-foreground mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {subtitle && <p className="text-muted mt-3 text-base leading-relaxed">{subtitle}</p>}
            </header>

            {/* Plain-English summary, when provided */}
            {plainEnglish && (
              <aside
                role="note"
                className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2 text-amber-700">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  <h2 className="text-xs font-semibold tracking-wider uppercase">
                    The 30-second version
                  </h2>
                </div>
                <p className="text-foreground/90 mt-2 text-sm leading-relaxed sm:text-base">
                  {plainEnglish}
                </p>
              </aside>
            )}

            {/* Article body. Capped at 70ch for comfortable reading
                line length on wide viewports. */}
            <article
              ref={articleRef}
              className="prose prose-slate prose-headings:scroll-mt-28 prose-headings:font-semibold prose-h2:mt-12 prose-h2:border-border/40 prose-h2:border-b prose-h2:pb-3 prose-h2:text-2xl prose-h2:tracking-tight prose-h3:mt-8 prose-h3:text-lg prose-li:my-1.5 prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline dark:prose-invert mx-auto mt-8 max-w-[70ch]"
            >
              {children}
            </article>

            {/* Bottom CTA. Single flex column on mobile (text first,
                buttons stacked). On `sm+` it flips to a row: the
                text block grows to fill, the buttons sit on the right
                with a fixed width. `whitespace-nowrap` keeps the
                button labels on a single line even at narrow widths. */}
            <div className="border-primary/20 bg-primary/5 mt-12 flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
              <div className="min-w-0 flex-1">
                <div className="text-foreground flex items-center gap-2 text-lg font-semibold">
                  <MessageCircle className="text-primary h-5 w-5" aria-hidden="true" />
                  Questions or concerns?
                </div>
                <p className="text-muted mt-1 text-sm">
                  We&apos;re happy to help. Reach out to our team anytime — a real human will read
                  and reply.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:gap-3">
                <Link
                  href="/contact"
                  className="bg-brand-gradient shadow-glow-sm inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium whitespace-nowrap text-white transition-all hover:brightness-110"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Contact us
                </Link>
                <Link
                  href="/suggest"
                  className="border-border hover:border-primary/40 inline-flex items-center justify-center gap-1.5 rounded-xl border bg-white px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Suggest a tool
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Related documents */}
            {related && related.length > 0 && (
              <div className="mt-10">
                <h2 className="text-foreground text-sm font-semibold tracking-wider uppercase">
                  Related documents
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="border-border/60 hover:border-primary/40 group flex h-full flex-col rounded-xl border bg-white p-4 transition-colors"
                      >
                        <span className="text-foreground group-hover:text-primary text-sm font-semibold">
                          {r.label}
                          <ArrowRight
                            aria-hidden="true"
                            className="ml-1 inline h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                        {r.description && (
                          <span className="text-muted mt-1 text-xs leading-relaxed">
                            {r.description}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </PageShell>
    </div>
  );
}
