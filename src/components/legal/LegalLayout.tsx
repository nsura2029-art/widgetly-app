"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

type TocItem = { id: string; label: string };

export default function LegalLayout({
  title,
  subtitle,
  toc = [],
  children,
  lastUpdated,
}: {
  title: string;
  subtitle?: string;
  toc?: TocItem[];
  children: React.ReactNode;
  lastUpdated?: string;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = rect.height - viewH + 80; // account for header
      if (total <= 0) return setProgress(100);
      const scrolled = Math.min(Math.max(-rect.top + 80, 0), total);
      setProgress(Math.round((scrolled / total) * 100));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="legal-page relative">
      {/* reading progress bar under header */}
      <div className="fixed left-0 right-0 top-16 z-50 h-1 bg-muted/20">
        <div
          aria-hidden
          className="h-1 bg-brand-gradient transition-width"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container py-8">
        <div className="mx-auto max-w-5xl lg:flex lg:items-start lg:gap-10">
          {/* Left TOC for desktop */}
          <aside className="hidden lg:block lg:w-56">
            <div className="sticky top-28 space-y-4">
              <div className="rounded-md bg-muted/5 p-3 text-sm">
                <div className="font-medium">On this page</div>
                <nav className="mt-2 flex flex-col gap-1">
                  {toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="text-muted hover:text-foreground">
                      {t.label}
                    </a>
                  ))}
                </nav>
              </div>

              {lastUpdated && (
                <div className="text-xs text-muted">Last updated: {lastUpdated}</div>
              )}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full bg-muted/5 px-3 py-1 text-xs font-medium">
                  Widgetly Legal
                </div>
                <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
              </div>
            </div>

            <article ref={contentRef} className="prose max-w-none prose-a:text-primary prose-li:mt-2 dark:prose-invert">
              <div className="max-w-[800px]">{children}</div>
            </article>

            {/* Footer CTA */}
            <div className="mt-12 border-t border-border/60 pt-8">
              <div className="max-w-[800px]">
                <div className="rounded-lg bg-muted/5 p-6">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">Questions or concerns?</div>
                      <div className="text-sm text-muted">We're happy to help. Reach out to our team anytime.</div>
                    </div>
                    <div className="mt-4 flex gap-3 sm:mt-0">
                      <Link href="/contact" className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
                        Contact Us
                      </Link>
                      <Link href="/suggest" className="rounded-md border border-border px-4 py-2 text-sm">
                        Suggest a Tool
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
