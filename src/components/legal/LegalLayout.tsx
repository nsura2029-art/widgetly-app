"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

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
      <div className="bg-muted/20 fixed top-16 right-0 left-0 z-40 h-1">
        <div
          aria-hidden
          className="bg-brand-gradient transition-width h-1"
          style={{ width: `${progress}%` }}
        />
      </div>

      <PageShell width="default">
        <div className="lg:flex lg:items-start lg:gap-10">
          {/* Left TOC for desktop */}
          <aside className="hidden lg:block lg:w-56">
            <div className="sticky top-28 space-y-4">
              <div className="bg-muted/5 rounded-md p-3 text-sm">
                <div className="font-medium">On this page</div>
                <nav className="mt-2 flex flex-col gap-1">
                  {toc.map((t) => (
                    <a key={t.id} href={`#${t.id}`} className="text-muted hover:text-foreground">
                      {t.label}
                    </a>
                  ))}
                </nav>
              </div>

              {lastUpdated && <div className="text-muted text-xs">Last updated: {lastUpdated}</div>}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="bg-muted/5 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                  Widgetly Legal
                </div>
                <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
                {subtitle && <p className="text-muted mt-2 text-sm">{subtitle}</p>}
              </div>
            </div>

            <article
              ref={contentRef}
              className="prose prose-a:text-primary prose-li:mt-2 dark:prose-invert max-w-none"
            >
              {children}
            </article>

            {/* Footer CTA */}
            <div className="border-border/60 mt-12 border-t pt-8">
              <div className="bg-muted/5 rounded-lg p-6">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">Questions or concerns?</div>
                    <div className="text-muted text-sm">
                      We&apos;re happy to help. Reach out to our team anytime.
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3 sm:mt-0">
                    <Link
                      href="/contact"
                      className="bg-brand-gradient rounded-md px-4 py-2 text-sm font-medium text-white"
                    >
                      Contact Us
                    </Link>
                    <Link
                      href="/suggest"
                      className="border-border rounded-md border px-4 py-2 text-sm"
                    >
                      Suggest a Tool
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
