"use client";

import * as React from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Github, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { LocalePicker } from "@/components/layout/locale-picker";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

/**
 * Sticky, glassmorphic site header. Collapses the nav into a sheet on
 * small viewports and animates a backdrop blur on scroll. Includes a
 * `<LocalePicker />` so the user can switch languages from anywhere.
 *
 * Localization:
 *   - Uses `next-intl`'s `<Link>` (re-exported from `@/i18n/navigation`)
 *     so all internal links automatically get the current locale prefix.
 *   - Nav labels, aria attributes, and CTA text are pulled from the
 *     `header.*` namespace via `useTranslations()`.
 */
export default function ClientHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  // Close sheet on resize-up past the breakpoint.
  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll while the mobile menu is open.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close mobile sheet on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/tools", label: t("header.nav.tools") },
    { href: "/#features", label: t("header.nav.features") },
    { href: "/#categories", label: t("header.nav.categories") },
    { href: "/blog", label: t("header.nav.blog") },
    { href: "/about", label: t("header.nav.about") },
    { href: "/contact", label: t("header.nav.contact") },
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-white/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={t("header.aria.homeLink", { siteName: t("site.name") })}
        >
          <Logo showWordmark={false} />
          <span className="text-lg font-semibold tracking-tight">{t("site.name")}</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-1" aria-label={t("header.aria.mainNav")}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-foreground rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocalePicker />
          <a
            href="https://github.com/widgetly/widgetly"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Widgetly on GitHub"
            className="border-border text-foreground hover:bg-muted/5 inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-transparent px-3.5 text-xs font-medium transition-colors"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("header.actions.star")}</span>
          </a>
          <Button asChild size="sm" className="h-9 rounded-lg">
            <a href="#waitlist">{t("header.actions.joinWaitlist")}</a>
          </Button>
        </div>

        {/* Mobile: locale picker + menu trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <LocalePicker />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t("header.aria.closeMenu") : t("header.aria.openMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="border-border text-foreground hover:bg-muted/5 inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white/60 backdrop-blur transition-colors hover:bg-white"
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu sheet */}
      <div
        id="mobile-nav"
        className={cn(
          "overflow-hidden border-t border-border/60 bg-white/95 backdrop-blur-xl transition-all md:hidden",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="container flex flex-col gap-1 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground hover:bg-muted/5 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
            <a
              href="https://github.com/widgetly/widgetly"
              target="_blank"
              rel="noreferrer noopener"
              className="border-border text-foreground hover:bg-muted/5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-medium transition-colors"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              Widgetly on GitHub
            </a>
            <a
              href="#waitlist"
              className="bg-brand-gradient text-white shadow-glow-sm hover:shadow-glow hover:brightness-110 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all"
            >
              {t("header.actions.joinWaitlist")}
            </a>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
